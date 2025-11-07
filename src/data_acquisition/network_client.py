"""Network client for ngrok server communication."""

import requests
import time
from typing import Optional, Tuple
from src.utils.logging import get_logger
from src.utils.config import config
from src.utils.exceptions import NetworkError, TimeoutError

logger = get_logger("network_client")


class NetworkClient:
    """Client for communicating with ngrok server."""
    
    def __init__(self):
        """Initialize network client."""
        self.base_url = config.ngrok.base_url
        self.auth = config.get_auth_tuple()
        self.headers = {"ngrok-skip-browser-warning": "true"}
        self.timeout = 10  # Default timeout in seconds
        self.last_frame_time = None
        self.frame_interval = 1.0  # 1 second for 1 fps
        self.tolerance = 0.1  # 10% tolerance
    
    def get_latest_frame(self) -> Optional[bytes]:
        """
        Get the latest frame from ngrok server.
        
        Returns:
            Image data as bytes or None if no frame available
            
        Raises:
            NetworkError: If request fails
            TimeoutError: If operation times out
        """
        try:
            logger.info(f"Fetching latest frame from ngrok server. Base URL: {self.base_url}")
            url = f"{self.base_url}/frame/latest"
            logger.info(f"Full URL: {url}")
            
            response = requests.get(
                url,
                headers=self.headers,
                auth=self.auth,
                timeout=self.timeout
            )
            
            if response.status_code == 503:
                logger.info("No frame available from server")
                return None
            
            response.raise_for_status()
            
            logger.info(f"Successfully fetched frame, size: {len(response.content)} bytes")
            return response.content
            
        except requests.exceptions.Timeout as e:
            logger.error(f"Request timeout: {e}")
            raise TimeoutError(f"Network request timeout: {e}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Network request failed: {e}")
            raise NetworkError(f"Failed to fetch latest frame: {e}")
    
    def get_frame_next(self, since_id: Optional[int] = None, timeout: int = 12) -> Optional[Tuple[int, bytes]]:
        """
        Get the next frame since a specific frame ID.
        
        Args:
            since_id: Frame ID to get frames after
            timeout: Timeout in seconds
            
        Returns:
            Tuple of (frame_id, frame_data) or None if timeout
            
        Raises:
            NetworkError: If request fails
            TimeoutError: If operation times out
        """
        try:
            logger.info(f"Fetching next frame since ID: {since_id}")
            url = f"{self.base_url}/frame/next?timeout={timeout}"
            if since_id is not None:
                url += f"&since={since_id}"
            
            response = requests.get(
                url,
                headers=self.headers,
                auth=self.auth,
                timeout=timeout + 2  # Add buffer to timeout
            )
            
            if response.status_code == 204:
                logger.info("No new frame available")
                return None
            
            response.raise_for_status()
            
            # Validate frame rate
            self._validate_frame_rate()
            
            frame_id = int(response.headers.get("X-Frame-Id", "0"))
            logger.info(f"Successfully fetched frame {frame_id}, size: {len(response.content)} bytes")
            return frame_id, response.content
            
        except requests.exceptions.Timeout as e:
            logger.error(f"Request timeout: {e}")
            raise TimeoutError(f"Network request timeout: {e}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Network request failed: {e}")
            raise NetworkError(f"Failed to fetch next frame: {e}")
    
    def start_session(self, preset: Optional[int] = None, distance: Optional[str] = None, fps: float = 1.0) -> dict:
        """
        Start a new session on ngrok server.
        
        Args:
            preset: Camera preset number
            distance: Shooting distance
            fps: Frames per second
            
        Returns:
            Session information dictionary
            
        Raises:
            NetworkError: If request fails
            TimeoutError: If operation times out
        """
        try:
            logger.info(f"Starting session: preset={preset}, distance={distance}, fps={fps}")
            url = f"{self.base_url}/session/start"
            
            payload = {}
            if preset is not None:
                payload["preset"] = int(preset)
            if distance is not None:
                payload["distance"] = distance
            if fps > 0:
                payload["fps"] = float(fps)
            
            response = requests.post(
                url,
                json=payload,
                headers=self.headers,
                auth=self.auth,
                timeout=8
            )
            
            response.raise_for_status()
            
            session_info = response.json()
            logger.info(f"Session started successfully: {session_info}")
            return session_info
            
        except requests.exceptions.Timeout as e:
            logger.error(f"Session start timeout: {e}")
            raise TimeoutError(f"Session start timeout: {e}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to start session: {e}")
            raise NetworkError(f"Failed to start session: {e}")
    
    def stop_session(self) -> dict:
        """
        Stop the current session on ngrok server.
        
        Returns:
            Session information dictionary
            
        Raises:
            NetworkError: If request fails
            TimeoutError: If operation times out
        """
        try:
            logger.info("Stopping session")
            url = f"{self.base_url}/session/stop"
            
            response = requests.post(
                url,
                json={},
                headers=self.headers,
                auth=self.auth,
                timeout=5
            )
            
            response.raise_for_status()
            
            session_info = response.json()
            logger.info(f"Session stopped successfully: {session_info}")
            return session_info
            
        except requests.exceptions.Timeout as e:
            logger.error(f"Session stop timeout: {e}")
            raise TimeoutError(f"Session stop timeout: {e}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to stop session: {e}")
            raise NetworkError(f"Failed to stop session: {e}")
    
    def set_zoom_preset(self, preset_number: int) -> dict:
        """
        Set zoom to a specific preset.
        
        Args:
            preset_number: Preset number to set
            
        Returns:
            Response dictionary
            
        Raises:
            NetworkError: If request fails
            TimeoutError: If operation times out
        """
        try:
            logger.info(f"Setting zoom preset: {preset_number}")
            url = f"{self.base_url}/zoom/preset"
            
            payload = {"number": int(preset_number)}
            
            response = requests.post(
                url,
                json=payload,
                headers=self.headers,
                auth=self.auth,
                timeout=5
            )
            
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Zoom preset set successfully: {result}")
            return result
            
        except requests.exceptions.Timeout as e:
            logger.error(f"Zoom preset timeout: {e}")
            raise TimeoutError(f"Zoom preset timeout: {e}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to set zoom preset: {e}")
            raise NetworkError(f"Failed to set zoom preset: {e}")
    
    def _validate_frame_rate(self) -> None:
        """
        Validate that frames are arriving at approximately 1 fps.
        
        Raises:
            NetworkError: If frame rate is outside acceptable range
        """
        current_time = time.time()
        
        if self.last_frame_time is not None:
            actual_interval = current_time - self.last_frame_time
            expected_interval = self.frame_interval
            tolerance = expected_interval * self.tolerance
            
            if actual_interval < expected_interval - tolerance:
                logger.warning(f"Frame arrived too early: {actual_interval:.2f}s (expected ~{expected_interval}s)")
            elif actual_interval > expected_interval + tolerance:
                logger.warning(f"Frame arrived too late: {actual_interval:.2f}s (expected ~{expected_interval}s)")
            else:
                logger.debug(f"Frame rate within tolerance: {actual_interval:.2f}s")
        
        self.last_frame_time = current_time
    
    def test_connection(self) -> bool:
        """
        Test connection to ngrok server.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            logger.info("Testing ngrok server connection")
            url = f"{self.base_url}/health"
            
            response = requests.get(
                url,
                headers=self.headers,
                auth=self.auth,
                timeout=5
            )
            
            response.raise_for_status()
            
            logger.info("Ngrok server connection test successful")
            return True
            
        except Exception as e:
            logger.error(f"Ngrok server connection test failed: {e}")
            return False


# Global network client instance
network_client = NetworkClient()
"""Data source module for GMShoot application."""

import os
from typing import Optional, List
from pathlib import Path
from PIL import Image
import requests
from io import BytesIO

from ..utils.logging import get_logger
from ..utils.config import config
from ..utils.exceptions import NetworkError, ImageProcessingError
from src.utils.image_processing import validate_image_format, convert_to_rgb
from ..analysis_engine.models import Shot

logger = get_logger("data_source")


class DataSource:
    """Handles data acquisition from various sources."""
    
    def __init__(self):
        """Initialize data source."""
        self.test_frames_dir = Path("test_frames")
        self.test_frames_dir.mkdir(exist_ok=True)
    
    def get_local_frame(self, frame_index: int, folder: str = "test_frames") -> Optional[Image.Image]:
        """
        Load a frame from local directory.
        
        Args:
            frame_index: Index of frame to load
            folder: Directory containing frames
            
        Returns:
            PIL Image or None if not found
            
        Raises:
            ImageProcessingError: If image loading fails
        """
        try:
            frame_path = Path(folder) / f"frame_{frame_index}.jpg"
            if not frame_path.exists():
                logger.warning(f"Frame not found: {frame_path}")
                return None
            
            image = Image.open(frame_path)
            logger.info(f"Loaded local frame: {frame_path}")
            
            # Validate image format
            if not validate_image_format(image):
                raise ImageProcessingError(f"Invalid image format: {frame_path}")
            
            return convert_to_rgb(image)
            
        except Exception as e:
            logger.error(f"Failed to load local frame {frame_index}: {e}")
            raise ImageProcessingError(f"Failed to load local frame: {e}")
    
    def get_live_frame(self) -> Optional[Image.Image]:
        """
        Fetch the latest frame from live ngrok server.
        
        Returns:
            PIL Image or None if fetch fails
            
        Raises:
            NetworkError: If network request fails
            ImageProcessingError: If image processing fails
        """
        try:
            logger.info("Fetching live frame from ngrok server")
            
            # Import here to avoid circular dependency
            from ..data_acquisition.network_client import NetworkClient
            
            network_client = NetworkClient()
            frame_data = network_client.get_latest_frame()
            
            if frame_data is None:
                logger.warning("No frame available from live server")
                return None
            
            # Convert bytes to PIL Image
            image = Image.open(BytesIO(frame_data))
            logger.info("Successfully fetched live frame")
            
            # Validate image format
            if not validate_image_format(image):
                raise ImageProcessingError("Invalid live frame format")
            
            return convert_to_rgb(image)
            
        except Exception as e:
            logger.error(f"Failed to get live frame: {e}")
            if isinstance(e, (NetworkError, ImageProcessingError)):
                raise
            raise NetworkError(f"Failed to get live frame: {e}")
    
    def get_available_local_frames(self, folder: str = "test_frames") -> List[int]:
        """
        Get list of available frame indices.
        
        Args:
            folder: Directory containing frames
            
        Returns:
            List of available frame indices
        """
        try:
            frame_dir = Path(folder)
            if not frame_dir.exists():
                return []
            
            frame_indices = []
            for file_path in frame_dir.glob("frame_*.jpg"):
                # Extract frame number from filename
                try:
                    parts = file_path.stem.split("_")
                    if len(parts) >= 2:
                        frame_num = int(parts[1])
                        frame_indices.append(frame_num)
                except (ValueError, IndexError):
                    logger.warning(f"Could not parse frame number from: {file_path}")
                    continue
            
            frame_indices.sort()
            logger.info(f"Found {len(frame_indices)} local frames")
            return frame_indices
            
        except Exception as e:
            logger.error(f"Failed to get available frames: {e}")
            return []
    
    def save_test_frame(self, image: Image.Image, frame_index: int) -> str:
        """
        Save an image as a test frame.
        
        Args:
            image: PIL Image to save
            frame_index: Index for the frame
            
        Returns:
            Path to saved frame
            
        Raises:
            ImageProcessingError: If saving fails
        """
        try:
            frame_path = self.test_frames_dir / f"frame_{frame_index}.jpg"
            image.save(frame_path, "JPEG", quality=95)
            logger.info(f"Saved test frame: {frame_path}")
            return str(frame_path)
            
        except Exception as e:
            logger.error(f"Failed to save test frame: {e}")
            raise ImageProcessingError(f"Failed to save test frame: {e}")
    
    def create_sample_frames(self, count: int = 5) -> List[str]:
        """
        Create sample test frames for development.
        
        Args:
            count: Number of sample frames to create
            
        Returns:
            List of paths to created frames
        """
        try:
            # Create a simple test image
            from PIL import ImageDraw
            
            frame_paths = []
            for i in range(count):
                # Create a simple test image with some circles
                img = Image.new("RGB", (1024, 1024), "white")
                draw = ImageDraw.Draw(img)
                
                # Draw some random circles to simulate shots
                import random
                for _ in range(random.randint(3, 8)):
                    x = random.randint(100, 924)
                    y = random.randint(100, 924)
                    radius = random.randint(5, 15)
                    draw.ellipse(
                        [x-radius, y-radius, x+radius, y+radius],
                        fill="black",
                        outline="red"
                    )
                
                # Save frame
                frame_path = self.save_test_frame(img, i)
                frame_paths.append(frame_path)
            
            logger.info(f"Created {count} sample test frames")
            return frame_paths
            
        except Exception as e:
            logger.error(f"Failed to create sample frames: {e}")
            raise ImageProcessingError(f"Failed to create sample frames: {e}")


# Global data source instance
data_source = DataSource()
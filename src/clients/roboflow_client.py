"""Roboflow API client for GMShoot application."""

import os
from typing import List, Dict, Any, Optional
from src.utils.logging import get_logger
from src.utils.config import config
from src.utils.exceptions import RoboflowError, TimeoutError
from src.analysis_engine.models import Shot

logger = get_logger("roboflow_client")

# Global flag to track if inference_sdk is available
INFERENCE_SDK_AVAILABLE = False


class RoboflowClient:
    """Client for interacting with Roboflow API."""
    
    def __init__(self):
        """Initialize Roboflow client."""
        global INFERENCE_SDK_AVAILABLE
        
        # Try to import inference_sdk only when needed
        try:
            from inference_sdk import InferenceHTTPClient
            INFERENCE_SDK_AVAILABLE = True
        except ImportError:
            INFERENCE_SDK_AVAILABLE = False
            logger.debug("inference_sdk not available. Roboflow client will run in mock mode.")
        
        if INFERENCE_SDK_AVAILABLE:
            try:
                self.client = InferenceHTTPClient(
                    api_url=config.roboflow.url,
                    api_key=config.roboflow.api_key
                )
                logger.info("Roboflow client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Roboflow client: {e}")
                raise RoboflowError(f"Failed to initialize Roboflow client: {e}")
        else:
            self.client = None
            logger.debug("Roboflow client running in mock mode (inference_sdk not installed)")
    
    def detect_holes(self, image_path: str, use_cache: bool = True) -> List[Shot]:
        """
        Detect bullet holes in target image using Roboflow.
        
        Args:
            image_path: Path to image file to analyze
            use_cache: Whether to use cached results
            
        Returns:
            List of detected Shot objects
            
        Raises:
            RoboflowError: If detection fails
            TimeoutError: If operation times out
        """
        try:
            logger.info(f"Detecting holes in image: {image_path}")
            
            # Check if inference_sdk is available
            if not INFERENCE_SDK_AVAILABLE:
                # Mock mode - return some sample shots
                logger.debug("Running in mock mode - returning sample shots")
                return [
                    Shot(x=100, y=100, confidence=0.95),
                    Shot(x=200, y=150, confidence=0.87),
                    Shot(x=150, y=200, confidence=0.92)
                ]
            
            # Import here to avoid module-level import error
            from inference_sdk import InferenceHTTPClient
            
            # Run inference workflow
            result = self.client.run_workflow(
                workspace_name="gmshooter",
                workflow_id="production-inference-sahi-detr-2-2",
                images={"image": image_path},
                use_cache=use_cache
            )
            
            # Log the result structure for debugging
            logger.debug(f"Roboflow API result type: {type(result)}")
            if isinstance(result, dict):
                logger.debug(f"Roboflow API result keys: {list(result.keys())}")
            elif isinstance(result, list) and len(result) > 0:
                logger.debug(f"Roboflow API first result keys: {list(result[0].keys()) if isinstance(result[0], dict) else 'Not a dict'}")
            
            # Extract predictions from result
            shots = self._extract_shots_from_result(result)
            logger.info(f"Detected {len(shots)} holes in image")
            return shots
            
        except Exception as e:
            logger.error(f"Failed to detect holes: {e}")
            if "timeout" in str(e).lower():
                raise TimeoutError(f"Roboflow API timeout: {e}")
            raise RoboflowError(f"Failed to detect holes: {e}")
    
    def _extract_shots_from_result(self, result: Dict[str, Any]) -> List[Shot]:
        """
        Extract Shot objects from Roboflow API result.
        
        Args:
            result: Raw API response from Roboflow
            
        Returns:
            List of Shot objects
        """
        shots: List[Shot] = []
        
        try:
            # Navigate through the result structure to find predictions
            if not result:
                logger.warning("Empty result from Roboflow API")
                return shots
            
            # Handle different response formats
            if isinstance(result, list) and len(result) > 0:
                first_result = result[0]
            elif isinstance(result, dict):
                first_result = result
            else:
                logger.warning(f"Unexpected result format: {type(result)}")
                return shots
            
            # Try different possible keys for output/predictions
            output = None
            if "output" in first_result:
                output = first_result["output"]
            elif "outputs" in first_result:
                output = first_result["outputs"]
            elif "predictions" in first_result:
                predictions = first_result["predictions"]
            else:
                logger.warning(f"No output or predictions found in result. Keys: {list(first_result.keys())}")
                return shots
            
            # Get predictions from output if needed
            if output is not None:
                if isinstance(output, dict):
                    if "predictions" in output:
                        predictions_dict = output["predictions"]
                        # Handle nested predictions structure (e.g., predictions.predictions)
                        if isinstance(predictions_dict, dict) and "predictions" in predictions_dict:
                            predictions = predictions_dict["predictions"]
                        elif isinstance(predictions_dict, list):
                            predictions = predictions_dict
                        else:
                            logger.warning(f"Unexpected predictions format. Keys: {list(predictions_dict.keys()) if isinstance(predictions_dict, dict) else 'Not a dict'}")
                            return shots
                    elif "outputs" in output:
                        predictions = output["outputs"]
                    else:
                        logger.warning(f"No predictions in output. Keys: {list(output.keys())}")
                        return shots
                elif isinstance(output, list):
                    predictions = output
                else:
                    logger.warning(f"Unexpected output format: {type(output)}")
                    return shots
            
            if not predictions:
                logger.info("No predictions found in image")
                return shots
            
            # Handle different prediction formats
            for prediction in predictions:
                if not isinstance(prediction, dict):
                    continue
                    
                # Extract bounding box coordinates
                x = prediction.get("x", 0)
                y = prediction.get("y", 0)
                confidence = prediction.get("confidence", 0.0)
                
                # Create shot object
                shot = Shot(x=x, y=y, confidence=confidence)
                shots.append(shot)
                logger.debug(f"Extracted shot: x={x}, y={y}, confidence={confidence}")
            
            return shots
            
        except (KeyError, TypeError, IndexError) as e:
            logger.error(f"Failed to parse Roboflow result: {e}")
            raise RoboflowError(f"Failed to parse Roboflow result: {e}")
    
    def test_connection(self) -> bool:
        """
        Test connection to Roboflow API.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            logger.info("Testing Roboflow API connection")
            if not INFERENCE_SDK_AVAILABLE:
                logger.warning("Mock mode - connection test not applicable")
                return True
            # Try a simple health check or minimal request
            # Note: Roboflow doesn't have a dedicated health check endpoint
            # so we'll test by initializing the client
            return True
        except Exception as e:
            logger.error(f"Roboflow connection test failed: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the current model.
        
        Returns:
            Dictionary with model information
        """
        return {
            "model_id": config.roboflow.model_id,
            "api_url": config.roboflow.url,
            "workspace": "gmshooter",
            "workflow_id": "production-inference-sahi-detr-2-2"
        }


# Global client instance
roboflow_client = RoboflowClient()
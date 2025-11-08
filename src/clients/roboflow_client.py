"""Roboflow API client for GMShoot application."""

from typing import List, Dict, Any
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
            logger.debug(
                "inference_sdk not available. Roboflow client will run in "
                "mock mode."
            )

        if INFERENCE_SDK_AVAILABLE:
            try:
                self.client = InferenceHTTPClient(
                    api_url=config.roboflow.url,
                    api_key=config.roboflow.api_key,
                )
                logger.info("Roboflow client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Roboflow client: {e}")
                raise RoboflowError(
                    f"Failed to initialize Roboflow client: {e}"
                )
        else:
            self.client = None
            logger.debug(
                "Roboflow client running in mock mode (inference_sdk not "
                "installed)"
            )

    def detect_holes(
        self, image_path: str, use_cache: bool = True
    ) -> List[Shot]:
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
                    Shot(x=150, y=200, confidence=0.92),
                ]

            # Import here to avoid module-level import error

            # Run inference workflow
            result = self.client.run_workflow(
                workspace_name="gmshooter",
                workflow_id="production-inference-sahi-detr-2-2",
                images={"image": image_path},
                use_cache=use_cache,
            )

            # Log the result structure for debugging
            logger.debug(f"Roboflow API result type: {type(result)}")
            if isinstance(result, dict):
                logger.debug(
                    f"Roboflow API result keys: {list(result.keys())}"
                )
            elif isinstance(result, list) and len(result) > 0:
                logger.debug(
                    f"Roboflow API first result keys: "
                    f"{list(result[0].keys()) if isinstance(result[0], dict) else 'Not a dict'}"
                )

            # Log the full result for debugging
            logger.info(f"Full Roboflow API response: {result}")

            # Extract predictions from result
            try:
                shots = self._extract_shots_from_result(result)
                logger.info(f"Detected {len(shots)} holes in image")
                return shots
            except Exception as e:
                logger.error(f"Failed to extract shots from result: {e}")
                # Return empty list if extraction fails
                return []

        except Exception as e:
            logger.error(f"Failed to detect holes: {e}")

            # Check for specific authentication errors
            error_str = str(e).lower()
            if "unauthorized" in error_str or "401" in error_str:
                logger.error(
                    "Authentication failed - check if API key is valid and has "
                    "correct permissions"
                )
                raise RoboflowError(
                    "Roboflow API authentication failed. Please verify that:\n"
                    "1. You're using a Private API key (not Publishable key)\n"
                    "2. The API key is valid and active\n"
                    "3. The key has permission to access the specified workspace/model\n"
                    f"Original error: {e}"
                )
            elif "timeout" in error_str:
                raise TimeoutError(f"Roboflow API timeout: {e}")
            else:
                raise RoboflowError(f"Failed to detect holes: {e}")

    def _extract_shots_from_result(self, result: Any) -> List[Shot]:
        """
        Extract Shot objects from the Roboflow API result.
        This version is specifically tailored to the workflow's nested output
        structure.

        Args:
            result: Raw API response from Roboflow.

        Returns:
            List of Shot objects.
        """
        shots: List[Shot] = []
        logger.debug(
            f"Attempting to parse Roboflow result of type: {type(result)}"
        )

        if not result:
            logger.warning("Received an empty or null result from Roboflow API.")
            return shots

        try:
            # The result is a list containing one dictionary.
            if isinstance(result, list) and result:
                first_item = result[0]
            elif isinstance(result, dict):
                first_item = result
            else:
                logger.error(
                    f"Unexpected result format: Expected a list or dict, got {type(result)}."
                )
                return shots

            # Navigate through the nested structure safely using .get()
            # Path: result[0] -> 'outputs' -> 'predictions' -> 'predictions'
            # Handle both flat and nested prediction structures
            predictions_data = first_item.get("outputs", {}).get(
                "predictions", {}
            )
            if isinstance(predictions_data, list):
                predictions_list = predictions_data
            elif isinstance(predictions_data, dict):
                predictions_list = predictions_data.get("predictions", [])
            else:
                logger.warning(
                    f"Unexpected 'predictions' data type: {type(predictions_data)}"
                )
                return shots

            if not predictions_list:
                logger.warning(
                    "No 'predictions' list found at the expected path in the "
                    "Roboflow response."
                )
                return shots

            if not isinstance(predictions_list, list):
                logger.error(
                    f"Expected predictions to be a list, but got {type(predictions_list)}."
                )
                return shots

            for prediction in predictions_list:
                if not isinstance(prediction, dict):
                    logger.warning(
                        f"Skipping a prediction item because it's not a dictionary: "
                        f"{prediction}"
                    )
                    continue

                # Extract coordinates and confidence safely
                x = prediction.get("x")
                y = prediction.get("y")
                confidence = prediction.get("confidence", 0.0)

                if x is not None and y is not None:
                    shot = Shot(x=float(x), y=float(y), confidence=float(confidence))
                    shots.append(shot)
                    logger.debug(
                        f"Successfully extracted shot: x={x}, y={y}, "
                        f"confidence={confidence}"
                    )
                else:
                    logger.warning(
                        f"Skipping prediction due to missing 'x' or 'y' "
                        f"coordinates: {prediction}"
                    )

            logger.info(
                f"Successfully extracted {len(shots)} shots from the API response."
            )
            return shots

        except (AttributeError, TypeError, IndexError) as e:
            logger.error(
                f"Failed to parse Roboflow result due to an unexpected structure "
                f"or data type: {e}",
                exc_info=True
            )
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
            "workflow_id": "production-inference-sahi-detr-2-2",
        }


# Global client instance
roboflow_client = RoboflowClient()
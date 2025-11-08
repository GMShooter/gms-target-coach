import os
from pathlib import Path

# IMPORTANT: This assumes your script is in the project root.
# Add the project's 'src' directory to the Python path to allow imports.
import sys
sys.path.append(str(Path(__file__).parent / "src"))

from clients.roboflow_client import RoboflowClient
from utils.logging import get_logger

# Initialize logger and client
logger = get_logger("roboflow_test")
roboflow_client = RoboflowClient()

def run_test():
    """
    Runs a simple test to detect holes in a local image.
    """
    logger.info("--- Starting Roboflow Client Test ---")
    
    # --- CONFIGURE YOUR TEST IMAGE HERE ---
    # Make sure this image exists and is accessible.
    image_to_test = "public/test_videos_frames/vid_1_frame_1.jpg"
    
    if not os.path.exists(image_to_test):
        logger.error(f"Test image not found at: {image_to_test}")
        logger.error("Please update the 'image_to_test' variable in test_roboflow.py")
        return

    try:
        logger.info(f"Detecting holes in image: {image_to_test}")
        # Call the main method of the client
        detected_shots = roboflow_client.detect_holes(image_path=image_to_test)

        if detected_shots:
            logger.info(f"SUCCESS: Detected {len(detected_shots)} shots.")
            for i, shot in enumerate(detected_shots):
                print(f"  Shot {i+1}: X={shot.x:.2f}, Y={shot.y:.2f}, Confidence={shot.confidence:.2f}")
        else:
            logger.warning("Test completed, but no shots were detected in the image.")
            
    except Exception as e:
        logger.error(f"TEST FAILED: An error occurred during hole detection: {e}", exc_info=True)
        
    logger.info("--- Roboflow Client Test Finished ---")


if __name__ == "__main__":
    run_test()
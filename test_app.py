"""Simple test script to verify GMShoot application works."""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from src.utils.config import config
from src.analysis_engine.models import Shot, Point
from src.ui_layer.components.image_display import image_display

def test_basic_functionality():
    """Test basic functionality of GMShoot components."""
    print("Testing GMShoot basic functionality...")
    
    # Test configuration
    if config.roboflow.api_key:
        print("Roboflow API Key is set.")
    else:
        print("Roboflow API Key is NOT set.")
    print(f"Roboflow Model ID: {config.roboflow.model_id}")
    print(f"Roboflow URL: {config.roboflow.url}")
    
    # Test data models
    shot = Shot(x=100, y=100, confidence=0.95)
    print(f"Created test shot: x={shot.x}, y={shot.y}, confidence={shot.confidence}")
    
    # Test point distance calculation
    point = Point(x=200, y=200)
    distance = shot.distance_to(point)
    print(f"Distance from shot to point: {distance}")
    
    # Test image display component
    print("Testing image display component...")
    try:
        # This would normally require a PIL Image, but we'll just test the import
        from PIL import Image
        image = Image.new("RGB", (100, 100), "white")
        
        # Test display methods
        image_display.display_shot_table([shot])
        image_display.display_shot_statistics([shot])
        
        print("Image display component test passed")
        return True
    except Exception as e:
        print(f"Image display component test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_basic_functionality()
    if success:
        print("All tests passed!")
        sys.exit(0)
    else:
        print("Some tests failed!")
        sys.exit(1)
import math
from typing import Dict, Any

class MetricCalculator:
    @staticmethod
    def calculate_score(x: float, y: float, calibration: Dict[str, Any]) -> float:
        # Simple distance-based scoring for now
        # Assuming calibration has 'center_x', 'center_y', and 'ring_width'
        cx = calibration.get("center_x", 0.5)
        cy = calibration.get("center_y", 0.5)
        ring_width = calibration.get("ring_width", 0.1) # normalized width of a ring (10 to 9, etc.)

        dx = x - cx
        dy = y - cy
        distance = math.sqrt(dx*dx + dy*dy)

        # Calculate score (10.9 is center)
        # Example: distance 0 = 10.9
        # distance ring_width = 10.0
        
        if ring_width <= 0: return 0.0

        score = 10.9 - (distance / ring_width)
        return max(0.0, min(10.9, score))

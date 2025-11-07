# Add src to path for imports
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from typing import List, Optional
import numpy as np
from scipy.spatial import ConvexHull, distance

from src.utils.logging import get_logger
from src.utils.exceptions import AnalysisError, InsufficientDataError
from src.analysis_engine.models import Shot, ShotGroup, Point

logger = get_logger("shot_analysis")


class ShotAnalyzer:
    """Analyzes shot groups and detects new shots."""
    
    def __init__(self, duplicate_threshold: float = 15.0):
        """
        Initialize shot analyzer.
        
        Args:
            duplicate_threshold: Distance threshold for considering shots as duplicates
        """
        self.duplicate_threshold = duplicate_threshold
        logger.debug(f"ShotAnalyzer initialized with duplicate threshold: {duplicate_threshold}")
    
    def find_new_shots(self, previous_shots: List[Shot], current_detections: List[Shot]) -> List[Shot]:
        """
        Find new shots by comparing current detections to previous shots.
        
        Args:
            previous_shots: List of previously detected shots
            current_detections: List of currently detected shots
            
        Returns:
            List of new shots not previously detected
            
        Raises:
            AnalysisError: If analysis fails
        """
        try:
            logger.info(f"Finding new shots: {len(previous_shots)} previous, {len(current_detections)} current")
            
            new_shots = []
            
            for detection in current_detections:
                is_duplicate = False
                
                # Check against all previous shots
                for prev_shot in previous_shots:
                    dist = detection.distance_to(prev_shot)
                    if dist <= self.duplicate_threshold:
                        logger.debug(f"Detection at ({detection.x}, {detection.y}) is duplicate of previous shot at ({prev_shot.x}, {prev_shot.y}) with distance {dist}")
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    new_shots.append(detection)
                    logger.debug(f"New shot detected at ({detection.x}, {detection.y}) with confidence {detection.confidence}")
            
            logger.info(f"Found {len(new_shots)} new shots")
            return new_shots
            
        except Exception as e:
            logger.error(f"Failed to find new shots: {e}")
            raise AnalysisError(f"Failed to find new shots: {e}")
    
    def merge_shot_groups(self, groups: List[ShotGroup]) -> ShotGroup:
        """
        Merge multiple shot groups into a single group.
        
        Args:
            groups: List of ShotGroup objects to merge
            
        Returns:
            Merged ShotGroup
            
        Raises:
            AnalysisError: If merge fails
        """
        try:
            logger.info(f"Merging {len(groups)} shot groups")
            
            if not groups:
                return ShotGroup()
            
            merged_group = ShotGroup()
            
            for group in groups:
                for shot in group.shots:
                    merged_group.add_shot(shot)
            
            logger.info(f"Merged group contains {len(merged_group.shots)} shots")
            return merged_group
            
        except Exception as e:
            logger.error(f"Failed to merge shot groups: {e}")
            raise AnalysisError(f"Failed to merge shot groups: {e}")
    
    def filter_shots_by_confidence(self, shots: List[Shot], min_confidence: float = 0.5) -> List[Shot]:
        """
        Filter shots by minimum confidence threshold.
        
        Args:
            shots: List of shots to filter
            min_confidence: Minimum confidence threshold
            
        Returns:
            Filtered list of shots
            
        Raises:
            AnalysisError: If filtering fails
        """
        try:
            logger.info(f"Filtering {len(shots)} shots by confidence >= {min_confidence}")
            
            filtered_shots = [
                shot for shot in shots 
                if shot.confidence >= min_confidence
            ]
            
            logger.info(f"Filtered to {len(filtered_shots)} shots above confidence threshold")
            return filtered_shots
            
        except Exception as e:
            logger.error(f"Failed to filter shots by confidence: {e}")
            raise AnalysisError(f"Failed to filter shots by confidence: {e}")
    
    def remove_outliers(self, shots: List[Shot], method: str = "std_dev", threshold: float = 2.0) -> List[Shot]:
        """
        Remove outlier shots from the group.
        
        Args:
            shots: List of shots to analyze
            method: Method for outlier detection ("std_dev", "iqr", "convex_hull")
            threshold: Threshold for outlier detection
            
        Returns:
            List of shots with outliers removed
            
        Raises:
            AnalysisError: If outlier removal fails
        """
        try:
            logger.info(f"Removing outliers using {method} method with threshold {threshold}")
            
            if len(shots) < 3:
                logger.warning("Insufficient shots for outlier removal")
                return shots
            
            if method == "std_dev":
                return self._remove_outliers_std_dev(shots, threshold)
            elif method == "iqr":
                return self._remove_outliers_iqr(shots, threshold)
            elif method == "convex_hull":
                return self._remove_outliers_convex_hull(shots, threshold)
            else:
                logger.warning(f"Unknown outlier removal method: {method}")
                return shots
                
        except Exception as e:
            logger.error(f"Failed to remove outliers: {e}")
            raise AnalysisError(f"Failed to remove outliers: {e}")
    
    def _remove_outliers_std_dev(self, shots: List[Shot], threshold: float) -> List[Shot]:
        """Remove outliers using standard deviation method."""
        try:
            coords = np.array([[shot.x, shot.y] for shot in shots])
            mean = np.mean(coords, axis=0)
            std_dev = np.std(coords, axis=0)
            
            filtered_shots = []
            for i, shot in enumerate(shots):
                dist = np.linalg.norm(coords[i] - mean)
                if dist <= threshold * std_dev.all():
                    filtered_shots.append(shot)
                else:
                    logger.debug(f"Removed outlier shot at ({shot.x}, {shot.y}) with distance {dist} from mean")
            
            logger.info(f"Removed {len(shots) - len(filtered_shots)} outliers using std dev method")
            return filtered_shots
            
        except Exception as e:
            logger.error(f"Failed to remove outliers using std dev: {e}")
            raise AnalysisError(f"Failed to remove outliers using std dev: {e}")
    
    def _remove_outliers_iqr(self, shots: List[Shot], threshold: float) -> List[Shot]:
        """Remove outliers using interquartile range method."""
        try:
            coords = np.array([[shot.x, shot.y] for shot in shots])
            
            # Calculate IQR for x and y coordinates
            q1_x, q3_x = np.percentile(coords[:, 0], [25, 75])
            iqr_x = q3_x - q1_x
            q1_y, q3_y = np.percentile(coords[:, 1], [25, 75])
            iqr_y = q3_y - q1_y
            
            filtered_shots = []
            for shot in shots:
                # Check if shot is within IQR bounds
                x_in_range = q1_x - threshold * iqr_x <= shot.x <= q3_x + threshold * iqr_x
                y_in_range = q1_y - threshold * iqr_y <= shot.y <= q3_y + threshold * iqr_y
                
                if x_in_range and y_in_range:
                    filtered_shots.append(shot)
                else:
                    logger.debug(f"Removed outlier shot at ({shot.x}, {shot.y}) outside IQR range")
            
            logger.info(f"Removed {len(shots) - len(filtered_shots)} outliers using IQR method")
            return filtered_shots
            
        except Exception as e:
            logger.error(f"Failed to remove outliers using IQR: {e}")
            raise AnalysisError(f"Failed to remove outliers using IQR: {e}")
    
    def _remove_outliers_convex_hull(self, shots: List[Shot], threshold: float) -> List[Shot]:
        """Remove outliers using convex hull method."""
        try:
            if len(shots) < 4:
                logger.warning("Insufficient shots for convex hull outlier removal")
                return shots
            
            coords = np.array([[shot.x, shot.y] for shot in shots])
            hull = ConvexHull(coords)
            
            # Calculate distances from hull
            filtered_shots = []
            for i, shot in enumerate(shots):
                # Check if point is inside hull or close to edge
                dist_to_hull = self._distance_to_convex_hull(coords[i], hull, coords)
                if dist_to_hull <= threshold:
                    filtered_shots.append(shot)
                else:
                    logger.debug(f"Removed outlier shot at ({shot.x}, {shot.y}) with distance {dist_to_hull} from convex hull")
            
            logger.info(f"Removed {len(shots) - len(filtered_shots)} outliers using convex hull method")
            return filtered_shots
            
        except Exception as e:
            logger.error(f"Failed to remove outliers using convex hull: {e}")
            raise AnalysisError(f"Failed to remove outliers using convex hull: {e}")
    
    def _distance_to_convex_hull(self, point: np.ndarray, hull: ConvexHull, coords: np.ndarray) -> float:
        """Calculate minimum distance from point to convex hull."""
        try:
            # For each edge of the convex hull, calculate distance to point
            min_dist = float('inf')
            
            for simplex in hull.simplices:
                # Get the vertices of the current edge
                for i in range(len(simplex)):
                    for j in range(i + 1, len(simplex) + 1):
                        if j >= len(simplex):
                            j = j % len(simplex)
                        
                        # Get the two vertices of the edge
                        v1 = coords[simplex[i]]
                        v2 = coords[simplex[j]]
                        
                        # Calculate distance from point to line segment
                        edge_dist = self._point_to_line_distance(point, v1, v2)
                        min_dist = min(min_dist, edge_dist)
            
            return min_dist
            
        except Exception as e:
            logger.error(f"Failed to calculate distance to convex hull: {e}")
            return float('inf')
    
    def _point_to_line_distance(self, point: np.ndarray, line_start: np.ndarray, line_end: np.ndarray) -> float:
        """Calculate distance from point to line segment."""
        try:
            # Vector from line_start to line_end
            line_vec = line_end - line_start
            # Vector from line_start to point
            point_vec = point - line_start
            
            # Calculate projection parameter
            line_len = np.linalg.norm(line_vec)
            if line_len == 0:
                return float(np.linalg.norm(point_vec))
            
            t = max(0, min(1, np.dot(point_vec, line_vec) / (line_len ** 2)))
            projection = line_start + t * line_vec
            
            return float(np.linalg.norm(point - projection))
            
        except Exception as e:
            logger.error(f"Failed to calculate point to line distance: {e}")
            return float('inf')


# Global shot analyzer instance
shot_analyzer = ShotAnalyzer()
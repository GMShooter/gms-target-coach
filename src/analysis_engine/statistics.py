"""Statistical calculations for GMShoot analysis engine."""

import numpy as np
from typing import List, Tuple, Optional, Dict, Any
from scipy import stats
from scipy.spatial import ConvexHull, distance

from src.utils.logging import get_logger
from src.utils.exceptions import AnalysisError, InsufficientDataError
from src.analysis_engine.models import Shot, Point

logger = get_logger("statistics")


class StatisticsCalculator:
    """Calculates statistical metrics for shot groups."""
    
    def __init__(self):
        """Initialize statistics calculator."""
        logger.debug("StatisticsCalculator initialized")
    
    def calculate_mean_point_of_impact(self, shots: List[Shot]) -> Point:
        """
        Calculate the Mean Point of Impact (MPI) for a group of shots.
        
        Args:
            shots: List of Shot objects
            
        Returns:
            Point representing the MPI
            
        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating MPI for {len(shots)} shots")
            
            if not shots:
                raise InsufficientDataError("No shots provided for MPI calculation")
            
            coords = np.array([[shot.x, shot.y] for shot in shots])
            mpi_x = np.mean(coords[:, 0])
            mpi_y = np.mean(coords[:, 1])
            
            mpi = Point(x=mpi_x, y=mpi_y)
            logger.info(f"Calculated MPI: ({mpi_x:.2f}, {mpi_y:.2f})")
            return mpi
            
        except Exception as e:
            logger.error(f"Failed to calculate MPI: {e}")
            raise AnalysisError(f"Failed to calculate MPI: {e}")
    
    def calculate_extreme_spread(self, shots: List[Shot]) -> float:
        """
        Calculate the extreme spread (maximum distance between any two shots).
        
        Args:
            shots: List of Shot objects
            
        Returns:
            Extreme spread in pixels
            
        Raises:
            InsufficientDataError: If less than 2 shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating extreme spread for {len(shots)} shots")
            
            if len(shots) < 2:
                raise InsufficientDataError("At least 2 shots required for extreme spread calculation")
            
            max_distance = 0.0
            for i, shot1 in enumerate(shots):
                for shot2 in shots[i+1:]:
                    dist = shot1.distance_to(shot2)
                    if dist > max_distance:
                        max_distance = dist
            
            logger.info(f"Calculated extreme spread: {max_distance:.2f} pixels")
            return max_distance
            
        except Exception as e:
            logger.error(f"Failed to calculate extreme spread: {e}")
            raise AnalysisError(f"Failed to calculate extreme spread: {e}")
    
    def calculate_mean_radius(self, shots: List[Shot], center: Optional[Point] = None) -> float:
        """
        Calculate the mean radius from center point to all shots.
        
        Args:
            shots: List of Shot objects
            center: Center point (defaults to MPI if not provided)
            
        Returns:
            Mean radius in pixels
            
        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating mean radius for {len(shots)} shots")
            
            if not shots:
                raise InsufficientDataError("No shots provided for mean radius calculation")
            
            if center is None:
                center = self.calculate_mean_point_of_impact(shots)
            
            distances = [shot.distance_to(Shot(x=center.x, y=center.y)) for shot in shots]
            mean_radius = float(np.mean(distances))
            
            logger.info(f"Calculated mean radius: {mean_radius:.2f} pixels")
            return mean_radius
            
        except Exception as e:
            logger.error(f"Failed to calculate mean radius: {e}")
            raise AnalysisError(f"Failed to calculate mean radius: {e}")
    
    def calculate_standard_deviations(self, shots: List[Shot]) -> Tuple[float, float]:
        """
        Calculate standard deviations for x and y coordinates.
        
        Args:
            shots: List of Shot objects
            
        Returns:
            Tuple of (std_dev_x, std_dev_y)
            
        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating standard deviations for {len(shots)} shots")
            
            if not shots:
                raise InsufficientDataError("No shots provided for standard deviation calculation")
            
            coords = np.array([[shot.x, shot.y] for shot in shots])
            std_dev_x = np.std(coords[:, 0])
            std_dev_y = np.std(coords[:, 1])
            
            logger.info(f"Calculated standard deviations: x={std_dev_x:.2f}, y={std_dev_y:.2f}")
            return (std_dev_x, std_dev_y)
            
        except Exception as e:
            logger.error(f"Failed to calculate standard deviations: {e}")
            raise AnalysisError(f"Failed to calculate standard deviations: {e}")
    
    def calculate_confidence_intervals(
        self, 
        shots: List[Shot], 
        confidence: float = 0.95
    ) -> Dict[str, Tuple[float, float]]:
        """
        Calculate confidence intervals for shot coordinates.
        
        Args:
            shots: List of Shot objects
            confidence: Confidence level (0.0 to 1.0)
            
        Returns:
            Dictionary with confidence intervals for x and y coordinates
            
        Raises:
            InsufficientDataError: If insufficient shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating {confidence*100:.0f}% confidence intervals for {len(shots)} shots")
            
            if len(shots) < 3:
                raise InsufficientDataError("At least 3 shots required for confidence interval calculation")
            
            coords = np.array([[shot.x, shot.y] for shot in shots])
            
            # Calculate confidence intervals using t-distribution
            alpha = 1.0 - confidence
            degrees_freedom = len(shots) - 1
            
            # Get t-critical value
            t_critical = stats.t.ppf(1.0 - alpha/2, degrees_freedom)
            
            # Calculate standard error
            std_error_x = stats.sem(coords[:, 0])
            std_error_y = stats.sem(coords[:, 1])
            
            # Calculate margin of error
            margin_x = t_critical * std_error_x
            margin_y = t_critical * std_error_y
            
            # Calculate intervals
            mean_x = np.mean(coords[:, 0])
            mean_y = np.mean(coords[:, 1])
            
            intervals = {
                'x': (mean_x - margin_x, mean_x + margin_x),
                'y': (mean_y - margin_y, mean_y + margin_y)
            }
            
            logger.info(f"Calculated confidence intervals: x={intervals['x']}, y={intervals['y']}")
            return intervals
            
        except Exception as e:
            logger.error(f"Failed to calculate confidence intervals: {e}")
            raise AnalysisError(f"Failed to calculate confidence intervals: {e}")
    
    def calculate_convex_hull_area(self, shots: List[Shot]) -> float:
        """
        Calculate the area of the convex hull formed by shots.
        
        Args:
            shots: List of Shot objects
            
        Returns:
            Area of convex hull in square pixels
            
        Raises:
            InsufficientDataError: If less than 3 shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating convex hull area for {len(shots)} shots")
            
            if len(shots) < 3:
                raise InsufficientDataError("At least 3 shots required for convex hull calculation")
            
            coords = np.array([[shot.x, shot.y] for shot in shots])
            hull = ConvexHull(coords)
            
            logger.info(f"Calculated convex hull area: {hull.area:.2f} square pixels")
            return hull.area
            
        except Exception as e:
            logger.error(f"Failed to calculate convex hull area: {e}")
            raise AnalysisError(f"Failed to calculate convex hull area: {e}")
    
    def calculate_shot_dispersion(self, shots: List[Shot]) -> Dict[str, float]:
        """
        Calculate various dispersion metrics for shot group.
        
        Args:
            shots: List of Shot objects
            
        Returns:
            Dictionary with dispersion metrics
            
        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating dispersion metrics for {len(shots)} shots")
            
            if not shots:
                raise InsufficientDataError("No shots provided for dispersion calculation")
            
            coords = np.array([[shot.x, shot.y] for shot in shots])
            
            # Calculate various dispersion metrics
            center_point = Point(x=np.mean(coords[:, 0]), y=np.mean(coords[:, 1]))
            center_shot = Shot(x=center_point.x, y=center_point.y)
            dispersion = {
                'mean_distance': float(np.mean([shot.distance_to(center_shot) for shot in shots])),
                'median_distance': float(np.median([shot.distance_to(center_shot) for shot in shots])),
                'max_distance': float(np.max([shot.distance_to(center_shot) for shot in shots])),
                'min_distance': float(np.min([shot.distance_to(center_shot) for shot in shots])),
                'range_distance': 0.0  # Will be calculated below
            }
            
            dispersion['range_distance'] = dispersion['max_distance'] - dispersion['min_distance']
            
            logger.info(f"Calculated dispersion metrics: {dispersion}")
            return dispersion
            
        except Exception as e:
            logger.error(f"Failed to calculate dispersion metrics: {e}")
            raise AnalysisError(f"Failed to calculate dispersion metrics: {e}")
    
    def calculate_group_statistics(self, shots: List[Shot]) -> Dict[str, Any]:
        """
        Calculate comprehensive statistics for a shot group.
        
        Args:
            shots: List of Shot objects
            
        Returns:
            Dictionary with all calculated statistics
            
        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating comprehensive statistics for {len(shots)} shots")
            
            if not shots:
                raise InsufficientDataError("No shots provided for statistics calculation")
            
            stats: Dict[str, Any] = {}
            
            # Basic statistics
            stats['total_shots'] = len(shots)
            stats['mpi'] = self.calculate_mean_point_of_impact(shots)
            stats['extreme_spread'] = self.calculate_extreme_spread(shots)
            stats['mean_radius'] = self.calculate_mean_radius(shots)
            
            # Standard deviations
            std_dev_x, std_dev_y = self.calculate_standard_deviations(shots)
            stats['std_dev_x'] = float(std_dev_x)
            stats['std_dev_y'] = float(std_dev_y)
            
            # Confidence intervals (if enough shots)
            if len(shots) >= 3:
                stats['confidence_intervals'] = self.calculate_confidence_intervals(shots)
            
            # Convex hull area (if enough shots)
            if len(shots) >= 3:
                stats['convex_hull_area'] = float(self.calculate_convex_hull_area(shots))
            
            # Dispersion metrics
            stats['dispersion'] = self.calculate_shot_dispersion(shots)
            
            # Shot quality metrics
            confidences = [shot.confidence for shot in shots if shot.confidence > 0]
            if confidences:
                stats['avg_confidence'] = float(np.mean(confidences))
                stats['min_confidence'] = float(np.min(confidences))
                stats['max_confidence'] = float(np.max(confidences))
            
            logger.info("Successfully calculated comprehensive statistics")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to calculate group statistics: {e}")
            raise AnalysisError(f"Failed to calculate group statistics: {e}")


# Global statistics calculator instance
statistics_calculator = StatisticsCalculator()
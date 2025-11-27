"""Statistical calculations for GMShoot analysis engine."""

import numpy as np
from typing import List, Tuple, Optional, Dict, Any
from scipy import stats
from scipy.spatial import ConvexHull, distance as scipy_distance

from src.utils.logging import get_logger
from src.utils.exceptions import AnalysisError, InsufficientDataError
from src.analysis_engine.models import Shot, Point

logger = get_logger("statistics")


class StatisticsCalculator:
    """Calculates statistical metrics for shot groups."""

    def __init__(self):
        """Initialize statistics calculator."""
        logger.debug("StatisticsCalculator initialized")

    def calculate_mean_point_of_impact(
        self, shots: List[Shot], coords: Optional[np.ndarray] = None
    ) -> Point:
        """
        Calculate the Mean Point of Impact (MPI) for a group of shots.

        Args:
            shots: List of Shot objects
            coords: Optional pre-calculated numpy array of coordinates

        Returns:
            Point representing the MPI

        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating MPI for {len(shots)} shots")

            if not shots:
                raise InsufficientDataError(
                    "No shots provided for MPI calculation"
                )

            if coords is None:
                coords = np.array([[shot.x, shot.y] for shot in shots])

            mpi_x, mpi_y = np.mean(coords, axis=0)

            mpi = Point(x=float(mpi_x), y=float(mpi_y))
            logger.info(f"Calculated MPI: ({mpi_x:.2f}, {mpi_y:.2f})")
            return mpi

        except Exception as e:
            logger.error(f"Failed to calculate MPI: {e}")
            raise AnalysisError(f"Failed to calculate MPI: {e}")

    def calculate_extreme_spread(
        self, shots: List[Shot], coords: Optional[np.ndarray] = None
    ) -> float:
        """
        Calculate the extreme spread (maximum distance between any two shots).

        Args:
            shots: List of Shot objects
            coords: Optional pre-calculated numpy array of coordinates

        Returns:
            Extreme spread in pixels

        Raises:
            InsufficientDataError: If less than 2 shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating extreme spread for {len(shots)} shots")

            if len(shots) < 2:
                raise InsufficientDataError(
                    "At least 2 shots required for extreme spread calculation"
                )

            if coords is None:
                coords = np.array([[shot.x, shot.y] for shot in shots])

            max_distance = np.max(scipy_distance.pdist(coords))

            logger.info(
                f"Calculated extreme spread: {max_distance:.2f} pixels"
            )
            return float(max_distance)

        except Exception as e:
            logger.error(f"Failed to calculate extreme spread: {e}")
            raise AnalysisError(f"Failed to calculate extreme spread: {e}")

    def calculate_mean_radius(
        self,
        shots: List[Shot],
        center: Optional[Point] = None,
        coords: Optional[np.ndarray] = None,
    ) -> float:
        """
        Calculate the mean radius from center point to all shots.

        Args:
            shots: List of Shot objects
            center: Center point (defaults to MPI if not provided)
            coords: Optional pre-calculated numpy array of coordinates

        Returns:
            Mean radius in pixels

        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating mean radius for {len(shots)} shots")

            if not shots:
                raise InsufficientDataError(
                    "No shots provided for mean radius calculation"
                )

            if coords is None:
                coords = np.array([[shot.x, shot.y] for shot in shots])

            if center is None:
                center = self.calculate_mean_point_of_impact(
                    shots, coords=coords
                )

            center_coord = np.array([center.x, center.y])
            distances = np.linalg.norm(coords - center_coord, axis=1)
            mean_radius = float(np.mean(distances))

            logger.info(f"Calculated mean radius: {mean_radius:.2f} pixels")
            return mean_radius

        except Exception as e:
            logger.error(f"Failed to calculate mean radius: {e}")
            raise AnalysisError(f"Failed to calculate mean radius: {e}")

    def calculate_standard_deviations(
        self, shots: List[Shot], coords: Optional[np.ndarray] = None
    ) -> Tuple[float, float]:
        """
        Calculate standard deviations for x and y coordinates.

        Args:
            shots: List of Shot objects
            coords: Optional pre-calculated numpy array of coordinates

        Returns:
            Tuple of (std_dev_x, std_dev_y)

        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(
                f"Calculating standard deviations for {len(shots)} shots"
            )

            if not shots:
                raise InsufficientDataError(
                    "No shots provided for standard deviation calculation"
                )

            if coords is None:
                coords = np.array([[shot.x, shot.y] for shot in shots])

            std_dev_x, std_dev_y = np.std(coords, axis=0)

            logger.info(
                f"Calculated standard deviations: x={std_dev_x:.2f}, "
                f"y={std_dev_y:.2f}"
            )
            return (float(std_dev_x), float(std_dev_y))

        except Exception as e:
            logger.error(f"Failed to calculate standard deviations: {e}")
            raise AnalysisError(
                f"Failed to calculate standard deviations: {e}"
            )

    def calculate_confidence_intervals(
        self,
        shots: List[Shot],
        confidence: float = 0.95,
        coords: Optional[np.ndarray] = None,
    ) -> Dict[str, Tuple[float, float]]:
        """
        Calculate confidence intervals for shot coordinates.

        Args:
            shots: List of Shot objects
            confidence: Confidence level (0.0 to 1.0)
            coords: Optional pre-calculated numpy array of coordinates

        Returns:
            Dictionary with confidence intervals for x and y coordinates

        Raises:
            InsufficientDataError: If insufficient shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(
                f"Calculating {confidence * 100:.0f}% confidence intervals for "
                f"{len(shots)} shots"
            )

            if len(shots) < 3:
                raise InsufficientDataError(
                    "At least 3 shots required for confidence interval "
                    "calculation"
                )

            if coords is None:
                coords = np.array([[shot.x, shot.y] for shot in shots])

            # Calculate confidence intervals using t-distribution
            alpha = 1.0 - confidence
            degrees_freedom = len(shots) - 1

            # Get t-critical value
            t_critical = stats.t.ppf(1.0 - alpha / 2, degrees_freedom)

            # Calculate standard error
            std_error = stats.sem(coords, axis=0)

            # Calculate margin of error
            margin = t_critical * std_error

            # Calculate intervals
            mean = np.mean(coords, axis=0)

            intervals = {
                "x": (mean[0] - margin[0], mean[0] + margin[0]),
                "y": (mean[1] - margin[1], mean[1] + margin[1]),
            }

            logger.info(
                f"Calculated confidence intervals: x={intervals['x']}, "
                f"y={intervals['y']}"
            )
            return intervals

        except Exception as e:
            logger.error(f"Failed to calculate confidence intervals: {e}")
            raise AnalysisError(
                f"Failed to calculate confidence intervals: {e}"
            )

    def calculate_convex_hull_area(
        self, shots: List[Shot], coords: Optional[np.ndarray] = None
    ) -> float:
        """
        Calculate the area of the convex hull formed by shots.

        Args:
            shots: List of Shot objects
            coords: Optional pre-calculated numpy array of coordinates

        Returns:
            Area of convex hull in square pixels

        Raises:
            InsufficientDataError: If less than 3 shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating convex hull area for {len(shots)} shots")

            if len(shots) < 3:
                raise InsufficientDataError(
                    "At least 3 shots required for convex hull calculation"
                )

            if coords is None:
                coords = np.array([[shot.x, shot.y] for shot in shots])
            hull = ConvexHull(coords)

            logger.info(
                f"Calculated convex hull area: {hull.area:.2f} square pixels"
            )
            return hull.area

        except Exception as e:
            logger.error(f"Failed to calculate convex hull area: {e}")
            raise AnalysisError(f"Failed to calculate convex hull area: {e}")

    def calculate_shot_dispersion(
        self, shots: List[Shot], coords: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Calculate various dispersion metrics for shot group.

        Args:
            shots: List of Shot objects
            coords: Optional pre-calculated numpy array of coordinates

        Returns:
            Dictionary with dispersion metrics

        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(
                f"Calculating dispersion metrics for {len(shots)} shots"
            )

            if not shots:
                raise InsufficientDataError(
                    "No shots provided for dispersion calculation"
                )

            if coords is None:
                coords = np.array([[shot.x, shot.y] for shot in shots])

            # Calculate various dispersion metrics
            center_coord = np.mean(coords, axis=0)
            distances = np.linalg.norm(coords - center_coord, axis=1)

            dispersion = {
                "mean_distance": float(np.mean(distances)),
                "median_distance": float(np.median(distances)),
                "max_distance": float(np.max(distances)),
                "min_distance": float(np.min(distances)),
                "range_distance": 0.0,  # Will be calculated below
            }

            dispersion["range_distance"] = (
                dispersion["max_distance"] - dispersion["min_distance"]
            )

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
            logger.info(
                f"Calculating comprehensive statistics for {len(shots)} shots"
            )

            if not shots:
                raise InsufficientDataError(
                    "No shots provided for statistics calculation"
                )

            coords = np.array([[shot.x, shot.y] for shot in shots])
            stats: Dict[str, Any] = {}

            # Basic statistics
            stats["total_shots"] = len(shots)
            stats["mpi"] = self.calculate_mean_point_of_impact(
                shots, coords=coords
            )
            stats["extreme_spread"] = self.calculate_extreme_spread(
                shots, coords=coords
            )
            stats["mean_radius"] = self.calculate_mean_radius(
                shots, coords=coords
            )

            # Standard deviations
            std_dev_x, std_dev_y = self.calculate_standard_deviations(
                shots, coords=coords
            )
            stats["std_dev_x"] = float(std_dev_x)
            stats["std_dev_y"] = float(std_dev_y)

            # Confidence intervals (if enough shots)
            if len(shots) >= 3:
                stats[
                    "confidence_intervals"
                ] = self.calculate_confidence_intervals(shots, coords=coords)

            # Convex hull area (if enough shots)
            if len(shots) >= 3:
                stats["convex_hull_area"] = float(
                    self.calculate_convex_hull_area(shots, coords=coords)
                )

            # Dispersion metrics
            stats["dispersion"] = self.calculate_shot_dispersion(
                shots, coords=coords
            )

            # Shot quality metrics
            confidences = [
                shot.confidence for shot in shots if shot.confidence > 0
            ]
            if confidences:
                stats["avg_confidence"] = float(np.mean(confidences))
                stats["min_confidence"] = float(np.min(confidences))
                stats["max_confidence"] = float(np.max(confidences))

            logger.info("Successfully calculated comprehensive statistics")
            return stats

        except Exception as e:
            logger.error(f"Failed to calculate group statistics: {e}")
            raise AnalysisError(f"Failed to calculate group statistics: {e}")


# Global statistics calculator instance
statistics_calculator = StatisticsCalculator()

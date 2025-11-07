"""SOTA metrics calculations for GMShoot analysis engine."""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from scipy.spatial import ConvexHull, distance
from scipy import stats

from src.utils.logging import get_logger
from src.utils.exceptions import AnalysisError, InsufficientDataError
from src.analysis_engine.models import Shot, Point, SOTAMetrics, ShotGroup
from src.analysis_engine.statistics import statistics_calculator

logger = get_logger("metrics")


class SOTAMetricsCalculator:
    """Calculates State-of-the-Art metrics for shot analysis."""
    
    def __init__(self):
        """Initialize SOTA metrics calculator."""
        logger.debug("SOTAMetricsCalculator initialized")
    
    def calculate_group_characteristics(self, shots: List[Shot]) -> Dict[str, Any]:
        """
        Calculate comprehensive group characteristics metrics.
        
        Args:
            shots: List of Shot objects
            
        Returns:
            Dictionary with group characteristics
            
        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating group characteristics for {len(shots)} shots")
            
            if not shots:
                raise InsufficientDataError("No shots provided for group characteristics calculation")
            
            # Use statistics calculator for basic metrics
            mpi = statistics_calculator.calculate_mean_point_of_impact(shots)
            extreme_spread = statistics_calculator.calculate_extreme_spread(shots)
            mean_radius = statistics_calculator.calculate_mean_radius(shots, mpi)
            std_dev_x, std_dev_y = statistics_calculator.calculate_standard_deviations(shots)
            
            characteristics = {
                'total_shots': len(shots),
                'mpi': mpi,
                'extreme_spread': extreme_spread,
                'mean_radius': mean_radius,
                'std_dev_x': std_dev_x,
                'std_dev_y': std_dev_y,
                'combined_std_dev': np.sqrt(std_dev_x**2 + std_dev_y**2)
            }
            
            # Calculate circular error probable (CEP)
            if len(shots) >= 3:
                characteristics['cep_50'] = self._calculate_circular_error_probable(shots, 0.5)
                characteristics['cep_90'] = self._calculate_circular_error_probable(shots, 0.9)
                characteristics['cep_95'] = self._calculate_circular_error_probable(shots, 0.95)
            
            # Calculate figure of merit (FOM)
            characteristics['figure_of_merit'] = self._calculate_figure_of_merit(shots)
            
            logger.info(f"Calculated group characteristics: {len(characteristics)} metrics")
            return characteristics
            
        except Exception as e:
            logger.error(f"Failed to calculate group characteristics: {e}")
            raise AnalysisError(f"Failed to calculate group characteristics: {e}")
    
    def calculate_sequential_metrics(self, shots: List[Shot]) -> Dict[str, Any]:
        """
        Calculate sequential analysis metrics for shot progression.
        
        Args:
            shots: List of Shot objects (assumed to be in chronological order)
            
        Returns:
            Dictionary with sequential metrics
            
        Raises:
            InsufficientDataError: If less than 2 shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating sequential metrics for {len(shots)} shots")
            
            if len(shots) < 2:
                raise InsufficientDataError("At least 2 shots required for sequential analysis")
            
            # Sort shots by timestamp if available, otherwise by index
            if all(shot.timestamp for shot in shots):
                sorted_shots = sorted(shots, key=lambda s: s.timestamp or 0)
            elif all(shot.frame_index is not None for shot in shots):
                sorted_shots = sorted(shots, key=lambda s: s.frame_index or 0)
            else:
                sorted_shots = shots  # Use original order
            
            # Calculate first shot displacement
            mpi = statistics_calculator.calculate_mean_point_of_impact(sorted_shots[1:])
            mpi_shot = Shot(x=mpi.x, y=mpi.y)
            first_shot_displacement = sorted_shots[0].distance_to(mpi_shot)
            
            # Calculate shot-to-shot displacements
            shot_displacements = []
            for i in range(1, len(sorted_shots)):
                prev_mpi = statistics_calculator.calculate_mean_point_of_impact(sorted_shots[:i])
                prev_mpi_shot = Shot(x=prev_mpi.x, y=prev_mpi.y)
                curr_shot = sorted_shots[i]
                displacement = curr_shot.distance_to(prev_mpi_shot)
                shot_displacements.append(displacement)
            
            sequential_metrics = {
                'first_shot_displacement': first_shot_displacement,
                'shot_to_shot_displacement': np.mean(shot_displacements) if shot_displacements else 0.0,
                'max_shot_displacement': np.max(shot_displacements) if shot_displacements else 0.0,
                'min_shot_displacement': np.min(shot_displacements) if shot_displacements else 0.0,
                'shot_displacement_std': np.std(shot_displacements) if shot_displacements else 0.0,
                'trend_stability': self._calculate_trend_stability(sorted_shots)
            }
            
            logger.info(f"Calculated sequential metrics: {len(sequential_metrics)} metrics")
            return sequential_metrics
            
        except Exception as e:
            logger.error(f"Failed to calculate sequential metrics: {e}")
            raise AnalysisError(f"Failed to calculate sequential metrics: {e}")
    
    def detect_flyers(self, shots: List[Shot], method: str = "std_dev", threshold: float = 2.0) -> Tuple[List[Shot], List[Shot]]:
        """
        Detect outlier shots (flyers) in a shot group.
        
        Args:
            shots: List of Shot objects
            method: Detection method ("std_dev", "iqr", "convex_hull", "distance")
            threshold: Threshold for outlier detection
            
        Returns:
            Tuple of (good_shots, flyer_shots)
            
        Raises:
            InsufficientDataError: If insufficient shots provided
            AnalysisError: If detection fails
        """
        try:
            logger.info(f"Detecting flyers using {method} method with threshold {threshold}")
            
            if len(shots) < 3:
                logger.warning("Insufficient shots for reliable flyer detection")
                return shots, []
            
            if method == "std_dev":
                return self._detect_flyers_std_dev(shots, threshold)
            elif method == "iqr":
                return self._detect_flyers_iqr(shots, threshold)
            elif method == "convex_hull":
                return self._detect_flyers_convex_hull(shots, threshold)
            elif method == "distance":
                return self._detect_flyers_distance(shots, threshold)
            else:
                logger.warning(f"Unknown flyer detection method: {method}")
                return shots, []
                
        except Exception as e:
            logger.error(f"Failed to detect flyers: {e}")
            raise AnalysisError(f"Failed to detect flyers: {e}")
    
    def calculate_scoring_metrics(self, shots: List[Shot], target_center: Point, ring_radii: List[float]) -> Dict[str, Any]:
        """
        Calculate scoring metrics based on target rings.
        
        Args:
            shots: List of Shot objects
            target_center: Center point of target
            ring_radii: List of ring radii from center (smallest to largest)
            
        Returns:
            Dictionary with scoring metrics
            
        Raises:
            InsufficientDataError: If no shots or ring radii provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating scoring metrics for {len(shots)} shots with {len(ring_radii)} rings")
            
            if not shots or not ring_radii:
                raise InsufficientDataError("Shots and ring radii required for scoring calculation")
            
            # Calculate score for each shot (higher ring number = lower score)
            shot_scores = []
            target_center_shot = Shot(x=target_center.x, y=target_center.y)
            for shot in shots:
                distance = shot.distance_to(target_center_shot)
                score = self._calculate_shot_score(distance, ring_radii)
                shot_scores.append(score)
            
            # Calculate scoring metrics
            scoring_metrics = {
                'total_score': sum(shot_scores),
                'average_score': np.mean(shot_scores),
                'max_score': max(shot_scores),
                'min_score': min(shot_scores),
                'score_std': np.std(shot_scores),
                'shot_scores': shot_scores
            }
            
            # Calculate hit distribution
            hit_distribution = [0] * (len(ring_radii) + 1)  # +1 for misses
            for score in shot_scores:
                if score <= len(ring_radii):
                    hit_distribution[score - 1] += 1
                else:
                    hit_distribution[-1] += 1  # Misses
            
            scoring_metrics['hit_distribution'] = hit_distribution
            
            logger.info(f"Calculated scoring metrics: total_score={scoring_metrics['total_score']}")
            return scoring_metrics
            
        except Exception as e:
            logger.error(f"Failed to calculate scoring metrics: {e}")
            raise AnalysisError(f"Failed to calculate scoring metrics: {e}")
    
    def calculate_comprehensive_sota_metrics(self, shot_group: ShotGroup) -> SOTAMetrics:
        """
        Calculate comprehensive SOTA metrics for a shot group.
        
        Args:
            shot_group: ShotGroup object containing shots and target information
            
        Returns:
            SOTAMetrics object with all calculated metrics
            
        Raises:
            InsufficientDataError: If no shots provided
            AnalysisError: If calculation fails
        """
        try:
            logger.info(f"Calculating comprehensive SOTA metrics for shot group with {len(shot_group.shots)} shots")
            
            if not shot_group.shots:
                raise InsufficientDataError("No shots provided for SOTA metrics calculation")
            
            # Initialize SOTA metrics
            sota_metrics = SOTAMetrics()
            sota_metrics.total_shots = len(shot_group.shots)
            
            # Calculate group characteristics
            group_chars = self.calculate_group_characteristics(shot_group.shots)
            sota_metrics.mpi = group_chars['mpi']
            sota_metrics.extreme_spread = group_chars['extreme_spread']
            sota_metrics.mean_radius = group_chars['mean_radius']
            sota_metrics.std_dev_x = group_chars['std_dev_x']
            sota_metrics.std_dev_y = group_chars['std_dev_y']
            
            # Calculate convex hull area
            if len(shot_group.shots) >= 3:
                sota_metrics.convex_hull_area = statistics_calculator.calculate_convex_hull_area(shot_group.shots)
            
            # Calculate sequential metrics
            if len(shot_group.shots) >= 2:
                sequential = self.calculate_sequential_metrics(shot_group.shots)
                sota_metrics.first_shot_displacement = sequential['first_shot_displacement']
                sota_metrics.shot_to_shot_displacement = sequential['shot_to_shot_displacement']
            
            # Detect flyers
            good_shots, flyer_shots = self.detect_flyers(shot_group.shots)
            sota_metrics.flyer_count = len(flyer_shots)
            
            # Calculate scoring metrics if target information is available
            if shot_group.target_center and shot_group.target_ring_radii:
                scoring = self.calculate_scoring_metrics(
                    shot_group.shots, 
                    shot_group.target_center, 
                    shot_group.target_ring_radii
                )
                sota_metrics.total_score = scoring['total_score']
                sota_metrics.average_score = scoring['average_score']
            
            logger.info("Successfully calculated comprehensive SOTA metrics")
            return sota_metrics
            
        except Exception as e:
            logger.error(f"Failed to calculate comprehensive SOTA metrics: {e}")
            raise AnalysisError(f"Failed to calculate comprehensive SOTA metrics: {e}")
    
    def _calculate_circular_error_probable(self, shots: List[Shot], probability: float) -> float:
        """Calculate Circular Error Probable (CEP) for given probability."""
        try:
            coords = np.array([[shot.x, shot.y] for shot in shots])
            center = np.mean(coords, axis=0)
            distances = [np.linalg.norm(coord - center) for coord in coords]
            
            # Calculate radius that contains the given percentage of shots
            return np.percentile(distances, probability * 100)
        except Exception as e:
            logger.error(f"Failed to calculate CEP: {e}")
            return 0.0
    
    def _calculate_figure_of_merit(self, shots: List[Shot]) -> float:
        """Calculate Figure of Merit (FOM) for shot group."""
        try:
            if len(shots) < 3:
                return 0.0
            
            extreme_spread = statistics_calculator.calculate_extreme_spread(shots)
            mean_radius = statistics_calculator.calculate_mean_radius(shots)
            
            # FOM = (Extreme Spread / Mean Radius) * 100
            # Lower FOM indicates tighter group
            fom = (extreme_spread / mean_radius) * 100 if mean_radius > 0 else 0.0
            return fom
        except Exception as e:
            logger.error(f"Failed to calculate FOM: {e}")
            return 0.0
    
    def _calculate_trend_stability(self, shots: List[Shot]) -> float:
        """Calculate trend stability metric for shot progression."""
        try:
            if len(shots) < 3:
                return 1.0  # Perfect stability for insufficient data
            
            coords = np.array([[shot.x, shot.y] for shot in shots])
            
            # Calculate linear trend
            x = np.arange(len(coords))
            y_x = coords[:, 0]
            y_y = coords[:, 1]
            
            # Calculate R-squared for both axes
            slope_x, intercept_x, r_value_x, _, _ = stats.linregress(x, y_x)
            slope_y, intercept_y, r_value_y, _, _ = stats.linregress(x, y_y)
            
            # Average R-squared as stability metric (1.0 = perfect stability)
            stability = (r_value_x**2 + r_value_y**2) / 2
            return max(0.0, stability)  # Ensure non-negative
        except Exception as e:
            logger.error(f"Failed to calculate trend stability: {e}")
            return 0.0
    
    def _detect_flyers_std_dev(self, shots: List[Shot], threshold: float) -> Tuple[List[Shot], List[Shot]]:
        """Detect flyers using standard deviation method."""
        try:
            coords = np.array([[shot.x, shot.y] for shot in shots])
            center = np.mean(coords, axis=0)
            distances = [np.linalg.norm(coord - center) for coord in coords]
            mean_dist = np.mean(distances)
            std_dist = np.std(distances)
            
            good_shots = []
            flyer_shots = []
            
            for i, shot in enumerate(shots):
                if distances[i] <= mean_dist + threshold * std_dist:
                    good_shots.append(shot)
                else:
                    flyer_shots.append(shot)
            
            logger.info(f"Std dev method: {len(flyer_shots)} flyers detected")
            return good_shots, flyer_shots
        except Exception as e:
            logger.error(f"Failed to detect flyers with std dev: {e}")
            return shots, []
    
    def _detect_flyers_iqr(self, shots: List[Shot], threshold: float) -> Tuple[List[Shot], List[Shot]]:
        """Detect flyers using interquartile range method."""
        try:
            coords = np.array([[shot.x, shot.y] for shot in shots])
            center = np.mean(coords, axis=0)
            distances = [np.linalg.norm(coord - center) for coord in coords]
            
            q1, q3 = np.percentile(distances, [25, 75])
            iqr = q3 - q1
            
            good_shots = []
            flyer_shots = []
            
            for i, shot in enumerate(shots):
                if q1 - threshold * iqr <= distances[i] <= q3 + threshold * iqr:
                    good_shots.append(shot)
                else:
                    flyer_shots.append(shot)
            
            logger.info(f"IQR method: {len(flyer_shots)} flyers detected")
            return good_shots, flyer_shots
        except Exception as e:
            logger.error(f"Failed to detect flyers with IQR: {e}")
            return shots, []
    
    def _detect_flyers_convex_hull(self, shots: List[Shot], threshold: float) -> Tuple[List[Shot], List[Shot]]:
        """Detect flyers using convex hull method."""
        try:
            if len(shots) < 4:
                return shots, []
            
            coords = np.array([[shot.x, shot.y] for shot in shots])
            hull = ConvexHull(coords)
            
            good_shots = []
            flyer_shots = []
            
            for i, shot in enumerate(shots):
                # Check if point is inside hull or close to edge
                dist_to_hull = self._distance_to_convex_hull(coords[i], hull, coords)
                if dist_to_hull <= threshold:
                    good_shots.append(shot)
                else:
                    flyer_shots.append(shot)
            
            logger.info(f"Convex hull method: {len(flyer_shots)} flyers detected")
            return good_shots, flyer_shots
        except Exception as e:
            logger.error(f"Failed to detect flyers with convex hull: {e}")
            return shots, []
    
    def _detect_flyers_distance(self, shots: List[Shot], threshold: float) -> Tuple[List[Shot], List[Shot]]:
        """Detect flyers using distance from mean method."""
        try:
            coords = np.array([[shot.x, shot.y] for shot in shots])
            center = np.mean(coords, axis=0)
            mean_distance = np.mean([np.linalg.norm(coord - center) for coord in coords])
            
            good_shots = []
            flyer_shots = []
            
            center_shot = Shot(x=center[0], y=center[1])
            for shot in shots:
                dist = shot.distance_to(center_shot)
                if dist <= mean_distance * threshold:
                    good_shots.append(shot)
                else:
                    flyer_shots.append(shot)
            
            logger.info(f"Distance method: {len(flyer_shots)} flyers detected")
            return good_shots, flyer_shots
        except Exception as e:
            logger.error(f"Failed to detect flyers with distance: {e}")
            return shots, []
    
    def _distance_to_convex_hull(self, point: np.ndarray, hull: ConvexHull, coords: np.ndarray) -> float:
        """Calculate minimum distance from point to convex hull."""
        try:
            min_dist = float('inf')
            
            for simplex in hull.simplices:
                for i in range(len(simplex)):
                    for j in range(i + 1, len(simplex) + 1):
                        if j >= len(simplex):
                            j = j % len(simplex)
                        
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
            line_vec = line_end - line_start
            point_vec = point - line_start
            line_len = np.linalg.norm(line_vec)
            
            if line_len == 0:
                return float(np.linalg.norm(point_vec))
            
            t = max(0, min(1, np.dot(point_vec, line_vec) / (line_len ** 2)))
            projection = line_start + t * line_vec
            
            return float(np.linalg.norm(point - projection))
        except Exception as e:
            logger.error(f"Failed to calculate point to line distance: {e}")
            return float('inf')
    
    def _calculate_shot_score(self, distance: float, ring_radii: List[float]) -> int:
        """Calculate score for a single shot based on distance and ring radii."""
        try:
            for i, radius in enumerate(ring_radii):
                if distance <= radius:
                    return len(ring_radii) - i  # Higher score for inner rings
            return len(ring_radii) + 1  # Miss (lowest score)
        except Exception as e:
            logger.error(f"Failed to calculate shot score: {e}")
            return len(ring_radii) + 1  # Default to miss


# Global SOTA metrics calculator instance
sota_metrics_calculator = SOTAMetricsCalculator()
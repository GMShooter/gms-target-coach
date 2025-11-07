"""Unit tests for SOTA metrics calculations."""

import pytest
import numpy as np
from unittest.mock import patch, MagicMock

from src.analysis_engine.metrics import SOTAMetricsCalculator
from src.analysis_engine.models import Shot, Point, ShotGroup, SOTAMetrics
from src.utils.exceptions import AnalysisError, InsufficientDataError
from tests.fixtures.sample_shots import get_sample_shots_5, get_sample_shots_10, get_wide_shot_group, get_flier_shot_group


class TestSOTAMetricsCalculator:
    """Test cases for SOTAMetricsCalculator class."""
    
    def setup_method(self):
        """Set up test method."""
        self.calculator = SOTAMetricsCalculator()
    
    def test_calculate_group_characteristics_valid_shots(self):
        """Test group characteristics calculation with valid shots."""
        shots = get_sample_shots_5()
        characteristics = self.calculator.calculate_group_characteristics(shots)
        
        # Check basic characteristics
        assert characteristics['total_shots'] == len(shots)
        assert isinstance(characteristics['mpi'], Point)
        assert isinstance(characteristics['extreme_spread'], float)
        assert isinstance(characteristics['mean_radius'], float)
        assert isinstance(characteristics['std_dev_x'], float)
        assert isinstance(characteristics['std_dev_y'], float)
        assert isinstance(characteristics['combined_std_dev'], float)
        
        # Check CEP calculations (should be present with 5+ shots)
        if len(shots) >= 5:
            assert 'cep_50' in characteristics
            assert 'cep_90' in characteristics
            assert 'cep_95' in characteristics
            assert all(isinstance(characteristics[f'cep_{p}'], float) for p in [50, 90, 95])
        
        # Check figure of merit
        assert 'figure_of_merit' in characteristics
        assert isinstance(characteristics['figure_of_merit'], float)
    
    def test_calculate_group_characteristics_empty_shots(self):
        """Test group characteristics calculation with empty shots list."""
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_group_characteristics([])
    
    def test_calculate_group_characteristics_insufficient_shots(self):
        """Test group characteristics calculation with insufficient shots."""
        # Should work with 2 shots for some metrics
        shots = get_sample_shots_5()[:2]
        characteristics = self.calculator.calculate_group_characteristics(shots)
        
        # Should have basic metrics
        assert characteristics['total_shots'] == 2
        assert isinstance(characteristics['mpi'], Point)
        
        # Should not have CEP with less than 3 shots
        assert 'cep_50' not in characteristics
        assert 'cep_90' not in characteristics
        assert 'cep_95' not in characteristics
    
    def test_calculate_sequential_metrics_valid_shots(self):
        """Test sequential metrics calculation with valid shots."""
        shots = get_sample_shots_10()
        sequential = self.calculator.calculate_sequential_metrics(shots)
        
        # Check structure
        required_keys = [
            'first_shot_displacement', 'shot_to_shot_displacement',
            'max_shot_displacement', 'min_shot_displacement',
            'shot_displacement_std', 'trend_stability'
        ]
        
        for key in required_keys:
            assert key in sequential
            assert isinstance(sequential[key], (int, float))
        
        # Check reasonable values
        assert sequential['first_shot_displacement'] >= 0
        assert sequential['shot_to_shot_displacement'] >= 0
        assert sequential['max_shot_displacement'] >= sequential['min_shot_displacement']
        assert sequential['shot_displacement_std'] >= 0
        assert 0 <= sequential['trend_stability'] <= 1.0
    
    def test_calculate_sequential_metrics_insufficient_shots(self):
        """Test sequential metrics calculation with insufficient shots."""
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_sequential_metrics([Shot(x=0, y=0)])
    
    def test_calculate_sequential_metrics_chronological_order(self):
        """Test sequential metrics with chronological ordering."""
        from datetime import datetime
        
        # Create shots with timestamps
        shots = []
        base_time = datetime(2023, 1, 1, 12, 0, 0)
        for i in range(5):
            shots.append(Shot(
                x=100 + i*10,
                y=100 + i*10,
                timestamp=base_time.replace(hour=i)
            ))
        
        sequential = self.calculator.calculate_sequential_metrics(shots)
        
        # Should use timestamps for ordering
        assert sequential['first_shot_displacement'] > 0  # First shot should be displaced from group mean
    
    def test_detect_flyers_std_dev_method(self):
        """Test flyer detection using standard deviation method."""
        shots = get_flier_shot_group()
        good_shots, flyers = self.calculator.detect_flyers(shots, "std_dev", 2.0)
        
        # Should detect 1 flyer
        assert len(good_shots) == 4
        assert len(flyers) == 1
        
        # Check that flyer is the outlier
        flyer = flyers[0]
        good_coords = np.array([[shot.x, shot.y] for shot in good_shots])
        good_center = np.mean(good_coords, axis=0)
        good_distances = [np.linalg.norm(coord - good_center) for coord in good_coords]
        flyer_distance = flyer.distance_to(Point(x=good_center[0], y=good_center[1]))
        
        # Flyer should be significantly farther from center than good shots
        assert flyer_distance > max(good_distances)
    
    def test_detect_flyers_iqr_method(self):
        """Test flyer detection using IQR method."""
        shots = get_flier_shot_group()
        good_shots, flyers = self.calculator.detect_flyers(shots, "iqr", 1.5)
        
        # Should detect 1 flyer
        assert len(good_shots) == 4
        assert len(flyers) == 1
    
    def test_detect_flyers_convex_hull_method(self):
        """Test flyer detection using convex hull method."""
        shots = get_flier_shot_group()
        good_shots, flyers = self.calculator.detect_flyers(shots, "convex_hull", 10.0)
        
        # Should detect 1 flyer
        assert len(good_shots) == 4
        assert len(flyers) == 1
    
    def test_detect_flyers_distance_method(self):
        """Test flyer detection using distance method."""
        shots = get_flier_shot_group()
        good_shots, flyers = self.calculator.detect_flyers(shots, "distance", 2.0)
        
        # Should detect 1 flyer
        assert len(good_shots) == 4
        assert len(flyers) == 1
    
    def test_detect_flyers_invalid_method(self):
        """Test flyer detection with invalid method."""
        shots = get_sample_shots_5()
        good_shots, flyers = self.calculator.detect_flyers(shots, "invalid_method", 2.0)
        
        # Should return all shots as good with warning
        assert len(good_shots) == len(shots)
        assert len(flyers) == 0
    
    def test_detect_flyers_insufficient_shots(self):
        """Test flyer detection with insufficient shots."""
        shots = get_sample_shots_5()[:2]
        good_shots, flyers = self.calculator.detect_flyers(shots, "std_dev", 2.0)
        
        # Should return all shots with warning
        assert len(good_shots) == 2
        assert len(flyers) == 0
    
    def test_calculate_scoring_metrics_valid_data(self):
        """Test scoring metrics calculation with valid data."""
        shots = get_sample_shots_5()
        target_center = Point(x=512, y=512)
        ring_radii = [50, 100, 150, 200]  # 10, 9, 7, 5 rings
        
        scoring = self.calculator.calculate_scoring_metrics(shots, target_center, ring_radii)
        
        # Check structure
        required_keys = [
            'total_score', 'average_score', 'max_score', 'min_score',
            'score_std', 'shot_scores', 'hit_distribution'
        ]
        
        for key in required_keys:
            assert key in scoring
            assert isinstance(scoring[key], (int, float, list))
        
        # Check hit distribution
        assert len(scoring['hit_distribution']) == len(ring_radii) + 1  # +1 for misses
        
        # Check score values
        assert scoring['max_score'] >= scoring['min_score']
        assert scoring['min_score'] >= 1  # Should have at least one hit
    
    def test_calculate_scoring_metrics_missing_data(self):
        """Test scoring metrics calculation with missing data."""
        shots = get_sample_shots_5()
        
        # Missing target center
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_scoring_metrics(shots, None, [50, 100, 150, 200])
        
        # Missing ring radii
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_scoring_metrics(shots, Point(x=512, y=512), [])
        
        # Empty shots
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_scoring_metrics([], Point(x=512, y=512), [50, 100, 150, 200])
    
    def test_calculate_comprehensive_sota_metrics_valid(self):
        """Test comprehensive SOTA metrics calculation with valid data."""
        shots = get_sample_shots_10()
        shot_group = ShotGroup()
        shot_group.target_center = Point(x=512, y=512)
        shot_group.target_ring_radii = [50, 100, 150, 200]
        
        for shot in shots:
            shot_group.add_shot(shot)
        
        sota_metrics = self.calculator.calculate_comprehensive_sota_metrics(shot_group)
        
        # Check SOTAMetrics structure
        assert isinstance(sota_metrics, SOTAMetrics)
        assert sota_metrics.total_shots == len(shots)
        assert isinstance(sota_metrics.mpi, Point)
        assert isinstance(sota_metrics.extreme_spread, float)
        assert isinstance(sota_metrics.mean_radius, float)
        assert isinstance(sota_metrics.std_dev_x, float)
        assert isinstance(sota_metrics.std_dev_y, float)
        assert isinstance(sota_metrics.convex_hull_area, float)
        assert isinstance(sota_metrics.first_shot_displacement, float)
        assert isinstance(sota_metrics.shot_to_shot_displacement, float)
        assert sota_metrics.flyer_count >= 0
        
        # Check scoring metrics (should be present with target info)
        assert sota_metrics.total_score >= 0
        assert sota_metrics.average_score >= 0
    
    def test_calculate_comprehensive_sota_metrics_empty_group(self):
        """Test comprehensive SOTA metrics calculation with empty group."""
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_comprehensive_sota_metrics(ShotGroup())
    
    def test_error_handling_invalid_data(self):
        """Test error handling with invalid data."""
        # Test with None shots
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_group_characteristics(None)
        
        # Test with non-list shots
        with pytest.raises(AnalysisError):
            self.calculator.calculate_group_characteristics("not_a_list")
    
    def test_edge_cases(self):
        """Test edge cases and boundary conditions."""
        # Test with single shot
        single_shot = [Shot(x=100, y=100)]
        
        # Some calculations should work
        mpi = self.calculator.calculate_mean_point_of_impact(single_shot)
        assert mpi.x == 100 and mpi.y == 100
        
        # Others should fail gracefully
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_extreme_spread(single_shot)
        
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_sequential_metrics(single_shot)
        
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_confidence_intervals(single_shot, 0.95)
    
    def test_performance_large_dataset(self):
        """Test performance with large dataset."""
        import time
        
        # Create large dataset
        large_shots = []
        for i in range(1000):
            large_shots.append(Shot(x=np.random.rand() * 1000, y=np.random.rand() * 1000))
        
        # Time calculation
        start_time = time.time()
        sota_metrics = self.calculator.calculate_comprehensive_sota_metrics(
            ShotGroup(shots=large_shots)
        )
        end_time = time.time()
        
        # Should complete within reasonable time (less than 1 second for 1000 shots)
        calculation_time = end_time - start_time
        assert calculation_time < 1.0
        
        # Check that results are reasonable
        assert sota_metrics.total_shots == 1000
        assert isinstance(sota_metrics.mpi, Point)


class TestSOTAMetricsCalculatorIntegration:
    """Integration tests for SOTAMetricsCalculator with other components."""
    
    def setup_method(self):
        """Set up test method."""
        self.calculator = SOTAMetricsCalculator()
    
    def test_integration_with_statistics_calculator(self):
        """Test integration with statistics calculator."""
        from src.analysis_engine.statistics import statistics_calculator
        
        shots = get_sample_shots_5()
        
        # Test that SOTA calculator uses statistics calculator
        with patch('src.analysis_engine.metrics.statistics_calculator') as mock_stats:
            mock_stats.calculate_mean_point_of_impact.return_value = Point(x=100, y=100)
            mock_stats.calculate_extreme_spread.return_value = 50.0
            mock_stats.calculate_mean_radius.return_value = 10.0
            
            characteristics = self.calculator.calculate_group_characteristics(shots)
            
            # Should use mocked values
            assert characteristics['mpi'].x == 100
            assert characteristics['mpi'].y == 100
            assert characteristics['extreme_spread'] == 50.0
            assert characteristics['mean_radius'] == 10.0
    
    def test_integration_with_shot_analyzer(self):
        """Test integration with shot analyzer."""
        from src.analysis_engine.shot_analysis import shot_analyzer
        
        shots = get_sample_shots_5()
        
        # Test flyer detection integration
        with patch('src.analysis_engine.shot_analysis.shot_analyzer') as mock_analyzer:
            mock_analyzer.remove_outliers.return_value = (shots[:4], [shots[4]])
            
            good_shots, flyers = self.calculator.detect_flyers(shots, "std_dev", 2.0)
            
            # Should use shot analyzer for outlier detection
            mock_analyzer.remove_outliers.assert_called_once_with(shots, "std_dev", 2.0)
    
    def test_to_dict_conversion(self):
        """Test SOTAMetrics to_dict conversion."""
        sota_metrics = SOTAMetrics()
        sota_metrics.total_shots = 5
        sota_metrics.mpi = Point(x=100, y=100)
        sota_metrics.extreme_spread = 50.0
        sota_metrics.mean_radius = 10.0
        sota_metrics.std_dev_x = 5.0
        sota_metrics.std_dev_y = 3.0
        sota_metrics.convex_hull_area = 100.0
        sota_metrics.first_shot_displacement = 15.0
        sota_metrics.shot_to_shot_displacement = 8.0
        sota_metrics.flyer_count = 1
        sota_metrics.total_score = 45
        sota_metrics.average_score = 9.0
        
        # Test to_dict conversion
        metrics_dict = sota_metrics.to_dict()
        
        # Check structure
        expected_keys = [
            'total_shots', 'mpi', 'extreme_spread', 'mean_radius',
            'std_dev_x', 'std_dev_y', 'convex_hull_area',
            'first_shot_displacement', 'shot_to_shot_displacement',
            'flyer_count', 'total_score', 'average_score'
        ]
        
        for key in expected_keys:
            assert key in metrics_dict
        
        # Check MPI conversion
        assert metrics_dict['mpi']['x'] == 100.0
        assert metrics_dict['mpi']['y'] == 100.0
        
        # Check numeric values
        assert metrics_dict['total_shots'] == 5
        assert metrics_dict['extreme_spread'] == 50.0
        assert metrics_dict['flyer_count'] == 1


if __name__ == "__main__":
    pytest.main([__file__])
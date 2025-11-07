"""Unit tests for statistical calculations."""

import pytest
import numpy as np
from unittest.mock import patch, MagicMock

from src.analysis_engine.statistics import StatisticsCalculator
from src.analysis_engine.models import Shot, Point
from src.utils.exceptions import AnalysisError, InsufficientDataError
from tests.fixtures.sample_shots import get_sample_shots_5, get_sample_shots_10, get_wide_shot_group


class TestStatisticsCalculator:
    """Test cases for StatisticsCalculator class."""
    
    def setup_method(self):
        """Set up test method."""
        self.calculator = StatisticsCalculator()
    
    def test_calculate_mean_point_of_impact_valid_shots(self):
        """Test MPI calculation with valid shots."""
        shots = get_sample_shots_5()
        mpi = self.calculator.calculate_mean_point_of_impact(shots)
        
        # Expected MPI for sample shots
        expected_x = 514.6  # Mean of x coordinates
        expected_y = 516.6  # Mean of y coordinates
        
        assert mpi.x == pytest.approx(expected_x, rel=1e-1)
        assert mpi.y == pytest.approx(expected_y, rel=1e-1)
        assert isinstance(mpi, Point)
    
    def test_calculate_mean_point_of_impact_empty_shots(self):
        """Test MPI calculation with empty shots list."""
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_mean_point_of_impact([])
    
    def test_calculate_extreme_spread_valid_shots(self):
        """Test extreme spread calculation with valid shots."""
        shots = get_sample_shots_5()
        spread = self.calculator.calculate_extreme_spread(shots)
        
        # Calculate expected extreme spread manually
        max_distance = 0.0
        for i, shot1 in enumerate(shots):
            for shot2 in shots[i+1:]:
                dist = shot1.distance_to(shot2)
                if dist > max_distance:
                    max_distance = dist
        
        assert spread == pytest.approx(max_distance, rel=1e-1)
        assert isinstance(spread, float)
    
    def test_calculate_extreme_spread_insufficient_shots(self):
        """Test extreme spread calculation with insufficient shots."""
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_extreme_spread([Shot(x=0, y=0)])
    
    def test_calculate_mean_radius_valid_shots(self):
        """Test mean radius calculation with valid shots."""
        shots = get_sample_shots_5()
        radius = self.calculator.calculate_mean_radius(shots)
        
        # Expected mean radius
        mpi = self.calculator.calculate_mean_point_of_impact(shots)
        expected_radius = np.mean([shot.distance_to(mpi) for shot in shots])
        
        assert radius == pytest.approx(expected_radius, rel=1e-1)
        assert isinstance(radius, float)
    
    def test_calculate_mean_radius_custom_center(self):
        """Test mean radius calculation with custom center."""
        shots = get_sample_shots_5()
        custom_center = Point(x=500, y=500)
        radius = self.calculator.calculate_mean_radius(shots, custom_center)
        
        # Expected radius from custom center
        expected_radius = np.mean([shot.distance_to(custom_center) for shot in shots])
        
        assert radius == pytest.approx(expected_radius, rel=1e-1)
    
    def test_calculate_standard_deviations_valid_shots(self):
        """Test standard deviations calculation with valid shots."""
        shots = get_sample_shots_5()
        std_dev_x, std_dev_y = self.calculator.calculate_standard_deviations(shots)
        
        # Calculate expected values manually
        coords = np.array([[shot.x, shot.y] for shot in shots])
        expected_std_x = np.std(coords[:, 0])
        expected_std_y = np.std(coords[:, 1])
        
        assert std_dev_x == pytest.approx(expected_std_x, rel=1e-1)
        assert std_dev_y == pytest.approx(expected_std_y, rel=1e-1)
        assert len([std_dev_x, std_dev_y]) == 2
        assert all(isinstance(val, float) for val in [std_dev_x, std_dev_y])
    
    def test_calculate_standard_deviations_empty_shots(self):
        """Test standard deviations calculation with empty shots list."""
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_standard_deviations([])
    
    def test_calculate_confidence_intervals_valid_shots(self):
        """Test confidence intervals calculation with valid shots."""
        shots = get_sample_shots_10()
        intervals = self.calculator.calculate_confidence_intervals(shots, 0.95)
        
        # Check structure
        assert 'x' in intervals
        assert 'y' in intervals
        assert len(intervals['x']) == 2
        assert len(intervals['y']) == 2
        
        # Check that intervals are reasonable
        assert intervals['x'][0] < intervals['x'][1]
        assert intervals['y'][0] < intervals['y'][1]
        
        # Check that mean is within intervals
        coords = np.array([[shot.x, shot.y] for shot in shots])
        mean_x = np.mean(coords[:, 0])
        mean_y = np.mean(coords[:, 1])
        
        assert intervals['x'][0] <= mean_x <= intervals['x'][1]
        assert intervals['y'][0] <= mean_y <= intervals['y'][1]
    
    def test_calculate_confidence_intervals_insufficient_shots(self):
        """Test confidence intervals calculation with insufficient shots."""
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_confidence_intervals([Shot(x=0, y=0), Shot(x=1, y=1)], 0.95)
    
    def test_calculate_convex_hull_area_valid_shots(self):
        """Test convex hull area calculation with valid shots."""
        shots = get_sample_shots_5()
        area = self.calculator.calculate_convex_hull_area(shots)
        
        # Check that area is positive
        assert area > 0
        assert isinstance(area, float)
    
    def test_calculate_convex_hull_area_insufficient_shots(self):
        """Test convex hull area calculation with insufficient shots."""
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_convex_hull_area([Shot(x=0, y=0), Shot(x=1, y=1)])
    
    def test_calculate_shot_dispersion_valid_shots(self):
        """Test shot dispersion calculation with valid shots."""
        shots = get_sample_shots_5()
        dispersion = self.calculator.calculate_shot_dispersion(shots)
        
        # Check structure
        required_keys = ['mean_distance', 'median_distance', 'max_distance', 'min_distance', 'range_distance']
        for key in required_keys:
            assert key in dispersion
        
        # Check that values are reasonable
        assert dispersion['min_distance'] <= dispersion['mean_distance'] <= dispersion['max_distance']
        assert dispersion['range_distance'] == dispersion['max_distance'] - dispersion['min_distance']
        assert all(isinstance(val, (int, float)) for val in dispersion.values())
    
    def test_calculate_shot_dispersion_empty_shots(self):
        """Test shot dispersion calculation with empty shots list."""
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_shot_dispersion([])
    
    def test_calculate_group_statistics_valid_shots(self):
        """Test comprehensive group statistics with valid shots."""
        shots = get_sample_shots_10()
        stats = self.calculator.calculate_group_statistics(shots)
        
        # Check basic statistics
        assert stats['total_shots'] == len(shots)
        assert isinstance(stats['mpi'], Point)
        assert isinstance(stats['extreme_spread'], float)
        assert isinstance(stats['mean_radius'], float)
        assert isinstance(stats['std_dev_x'], float)
        assert isinstance(stats['std_dev_y'], float)
        
        # Check confidence intervals (should be present with 10 shots)
        assert 'confidence_intervals' in stats
        
        # Check convex hull area
        assert 'convex_hull_area' in stats
        
        # Check dispersion metrics
        assert 'dispersion' in stats
        
        # Check confidence metrics (if shots have confidence)
        confidences = [shot.confidence for shot in shots if shot.confidence > 0]
        if confidences:
            assert 'avg_confidence' in stats
            assert 'min_confidence' in stats
            assert 'max_confidence' in stats
    
    def test_calculate_group_statistics_empty_shots(self):
        """Test comprehensive group statistics with empty shots list."""
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_group_statistics([])
    
    def test_error_handling_invalid_data(self):
        """Test error handling with invalid data."""
        # Test with None shots
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_mean_point_of_impact(None)
        
        # Test with non-list shots
        with pytest.raises(AnalysisError):
            self.calculator.calculate_extreme_spread("not_a_list")
    
    def test_edge_cases(self):
        """Test edge cases and boundary conditions."""
        # Test with single shot
        single_shot = [Shot(x=100, y=100)]
        
        # Should work for some calculations but fail for others
        mpi = self.calculator.calculate_mean_point_of_impact(single_shot)
        assert mpi.x == 100 and mpi.y == 100
        
        # Should fail for calculations requiring multiple shots
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_extreme_spread(single_shot)
        
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_confidence_intervals(single_shot, 0.95)
        
        with pytest.raises(InsufficientDataError):
            self.calculator.calculate_convex_hull_area(single_shot)
    
    def test_performance_large_dataset(self):
        """Test performance with large dataset."""
        import time
        
        # Create large dataset
        large_shots = []
        for i in range(1000):
            large_shots.append(Shot(x=np.random.rand() * 1000, y=np.random.rand() * 1000))
        
        # Time the calculation
        start_time = time.time()
        stats = self.calculator.calculate_group_statistics(large_shots)
        end_time = time.time()
        
        # Should complete within reasonable time (less than 1 second for 1000 shots)
        calculation_time = end_time - start_time
        assert calculation_time < 1.0
        
        # Check that results are reasonable
        assert stats['total_shots'] == 1000
        assert isinstance(stats['mpi'], Point)


class TestStatisticsCalculatorIntegration:
    """Integration tests for StatisticsCalculator with other components."""
    
    def setup_method(self):
        """Set up test method."""
        self.calculator = StatisticsCalculator()
    
    def test_integration_with_shot_analysis(self):
        """Test integration with shot analysis module."""
        from src.analysis_engine.shot_analysis import ShotAnalyzer
        
        # Create shot analyzer and test interaction
        shot_analyzer = ShotAnalyzer()
        shots = get_sample_shots_5()
        
        # Test filtering by confidence
        filtered_shots = shot_analyzer.filter_shots_by_confidence(shots, 0.9)
        assert len(filtered_shots) <= len(shots)
        
        # Test outlier removal
        good_shots, flyers = shot_analyzer.remove_outliers(shots, "std_dev", 2.0)
        assert len(good_shots) + len(flyers) == len(shots)
        
        # Test with filtered shots in statistics calculator
        if len(good_shots) >= 2:
            stats = self.calculator.calculate_group_statistics(good_shots)
            assert stats['total_shots'] == len(good_shots)
    
    def test_integration_with_models(self):
        """Test integration with data models."""
        shots = get_sample_shots_5()
        
        # Test MPI calculation
        mpi = self.calculator.calculate_mean_point_of_impact(shots)
        
        # Test Point model methods
        test_point = Point(x=200, y=200)
        distance = mpi.distance_to(test_point)
        expected_distance = np.sqrt((mpi.x - 200)**2 + (mpi.y - 200)**2)
        
        assert distance == pytest.approx(expected_distance, rel=1e-1)
        
        # Test Point model initialization
        another_point = Point(x=mpi.x, y=mpi.y)
        assert another_point.x == mpi.x
        assert another_point.y == mpi.y


if __name__ == "__main__":
    pytest.main([__file__])
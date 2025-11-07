"""Unit tests for shot analysis functionality."""

import pytest
import numpy as np
from src.analysis_engine.shot_analysis import ShotAnalyzer
from src.analysis_engine.models import Shot


class TestShotAnalyzer:
    """Test cases for ShotAnalyzer class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.analyzer = ShotAnalyzer(duplicate_threshold=15.0)
    
    def test_shot_distance_calculation(self):
        """Test distance calculation between two shots."""
        shot1 = Shot(x=100, y=100)
        shot2 = Shot(x=200, y=200)
        expected_distance = 141.4213562373095  # sqrt(100^2 + 100^2)
        assert abs(shot1.distance_to(shot2) - expected_distance) < 0.001
    
    def test_find_new_shots_empty_previous(self):
        """Test finding new shots with empty previous shots list."""
        previous_shots = []
        current_detections = [
            Shot(x=100, y=100, confidence=0.95),
            Shot(x=200, y=150, confidence=0.87)
        ]
        
        new_shots = self.analyzer.find_new_shots(previous_shots, current_detections)
        
        assert len(new_shots) == 2
        assert new_shots == current_detections
    
    def test_find_new_shots_with_duplicates(self):
        """Test finding new shots with duplicate detection."""
        previous_shots = [Shot(x=100, y=100, confidence=0.95)]
        current_detections = [
            Shot(x=100, y=100, confidence=0.95),  # Duplicate
            Shot(x=200, y=150, confidence=0.87),  # New
            Shot(x=105, y=105, confidence=0.90)   # Within threshold
        ]
        
        new_shots = self.analyzer.find_new_shots(previous_shots, current_detections)
        
        assert len(new_shots) == 1
        assert new_shots[0].x == 200
        assert new_shots[0].y == 150
    
    def test_filter_shots_by_confidence(self):
        """Test filtering shots by confidence threshold."""
        shots = [
            Shot(x=100, y=100, confidence=0.95),
            Shot(x=200, y=150, confidence=0.87),
            Shot(x=150, y=200, confidence=0.92)
        ]
        
        # Filter with high threshold
        filtered = self.analyzer.filter_shots_by_confidence(shots, 0.90)
        assert len(filtered) == 2
        assert all(shot.confidence >= 0.90 for shot in filtered)
        
        # Filter with low threshold
        filtered = self.analyzer.filter_shots_by_confidence(shots, 0.80)
        assert len(filtered) == 3
    
    def test_remove_outliers_insufficient_data(self):
        """Test outlier removal with insufficient data."""
        shots = [Shot(x=100, y=100), Shot(x=200, y=200)]
        
        # Should return original shots when insufficient data
        filtered = self.analyzer.remove_outliers(shots, "std_dev", 2.0)
        assert len(filtered) == 2
    
    def test_remove_outliers_std_dev(self):
        """Test outlier removal using standard deviation method."""
        shots = [
            Shot(x=100, y=100),
            Shot(x=200, y=200),
            Shot(x=150, y=150),
            Shot(x=500, y=500),  # Outlier
            Shot(x=120, y=120)
        ]
        
        filtered = self.analyzer.remove_outliers(shots, "std_dev", 2.0)
        
        # Should remove the outlier
        assert len(filtered) < len(shots)
        assert not any(shot.x == 500 and shot.y == 500 for shot in filtered)
    
    def test_merge_shot_groups(self):
        """Test merging multiple shot groups."""
        from src.analysis_engine.models import ShotGroup
        
        group1 = ShotGroup()
        group1.add_shot(Shot(x=100, y=100))
        group1.add_shot(Shot(x=200, y=200))
        
        group2 = ShotGroup()
        group2.add_shot(Shot(x=150, y=150))
        
        merged = self.analyzer.merge_shot_groups([group1, group2])
        
        assert len(merged.shots) == 3
        assert merged.get_shot_count() == 3
    
    def test_merge_empty_shot_groups(self):
        """Test merging empty shot groups."""
        merged = self.analyzer.merge_shot_groups([])
        
        assert len(merged.shots) == 0
        assert merged.get_shot_count() == 0
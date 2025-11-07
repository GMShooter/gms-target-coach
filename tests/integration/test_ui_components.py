"""Integration tests for UI components."""

import pytest
import streamlit as st
from unittest.mock import patch, MagicMock
import tempfile
import json

from src.ui_layer.components.controls import ControlsComponent
from src.ui_layer.components.image_display import ImageDisplay
from src.ui_layer.components.metrics_panel import MetricsPanelComponent
from src.ui_layer.state_management import StateManager
from src.analysis_engine.models import Shot, Point
from src.utils.exceptions import ValidationError

from tests.fixtures.sample_shots import get_sample_shots_5, get_sample_shots_10


class TestUIComponentsIntegration:
    """Integration tests for UI components."""
    
    def setup_method(self):
        """Set up test method."""
        # Mock streamlit session state
        self.mock_session_state = {}
        
        # Patch streamlit session state
        self.session_patcher = patch('streamlit.session_state', self.mock_session_state)
        self.session_patcher.start()
        
        # Initialize components
        self.controls = ControlsComponent()
        self.image_display = ImageDisplay()
        self.metrics_panel = MetricsPanelComponent()
        self.state_manager = StateManager()
    
    def teardown_method(self):
        """Clean up after test."""
        self.session_patcher.stop()
    
    def test_controls_component_integration(self):
        """Test controls component integration with state manager."""
        # Set up test data
        test_shots = get_sample_shots_5()
        self.mock_session_state['shots'] = test_shots
        self.mock_session_state['analysis_mode'] = "Local Files"
        self.mock_session_state['duplicate_threshold'] = 20.0
        self.mock_session_state['min_confidence'] = 0.8
        self.mock_session_state['outlier_method'] = "Standard Deviation"
        self.mock_session_state['outlier_threshold'] = 2.5
        
        # Render controls component
        controls_state = self.controls.render()
        
        # Check that controls were rendered
        assert 'analysis_mode' in controls_state
        assert 'configuration' in controls_state
        assert 'button_states' in controls_state
        assert 'session_states' in controls_state
        assert 'advanced_settings' in controls_state
        
        # Check that state was accessed
        assert controls_state['analysis_mode'] == "Local Files"
        assert controls_state['configuration']['duplicate_threshold'] == 20.0
        assert controls_state['configuration']['min_confidence'] == 0.8
        assert controls_state['configuration']['outlier_method'] == "Standard Deviation"
        assert controls_state['configuration']['outlier_threshold'] == 2.5
    
    def test_image_display_component_integration(self):
        """Test image display component integration with state manager."""
        # Set up test data
        test_shots = get_sample_shots_5()
        test_mpi = Point(x=100, y=100)
        test_image = "test_image"
        
        self.mock_session_state['shots'] = test_shots
        self.mock_session_state['filtered_shots'] = test_shots
        self.mock_session_state['mpi'] = {'x': 100, 'y': 100}
        self.mock_session_state['current_image'] = test_image
        
        # Render image display component
        with patch('src.ui_layer.components.image_display.image_display.display_single_image') as mock_display:
            # Render component
            self.image_display.render_single_image(
                test_image, test_shots, test_mpi, "Test Display"
            )
            
            # Check that display was called
            mock_display.assert_called_once()
            call_args = mock_display.call_args[0]
            assert call_args[0] == test_image
            assert call_args[1] == test_shots
            assert call_args[2] == test_mpi
            assert call_args[3] == "Test Display"
    
    def test_metrics_panel_component_integration(self):
        """Test metrics panel component integration with state manager."""
        # Set up test data
        test_shots = get_sample_shots_10()
        
        self.mock_session_state['shots'] = test_shots
        self.mock_session_state['filtered_shots'] = test_shots
        
        # Render metrics panel component
        with patch('src.ui_layer.components.metrics_panel.metrics_panel_component.render') as mock_render:
            # Render component
            self.metrics_panel.render(test_shots)
            
            # Check that render was called
            mock_render.assert_called_once()
            call_args = mock_render.call_args[0]
            assert call_args[0] == test_shots
    
    def test_state_manager_integration(self):
        """Test state manager integration with UI components."""
        # Set up test data
        test_shots = get_sample_shots_5()
        
        self.mock_session_state['shots'] = test_shots
        
        # Test state manager methods
        self.state_manager.set_shots(test_shots)
        assert self.mock_session_state['shots'] == test_shots
        
        self.state_manager.set_filtered_shots(test_shots)
        assert self.mock_session_state['filtered_shots'] == test_shots
        
        test_mpi = Point(x=100, y=100)
        self.state_manager.set_mpi(test_mpi)
        assert self.mock_session_state['mpi'] == {'x': 100, 'y': 100}
        
        test_mode = "Live Camera"
        self.state_manager.set_analysis_mode(test_mode)
        assert self.mock_session_state['analysis_mode'] == test_mode
        
        test_threshold = 25.0
        self.state_manager.set_duplicate_threshold(test_threshold)
        assert self.mock_session_state['duplicate_threshold'] == test_threshold
        
        test_confidence = 0.9
        self.state_manager.set_min_confidence(test_confidence)
        assert self.mock_session_state['min_confidence'] == test_confidence
        
        test_method = "IQR"
        self.state_manager.set_outlier_method(test_method)
        assert self.mock_session_state['outlier_method'] == test_method
        
        test_outlier_threshold = 3.0
        self.state_manager.set_outlier_threshold(test_outlier_threshold)
        assert self.mock_session_state['outlier_threshold'] == test_outlier_threshold
    
    def test_session_persistence(self):
        """Test session persistence and recovery."""
        # Set up test data
        test_shots = get_sample_shots_5()
        test_session_id = "test_session_12345"
        
        self.mock_session_state['shots'] = test_shots
        self.mock_session_state['session_id'] = test_session_id
        
        # Test session saving
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch('pathlib.Path.mkdir') as mock_mkdir:
                # Save session
                saved_path = self.state_manager.save_session()
                
                # Check that file was created
                assert saved_path.endswith('.json')
                assert test_session_id in saved_path
                
                # Check file content
                with open(saved_path, 'r') as f:
                    saved_data = json.load(f)
                    
                    assert saved_data['session_id'] == test_session_id
                    assert saved_data['state']['shots'] == [
                        shot.to_dict() for shot in test_shots
                    ]
    
    def test_session_validation(self):
        """Test session state validation."""
        # Set up valid state
        test_shots = get_sample_shots_5()
        self.mock_session_state['shots'] = test_shots
        self.mock_session_state['duplicate_threshold'] = 15.0
        self.mock_session_state['min_confidence'] = 0.5
        self.mock_session_state['session_id'] = "test_session"
        
        # Should validate successfully
        assert self.state_manager.validate_state() is True
        
        # Test missing required keys
        del self.mock_session_state['session_id']
        assert self.state_manager.validate_state() is False
        
        # Test invalid data types
        self.mock_session_state['shots'] = "not_a_list"
        assert self.state_manager.validate_state() is False
        
        # Test invalid value ranges
        self.mock_session_state['min_confidence'] = -0.1
        assert self.state_manager.validate_state() is False
        
        self.mock_session_state['min_confidence'] = 1.5
        assert self.state_manager.validate_state() is False
        
        self.mock_session_state['duplicate_threshold'] = 60.0
        assert self.state_manager.validate_state() is False
    
    def test_session_history_tracking(self):
        """Test session history tracking."""
        # Set up test data
        test_shots = get_sample_shots_5()
        
        self.mock_session_state['shots'] = []
        
        # Perform multiple state changes
        self.state_manager.set_shots(test_shots)
        self.state_manager.set_analysis_mode("Live Camera")
        self.state_manager.set_duplicate_threshold(20.0)
        
        # Check history
        history = self.state_manager.get_analysis_history()
        
        # Should have 3 entries
        assert len(history) == 3
        
        # Check first entry (shots_updated)
        assert history[0]['action'] == 'shots_updated'
        assert history[0]['data']['shot_count'] == len(test_shots)
        
        # Check second entry (mode_changed)
        assert history[1]['action'] == 'mode_changed'
        assert history[1]['data']['mode'] == "Live Camera"
        
        # Check third entry (threshold_changed)
        assert history[2]['action'] == 'threshold_changed'
        assert history[2]['data']['type'] == 'duplicate'
        assert history[2]['data']['value'] == 20.0
    
    def test_error_handling(self):
        """Test error handling in UI components."""
        # Test controls component with invalid state
        self.mock_session_state['analysis_mode'] = "Invalid Mode"
        
        # Should handle error gracefully
        with patch('streamlit.error') as mock_error:
            controls_state = self.controls.render()
            
            # Check that error was displayed
            mock_error.assert_called()
    
    def test_component_interaction(self):
        """Test interaction between components."""
        # Set up test data
        test_shots = get_sample_shots_5()
        
        self.mock_session_state['shots'] = test_shots
        self.mock_session_state['filtered_shots'] = test_shots
        
        # Test that components can share state
        # Controls component changes state
        self.controls.render()
        assert self.mock_session_state['duplicate_threshold'] == 15.0  # Default value
        
        # Metrics panel should see the change
        with patch('src.ui_layer.components.metrics_panel.metrics_panel_component.render') as mock_render:
            self.metrics_panel.render(test_shots)
            
            # Check that metrics panel was called with updated state
            mock_render.assert_called_once()
            call_args = mock_render.call_args[0]
            assert call_args[0] == test_shots
    
    def test_performance_with_components(self):
        """Test performance with UI components."""
        import time
        
        # Set up large dataset
        large_shots = []
        for i in range(100):
            large_shots.append(Shot(x=i*10, y=i*10))
        
        self.mock_session_state['shots'] = large_shots
        
        # Time component rendering
        start_time = time.time()
        
        # Render all components
        self.controls.render()
        self.image_display.render_single_image(
            "test_image", large_shots, Point(x=500, y=500), "Test"
        )
        self.metrics_panel.render(large_shots)
        
        end_time = time.time()
        
        # Should complete within reasonable time
        render_time = end_time - start_time
        assert render_time < 0.5  # Should be fast even with large dataset


if __name__ == "__main__":
    pytest.main([__file__])
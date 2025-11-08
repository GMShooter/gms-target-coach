"""Integration tests for UI components."""

import pytest
import streamlit as st
from unittest.mock import patch, MagicMock
import tempfile
import os
from pathlib import Path
from PIL import Image as PILImage

from src.ui_layer.components.image_display import ImageDisplay
from src.ui_layer.components.metrics_panel import MetricsPanelComponent
from src.ui_layer.components.controls import ControlsComponent
from src.ui_layer.state_management import StateManager
from src.analysis_engine.models import Shot, Point, SOTAMetrics
from src.utils.exceptions import ValidationError
from tests.fixtures.sample_shots import get_sample_shots_5
from tests.conftest import MockSessionState


class TestImageDisplay:
    """Test cases for ImageDisplay component."""
    
    def setup_method(self):
        """Set up test method."""
        # Mock streamlit session state with our custom mock
        self.mock_session_state = MockSessionState()
        
        # Patch streamlit session state
        self.session_patcher = patch('streamlit.session_state', self.mock_session_state)
        self.session_patcher.start()
        
        self.state_manager = StateManager()
        self.image_display = ImageDisplay()
    
    def teardown_method(self):
        """Clean up after test."""
        self.session_patcher.stop()
    
    def test_display_no_image(self):
        """Test display when no image is loaded."""
        # Ensure no image is loaded
        self.state_manager.set_current_image(None)
        
        # Mock streamlit functions
        with patch('streamlit.info') as mock_info:
            # Render component
            self.image_display.render(state_manager=self.state_manager)
            
            # Check that info message was shown
            mock_info.assert_called_once()
    
    def test_display_with_image(self):
        """Test display when image is loaded."""
        # Create a temporary image file with actual image content
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            # Create a simple test image
            test_image = PILImage.new('RGB', (100, 100), color='red')
            test_image.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            # Set image in state
            self.state_manager.set_current_image(temp_path)
            
            # Mock streamlit functions - need to patch where it's used
            with patch('src.ui_layer.components.image_display.st.image') as mock_image:
                # Render component with state_manager
                self.image_display.render(state_manager=self.state_manager)
                
                # Check that image was displayed
                mock_image.assert_called_once()
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def test_display_with_shots(self):
        """Test display when image with shots is loaded."""
        # Create a temporary image file with actual image content
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            # Create a simple test image
            test_image = PILImage.new('RGB', (100, 100), color='red')
            test_image.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            # Set image and shots in state
            self.state_manager.set_current_image(temp_path)
            self.state_manager.set_shots(get_sample_shots_5())
            
            # Mock streamlit functions
            with patch('src.ui_layer.components.image_display.st.image') as mock_image:
                # Render component with state_manager
                self.image_display.render(state_manager=self.state_manager)
                
                # Check that image was displayed
                mock_image.assert_called_once()
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def test_display_with_mpi(self):
        """Test display when image with MPI is loaded."""
        # Create a temporary image file with actual image content
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            # Create a simple test image
            test_image = PILImage.new('RGB', (100, 100), color='red')
            test_image.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            # Set image and MPI in state
            self.state_manager.set_current_image(temp_path)
            self.state_manager.set_mpi(Point(x=100, y=100))
            
            # Mock streamlit functions
            with patch('src.ui_layer.components.image_display.st.image') as mock_image:
                # Render component with state_manager
                self.image_display.render(state_manager=self.state_manager)
                
                # Check that image was displayed
                mock_image.assert_called_once()
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def test_display_invalid_image(self):
        """Test display when invalid image path is set."""
        # Set invalid image path
        self.state_manager.set_current_image("nonexistent_image.jpg")
        
        # Mock streamlit functions
        with patch('streamlit.error') as mock_error:
            # Render component with state_manager
            self.image_display.render(state_manager=self.state_manager)
            
            # Check that error message was shown
            mock_error.assert_called_once()


class TestMetricsPanel:
    """Test cases for MetricsPanel component."""
    
    def setup_method(self):
        """Set up test method."""
        # Mock streamlit session state with our custom mock
        self.mock_session_state = MockSessionState()
        
        # Patch streamlit session state
        self.session_patcher = patch('streamlit.session_state', self.mock_session_state)
        self.session_patcher.start()
        
        self.state_manager = StateManager()
        self.metrics_panel = MetricsPanelComponent()
    
    def teardown_method(self):
        """Clean up after test."""
        self.session_patcher.stop()
    
    def test_display_no_shots(self):
        """Test display when no shots are loaded."""
        # Ensure no shots are loaded
        self.state_manager.set_shots([])
        
        # Mock streamlit functions
        with patch('streamlit.info') as mock_info:
            # Render component
            self.metrics_panel.render()
            
            # Check that info message was shown
            mock_info.assert_called_once()
    
    def test_display_with_shots(self):
        """Test display when shots are loaded."""
        # Set shots in state
        self.state_manager.set_shots(get_sample_shots_5())
        
        # Mock streamlit functions
        with patch('streamlit.metric') as mock_metric:
            # Render component
            self.metrics_panel.render()
            
            # Check that metrics were displayed
            assert mock_metric.call_count >= 5  # At least 5 metrics should be displayed
    
    def test_display_with_metrics(self):
        """Test display when metrics are calculated."""
        # Set shots and metrics in state
        self.state_manager.set_shots(get_sample_shots_5())
        
        # Create test metrics
        test_metrics = SOTAMetrics(
            total_shots=5,
            extreme_spread=15.0,
            mean_radius=9.5,
            std_dev_x=3.2,
            std_dev_y=3.2,
            mpi=Point(x=100, y=100)
        )
        
        # Mock streamlit functions
        with patch('streamlit.metric') as mock_metric:
            # Render component with metrics
            self.metrics_panel.render()
            
            # Check that metrics were displayed
            assert mock_metric.call_count >= 10  # All metrics should be displayed
    
    def test_export_csv(self):
        """Test CSV export functionality."""
        # Set shots in state
        self.state_manager.set_shots(get_sample_shots_5())
        
        # Mock streamlit functions
        with patch('streamlit.download_button') as mock_download, \
             patch('streamlit.selectbox') as mock_selectbox, \
             patch('streamlit.button') as mock_button:
            
            # Set up mock return values
            mock_selectbox.return_value = "CSV"  # Export format
            mock_button.return_value = True  # Export button clicked
            
            # Render component
            self.metrics_panel.render()
            
            # Check that download button was shown
            mock_download.assert_called()
    
    def test_export_excel(self):
        """Test Excel export functionality."""
        # Set shots in state
        self.state_manager.set_shots(get_sample_shots_5())
        
        # Mock streamlit functions
        with patch('streamlit.download_button') as mock_download, \
             patch('streamlit.selectbox') as mock_selectbox, \
             patch('streamlit.button') as mock_button:
            
            # Set up mock return values
            mock_selectbox.return_value = "Excel"  # Export format
            mock_button.return_value = True  # Export button clicked
            
            # Render component
            self.metrics_panel.render()
            
            # Check that download button was shown
            mock_download.assert_called()


class TestControls:
    """Test cases for Controls component."""
    
    def setup_method(self):
        """Set up test method."""
        # Mock streamlit session state with our custom mock
        self.mock_session_state = MockSessionState()
        
        # Patch streamlit session state
        self.session_patcher = patch('streamlit.session_state', self.mock_session_state)
        self.session_patcher.start()
        
        self.state_manager = StateManager()
        self.controls = ControlsComponent()
        
        # Mock callback functions
        self.mock_load_image = MagicMock()
        self.mock_analyze_shots = MagicMock()
        self.mock_clear_data = MagicMock()
    
    def teardown_method(self):
        """Clean up after test."""
        self.session_patcher.stop()
    
    def test_render_default(self):
        """Test default rendering of controls."""
        # Mock streamlit functions
        with patch('streamlit.sidebar.selectbox') as mock_selectbox, \
             patch('streamlit.sidebar.slider') as mock_slider, \
             patch('streamlit.sidebar.button') as mock_button, \
             patch('streamlit.sidebar.radio') as mock_radio:
            
            # Set up mock return values
            mock_radio.return_value = "Local Files"
            mock_selectbox.return_value = "None"  # outlier_method
            mock_slider.side_effect = [15.0, 0.5, 2.0]  # duplicate_threshold, min_confidence, outlier_threshold
            
            # Render component
            self.controls.render()
            
            # Check that controls were rendered
            mock_radio.assert_called_once()  # Analysis mode selector
            mock_selectbox.assert_called()  # Outlier method selector
            assert mock_slider.call_count >= 3  # At least 3 sliders should be called
            mock_button.assert_called()
    
    def test_analysis_mode_change(self):
        """Test analysis mode change."""
        # Mock streamlit functions
        with patch('streamlit.sidebar.radio') as mock_radio, \
             patch('streamlit.sidebar.slider') as mock_slider, \
             patch('streamlit.sidebar.selectbox') as mock_selectbox:
            # Set return value for radio and sliders
            mock_radio.return_value = "Live Camera"
            mock_slider.side_effect = [15.0, 0.5, 2.0]  # duplicate_threshold, min_confidence, outlier_threshold
            mock_selectbox.return_value = "None"  # outlier_method
            
            # Render component
            self.controls.render()
            
            # Check that analysis mode was updated
            assert self.state_manager.get_analysis_mode() == "Live Camera"
    
    def test_duplicate_threshold_change(self):
        """Test duplicate threshold change."""
        # Mock streamlit functions
        with patch('streamlit.sidebar.slider') as mock_slider:
            # Set return value for slider
            mock_slider.side_effect = [25.0, 0.5, "None", 2.0]  # duplicate_threshold, min_confidence, outlier_method, outlier_threshold
            
            # Render component
            self.controls.render()
            
            # Check that threshold was updated
            assert self.state_manager.get_duplicate_threshold() == 25.0
    
    def test_min_confidence_change(self):
        """Test minimum confidence change."""
        # Mock streamlit functions
        with patch('streamlit.sidebar.slider') as mock_slider:
            # Set return value for slider
            mock_slider.side_effect = [15.0, 0.8, "None", 2.0]  # duplicate_threshold, min_confidence, outlier_method, outlier_threshold
            
            # Render component
            self.controls.render()
            
            # Check that confidence was updated
            assert self.state_manager.get_min_confidence() == 0.8
    
    def test_outlier_method_change(self):
        """Test outlier method change."""
        # Mock streamlit functions
        with patch('streamlit.sidebar.selectbox') as mock_selectbox, \
             patch('streamlit.sidebar.slider') as mock_slider:
            # Set return value for selectbox and sliders
            mock_selectbox.return_value = "IQR"
            mock_slider.side_effect = [15.0, 0.5, 2.0]  # duplicate_threshold, min_confidence, outlier_threshold
            
            # Render component
            self.controls.render()
            
            # Check that method was updated
            assert self.state_manager.get_outlier_method() == "IQR"
    
    def test_outlier_threshold_change(self):
        """Test outlier threshold change."""
        # Mock streamlit functions
        with patch('streamlit.sidebar.slider') as mock_slider, \
             patch('streamlit.sidebar.selectbox') as mock_selectbox:
            # Set return value for slider and selectbox
            mock_selectbox.return_value = "None"  # outlier_method
            mock_slider.side_effect = [15.0, 0.5, 3.0]  # duplicate_threshold, min_confidence, outlier_threshold
            
            # Render component
            self.controls.render()
            
            # Check that threshold was updated
            assert self.state_manager.get_outlier_threshold() == 3.0
    
    def test_load_image_button(self):
        """Test load image button."""
        # Mock streamlit functions
        with patch('streamlit.sidebar.button') as mock_button:
            # Set return value for button
            mock_button.return_value = True
            
            # Render component
            self.controls.render()
            
            # Check that button was rendered
            mock_button.assert_called()
    
    def test_analyze_shots_button(self):
        """Test analyze shots button."""
        # Mock streamlit functions
        with patch('streamlit.sidebar.button') as mock_button:
            # Set return value for button
            mock_button.return_value = True
            
            # Render component
            self.controls.render()
            
            # Check that button was rendered
            mock_button.assert_called()
    
    def test_clear_data_button(self):
        """Test clear data button."""
        # Mock streamlit functions
        with patch('streamlit.sidebar.button') as mock_button:
            # Set return value for button
            mock_button.return_value = True
            
            # Render component
            self.controls.render()
            
            # Check that button was rendered
            mock_button.assert_called()
    
    def test_disabled_buttons_with_no_data(self):
        """Test that buttons are disabled when no data is loaded."""
        # Mock streamlit functions
        with patch('streamlit.sidebar.button') as mock_button:
            # Render component with no data
            self.controls.render()
            
            # Check that analyze button was disabled
            analyze_call = None
            for call in mock_button.call_args_list:
                if 'Analyze' in str(call):
                    analyze_call = call
                    break
            
            assert analyze_call is not None
            assert analyze_call[1]['disabled'] is True
    
    def test_enabled_buttons_with_data(self):
        """Test that buttons are enabled when data is loaded."""
        # Set shots in state
        self.state_manager.set_shots(get_sample_shots_5())
        
        # Mock streamlit functions
        with patch('streamlit.sidebar.button') as mock_button:
            # Render component with data
            self.controls.render()
            
            # Check that analyze button was enabled
            analyze_call = None
            for call in mock_button.call_args_list:
                if 'Analyze' in str(call):
                    analyze_call = call
                    break
            
            assert analyze_call is not None
            assert analyze_call[1]['disabled'] is False


class TestComponentIntegration:
    """Test cases for component integration."""
    
    def setup_method(self):
        """Set up test method."""
        # Mock streamlit session state with our custom mock
        self.mock_session_state = MockSessionState()
        
        # Patch streamlit session state
        self.session_patcher = patch('streamlit.session_state', self.mock_session_state)
        self.session_patcher.start()
        
        self.state_manager = StateManager()
    
    def teardown_method(self):
        """Clean up after test."""
        self.session_patcher.stop()
    
    def test_full_workflow(self):
        """Test full workflow with all components."""
        # Create components
        image_display = ImageDisplay()
        metrics_panel = MetricsPanelComponent()
        controls = ControlsComponent()
        
        # Create a temporary image file with actual image content
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            # Create a simple test image
            test_image = PILImage.new('RGB', (100, 100), color='red')
            test_image.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            # Mock streamlit functions
            with patch('src.ui_layer.components.image_display.st.image'), \
                 patch('streamlit.metric'), \
                 patch('streamlit.button') as mock_button, \
                 patch('streamlit.selectbox') as mock_selectbox, \
                 patch('streamlit.slider') as mock_slider, \
                 patch('streamlit.radio') as mock_radio:
                
                # Set up button return values
                def button_side_effect(label, **kwargs):
                    if 'Load Image' in str(label):
                        return True
                    elif 'Analyze' in str(label):
                        return True
                    return False
                
                mock_button.side_effect = button_side_effect
                
                # Set up selectbox return value
                mock_selectbox.return_value = "Local Files"
                
                # Set up radio return value
                mock_radio.return_value = "Local Files"
                
                # Set up slider return values
                mock_slider.return_value = 15.0
                
                # Step 1: Load image
                self.state_manager.set_current_image(temp_path)
                
                # Step 2: Load shots
                self.state_manager.set_shots(get_sample_shots_5())
                
                # Step 3: Render controls
                controls.render()
                
                # Step 4: Render image display
                image_display.render(state_manager=self.state_manager)
                
                # Step 5: Render metrics panel
                metrics_panel.render()
                
                # Check that state is consistent
                assert self.state_manager.get_shots() == get_sample_shots_5()
                assert self.state_manager.get_current_image() == temp_path
                
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def test_state_consistency(self):
        """Test that state remains consistent across components."""
        # Create components
        image_display = ImageDisplay()
        metrics_panel = MetricsPanelComponent()
        controls = ControlsComponent()
        
        # Mock streamlit functions
        with patch('streamlit.info'), \
             patch('streamlit.metric'), \
             patch('streamlit.button'), \
             patch('streamlit.selectbox') as mock_selectbox, \
             patch('streamlit.slider') as mock_slider, \
             patch('streamlit.radio') as mock_radio:
            
            # Set up return values
            mock_selectbox.return_value = "Local Files"
            mock_radio.return_value = "Local Files"
            mock_slider.return_value = 15.0
            
            # Set initial state
            self.state_manager.set_shots(get_sample_shots_5())
            self.state_manager.set_duplicate_threshold(20.0)
            self.state_manager.set_min_confidence(0.8)
            
            # Render all components
            image_display.render(state_manager=self.state_manager)
            metrics_panel.render()
            controls.render()
            
            # Check that state is consistent
            assert self.state_manager.get_shots() == get_sample_shots_5()
            assert self.state_manager.get_duplicate_threshold() == 20.0
            assert self.state_manager.get_min_confidence() == 0.8


if __name__ == "__main__":
    pytest.main([__file__])
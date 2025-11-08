"""Unit tests for state management."""

import pytest
import streamlit as st
from unittest.mock import patch, MagicMock
import tempfile
import json
from pathlib import Path

from src.ui_layer.state_management import StateManager
from src.analysis_engine.models import Shot, Point
from src.utils.exceptions import ValidationError
from tests.fixtures.sample_shots import get_sample_shots_5
from tests.conftest import MockSessionState


class TestStateManager:
    """Test cases for StateManager class."""
    
    def setup_method(self):
        """Set up test method."""
        # Mock streamlit session state with our custom mock
        self.mock_session_state = MockSessionState()
        
        # Patch streamlit session state
        self.session_patcher = patch('streamlit.session_state', self.mock_session_state)
        self.session_patcher.start()
        
        self.manager = StateManager()
    
    def teardown_method(self):
        """Clean up after test."""
        self.session_patcher.stop()
    
    def test_initialization(self):
        """Test state manager initialization."""
        # Check that default state is set
        assert 'shots' in self.mock_session_state
        assert self.mock_session_state['shots'] == []
        
        assert 'filtered_shots' in self.mock_session_state
        assert self.mock_session_state['filtered_shots'] == []
        
        assert 'current_image' in self.mock_session_state
        assert self.mock_session_state['current_image'] is None
        
        assert 'analysis_mode' in self.mock_session_state
        assert self.mock_session_state['analysis_mode'] == "Local Files"
        
        assert 'duplicate_threshold' in self.mock_session_state
        assert self.mock_session_state['duplicate_threshold'] == 15.0
        
        assert 'min_confidence' in self.mock_session_state
        assert self.mock_session_state['min_confidence'] == 0.5
        
        assert 'outlier_method' in self.mock_session_state
        assert self.mock_session_state['outlier_method'] == "None"
        
        assert 'outlier_threshold' in self.mock_session_state
        assert self.mock_session_state['outlier_threshold'] == 2.0
        
        assert 'session_id' in self.mock_session_state
        assert len(self.mock_session_state['session_id']) == 8  # UUID length
        
        assert 'session_created_at' in self.mock_session_state
        
        assert 'analysis_history' in self.mock_session_state
        assert self.mock_session_state['analysis_history'] == []
    
    def test_get_shots(self):
        """Test getting shots from session state."""
        # Set test shots
        test_shots = get_sample_shots_5()
        self.mock_session_state['shots'] = test_shots
        
        # Get shots
        result = self.manager.get_shots()
        
        assert result == test_shots
        assert isinstance(result, list)
    
    def test_set_shots(self):
        """Test setting shots in session state."""
        # Set test shots
        test_shots = get_sample_shots_5()
        
        # Set shots
        self.manager.set_shots(test_shots)
        
        # Check that shots were set
        assert self.mock_session_state['shots'] == test_shots
        
        # Check that history was updated
        assert len(self.mock_session_state['analysis_history']) > 0
        assert self.mock_session_state['analysis_history'][-1]['action'] == 'shots_updated'
        assert self.mock_session_state['analysis_history'][-1]['data']['shot_count'] == len(test_shots)
    
    def test_get_filtered_shots(self):
        """Test getting filtered shots from session state."""
        # Set test shots
        test_shots = get_sample_shots_5()
        self.mock_session_state['filtered_shots'] = test_shots
        
        # Get filtered shots
        result = self.manager.get_filtered_shots()
        
        assert result == test_shots
        assert isinstance(result, list)
    
    def test_set_filtered_shots(self):
        """Test setting filtered shots in session state."""
        # Set test shots
        test_shots = get_sample_shots_5()
        
        # Set filtered shots
        self.manager.set_filtered_shots(test_shots)
        
        # Check that filtered shots were set
        assert self.mock_session_state['filtered_shots'] == test_shots
        
        # Check that history was updated
        assert len(self.mock_session_state['analysis_history']) > 0
        assert self.mock_session_state['analysis_history'][-1]['action'] == 'filtering'
        assert self.mock_session_state['analysis_history'][-1]['data']['filtered_count'] == len(test_shots)
    
    def test_get_current_image(self):
        """Test getting current image from session state."""
        # Set test image
        test_image = "test_image_data"
        self.mock_session_state['current_image'] = test_image
        
        # Get current image
        result = self.manager.get_current_image()
        
        assert result == test_image
    
    def test_set_current_image(self):
        """Test setting current image in session state."""
        # Set test image
        test_image = "test_image_data"
        
        # Set current image
        self.manager.set_current_image(test_image)
        
        # Check that image was set
        assert self.mock_session_state['current_image'] == test_image
        
        # Check that history was updated
        assert len(self.mock_session_state['analysis_history']) > 0
        assert self.mock_session_state['analysis_history'][-1]['action'] == 'image_loaded'
    
    def test_get_mpi(self):
        """Test getting MPI from session state."""
        # Set test MPI
        test_mpi = Point(x=100, y=100)
        self.mock_session_state['mpi'] = {'x': 100, 'y': 100}
        
        # Get MPI
        result = self.manager.get_mpi()
        
        assert result is not None
        assert result.x == 100
        assert result.y == 100
        assert isinstance(result, Point)
    
    def test_set_mpi(self):
        """Test setting MPI in session state."""
        # Set test MPI
        test_mpi = Point(x=100, y=100)
        
        # Set MPI
        self.manager.set_mpi(test_mpi)
        
        # Check that MPI was set
        assert self.mock_session_state['mpi'] == {'x': 100, 'y': 100}
        
        # Check that history was updated
        assert len(self.mock_session_state['analysis_history']) > 0
        assert self.mock_session_state['analysis_history'][-1]['action'] == 'mpi_calculated'
        assert self.mock_session_state['analysis_history'][-1]['data']['mpi']['x'] == 100
        assert self.mock_session_state['analysis_history'][-1]['data']['mpi']['y'] == 100
    
    def test_set_mpi_none(self):
        """Test setting None MPI in session state."""
        # Set None MPI
        self.manager.set_mpi(None)
        
        # Check that MPI was set to None
        assert self.mock_session_state['mpi'] is None
        
        # Check that history was updated
        assert len(self.mock_session_state['analysis_history']) > 0
        assert self.mock_session_state['analysis_history'][-1]['action'] == 'mpi_calculated'
        assert self.mock_session_state['analysis_history'][-1]['data']['mpi'] is None
    
    def test_get_analysis_mode(self):
        """Test getting analysis mode from session state."""
        # Set test mode
        test_mode = "Live Camera"
        self.mock_session_state['analysis_mode'] = test_mode
        
        # Get analysis mode
        result = self.manager.get_analysis_mode()
        
        assert result == test_mode
        assert isinstance(result, str)
    
    def test_set_analysis_mode(self):
        """Test setting analysis mode in session state."""
        # Set test mode
        test_mode = "Live Camera"
        
        # Set analysis mode
        self.manager.set_analysis_mode(test_mode)
        
        # Check that mode was set
        assert self.mock_session_state['analysis_mode'] == test_mode
        
        # Check that history was updated
        assert len(self.mock_session_state['analysis_history']) > 0
        assert self.mock_session_state['analysis_history'][-1]['action'] == 'mode_changed'
        assert self.mock_session_state['analysis_history'][-1]['data']['mode'] == test_mode
    
    def test_set_analysis_mode_invalid(self):
        """Test setting invalid analysis mode."""
        # Test invalid mode
        with pytest.raises(ValidationError):
            self.manager.set_analysis_mode("Invalid Mode")
    
    def test_get_duplicate_threshold(self):
        """Test getting duplicate threshold from session state."""
        # Set test threshold
        test_threshold = 25.0
        self.mock_session_state['duplicate_threshold'] = test_threshold
        
        # Get threshold
        result = self.manager.get_duplicate_threshold()
        
        assert result == test_threshold
        assert isinstance(result, float)
    
    def test_set_duplicate_threshold(self):
        """Test setting duplicate threshold in session state."""
        # Set test threshold
        test_threshold = 25.0
        
        # Set threshold
        self.manager.set_duplicate_threshold(test_threshold)
        
        # Check that threshold was set
        assert self.mock_session_state['duplicate_threshold'] == test_threshold
        
        # Check that history was updated
        assert len(self.mock_session_state['analysis_history']) > 0
        assert self.mock_session_state['analysis_history'][-1]['action'] == 'threshold_changed'
        assert self.mock_session_state['analysis_history'][-1]['data']['type'] == 'duplicate'
        assert self.mock_session_state['analysis_history'][-1]['data']['value'] == test_threshold
    
    def test_set_duplicate_threshold_invalid(self):
        """Test setting invalid duplicate threshold."""
        # Test invalid thresholds
        with pytest.raises(ValidationError):
            self.manager.set_duplicate_threshold(4.0)  # Too low
        
        with pytest.raises(ValidationError):
            self.manager.set_duplicate_threshold(60.0)  # Too high
    
    def test_get_min_confidence(self):
        """Test getting minimum confidence from session state."""
        # Set test confidence
        test_confidence = 0.8
        self.mock_session_state['min_confidence'] = test_confidence
        
        # Get confidence
        result = self.manager.get_min_confidence()
        
        assert result == test_confidence
        assert isinstance(result, float)
    
    def test_set_min_confidence(self):
        """Test setting minimum confidence in session state."""
        # Set test confidence
        test_confidence = 0.8
        
        # Set confidence
        self.manager.set_min_confidence(test_confidence)
        
        # Check that confidence was set
        assert self.mock_session_state['min_confidence'] == test_confidence
        
        # Check that history was updated
        assert len(self.mock_session_state['analysis_history']) > 0
        assert self.mock_session_state['analysis_history'][-1]['action'] == 'threshold_changed'
        assert self.mock_session_state['analysis_history'][-1]['data']['type'] == 'confidence'
        assert self.mock_session_state['analysis_history'][-1]['data']['value'] == test_confidence
    
    def test_set_min_confidence_invalid(self):
        """Test setting invalid minimum confidence."""
        # Test invalid confidences
        with pytest.raises(ValidationError):
            self.manager.set_min_confidence(-0.1)  # Too low
        
        with pytest.raises(ValidationError):
            self.manager.set_min_confidence(1.5)  # Too high
    
    def test_get_outlier_method(self):
        """Test getting outlier method from session state."""
        # Set test method
        test_method = "IQR"
        self.mock_session_state['outlier_method'] = test_method
        
        # Get method
        result = self.manager.get_outlier_method()
        
        assert result == test_method
        assert isinstance(result, str)
    
    def test_set_outlier_method(self):
        """Test setting outlier method in session state."""
        # Set test method
        test_method = "IQR"
        
        # Set method
        self.manager.set_outlier_method(test_method)
        
        # Check that method was set
        assert self.mock_session_state['outlier_method'] == test_method
        
        # Check that history was updated
        assert len(self.mock_session_state['analysis_history']) > 0
        assert self.mock_session_state['analysis_history'][-1]['action'] == 'outlier_method_changed'
        assert self.mock_session_state['analysis_history'][-1]['data']['method'] == test_method
    
    def test_set_outlier_method_invalid(self):
        """Test setting invalid outlier method."""
        # Test invalid method
        with pytest.raises(ValidationError):
            self.manager.set_outlier_method("Invalid Method")
    
    def test_get_outlier_threshold(self):
        """Test getting outlier threshold from session state."""
        # Set test threshold
        test_threshold = 3.5
        self.mock_session_state['outlier_threshold'] = test_threshold
        
        # Get threshold
        result = self.manager.get_outlier_threshold()
        
        assert result == test_threshold
        assert isinstance(result, float)
    
    def test_set_outlier_threshold(self):
        """Test setting outlier threshold in session state."""
        # Set test threshold
        test_threshold = 3.5
        
        # Set threshold
        self.manager.set_outlier_threshold(test_threshold)
        
        # Check that threshold was set
        assert self.mock_session_state['outlier_threshold'] == test_threshold
        
        # Check that history was updated
        assert len(self.mock_session_state['analysis_history']) > 0
        assert self.mock_session_state['analysis_history'][-1]['action'] == 'threshold_changed'
        assert self.mock_session_state['analysis_history'][-1]['data']['type'] == 'outlier'
        assert self.mock_session_state['analysis_history'][-1]['data']['value'] == test_threshold
    
    def test_set_outlier_threshold_invalid(self):
        """Test setting invalid outlier threshold."""
        # Test invalid thresholds
        with pytest.raises(ValidationError):
            self.manager.set_outlier_threshold(0.3)  # Too low
        
        with pytest.raises(ValidationError):
            self.manager.set_outlier_threshold(6.0)  # Too high
    
    def test_get_session_id(self):
        """Test getting session ID from session state."""
        # Set test session ID
        test_id = "test_session_123"
        self.mock_session_state['session_id'] = test_id
        
        # Get session ID
        result = self.manager.get_session_id()
        
        assert result == test_id
        assert isinstance(result, str)
    
    def test_get_session_created_at(self):
        """Test getting session creation time from session state."""
        # Set test time
        test_time = "2023-01-01T12:00:00"
        self.mock_session_state['session_created_at'] = test_time
        
        # Get session creation time
        result = self.manager.get_session_created_at()
        
        assert result == test_time
        assert isinstance(result, str)
    
    def test_get_analysis_history(self):
        """Test getting analysis history from session state."""
        # Set test history
        test_history = [
            {'action': 'test_action_1', 'data': {'key': 'value1'}},
            {'action': 'test_action_2', 'data': {'key': 'value2'}}
        ]
        self.mock_session_state['analysis_history'] = test_history
        
        # Get analysis history
        result = self.manager.get_analysis_history()
        
        assert result == test_history
        assert isinstance(result, list)
    
    def test_save_session(self):
        """Test saving session to file."""
        # Set up test data
        test_shots = get_sample_shots_5()
        self.mock_session_state['shots'] = test_shots
        self.mock_session_state['session_id'] = "test_session"
        self.mock_session_state['session_created_at'] = "2023-01-01T12:00:00"
        
        # Create temporary directory for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create sessions directory in temp folder
            sessions_dir = Path(temp_dir) / "sessions"
            sessions_dir.mkdir(exist_ok=True)
            
            # Patch sessions directory creation
            with patch('src.ui_layer.state_management.Path') as mock_path:
                # Return our temp sessions directory
                mock_path.return_value = sessions_dir
                
                # Save session with specific filename
                saved_path = self.manager.save_session("test_session.json")
                
                # Check that file was created
                assert saved_path.endswith('.json')
                assert 'test_session' in saved_path
                
                # Check file content
                with open(saved_path, 'r') as f:
                    saved_data = json.load(f)
                    
                    assert saved_data['session_id'] == "test_session"
                    assert saved_data['state']['shots'] == [
                        shot.to_dict() for shot in test_shots
                    ]
    
    def test_load_session(self):
        """Test loading session from file."""
        # Create test session file
        test_shots = get_sample_shots_5()
        test_data = {
            'session_id': 'test_load_session',
            'state': {
                'shots': [shot.to_dict() for shot in test_shots]
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            json.dump(test_data, temp_file)
            temp_path = temp_file.name
        
        # Load session
        result = self.manager.load_session(temp_path)
        
        assert result is True
        
        # Check that session state was updated
        assert self.mock_session_state['session_id'] == 'test_load_session'
        assert len(self.mock_session_state['shots']) == len(test_shots)
    
    def test_load_session_invalid_file(self):
        """Test loading invalid session file."""
        # Test invalid file
        with pytest.raises(ValidationError):
            self.manager.load_session("nonexistent_file.json")
        
        # Test invalid format
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            temp_file.write('{"invalid": "format"}')
            temp_path = temp_file.name
        
        with pytest.raises(ValidationError):
            self.manager.load_session(temp_path)
    
    def test_clear_session(self):
        """Test clearing session state."""
        # Set up test data
        test_shots = get_sample_shots_5()
        self.mock_session_state['shots'] = test_shots
        self.mock_session_state['session_id'] = "test_session"
        
        # Clear session
        self.manager.clear_session()
        
        # Check that session was reset to defaults
        assert self.mock_session_state['shots'] == []
        assert self.mock_session_state['filtered_shots'] == []
        assert self.mock_session_state['current_image'] is None
        assert self.mock_session_state['mpi'] is None
        assert self.mock_session_state['analysis_mode'] == "Local Files"
        assert self.mock_session_state['duplicate_threshold'] == 15.0
        assert self.mock_session_state['min_confidence'] == 0.5
        assert self.mock_session_state['outlier_method'] == "None"
        assert self.mock_session_state['outlier_threshold'] == 2.0
        assert self.mock_session_state['analysis_history'] == []

        # Check that session ID was regenerated
        assert len(self.mock_session_state['session_id']) == 8  # UUID length
    
    def test_get_session_summary(self):
        """Test getting session summary."""
        # Set up test data
        test_shots = get_sample_shots_5()
        self.mock_session_state['shots'] = test_shots
        self.mock_session_state['session_id'] = "test_session"
        self.mock_session_state['session_created_at'] = "2023-01-01T12:00:00"
        self.mock_session_state['analysis_mode'] = "Local Files"
        self.mock_session_state['duplicate_threshold'] = 20.0
        self.mock_session_state['min_confidence'] = 0.8
        self.mock_session_state['outlier_method'] = "IQR"
        self.mock_session_state['outlier_threshold'] = 3.0
        
        # Get session summary
        summary = self.manager.get_session_summary()
        
        # Check summary structure
        required_keys = [
            'session_id', 'created_at', 'analysis_mode', 'total_shots',
            'filtered_shots', 'has_image', 'has_mpi', 'settings'
        ]
        
        for key in required_keys:
            assert key in summary
        
        # Check values
        assert summary['session_id'] == "test_session"
        assert summary['total_shots'] == len(test_shots)
        assert summary['filtered_shots'] == 0  # No filtering applied
        assert summary['has_image'] is False
        assert summary['has_mpi'] is False
        assert summary['settings']['duplicate_threshold'] == 20.0
        assert summary['settings']['min_confidence'] == 0.8
        assert summary['settings']['outlier_method'] == "IQR"
        assert summary['settings']['outlier_threshold'] == 3.0
    
    def test_validate_state(self):
        """Test session state validation."""
        # Set up valid state
        test_shots = get_sample_shots_5()
        self.mock_session_state['shots'] = test_shots
        self.mock_session_state['duplicate_threshold'] = 15.0
        self.mock_session_state['min_confidence'] = 0.5
        self.mock_session_state['session_id'] = "test_session"
        
        # Should validate successfully
        assert self.manager.validate_state() is True
        
        # Test missing required keys
        del self.mock_session_state['session_id']
        assert self.manager.validate_state() is False
        
        # Test invalid data types
        self.mock_session_state['shots'] = "not_a_list"
        assert self.manager.validate_state() is False
        
        self.mock_session_state['duplicate_threshold'] = "not_a_number"
        assert self.manager.validate_state() is False
        
        # Test invalid value ranges
        self.mock_session_state['min_confidence'] = -0.1
        assert self.manager.validate_state() is False
        
        self.mock_session_state['min_confidence'] = 1.5
        assert self.manager.validate_state() is False


if __name__ == "__main__":
    pytest.main([__file__])
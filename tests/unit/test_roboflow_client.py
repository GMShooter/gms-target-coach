"""Unit tests for Roboflow client functionality."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from src.clients.roboflow_client import RoboflowClient
from src.analysis_engine.models import Shot


class TestRoboflowClient:
    """Test cases for RoboflowClient class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock inference_sdk import
        self.mock_inference_patcher = patch('src.clients.roboflow_client.INFERENCE_SDK_AVAILABLE', True)
        self.mock_inference_patcher.start()
        
        # Mock the InferenceHTTPClient class
        self.mock_http_client = MagicMock()
        
        self.client = RoboflowClient()
    
    def teardown_method(self):
        """Clean up after tests."""
        self.mock_inference_patcher.stop()
    
    def test_init_with_inference_sdk(self):
        """Test initialization when inference_sdk is available."""
        with patch('src.clients.roboflow_client.INFERENCE_SDK_AVAILABLE', True):
            client = RoboflowClient()
            # Client should be initialized (we can't easily test the internal client)
            assert client is not None
    
    def test_init_without_inference_sdk(self):
        """Test initialization when inference_sdk is not available."""
        # Create a client with mocked inference_sdk import
        with patch('src.clients.roboflow_client.InferenceHTTPClient') as mock_inference_http:
            with patch('src.clients.roboflow_client.InferenceHTTPClient') as mock_client_class:
                # Mock the InferenceHTTPClient class
                mock_client_class.return_value = MagicMock()
                
                # Patch the import to return our mocked class
                with patch('inference_sdk', InferenceHTTPClient=mock_inference_http):
                    client = RoboflowClient()
                    # In mock mode, client.client should be None
                    assert client.client is None
    
    def test_detect_holes_mock_mode(self):
        """Test hole detection in mock mode."""
        with patch('src.clients.roboflow_client.INFERENCE_SDK_AVAILABLE', False):
            client = RoboflowClient()
            shots = client.detect_holes("test_image.jpg")
            
            assert len(shots) == 3  # Mock mode returns 3 shots
            assert all(isinstance(shot, Shot) for shot in shots)
            assert all(0 <= shot.confidence <= 1.0 for shot in shots)
    
    def test_detect_holes_with_real_client(self):
        """Test hole detection with real client."""
        # Mock the client's internal client
        self.client.client = self.mock_http_client
        
        # Mock the workflow run - match actual SDK structure
        mock_result = {
            "output": {
                "predictions": {
                    "predictions": [
                        {"x": 100, "y": 200, "confidence": 0.95},
                        {"x": 150, "y": 250, "confidence": 0.87}
                    ]
                }
            }
        }
        
        self.client.client.run_workflow.return_value = mock_result
        
        shots = self.client.detect_holes("test_image.jpg")
        
        assert len(shots) == 2
        assert shots[0].x == 100
        assert shots[0].y == 200
        assert shots[0].confidence == 0.95
        assert shots[1].x == 150
        assert shots[1].y == 250
        assert shots[1].confidence == 0.87
    
    def test_extract_shots_from_empty_result(self):
        """Test extracting shots from empty result."""
        shots = self.client._extract_shots_from_result({})
        assert len(shots) == 0
    
    def test_extract_shots_from_nested_predictions(self):
        """Test extracting shots from nested predictions structure."""
        result = [{
            "output": {
                "predictions": {
                    "predictions": [
                        {"x": 100, "y": 200, "confidence": 0.95},
                        {"x": 150, "y": 250, "confidence": 0.87}
                    ]
                }
            }
        }]
        
        shots = self.client._extract_shots_from_result(result)
        
        assert len(shots) == 2
        assert shots[0].x == 100
        assert shots[0].y == 200
        assert shots[0].confidence == 0.95
        assert shots[1].x == 150
        assert shots[1].y == 250
        assert shots[1].confidence == 0.87
    
    def test_extract_shots_from_flat_predictions(self):
        """Test extracting shots from flat predictions structure."""
        result = [{
            "output": {
                "predictions": [
                    {"x": 100, "y": 200, "confidence": 0.95},
                    {"x": 150, "y": 250, "confidence": 0.87}
                ]
            }
        }]
        
        shots = self.client._extract_shots_from_result(result)
        
        assert len(shots) == 2
        assert shots[0].x == 100
        assert shots[0].y == 200
        assert shots[0].confidence == 0.95
        assert shots[1].x == 150
        assert shots[1].y == 250
        assert shots[1].confidence == 0.87
    
    def test_test_connection_mock_mode(self):
        """Test connection test in mock mode."""
        with patch('src.clients.roboflow_client.INFERENCE_SDK_AVAILABLE', False):
            client = RoboflowClient()
            result = client.test_connection()
            assert result is True  # Mock mode always returns True
    
    def test_test_connection_real_mode(self):
        """Test connection test with real client."""
        # In real mode, it should return True if client initializes successfully
        result = self.client.test_connection()
        assert result is True
    
    def test_get_model_info(self):
        """Test getting model information."""
        model_info = self.client.get_model_info()
        
        assert "model_id" in model_info
        assert "api_url" in model_info
        assert "workspace" in model_info
        assert "workflow_id" in model_info
        assert model_info["workspace"] == "gmshooter"
        assert model_info["workflow_id"] == "production-inference-sahi-detr-2-2"
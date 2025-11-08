"""Unit tests for Roboflow client functionality."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from src.clients.roboflow_client import RoboflowClient
from src.analysis_engine.models import Shot


class TestRoboflowClient:
    """Test cases for RoboflowClient class."""
    
    def test_init_with_inference_sdk(self):
        """Test initialization when inference_sdk is available."""
        # Mock the import at the module level
        with patch('builtins.__import__') as mock_import:
            # Create a mock InferenceHTTPClient class
            mock_inference_module = MagicMock()
            mock_inference_module.InferenceHTTPClient = MagicMock()
            
            # Make the import return our mock module
            mock_import.return_value = mock_inference_module
            
            with patch('src.clients.roboflow_client.config') as mock_config:
                mock_config.roboflow.url = "https://test.roboflow.com"
                mock_config.roboflow.api_key = "test_key"
                
                client = RoboflowClient()
                # Client should be initialized
                assert client is not None
                assert client.client is not None
    
    def test_init_without_inference_sdk(self):
        """Test initialization when inference_sdk is not available."""
        # Mock the import to fail
        with patch('builtins.__import__', side_effect=ImportError("No module named 'inference_sdk'")):
            client = RoboflowClient()
            # In mock mode, client.client should be None
            assert client.client is None
    
    def test_detect_holes_mock_mode(self):
        """Test hole detection in mock mode."""
        # Create a client in mock mode by mocking the import to fail
        with patch('builtins.__import__', side_effect=ImportError("No module named 'inference_sdk'")):
            client = RoboflowClient()
            shots = client.detect_holes("test_image.jpg")
           
            assert len(shots) == 3  # Mock mode returns 3 shots
            assert all(isinstance(shot, Shot) for shot in shots)
            assert all(0 <= shot.confidence <= 1.0 for shot in shots)
    
    def test_detect_holes_with_real_client(self):
        """Test hole detection with real client."""
        # Mock the import at the module level
        with patch('builtins.__import__') as mock_import:
            # Create a mock InferenceHTTPClient class
            mock_inference_module = MagicMock()
            mock_client_class = MagicMock()
            mock_inference_module.InferenceHTTPClient = mock_client_class
            
            # Make the import return our mock module
            mock_import.return_value = mock_inference_module
            
            with patch('src.clients.roboflow_client.config') as mock_config:
                mock_config.roboflow.url = "https://test.roboflow.com"
                mock_config.roboflow.api_key = "test_key"
                
                # Create client
                client = RoboflowClient()
                
                # Mock the workflow run - match actual SDK structure
                mock_result = [{
                    "outputs": {
                        "predictions": [
                            {"x": 100, "y": 200, "confidence": 0.95},
                            {"x": 150, "y": 250, "confidence": 0.87}
                        ]
                    }
                }]
                
                mock_client_class.return_value.run_workflow.return_value = mock_result
                
                shots = client.detect_holes("test_image.jpg")
                
                assert len(shots) == 2
                assert shots[0].x == 100
                assert shots[0].y == 200
                assert shots[0].confidence == 0.95
                assert shots[1].x == 150
                assert shots[1].y == 250
                assert shots[1].confidence == 0.87
    
    def test_extract_shots_from_empty_result(self):
        """Test extracting shots from empty result."""
        # Create a client in mock mode
        with patch('builtins.__import__', side_effect=ImportError("No module named 'inference_sdk'")):
            client = RoboflowClient()
            shots = client._extract_shots_from_result({})
            assert len(shots) == 0
    
    def test_extract_shots_from_nested_predictions(self):
        """Test extracting shots from nested predictions structure."""
        # Create a client in mock mode
        with patch('builtins.__import__', side_effect=ImportError("No module named 'inference_sdk'")):
            client = RoboflowClient()
            
            result = [{
                "outputs": {
                    "predictions": {
                        "predictions": [
                            {"x": 100, "y": 200, "confidence": 0.95},
                            {"x": 150, "y": 250, "confidence": 0.87}
                        ]
                    }
                }
            }]
            
            shots = client._extract_shots_from_result(result)
            
            assert len(shots) == 2
            assert shots[0].x == 100
            assert shots[0].y == 200
            assert shots[0].confidence == 0.95
            assert shots[1].x == 150
            assert shots[1].y == 250
            assert shots[1].confidence == 0.87
    
    def test_extract_shots_from_flat_predictions(self):
        """Test extracting shots from flat predictions structure."""
        # Create a client in mock mode
        with patch('builtins.__import__', side_effect=ImportError("No module named 'inference_sdk'")):
            client = RoboflowClient()
            
            result = [{
                "outputs": {
                    "predictions": [
                        {"x": 100, "y": 200, "confidence": 0.95},
                        {"x": 150, "y": 250, "confidence": 0.87}
                    ]
                }
            }]
            
            shots = client._extract_shots_from_result(result)
            
            assert len(shots) == 2
            assert shots[0].x == 100
            assert shots[0].y == 200
            assert shots[0].confidence == 0.95
            assert shots[1].x == 150
            assert shots[1].y == 250
            assert shots[1].confidence == 0.87
    
    def test_test_connection_mock_mode(self):
        """Test connection test in mock mode."""
        # Create a client in mock mode
        with patch('builtins.__import__', side_effect=ImportError("No module named 'inference_sdk'")):
            client = RoboflowClient()
            result = client.test_connection()
            assert result is True  # Mock mode always returns True
    
    def test_test_connection_real_mode(self):
        """Test connection test with real client."""
        # Mock the import at the module level
        with patch('builtins.__import__') as mock_import:
            # Create a mock InferenceHTTPClient class
            mock_inference_module = MagicMock()
            mock_client_class = MagicMock()
            mock_inference_module.InferenceHTTPClient = mock_client_class
            
            # Make the import return our mock module
            mock_import.return_value = mock_inference_module
            
            with patch('src.clients.roboflow_client.config') as mock_config:
                mock_config.roboflow.url = "https://test.roboflow.com"
                mock_config.roboflow.api_key = "test_key"
                
                # Create client
                client = RoboflowClient()
                
                # In real mode, it should return True if client initializes successfully
                result = client.test_connection()
                assert result is True
    
    def test_get_model_info(self):
        """Test getting model information."""
        # Create a client in mock mode
        with patch('builtins.__import__', side_effect=ImportError("No module named 'inference_sdk'")):
            with patch('src.clients.roboflow_client.config') as mock_config:
                mock_config.roboflow.model_id = "test_model"
                mock_config.roboflow.url = "https://test.roboflow.com"
                
                client = RoboflowClient()
                model_info = client.get_model_info()
                
                assert "model_id" in model_info
                assert "api_url" in model_info
                assert "workspace" in model_info
                assert "workflow_id" in model_info
                assert model_info["workspace"] == "gmshooter"
                assert model_info["workflow_id"] == "production-inference-sahi-detr-2-2"
#!/usr/bin/env python3
"""
Test script to verify Roboflow API connection after fixing authentication issue.
"""

import os
import sys
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Add src directory to path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

from src.utils.config import config
from src.clients.roboflow_client import RoboflowClient
from src.utils.exceptions import RoboflowError

def test_api_connection():
    """Test Roboflow API connection with updated credentials."""
    print("Testing Roboflow API connection...")
    print(f"API URL: {config.roboflow.url}")
    print(f"API Key (first 5 chars): {config.roboflow.api_key[:5]}...")
    print(f"Model ID: {config.roboflow.model_id}")
    
    try:
        # Validate configuration first
        config.validate()
        print("✓ Configuration validation passed")
        
        # Initialize client
        client = RoboflowClient()
        print("✓ Roboflow client initialized successfully")
        
        # Test connection
        if client.test_connection():
            print("✓ API connection test passed")
            return True
        else:
            print("✗ API connection test failed")
            return False
            
    except Exception as e:
        print(f"✗ Test failed with error: {e}")
        return False

if __name__ == "__main__":
    success = test_api_connection()
    if success:
        print("\n🎉 Roboflow API connection is working correctly!")
        print("The authentication issue has been resolved.")
    else:
        print("\n❌ Roboflow API connection is still failing.")
        print("Please check the error messages above for further details.")
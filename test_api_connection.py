import sys
from pathlib import Path

# Add src to path for imports
sys.path.append(str(Path(__file__).parent / "src"))

from src.clients.roboflow_client import roboflow_client
from src.utils.config import config

def main():
    print("--- Testing API Connection ---")
    print(f"Roboflow API Key is loaded (length: {len(config.roboflow.api_key)})")
    print(f"Roboflow URL: {config.roboflow.url}")
    print(f"Roboflow Model ID: {config.roboflow.model_id}")

    # Test connection
    connection_status = roboflow_client.test_connection()
    print(f"\nConnection test result: {connection_status}")

    if connection_status:
        print("\nAPI connection appears to be successful (client initialized without errors).")
    else:
        print("\nAPI connection failed.")

if __name__ == "__main__":
    main()
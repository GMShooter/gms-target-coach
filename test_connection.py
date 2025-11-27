import requests
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE", "https://f92126526c77.ngrok-free.app")
HEADERS = {"ngrok-skip-browser-warning": "true"}

print(f"Testing connection to: {BASE_URL}")

try:
    resp = requests.get(f"{BASE_URL}/health", headers=HEADERS, timeout=10)
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
except Exception as e:
    print(f"Error: {e}")

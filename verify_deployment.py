import requests
import time
import sys

def check_service(name, url):
    print(f"Checking {name} at {url}...", end=" ")
    try:
        r = requests.get(url, timeout=2)
        if r.status_code == 200:
            print("OK")
            return True
        else:
            print(f"FAIL (Status {r.status_code})")
            return False
    except Exception as e:
        print(f"FAIL ({e})")
        return False

def main():
    print("Verifying Deployment...")
    
    # Camera Service
    cam_ok = check_service("Camera Service", "http://localhost:8000/health")
    
    # Analysis Service (no direct health endpoint, check stream or just connect)
    # We can check if it accepts a connection
    analysis_ok = check_service("Analysis Service", "http://localhost:8001/docs")
    
    # UI Service
    ui_ok = check_service("UI Service", "http://localhost:8501/_stcore/health")
    
    if cam_ok and analysis_ok and ui_ok:
        print("\n✅ All systems GO!")
        sys.exit(0)
    else:
        print("\n❌ Some services are down.")
        sys.exit(1)

if __name__ == "__main__":
    main()

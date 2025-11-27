import os
import time
import requests
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel

app = FastAPI(title="Camera Service Proxy")

# Configuration
BASE_URL = os.getenv("BASE", "https://f92126526c77.ngrok-free.app")
NGROK_USER = os.getenv("NGROK_USER", "")
NGROK_PASS = os.getenv("NGROK_PASS", "")

# Headers to bypass ngrok warning
HEADERS = {"ngrok-skip-browser-warning": "true"}

# Cache
latest_frame_content = None
last_fetch_time = 0

from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# Configure robust session
retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
)
adapter = HTTPAdapter(max_retries=retry_strategy)
http = requests.Session()
http.mount("https://", adapter)
http.mount("http://", adapter)

def get_auth():
    if NGROK_USER and NGROK_PASS:
        return (NGROK_USER, NGROK_PASS)
    return None

@app.get("/health")
def health():
    # Check upstream health
    try:
        resp = http.get(f"{BASE_URL}/health", headers=HEADERS, auth=get_auth(), timeout=2)
        upstream_status = "ok" if resp.status_code == 200 else f"error_{resp.status_code}"
    except Exception as e:
        upstream_status = f"unreachable: {str(e)}"
        
    return {
        "status": "ok", 
        "proxy_target": BASE_URL,
        "upstream_health": upstream_status
    }

@app.get("/frame/latest")
def get_latest_frame():
    global latest_frame_content, last_fetch_time
    
    # Simple cache to prevent flooding the ngrok link
    if time.time() - last_fetch_time < 0.1 and latest_frame_content:
        return Response(content=latest_frame_content, media_type="image/jpeg")

    try:
        # Remote API is directly at /frame/latest (no /api prefix)
        resp = http.get(f"{BASE_URL}/frame/latest", headers=HEADERS, auth=get_auth(), timeout=10)
        if resp.status_code == 200:
            latest_frame_content = resp.content
            last_fetch_time = time.time()
            return Response(content=latest_frame_content, media_type="image/jpeg")
        else:
            # If remote fails, return cached if available
            if latest_frame_content:
                return Response(content=latest_frame_content, media_type="image/jpeg")
            raise HTTPException(status_code=502, detail=f"Remote camera error: {resp.status_code} - {resp.text[:100]}")
    except Exception as e:
        print(f"Camera fetch error: {e}")
        if latest_frame_content:
            return Response(content=latest_frame_content, media_type="image/jpeg")
        # Return a placeholder or error
        raise HTTPException(status_code=502, detail=str(e))

@app.post("/session/start")
def start_session(config: dict):
    # Forward to remote
    try:
        http.post(f"{BASE_URL}/session/start", json=config, headers=HEADERS, auth=get_auth(), timeout=10)
    except:
        pass
    return {"status": "started"}

@app.post("/session/stop")
def stop_session():
    try:
        http.post(f"{BASE_URL}/session/stop", headers=HEADERS, auth=get_auth(), timeout=10)
    except:
        pass
    return {"status": "stopped"}

@app.post("/zoom/preset")
def zoom_preset(config: dict):
    # config should be {"number": int}
    try:
        resp = http.post(f"{BASE_URL}/zoom/preset", json=config, headers=HEADERS, auth=get_auth(), timeout=10)
        if resp.status_code != 200:
             raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Debug endpoint
@app.post("/debug/frame")
async def set_debug_frame(file: bytes):
    global latest_frame_content
    latest_frame_content = file
    return {"status": "updated"}

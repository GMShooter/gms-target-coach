#!/usr/bin/env python3
import os
import sys
import time
import threading
import requests
from datetime import datetime
from pathlib import Path

# ========= Configuration =========
# Your ngrok base URL:
BASE = os.getenv("BASE", "https://f92126526c77.ngrok-free.app")

# Add this header to bypass ngrok’s interstitial page.
HDRS = {"ngrok-skip-browser-warning": "true"}

# If you enabled ngrok basic_auth in ngrok.yml, set these (otherwise leave None):
NGROK_BASIC_USER = os.getenv("NGROK_USER")     # e.g. "api"
NGROK_BASIC_PASS = os.getenv("NGROK_PASS")     # e.g. "secret123"
AUTH = (NGROK_BASIC_USER, NGROK_BASIC_PASS) if (NGROK_BASIC_USER and NGROK_BASIC_PASS) else None

# Where to save frames
FRAMES_DIR = Path("frames")
FRAMES_DIR.mkdir(exist_ok=True)

# ========= API helpers =========
def _get(path, **kw):
    url = f"{BASE}{path}"
    return requests.get(url, headers=HDRS, auth=AUTH, timeout=kw.pop("timeout", 10), **kw)

def _post(path, json=None, **kw):
    url = f"{BASE}{path}"
    return requests.post(url, json=json, headers=HDRS, auth=AUTH, timeout=kw.pop("timeout", 10), **kw)

def api_health():
    r = _get("/health", timeout=5)
    r.raise_for_status()
    return r.json()

def api_start_session(preset=None, distance=None, fps=1):
    payload = {}
    if preset is not None:
        payload["preset"] = int(preset)
    if distance is not None:
        payload["distance"] = str(distance)
    if fps:
        payload["fps"] = float(fps)
    r = _post("/session/start", json=payload, timeout=8)
    if r.status_code == 404:
        raise RuntimeError(r.text)
    r.raise_for_status()
    return r.json()

def api_stop_session():
    r = _post("/session/stop", json={}, timeout=5)
    r.raise_for_status()
    return r.json()

def api_zoom_preset(number: int):
    r = _post("/zoom/preset", json={"number": int(number)}, timeout=5)
    r.raise_for_status()
    return r.json()

def api_frame_latest():
    r = _get("/frame/latest", timeout=10)
    if r.status_code == 503:
        return None, None, None  # no frame yet
    r.raise_for_status()
    fid = int(r.headers.get("X-Frame-Id", "0") or "0")
    return fid, r.headers, r.content

def api_frame_next(since_id=None, timeout=10):
    url = f"/frame/next?timeout={int(timeout)}"
    if since_id is not None:
        url += f"&since={int(since_id)}"
    r = _get(url, timeout=timeout+2)
    if r.status_code == 204:
        return None, None, None
    r.raise_for_status()
    fid = int(r.headers.get("X-Frame-Id", "0") or "0")
    return fid, r.headers, r.content

# ========= Frame Fetcher (1 fps from server) =========
class FrameFetcher(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True)
        self._stop = threading.Event()
        self._last_id = None

    def stop(self):
        self._stop.set()

    def run(self):
        print("[fetch] started (1 fps server-side)")
        while not self._stop.is_set():
            try:
                fid, headers, data = api_frame_next(self._last_id, timeout=12)
                if fid is None:
                    # timeout waiting for next frame; try again
                    continue
                # Save to disk
                ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
                fname = FRAMES_DIR / f"frame_{fid}_{ts}.jpg"
                with open(fname, "wb") as f:
                    f.write(data)
                self._last_id = fid
                print(f"[fetch] saved {fname} (FrameId={fid})")
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"[fetch] error: {e}")
                time.sleep(1.0)
        print("[fetch] stopped")

# ========= Simple CLI =========
def main():
    print(f"[base] {BASE}")
    try:
        print("[health]", api_health())
    except Exception as e:
        print("Health check failed:", e)

    fetcher = None
    session_active = False

    print("""
Commands:
  start [fps]            Start session (no fetching yet) — default fps=1
  stop                   Stop session & stop fetching
  zoom N                 Zoom to preset N, wait 1s, then start fetching @1fps
  latest                 Download a single latest frame now
  quit / exit            Leave
""")

    while True:
        try:
            cmd = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not cmd:
            continue

        parts = cmd.split()
        op = parts[0].lower()

        if op in ("quit", "exit"):
            break

        elif op == "start":
            fps = 1
            if len(parts) >= 2:
                try:
                    fps = float(parts[1])
                except:
                    print("Invalid fps; using 1")
            try:
                rj = api_start_session(fps=fps)
                print("[session]", rj)
                session_active = True
            except Exception as e:
                print("Start session error:", e)

        elif op == "stop":
            # stop fetcher first
            if fetcher and fetcher.is_alive():
                fetcher.stop()
                fetcher.join(timeout=3)
                fetcher = None
            try:
                rj = api_stop_session()
                print("[session]", rj)
                session_active = False
            except Exception as e:
                print("Stop session error:", e)

        elif op == "zoom":
            if len(parts) < 2:
                print("Usage: zoom <preset_number>")
                continue
            try:
                n = int(parts[1])
                # Ensure session is active (server needs it for frames)
                if not session_active:
                    print("[info] session not active; starting @1fps…")
                    api_start_session(fps=1)
                    session_active = True
                # Send zoom
                rj = api_zoom_preset(n)
                print("[zoom]", rj)
                # Wait 1 sec, then start polling if not running
                time.sleep(1.0)
                if not fetcher or not fetcher.is_alive():
                    fetcher = FrameFetcher()
                    fetcher.start()
            except Exception as e:
                print("Zoom error:", e)

        elif op == "latest":
            try:
                fid, headers, data = api_frame_latest()
                if data is None:
                    print("No frame yet (session might not be running).")
                else:
                    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
                    fname = FRAMES_DIR / f"latest_{fid}_{ts}.jpg"
                    with open(fname, "wb") as f:
                        f.write(data)
                    print(f"Saved {fname} (FrameId={fid})")
            except Exception as e:
                print("Latest error:", e)

        else:
            print("Unknown command.")

    # Cleanup on exit
    if fetcher and fetcher.is_alive():
        fetcher.stop()
        fetcher.join(timeout=3)

if __name__ == "__main__":
    main()

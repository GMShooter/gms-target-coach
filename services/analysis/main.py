import asyncio
import json
import time
import os
import aiohttp
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, AsyncGenerator

from state_manager import StateManager, SessionState, Shot
from roboflow_service import RoboflowService
from metrics import MetricCalculator
from round_detector import RoundDetector

app = FastAPI(title="Analysis Service")

# ========= Dependencies =========
state_manager = StateManager()
roboflow_service = RoboflowService()
round_detector = RoundDetector()

CAMERA_SERVICE_URL = os.getenv("CAMERA_SERVICE_URL", "http://camera:8000")

# ========= Models =========
class SessionStartRequest(BaseModel):
    session_id: str = "default"

class CalibrationRequest(BaseModel):
    center_x: float
    center_y: float
    ring_width: float

# ========= Pipeline =========
async def analysis_pipeline():
    print("[pipeline] started")
    while True:
        try:
            if state_manager.state.status == SessionState.LIVE_SESSION:
                # 1. Fetch frame from Camera Service
                async with aiohttp.ClientSession() as session:
                    try:
                        async with session.get(f"{CAMERA_SERVICE_URL}/frame/latest", timeout=2) as resp:
                            if resp.status == 200:
                                frame_data = await resp.read()
                            else:
                                frame_data = None
                    except Exception as e:
                        print(f"[pipeline] camera fetch error: {e}")
                        frame_data = None

                if frame_data:
                    # 2. Inference
                    predictions = await roboflow_service.infer(frame_data)
                    
                    # 3. Process Predictions
                    current_time = time.time()
                    
                    if "predictions" in predictions:
                        for pred in predictions["predictions"]:
                            if pred["class"] == "hole" and pred["confidence"] > 0.4:
                                # Calculate Score
                                score = MetricCalculator.calculate_score(
                                    pred["x"], pred["y"], state_manager.state.calibration_data
                                )
                                
                                # Round Detection
                                round_id = round_detector.process_shot(current_time)
                                state_manager.update_round(round_id)
                                
                                # Create Shot
                                shot = Shot(
                                    id=int(current_time * 1000), # simple ID
                                    x=pred["x"],
                                    y=pred["y"],
                                    score=score,
                                    timestamp=current_time,
                                    round_id=round_id
                                )
                                state_manager.add_shot(shot)

            await asyncio.sleep(0.5) # 2 FPS to save bandwidth
        except Exception as e:
            print(f"[pipeline] error: {e}")
            await asyncio.sleep(1)

# Start pipeline on startup
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(analysis_pipeline())

# ========= Endpoints =========

@app.post("/session/start")
async def start_session(req: SessionStartRequest):
    state_manager.start_session(req.session_id)
    round_detector.reset()
    
    # Notify Camera Service
    async with aiohttp.ClientSession() as session:
        try:
            await session.post(f"{CAMERA_SERVICE_URL}/session/start", json={"fps": 5})
        except:
            pass 

    return {"status": "started", "session_id": req.session_id}

@app.post("/session/end")
async def end_session():
    state_manager.end_session()
    
    # Notify Camera Service
    async with aiohttp.ClientSession() as session:
        try:
            await session.post(f"{CAMERA_SERVICE_URL}/session/stop")
        except:
            pass

    return {"status": "ended"}

@app.post("/calibrate")
async def calibrate(req: CalibrationRequest):
    state_manager.set_calibration(req.dict())
    return {"status": "calibrated", "data": req.dict()}

@app.get("/stream")
async def stream():
    async def event_generator() -> AsyncGenerator[str, None]:
        while True:
            # Push current state every 500ms (2 FPS UI update)
            if state_manager.state.status == SessionState.LIVE_SESSION:
                data = state_manager.state.json()
                yield f"data: {data}\n\n"
            else:
                # Send heartbeat or idle state
                yield f"data: {json.dumps({'status': 'IDLE'})}\n\n"
            
            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

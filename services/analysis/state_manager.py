from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import time

class SessionState(Enum):
    IDLE = "IDLE"
    LIVE_SESSION = "LIVE_SESSION"

class Shot(BaseModel):
    id: int
    x: float
    y: float
    score: float
    timestamp: float
    round_id: int

class AnalysisState(BaseModel):
    status: SessionState = SessionState.IDLE
    session_id: str = ""
    shots: List[Shot] = []
    current_round: int = 1
    total_score: float = 0.0
    average_score: float = 0.0
    latest_frame_url: Optional[str] = None
    calibration_data: Dict[str, Any] = {}

class StateManager:
    def __init__(self):
        self._state = AnalysisState()

    @property
    def state(self) -> AnalysisState:
        return self._state

    def start_session(self, session_id: str):
        self._state = AnalysisState(
            status=SessionState.LIVE_SESSION,
            session_id=session_id,
            calibration_data=self._state.calibration_data # Preserve calibration
        )

    def end_session(self):
        self._state.status = SessionState.IDLE

    def add_shot(self, shot: Shot):
        self._state.shots.append(shot)
        self._recalculate_stats()

    def update_round(self, round_id: int):
        self._state.current_round = round_id

    def set_calibration(self, data: Dict[str, Any]):
        self._state.calibration_data = data

    def _recalculate_stats(self):
        if not self._state.shots:
            self._state.total_score = 0.0
            self._state.average_score = 0.0
            return
        
        self._state.total_score = sum(s.score for s in self._state.shots)
        self._state.average_score = self._state.total_score / len(self._state.shots)

"""State management for GMShoot application."""

import streamlit as st
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path

from src.utils.logging import get_logger
from src.utils.exceptions import ValidationError
from src.analysis_engine.models import Shot, Point

logger = get_logger("state_management")


class StateManager:
    """Manages Streamlit session state for GMShoot application."""

    def __init__(self):
        """Initialize state manager."""
        logger.debug("StateManager initialized")
        self._initialize_session_state()

    def _initialize_session_state(self) -> None:
        """Initialize default session state values."""
        try:
            # Initialize analysis state
            if "shots" not in st.session_state:
                st.session_state.shots = []

            if "filtered_shots" not in st.session_state:
                st.session_state.filtered_shots = []

            if "current_image" not in st.session_state:
                st.session_state.current_image = None

            if "mpi" not in st.session_state:
                st.session_state.mpi = None

            if "analysis_mode" not in st.session_state:
                st.session_state.analysis_mode = "Local Files"

            if "duplicate_threshold" not in st.session_state:
                st.session_state.duplicate_threshold = 15.0

            if "min_confidence" not in st.session_state:
                st.session_state.min_confidence = 0.5

            if "outlier_method" not in st.session_state:
                st.session_state.outlier_method = "None"

            if "outlier_threshold" not in st.session_state:
                st.session_state.outlier_threshold = 2.0

            # Initialize session metadata
            if "session_id" not in st.session_state:
                st.session_state.session_id = self._generate_session_id()

            if "session_created_at" not in st.session_state:
                st.session_state.session_created_at = (
                    datetime.now().isoformat()
                )

            if "analysis_history" not in st.session_state:
                st.session_state.analysis_history = []

            logger.debug("Session state initialized")

        except Exception as e:
            logger.error(f"Failed to initialize session state: {e}")
            raise ValidationError(f"Failed to initialize session state: {e}")

    def get_shots(self) -> List[Shot]:
        """Get current shots from session state."""
        return st.session_state.get("shots", [])

    def set_shots(self, shots: List[Shot]) -> None:
        """Set shots in session state."""
        try:
            st.session_state.shots = shots
            logger.info(f"Updated shots in session state: {len(shots)} shots")
            self._add_to_analysis_history(
                "shots_updated", {"shot_count": len(shots)}
            )
        except Exception as e:
            logger.error(f"Failed to set shots in session state: {e}")
            raise ValidationError(f"Failed to set shots in session state: {e}")

    def get_filtered_shots(self) -> List[Shot]:
        """Get filtered shots from session state."""
        return st.session_state.get("filtered_shots", [])

    def set_filtered_shots(self, filtered_shots: List[Shot]) -> None:
        """Set filtered shots in session state."""
        try:
            st.session_state.filtered_shots = filtered_shots
            logger.info(
                f"Updated filtered shots in session state: {len(filtered_shots)} shots"
            )
            self._add_to_analysis_history(
                "filtering", {"filtered_count": len(filtered_shots)}
            )
        except Exception as e:
            logger.error(f"Failed to set filtered shots in session state: {e}")
            raise ValidationError(
                f"Failed to set filtered shots in session state: {e}"
            )

    def get_current_image(self) -> Optional[Any]:
        """Get current image from session state."""
        return st.session_state.get("current_image", None)

    def set_current_image(self, image: Any) -> None:
        """Set current image in session state."""
        try:
            st.session_state.current_image = image
            logger.info("Updated current image in session state")
            self._add_to_analysis_history("image_loaded", {})
        except Exception as e:
            logger.error(f"Failed to set current image in session state: {e}")
            raise ValidationError(
                f"Failed to set current image in session state: {e}"
            )

    def get_mpi(self) -> Optional[Point]:
        """Get MPI from session state."""
        mpi_data = st.session_state.get("mpi", None)
        if mpi_data:
            return (
                Point(x=mpi_data["x"], y=mpi_data["y"])
                if isinstance(mpi_data, dict)
                else mpi_data
            )
        return None

    def set_mpi(self, mpi: Optional[Point]) -> None:
        """Set MPI in session state."""
        try:
            if mpi:
                st.session_state.mpi = {"x": mpi.x, "y": mpi.y}
            else:
                st.session_state.mpi = None
            logger.info(f"Updated MPI in session state: {mpi}")
            self._add_to_analysis_history(
                "mpi_calculated",
                {"mpi": {"x": mpi.x, "y": mpi.y} if mpi else None},
            )
        except Exception as e:
            logger.error(f"Failed to set MPI in session state: {e}")
            raise ValidationError(f"Failed to set MPI in session state: {e}")

    def get_analysis_mode(self) -> str:
        """Get analysis mode from session state."""
        return st.session_state.get("analysis_mode", "Local Files")

    def set_analysis_mode(self, mode: str) -> None:
        """Set analysis mode in session state."""
        try:
            if mode not in ["Local Files", "Live Camera"]:
                raise ValidationError(f"Invalid analysis mode: {mode}")

            st.session_state.analysis_mode = mode
            logger.info(f"Updated analysis mode in session state: {mode}")
            self._add_to_analysis_history("mode_changed", {"mode": mode})
        except Exception as e:
            logger.error(f"Failed to set analysis mode in session state: {e}")
            raise ValidationError(
                f"Failed to set analysis mode in session state: {e}"
            )

    def get_duplicate_threshold(self) -> float:
        """Get duplicate threshold from session state."""
        return st.session_state.get("duplicate_threshold", 15.0)

    def set_duplicate_threshold(self, threshold: float) -> None:
        """Set duplicate threshold in session state."""
        try:
            if threshold < 5.0 or threshold > 50.0:
                raise ValidationError(
                    f"Duplicate threshold must be between 5.0 and 50.0: {threshold}"
                )

            st.session_state.duplicate_threshold = threshold
            logger.info(
                f"Updated duplicate threshold in session state: {threshold}"
            )
            self._add_to_analysis_history(
                "threshold_changed", {"type": "duplicate", "value": threshold}
            )
        except Exception as e:
            logger.error(
                f"Failed to set duplicate threshold in session state: {e}"
            )
            raise ValidationError(
                f"Failed to set duplicate threshold in session state: {e}"
            )

    def get_min_confidence(self) -> float:
        """Get minimum confidence from session state."""
        return st.session_state.get("min_confidence", 0.5)

    def set_min_confidence(self, confidence: float) -> None:
        """Set minimum confidence in session state."""
        try:
            if confidence < 0.0 or confidence > 1.0:
                raise ValidationError(
                    f"Minimum confidence must be between 0.0 and 1.0: {confidence}"
                )

            st.session_state.min_confidence = confidence
            logger.info(
                f"Updated minimum confidence in session state: {confidence}"
            )
            self._add_to_analysis_history(
                "threshold_changed",
                {"type": "confidence", "value": confidence},
            )
        except Exception as e:
            logger.error(
                f"Failed to set minimum confidence in session state: {e}"
            )
            raise ValidationError(
                f"Failed to set minimum confidence in session state: {e}"
            )

    def get_outlier_method(self) -> str:
        """Get outlier method from session state."""
        return st.session_state.get("outlier_method", "None")

    def set_outlier_method(self, method: str) -> None:
        """Set outlier method in session state."""
        try:
            valid_methods = [
                "None",
                "Standard Deviation",
                "IQR",
                "Convex Hull",
            ]
            if method not in valid_methods:
                raise ValidationError(f"Invalid outlier method: {method}")

            st.session_state.outlier_method = method
            logger.info(f"Updated outlier method in session state: {method}")
            self._add_to_analysis_history(
                "outlier_method_changed", {"method": method}
            )
        except Exception as e:
            logger.error(f"Failed to set outlier method in session state: {e}")
            raise ValidationError(
                f"Failed to set outlier method in session state: {e}"
            )

    def get_outlier_threshold(self) -> float:
        """Get outlier threshold from session state."""
        return st.session_state.get("outlier_threshold", 2.0)

    def set_outlier_threshold(self, threshold: float) -> None:
        """Set outlier threshold in session state."""
        try:
            if threshold < 0.5 or threshold > 5.0:
                raise ValidationError(
                    f"Outlier threshold must be between 0.5 and 5.0: {threshold}"
                )

            st.session_state.outlier_threshold = threshold
            logger.info(
                f"Updated outlier threshold in session state: {threshold}"
            )
            self._add_to_analysis_history(
                "threshold_changed", {"type": "outlier", "value": threshold}
            )
        except Exception as e:
            logger.error(
                f"Failed to set outlier threshold in session state: {e}"
            )
            raise ValidationError(
                f"Failed to set outlier threshold in session state: {e}"
            )

    def get_session_id(self) -> str:
        """Get session ID from session state."""
        return st.session_state.get("session_id", "")

    def get_session_created_at(self) -> str:
        """Get session creation time from session state."""
        return st.session_state.get("session_created_at", "")

    def get_analysis_history(self) -> List[Dict[str, Any]]:
        """Get analysis history from session state."""
        return st.session_state.get("analysis_history", [])

    def _add_to_analysis_history(
        self, action: str, data: Dict[str, Any]
    ) -> None:
        """Add entry to analysis history."""
        try:
            history_entry = {
                "timestamp": datetime.now().isoformat(),
                "action": action,
                "data": data,
            }

            # Keep only last 50 entries to prevent memory issues
            history = st.session_state.get("analysis_history", [])
            history.append(history_entry)

            if len(history) > 50:
                history = history[-50:]

            st.session_state.analysis_history = history
            logger.debug(f"Added to analysis history: {action}")
        except Exception as e:
            logger.error(f"Failed to add to analysis history: {e}")

    def save_session(self, filename: Optional[str] = None) -> str:
        """Save current session state to file."""
        try:
            if filename is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"gmshoot_session_{timestamp}.json"

            # Create session data dictionary
            session_data = {
                "session_id": st.session_state.get("session_id", ""),
                "created_at": st.session_state.get("session_created_at", ""),
                "saved_at": datetime.now().isoformat(),
                "state": {},
            }

            # Save relevant state variables
            state_keys = [
                "shots",
                "filtered_shots",
                "analysis_mode",
                "duplicate_threshold",
                "min_confidence",
                "outlier_method",
                "outlier_threshold",
            ]

            for key in state_keys:
                if key in st.session_state:
                    session_data["state"][key] = st.session_state[key]

            # Convert complex objects to serializable format
            if "shots" in session_data["state"]:
                session_data["state"]["shots"] = [
                    shot.to_dict() for shot in session_data["state"]["shots"]
                ]

            if "filtered_shots" in session_data["state"]:
                session_data["state"]["filtered_shots"] = [
                    shot.to_dict()
                    for shot in session_data["state"]["filtered_shots"]
                ]

            # Save to file
            sessions_dir = Path("sessions")
            sessions_dir.mkdir(exist_ok=True)

            filepath = sessions_dir / filename
            with open(filepath, "w") as f:
                json.dump(session_data, f, indent=2)

            logger.info(f"Session saved to: {filepath}")
            return str(filepath)

        except Exception as e:
            logger.error(f"Failed to save session: {e}")
            raise ValidationError(f"Failed to save session: {e}")

    def load_session(self, filepath: str) -> bool:
        """Load session state from file."""
        try:
            with open(filepath, "r") as f:
                session_data = json.load(f)

            # Validate session data
            if not all(key in session_data for key in ["session_id", "state"]):
                raise ValidationError("Invalid session file format")

            # Restore state variables
            for key, value in session_data["state"].items():
                if key == "shots" or key == "filtered_shots":
                    # Convert back to Shot objects
                    st.session_state[key] = [
                        Shot(**shot_data) for shot_data in value
                    ]
                else:
                    st.session_state[key] = value

            # Restore session metadata
            st.session_state.session_id = session_data.get("session_id", "")
            st.session_state.session_created_at = session_data.get(
                "created_at", ""
            )

            logger.info(f"Session loaded from: {filepath}")
            return True

        except Exception as e:
            logger.error(f"Failed to load session: {e}")
            raise ValidationError(f"Failed to load session: {e}")

    def clear_session(self) -> None:
        """Clear all session state."""
        try:
            # Clear all state variables
            keys_to_clear = list(st.session_state.keys())
            for key in keys_to_clear:
                del st.session_state[key]

            # Reinitialize with defaults
            self._initialize_session_state()

            logger.info("Session state cleared")
        except Exception as e:
            logger.error(f"Failed to clear session state: {e}")
            raise ValidationError(f"Failed to clear session state: {e}")

    def get_session_summary(self) -> Dict[str, Any]:
        """Get summary of current session state."""
        try:
            shots = self.get_shots()
            filtered_shots = self.get_filtered_shots()

            summary = {
                "session_id": self.get_session_id(),
                "created_at": self.get_session_created_at(),
                "analysis_mode": self.get_analysis_mode(),
                "total_shots": len(shots),
                "filtered_shots": len(filtered_shots),
                "has_image": self.get_current_image() is not None,
                "has_mpi": self.get_mpi() is not None,
                "settings": {
                    "duplicate_threshold": self.get_duplicate_threshold(),
                    "min_confidence": self.get_min_confidence(),
                    "outlier_method": self.get_outlier_method(),
                    "outlier_threshold": self.get_outlier_threshold(),
                },
            }

            return summary
        except Exception as e:
            logger.error(f"Failed to get session summary: {e}")
            return {}

    def _generate_session_id(self) -> str:
        """Generate a unique session ID."""
        import uuid

        return str(uuid.uuid4())[:8]

    def validate_state(self) -> bool:
        """Validate current session state."""
        try:
            # Check required state variables
            required_keys = ["session_id", "analysis_mode"]
            for key in required_keys:
                if key not in st.session_state:
                    logger.warning(f"Missing required state key: {key}")
                    return False

            # Validate data types
            if not isinstance(st.session_state.get("shots", []), list):
                logger.error("Shots state is not a list")
                return False

            if not isinstance(
                st.session_state.get("duplicate_threshold", 15.0), (int, float)
            ):
                logger.error("Duplicate threshold is not a number")
                return False

            # Validate value ranges
            if (
                st.session_state.get("min_confidence", 0.5) < 0
                or st.session_state.get("min_confidence", 0.5) > 1
            ):
                logger.error("Minimum confidence out of range")
                return False

            logger.debug("Session state validation passed")
            return True
        except Exception as e:
            logger.error(f"Session state validation failed: {e}")
            return False


# Global state manager instance
state_manager = StateManager()

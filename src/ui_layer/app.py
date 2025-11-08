"""GMShoot SOTA Analysis Application."""

# Add src to path for imports
import sys
import os
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

# Load environment variables from .env file
from dotenv import load_dotenv

load_dotenv()

import streamlit as st
from PIL import Image
from typing import Optional

from src.utils.logging import setup_logging, get_logger
from src.utils.config import config
from src.utils.exceptions import (
    GMShootError,
    NetworkError,
    ImageProcessingError,
    RoboflowError,
    AnalysisError,
    ValidationError,
)
from src.analysis_engine.shot_analysis import shot_analyzer
from src.data_acquisition.data_source import data_source
from src.clients.roboflow_client import roboflow_client

from src.ui_layer.components.image_display import image_display
from src.ui_layer.components.controls import controls_component
from src.ui_layer.components.metrics_panel import metrics_panel_component
from src.ui_layer.state_management import state_manager

# Setup logging
setup_logging(level=config.app.log_level, log_file="logs/gmshoot.log")

logger = get_logger("app")


def main():
    """Main application entry point."""
    try:
        # Page configuration
        st.set_page_config(
            page_title="GMShoot SOTA Analysis",
            page_icon="🎯",
            layout="wide",
            initial_sidebar_state="expanded",
        )

        # Sidebar header
        st.sidebar.title("GMShoot Controls")
        st.sidebar.markdown("---")

        # Analysis mode selection
        _analysis_mode = controls_component.render_analysis_mode_selector()

        # Configuration section
        _config = controls_component.render_configuration_section()

        st.sidebar.markdown("---")

        # Action buttons
        button_states = controls_component.render_action_buttons()

        # Handle button actions
        if button_states.get("load_clicked", False):
            logger.info(
                f"Load Image button clicked with mode: "
                f"{state_manager.get_analysis_mode()}"
            )
            handle_image_load(state_manager.get_analysis_mode())

        if button_states.get("analyze_clicked", False):
            logger.info("Analyze button clicked")
            handle_analysis(
                state_manager.get_min_confidence(),
                state_manager.get_outlier_method(),
                state_manager.get_outlier_threshold(),
            )

        st.sidebar.markdown("---")

        # Status section
        controls_component.render_status_section()

        # Main content area
        st.title("GMShoot State-of-the-Art Analysis")

        # Display current image if available
        if (
            state_manager.get_current_image() is not None
            and state_manager.get_shots()
        ):
            image_display.display_single_image(
                state_manager.get_current_image(),
                state_manager.get_shots(),
                state_manager.get_mpi(),
                "Current Analysis",
            )

        # Display shot table if available
        if state_manager.get_shots():
            image_display.display_shot_table(state_manager.get_shots())
            image_display.display_shot_statistics(state_manager.get_shots())

            # Display metrics panel if shots are available
            if state_manager.get_shots():
                metrics_panel_component.render(state_manager.get_shots())

    except GMShootError as e:
        logger.error(f"Application error: {e}")
        st.error(f"Application error: {e}")
    except Exception as e:
        logger.error(f"Unexpected application error: {e}")
        st.error(
            "An unexpected error occurred. Please check the logs for details."
        )


def handle_image_load(analysis_mode: str) -> None:
    """Handle image loading based on analysis mode."""
    try:
        logger.info(f"handle_image_load called with mode: {analysis_mode}")

        if analysis_mode == "Local Files":
            # File upload for local analysis
            uploaded_file = st.file_uploader(
                "Choose a target image", type=["jpg", "jpeg", "png"]
            )

            logger.info(f"File uploader returned: {uploaded_file}")

            if uploaded_file is not None:
                logger.info("Processing uploaded file")
                # Process uploaded image
                image = Image.open(uploaded_file)
                st.session_state.current_image = image

                # Detect shots
                with st.spinner("Detecting shots..."):
                    shots = roboflow_client.detect_holes(uploaded_file.name)

                st.session_state.shots = shots
                st.success(f"Detected {len(shots)} shots")
            else:
                logger.info("No file uploaded, using test image")
                # Use a test image as fallback
                test_image_path = "public/test_videos_frames/vid_1_frame_1.jpg"
                if os.path.exists(test_image_path):
                    image = Image.open(test_image_path)
                    st.session_state.current_image = image

                    # Detect shots
                    with st.spinner("Detecting shots..."):
                        shots = roboflow_client.detect_holes(test_image_path)

                    st.session_state.shots = shots
                    st.success(
                        f"Using test image - Detected {len(shots)} shots"
                    )
                else:
                    st.error("Test image not found")

        elif analysis_mode == "Live Camera":
            logger.info("Attempting to get live frame")
            # Get frame from live camera
            with st.spinner("Fetching live frame..."):
                live_image: Optional[Image.Image] = (
                    data_source.get_live_frame()
                )

            logger.info(f"Live frame result: {live_image}")

            if live_image is not None:
                st.session_state.current_image = live_image

                # Save temporary file for processing
                from src.utils.image_processing import save_temp_image

                temp_path = save_temp_image(live_image)

                # Detect shots
                shots = roboflow_client.detect_holes(temp_path)

                st.session_state.shots = shots
                st.success(f"Detected {len(shots)} shots from live camera")
            else:
                st.warning("No frame available from live camera")

    except (NetworkError, ImageProcessingError, RoboflowError) as e:
        logger.error(f"Error loading image: {e}")
        st.error(f"Error loading image: {e}")
    except Exception as e:
        logger.error(f"Unexpected error loading image: {e}")
        st.error(
            "An unexpected error occurred while loading the image. Please check the logs."
        )


def handle_analysis(
    analysis_mode: str,
    min_confidence: float,
    outlier_method: str,
    outlier_threshold: float,
) -> None:
    """Handle shot analysis with selected parameters."""
    try:
        if "shots" not in st.session_state or not st.session_state.shots:
            st.warning("No shots to analyze")
            return

        shots = st.session_state.shots

        # Filter by confidence
        filtered_shots = shot_analyzer.filter_shots_by_confidence(
            shots, min_confidence
        )

        # Remove outliers
        if outlier_method != "None":
            filtered_shots, _ = shot_analyzer.remove_outliers(
                filtered_shots, outlier_method, outlier_threshold
            )

        # Update session state
        st.session_state.filtered_shots = filtered_shots

        # Calculate and display MPI
        if len(filtered_shots) > 0:
            coords = [[shot.x, shot.y] for shot in filtered_shots]
            import numpy as np

            mpi_x = np.mean([coord[0] for coord in coords])
            mpi_y = np.mean([coord[1] for coord in coords])

            from src.analysis_engine.models import Point

            mpi = Point(x=float(mpi_x), y=float(mpi_y))
            st.session_state.mpi = mpi

            st.success(
                f"Analysis complete: {len(filtered_shots)} shots after "
                f"filtering"
            )
        else:
            st.warning("No shots remaining after filtering")

    except (AnalysisError, ValidationError) as e:
        logger.error(f"Error in analysis: {e}")
        st.error(f"Error in analysis: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in analysis: {e}")
        st.error(
            "An unexpected error occurred during analysis. Please check the "
            "logs."
        )


if __name__ == "__main__":
    main()
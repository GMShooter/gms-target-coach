"""Controls component for GMShoot application."""

import streamlit as st
from typing import Dict, Any

from src.utils.logging import get_logger
from src.ui_layer.state_management import state_manager

logger = get_logger("controls")


class ControlsComponent:
    """Component for application controls and settings."""

    def __init__(self):
        """Initialize controls component."""
        logger.debug("ControlsComponent initialized")

    def render_analysis_mode_selector(self) -> str:
        """
        Render analysis mode selector.

        Returns:
            Selected analysis mode
        """
        try:
            logger.info("Rendering analysis mode selector")

            current_mode = state_manager.get_analysis_mode()

            # Analysis mode selection
            mode = st.sidebar.radio(
                "Analysis Mode",
                ["Local Files", "Live Camera"],
                index=0 if current_mode == "Local Files" else 1,
                key="analysis_mode_selector",
            )

            # Update state if changed
            if mode != current_mode:
                state_manager.set_analysis_mode(mode)
                st.rerun()

            return mode

        except Exception as e:
            logger.error(f"Failed to render analysis mode selector: {e}")
            st.error(f"Error in analysis mode selector: {e}")
            return current_mode

    def render_configuration_section(self) -> Dict[str, Any]:
        """
        Render configuration section with all settings.

        Returns:
            Dictionary with current configuration values
        """
        try:
            logger.info("Rendering configuration section")

            st.sidebar.subheader("Configuration")

            # Duplicate threshold slider
            duplicate_threshold = st.sidebar.slider(
                "Duplicate Threshold (pixels)",
                min_value=5.0,
                max_value=50.0,
                value=state_manager.get_duplicate_threshold(),
                step=1.0,
                key="duplicate_threshold_slider",
            )

            # Update state if changed
            if duplicate_threshold != state_manager.get_duplicate_threshold():
                state_manager.set_duplicate_threshold(duplicate_threshold)

            # Confidence threshold slider
            min_confidence = st.sidebar.slider(
                "Minimum Confidence",
                min_value=0.0,
                max_value=1.0,
                value=state_manager.get_min_confidence(),
                step=0.05,
                key="min_confidence_slider",
            )

            # Update state if changed
            if min_confidence != state_manager.get_min_confidence():
                state_manager.set_min_confidence(min_confidence)

            # Outlier detection method
            outlier_method = st.sidebar.selectbox(
                "Outlier Detection Method",
                ["None", "Standard Deviation", "IQR", "Convex Hull"],
                index=[
                    "None",
                    "Standard Deviation",
                    "IQR",
                    "Convex Hull",
                ].index(
                    state_manager.get_outlier_method()
                ),
                key="outlier_method_selectbox",
            )

            # Update state if changed
            if outlier_method != state_manager.get_outlier_method():
                state_manager.set_outlier_method(outlier_method)

            # Outlier threshold slider (disabled if no outlier detection)
            outlier_threshold = st.sidebar.slider(
                "Outlier Threshold",
                min_value=0.5,
                max_value=5.0,
                value=state_manager.get_outlier_threshold(),
                step=0.1,
                disabled=outlier_method == "None",
                key="outlier_threshold_slider",
            )

            # Update state if changed
            if outlier_threshold != state_manager.get_outlier_threshold():
                state_manager.set_outlier_threshold(outlier_threshold)

            config = {
                "duplicate_threshold": duplicate_threshold,
                "min_confidence": min_confidence,
                "outlier_method": outlier_method,
                "outlier_threshold": outlier_threshold,
            }

            logger.debug(f"Configuration rendered: {config}")
            return config

        except Exception as e:
            logger.error(f"Failed to render configuration section: {e}")
            st.error(f"Error in configuration section: {e}")
            return {}

    def render_action_buttons(self) -> Dict[str, bool]:
        """
        Render action buttons.

        Returns:
            Dictionary with button click states
        """
        try:
            logger.info("Rendering action buttons")

            st.sidebar.markdown("---")

            # Create columns for buttons
            col1, col2 = st.sidebar.columns(2)

            button_states = {}

            with col1:
                load_clicked = st.sidebar.button(
                    "📷 Load Image", type="primary", key="load_image_button"
                )
                button_states["load_clicked"] = load_clicked

            with col2:
                analyze_clicked = st.sidebar.button(
                    "🔍 Analyze",
                    type="primary",
                    key="analyze_button",
                    disabled=state_manager.get_shots() == [],
                )
                button_states["analyze_clicked"] = analyze_clicked

            logger.debug(f"Action buttons rendered: {button_states}")
            return button_states

        except Exception as e:
            logger.error(f"Failed to render action buttons: {e}")
            st.error(f"Error in action buttons: {e}")
            return {}

    def render_status_section(self) -> None:
        """Render status section showing current state."""
        try:
            logger.info("Rendering status section")

            st.sidebar.subheader("Status")

            # Display session state
            shots = state_manager.get_shots()
            filtered_shots = state_manager.get_filtered_shots()

            # Shot count metrics
            st.sidebar.metric("Total Shots", len(shots))

            if filtered_shots != shots:
                st.sidebar.metric("Filtered Shots", len(filtered_shots))

            # Display current image if available
            current_image = state_manager.get_current_image()
            if current_image is not None:
                st.sidebar.image(
                    current_image, width=200, caption="Current Image"
                )

            # Display MPI if available
            mpi = state_manager.get_mpi()
            if mpi is not None:
                st.sidebar.markdown("**Mean Point of Impact**")
                st.sidebar.write(f"X: {mpi.x:.1f}")
                st.sidebar.write(f"Y: {mpi.y:.1f}")

            # Session info
            st.sidebar.markdown("---")
            st.sidebar.markdown("**Session Info**")
            st.sidebar.write(f"ID: {state_manager.get_session_id()}")
            st.sidebar.write(
                f"Created: {state_manager.get_session_created_at()[:10]}"
            )

            logger.debug("Status section rendered successfully")

        except Exception as e:
            logger.error(f"Failed to render status section: {e}")
            st.error(f"Error in status section: {e}")

    def render_session_management(self) -> Dict[str, bool]:
        """
        Render session management controls.

        Returns:
            Dictionary with session action states
        """
        try:
            logger.info("Rendering session management")

            # Session management section
            with st.sidebar.expander("Session Management"):
                # Save session button
                save_clicked = st.sidebar.button(
                    "💾 Save Session", key="save_session_button"
                )

                # Load session button
                load_clicked = st.sidebar.button(
                    "📁 Load Session", key="load_session_button"
                )

                # Clear session button
                clear_clicked = st.sidebar.button(
                    "🗑️ Clear Session", key="clear_session_button"
                )

                # Session file upload for loading
                if load_clicked:
                    uploaded_file = st.sidebar.file_uploader(
                        "Choose a session file",
                        type=["json"],
                        key="session_file_uploader",
                    )

                    if uploaded_file is not None:
                        # Save uploaded file temporarily
                        import tempfile

                        with tempfile.NamedTemporaryFile(
                            delete=False,
                            suffix=".json"
                        ) as tmp:
                            tmp.write(uploaded_file.getvalue())
                            tmp_path = tmp.name

                        # Load session
                        if state_manager.load_session(tmp_path):
                            st.success("Session loaded successfully!")
                            st.rerun()

                # Handle save session
                if save_clicked:
                    try:
                        saved_path = state_manager.save_session()
                        st.success(f"Session saved to: {saved_path}")
                    except Exception as e:
                        st.error(f"Failed to save session: {e}")

                # Handle clear session
                if clear_clicked:
                    if st.sidebar.button("Confirm Clear", type="secondary"):
                        state_manager.clear_session()
                        st.success("Session cleared!")
                        st.rerun()

            action_states = {
                "save_clicked": save_clicked,
                "load_clicked": load_clicked,
                "clear_clicked": clear_clicked,
            }

            logger.debug(f"Session management rendered: {action_states}")
            return action_states

        except Exception as e:
            logger.error(f"Failed to render session management: {e}")
            st.error(f"Error in session management: {e}")
            return {}

    def render_advanced_settings(self) -> Dict[str, Any]:
        """
        Render advanced settings section.

        Returns:
            Dictionary with advanced settings values
        """
        try:
            logger.info("Rendering advanced settings")

            with st.sidebar.expander("Advanced Settings"):
                # Performance settings
                st.sidebar.subheader("Performance")

                # Memory limit
                memory_limit = st.sidebar.number_input(
                    "Memory Limit (MB)",
                    min_value=100,
                    max_value=2000,
                    value=500,
                    key="memory_limit_input",
                )

                # Processing timeout
                processing_timeout = st.sidebar.number_input(
                    "Image Processing Timeout (s)",
                    min_value=1.0,
                    max_value=10.0,
                    value=2.0,
                    step=0.1,
                    key="processing_timeout_input",
                )

                # Calculation timeout
                calc_timeout = st.sidebar.number_input(
                    "Statistics Calculation Timeout (s)",
                    min_value=0.1,
                    max_value=5.0,
                    value=0.5,
                    step=0.1,
                    key="calc_timeout_input",
                )

                # Debug settings
                st.sidebar.subheader("Debug")
                debug_mode = st.sidebar.checkbox(
                    "Enable Debug Mode", value=False, key="debug_mode_checkbox"
                )

                # Verbose logging
                verbose_logging = st.sidebar.checkbox(
                    "Enable Verbose Logging",
                    value=False,
                    key="verbose_logging_checkbox",
                )

            advanced_settings = {
                "memory_limit": memory_limit,
                "processing_timeout": processing_timeout,
                "calc_timeout": calc_timeout,
                "debug_mode": debug_mode,
                "verbose_logging": verbose_logging,
            }

            logger.debug(f"Advanced settings rendered: {advanced_settings}")
            return advanced_settings

        except Exception as e:
            logger.error(f"Failed to render advanced settings: {e}")
            st.error(f"Error in advanced settings: {e}")
            return {}

    def render_help_section(self) -> None:
        """Render help section with usage information."""
        try:
            logger.info("Rendering help section")

            with st.sidebar.expander("Help & Info"):
                st.markdown(
                    """
                ### GMShoot SOTA Analysis

                **Analysis Modes:**
                - **Local Files**: Analyze images from your computer
                - **Live Camera**: Analyze images from live camera feed

                **Configuration:**
                - **Duplicate Threshold**: Distance in pixels to consider shots as
                "duplicates"
                - **Minimum Confidence**: Filter out shots below this confidence
                "level"
                - **Outlier Detection**: Method to identify outlier shots
                - **Outlier Threshold**: Sensitivity for outlier detection

                **Session Management:**
                - Save your analysis progress to continue later
                - Load previous sessions to resume work
                - Clear session to start fresh

                **Keyboard Shortcuts:**
                - Press `R` to rerun the application
                - Press `C` to clear current session
                """
                )

                # Version info
                st.markdown("---")
                st.markdown("**Version:** 1.0.0")
                st.markdown("**Build:** MVP Release")

            logger.debug("Help section rendered successfully")

        except Exception as e:
            logger.error(f"Failed to render help section: {e}")
            st.error(f"Error in help section: {e}")

    def render(self) -> Dict[str, Any]:
        """
        Render complete controls component.

        Returns:
            Dictionary with all control states and values
        """
        try:
            logger.info("Rendering complete controls component")

            # Render all sections
            analysis_mode = self.render_analysis_mode_selector()
            config = self.render_configuration_section()
            button_states = self.render_action_buttons()
            session_states = self.render_session_management()
            advanced_settings = self.render_advanced_settings()
            self.render_status_section()
            self.render_help_section()

            # Combine all states
            controls_state = {
                "analysis_mode": analysis_mode,
                "configuration": config,
                "button_states": button_states,
                "session_states": session_states,
                "advanced_settings": advanced_settings,
            }

            logger.info("Controls component rendered successfully")
            return controls_state

        except Exception as e:
            logger.error(f"Failed to render controls component: {e}")
            st.error(f"Error in controls component: {e}")
            return {}


# Global controls component instance
controls_component = ControlsComponent()

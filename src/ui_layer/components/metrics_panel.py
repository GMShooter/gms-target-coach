"""Metrics panel component for GMShoot application."""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, Any, Optional, List
import numpy as np

from src.utils.logging import get_logger
from src.ui_layer.state_management import state_manager
from src.analysis_engine.statistics import statistics_calculator
from src.analysis_engine.metrics import sota_metrics_calculator

logger = get_logger("metrics_panel")


class MetricsPanelComponent:
    """Component for displaying analysis metrics and statistics."""
    
    def __init__(self):
        """Initialize metrics panel component."""
        logger.debug("MetricsPanelComponent initialized")
    
    def render_basic_metrics(self, shots: List) -> None:
        """Render basic shot metrics."""
        try:
            logger.info(f"Rendering basic metrics for {len(shots)} shots")
            
            if not shots:
                st.info("No shots to analyze")
                return
            
            st.subheader("Basic Metrics")
            
            # Calculate basic statistics
            mpi = statistics_calculator.calculate_mean_point_of_impact(shots)
            extreme_spread = statistics_calculator.calculate_extreme_spread(shots)
            mean_radius = statistics_calculator.calculate_mean_radius(shots, mpi)
            std_dev_x, std_dev_y = statistics_calculator.calculate_standard_deviations(shots)
            
            # Display metrics in columns
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("Total Shots", len(shots))
            
            with col2:
                st.metric("Extreme Spread", f"{extreme_spread:.1f} px")
            
            with col3:
                st.metric("Mean Radius", f"{mean_radius:.1f} px")
            
            with col4:
                st.metric("Combined Std Dev", f"{np.sqrt(std_dev_x**2 + std_dev_y**2):.1f} px")
            
            # MPI coordinates
            st.subheader("Mean Point of Impact (MPI)")
            col1, col2 = st.columns(2)
            
            with col1:
                st.metric("X Coordinate", f"{mpi.x:.1f}")
            
            with col2:
                st.metric("Y Coordinate", f"{mpi.y:.1f}")
            
            # Standard deviations
            st.subheader("Standard Deviations")
            col1, col2 = st.columns(2)
            
            with col1:
                st.metric("X Std Dev", f"{std_dev_x:.2f}")
            
            with col2:
                st.metric("Y Std Dev", f"{std_dev_y:.2f}")
            
            logger.debug("Basic metrics rendered successfully")
            
        except Exception as e:
            logger.error(f"Failed to render basic metrics: {e}")
            st.error(f"Error rendering basic metrics: {e}")
    
    def render_advanced_metrics(self, shots: List) -> None:
        """Render advanced SOTA metrics."""
        try:
            logger.info(f"Rendering advanced metrics for {len(shots)} shots")
            
            if len(shots) < 3:
                st.warning("At least 3 shots required for advanced metrics")
                return
            
            st.subheader("Advanced SOTA Metrics")
            
            # Calculate advanced metrics
            group_chars = sota_metrics_calculator.calculate_group_characteristics(shots)
            sequential_metrics = sota_metrics_calculator.calculate_sequential_metrics(shots)
            
            # CEP metrics
            if 'cep_50' in group_chars:
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.metric("CEP 50%", f"{group_chars['cep_50']:.1f} px")
                
                with col2:
                    st.metric("CEP 90%", f"{group_chars['cep_90']:.1f} px")
                
                with col3:
                    st.metric("CEP 95%", f"{group_chars['cep_95']:.1f} px")
            
            # Figure of Merit
            if 'figure_of_merit' in group_chars:
                st.metric("Figure of Merit", f"{group_chars['figure_of_merit']:.1f}")
            
            # Convex hull area
            if len(shots) >= 3:
                convex_area = statistics_calculator.calculate_convex_hull_area(shots)
                st.metric("Convex Hull Area", f"{convex_area:.0f} px²")
            
            # Sequential metrics
            if len(shots) >= 2:
                st.subheader("Sequential Analysis")
                col1, col2 = st.columns(2)
                
                with col1:
                    st.metric("First Shot Displacement", f"{sequential_metrics['first_shot_displacement']:.1f} px")
                
                with col2:
                    st.metric("Shot-to-Shot Displacement", f"{sequential_metrics['shot_to_shot_displacement']:.1f} px")
                
                # Trend stability
                if 'trend_stability' in sequential_metrics:
                    st.metric("Trend Stability", f"{sequential_metrics['trend_stability']:.3f}")
            
            logger.debug("Advanced metrics rendered successfully")
            
        except Exception as e:
            logger.error(f"Failed to render advanced metrics: {e}")
            st.error(f"Error rendering advanced metrics: {e}")
    
    def render_shot_distribution(self, shots: List) -> None:
        """Render shot distribution visualization."""
        try:
            logger.info(f"Rendering shot distribution for {len(shots)} shots")
            
            if not shots:
                return
            
            st.subheader("Shot Distribution")
            
            # Create scatter plot
            x_coords = [shot.x for shot in shots]
            y_coords = [shot.y for shot in shots]
            confidences = [shot.confidence for shot in shots]
            
            # Create scatter plot
            fig = go.Figure()
            
            # Add shots as scatter points
            fig.add_trace(go.Scatter(
                x=x_coords,
                y=y_coords,
                mode='markers',
                marker=dict(
                    size=8,
                    color=confidences,
                    colorscale='Viridis',
                    showscale=True,
                    colorbar=dict(title="Confidence")
                ),
                text=[f"Shot {i+1}" for i in range(len(shots))],
                name="Shots"
            ))
            
            # Add MPI as special marker
            mpi = statistics_calculator.calculate_mean_point_of_impact(shots)
            fig.add_trace(go.Scatter(
                x=[mpi.x],
                y=[mpi.y],
                mode='markers',
                marker=dict(
                    size=15,
                    color='red',
                    symbol='x'
                ),
                name="MPI"
            ))
            
            # Add confidence ellipse if enough shots
            if len(shots) >= 3:
                # Calculate confidence ellipse
                coords = np.array([[shot.x, shot.y] for shot in shots])
                mean = np.mean(coords, axis=0)
                cov = np.cov(coords.T)
                
                # Create ellipse points
                theta = np.linspace(0, 2*np.pi, 100)
                eigenvalues, eigenvectors = np.linalg.eig(cov)
                
                # Sort eigenvalues and eigenvectors
                idx = eigenvalues.argsort()[::-1]
                eigenvalues = eigenvalues[idx]
                eigenvectors = eigenvectors[:, idx]
                
                # Calculate ellipse points
                chi2 = 5.991  # 95% confidence
                ellipse_x = []
                ellipse_y = []
                
                for t in theta:
                    x = mean[0] + np.sqrt(chi2 * eigenvalues[0]) * np.cos(t) * eigenvectors[0, 0] - np.sqrt(chi2 * eigenvalues[1]) * np.sin(t) * eigenvectors[0, 1]
                    y = mean[1] + np.sqrt(chi2 * eigenvalues[0]) * np.sin(t) * eigenvectors[0, 0] + np.sqrt(chi2 * eigenvalues[1]) * np.cos(t) * eigenvectors[0, 1]
                    ellipse_x.append(x)
                    ellipse_y.append(y)
                
                fig.add_trace(go.Scatter(
                    x=ellipse_x,
                    y=ellipse_y,
                    mode='lines',
                    line=dict(color='rgba(255,0,0,0.3)', width=2),
                    name="95% Confidence"
                ))
            
            fig.update_layout(
                title="Shot Distribution",
                xaxis_title="X Coordinate (pixels)",
                yaxis_title="Y Coordinate (pixels)",
                showlegend=True,
                width=700,
                height=500
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            logger.debug("Shot distribution rendered successfully")
            
        except Exception as e:
            logger.error(f"Failed to render shot distribution: {e}")
            st.error(f"Error rendering shot distribution: {e}")
    
    def render_confidence_intervals(self, shots: List) -> None:
        """Render confidence intervals."""
        try:
            logger.info(f"Rendering confidence intervals for {len(shots)} shots")
            
            if len(shots) < 3:
                st.warning("At least 3 shots required for confidence intervals")
                return
            
            st.subheader("Confidence Intervals")
            
            # Calculate confidence intervals
            intervals = statistics_calculator.calculate_confidence_intervals(shots, 0.95)
            
            # Display intervals in table
            interval_data = {
                'Coordinate': ['X', 'Y'],
                'Lower Bound': [f"{intervals['x'][0]:.2f}", f"{intervals['y'][0]:.2f}"],
                'Upper Bound': [f"{intervals['x'][1]:.2f}", f"{intervals['y'][1]:.2f}"],
                'Range': [f"{intervals['x'][1] - intervals['x'][0]:.2f}", f"{intervals['y'][1] - intervals['y'][0]:.2f}"]
            }
            
            st.dataframe(interval_data, use_container_width=True)
            
            logger.debug("Confidence intervals rendered successfully")
            
        except Exception as e:
            logger.error(f"Failed to render confidence intervals: {e}")
            st.error(f"Error rendering confidence intervals: {e}")
    
    def render_flyer_analysis(self, shots: List) -> None:
        """Render flyer detection analysis."""
        try:
            logger.info(f"Rendering flyer analysis for {len(shots)} shots")
            
            if len(shots) < 3:
                st.warning("At least 3 shots required for flyer detection")
                return
            
            st.subheader("Flyer Detection")
            
            # Get current settings
            outlier_method = state_manager.get_outlier_method()
            outlier_threshold = state_manager.get_outlier_threshold()
            
            # Detect flyers
            good_shots, flyer_shots = sota_metrics_calculator.detect_flyers(shots, outlier_method.lower().replace(" ", "_"), outlier_threshold)
            
            # Display results
            col1, col2 = st.columns(2)
            
            with col1:
                st.metric("Good Shots", len(good_shots))
                st.metric("Flyers", len(flyer_shots))
            
            with col2:
                st.metric("Flyer Rate", f"{len(flyer_shots)/len(shots)*100:.1f}%")
            
            # Show flyer details
            if flyer_shots:
                st.subheader("Flyer Details")
                
                flyer_data = []
                for i, shot in enumerate(flyer_shots):
                    flyer_data.append({
                        'Shot #': i + 1,
                        'X': f"{shot.x:.1f}",
                        'Y': f"{shot.y:.1f}",
                        'Confidence': f"{shot.confidence:.2f}"
                    })
                
                st.dataframe(flyer_data, use_container_width=True)
            
            logger.debug("Flyer analysis rendered successfully")
            
        except Exception as e:
            logger.error(f"Failed to render flyer analysis: {e}")
            st.error(f"Error rendering flyer analysis: {e}")
    
    def render_scoring_metrics(self, shots: List) -> None:
        """Render scoring metrics if target information is available."""
        try:
            logger.info(f"Rendering scoring metrics for {len(shots)} shots")
            
            # Check if target information is available
            # This would come from state or configuration
            target_center = None  # Would get from state_manager
            ring_radii = []  # Would get from state_manager
            
            if not target_center or not ring_radii:
                st.info("Target information not available for scoring")
                return
            
            st.subheader("Scoring Metrics")
            
            # Calculate scoring metrics
            scoring = sota_metrics_calculator.calculate_scoring_metrics(shots, target_center, ring_radii)
            
            # Display scoring summary
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("Total Score", scoring['total_score'])
            
            with col2:
                st.metric("Average Score", f"{scoring['average_score']:.1f}")
            
            with col3:
                st.metric("Best Score", scoring['max_score'])
            
            with col4:
                st.metric("Worst Score", scoring['min_score'])
            
            # Hit distribution chart
            if 'hit_distribution' in scoring:
                st.subheader("Hit Distribution")
                
                # Create pie chart
                labels = []
                values = []
                
                ring_labels = [f"Ring {i+1}" for i in range(len(ring_radii))]
                labels.extend(ring_labels)
                labels.append("Miss")
                
                values = scoring['hit_distribution']
                
                fig = px.pie(
                    values=values,
                    names=labels,
                    title="Hit Distribution by Ring"
                )
                
                st.plotly_chart(fig, use_container_width=True)
            
            logger.debug("Scoring metrics rendered successfully")
            
        except Exception as e:
            logger.error(f"Failed to render scoring metrics: {e}")
            st.error(f"Error rendering scoring metrics: {e}")
    
    def render_export_options(self, shots: List) -> None:
        """Render export options for metrics data."""
        try:
            logger.info("Rendering export options")
            
            if not shots:
                st.warning("No data to export")
                return
            
            st.subheader("Export Options")
            
            # Export format selection
            export_format = st.selectbox(
                "Export Format",
                ["JSON", "CSV", "Excel"],
                key="export_format_selectbox"
            )
            
            # Export button
            if st.button("📁 Export Data", key="export_data_button"):
                self._export_data(shots, export_format)
            
            logger.debug("Export options rendered successfully")
            
        except Exception as e:
            logger.error(f"Failed to render export options: {e}")
            st.error(f"Error rendering export options: {e}")
    
    def _export_data(self, shots: List, format: str) -> None:
        """Export shot data in selected format."""
        try:
            logger.info(f"Exporting {len(shots)} shots in {format} format")
            
            # Prepare data
            if format == "JSON":
                data = {
                    'shots': [shot.to_dict() for shot in shots],
                    'exported_at': str(st.session_state.get('export_timestamp', ''))
                }
                st.download_button(
                    label="Download JSON",
                    data=str(data).encode(),
                    file_name="gmshoot_data.json",
                    mime="application/json"
                )
            
            elif format == "CSV":
                # Create CSV data
                import csv
                import io
                
                output = io.StringIO()
                writer = csv.writer(output)
                
                # Write header
                writer.writerow(['Shot #', 'X', 'Y', 'Confidence', 'Frame', 'Timestamp'])
                
                # Write shot data
                for i, shot in enumerate(shots):
                    writer.writerow([
                        i + 1,
                        f"{shot.x:.2f}",
                        f"{shot.y:.2f}",
                        f"{shot.confidence:.3f}",
                        shot.frame_index if shot.frame_index else '',
                        shot.timestamp.isoformat() if shot.timestamp else ''
                    ])
                
                st.download_button(
                    label="Download CSV",
                    data=output.getvalue(),
                    file_name="gmshoot_data.csv",
                    mime="text/csv"
                )
            
            elif format == "Excel":
                # Create Excel data
                import pandas as pd
                
                df = pd.DataFrame([
                    {
                        'Shot #': i + 1,
                        'X': shot.x,
                        'Y': shot.y,
                        'Confidence': shot.confidence,
                        'Frame': shot.frame_index if shot.frame_index else None,
                        'Timestamp': shot.timestamp.isoformat() if shot.timestamp else None
                    }
                    for i, shot in enumerate(shots)
                ])
                
                # Convert to Excel
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df.to_excel(writer, index=False, sheet_name='Shots')
                
                st.download_button(
                    label="Download Excel",
                    data=output.getvalue(),
                    file_name="gmshoot_data.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
            
            # Update export timestamp
            st.session_state.export_timestamp = str(st.session_state.get('export_timestamp', ''))
            
            logger.info(f"Data exported successfully in {format} format")
            
        except Exception as e:
            logger.error(f"Failed to export data: {e}")
            st.error(f"Error exporting data: {e}")
    
    def render(self, shots: Optional[List] = None) -> Dict[str, Any]:
        """
        Render complete metrics panel.
        
        Args:
            shots: List of shots to analyze (uses session state if None)
            
        Returns:
            Dictionary with panel state
        """
        try:
            logger.info("Rendering complete metrics panel")
            
            # Use session shots if not provided
            if shots is None:
                shots = state_manager.get_filtered_shots() or state_manager.get_shots()
            
            if not shots:
                st.info("No shots to display. Load an image and detect shots first.")
                return {}
            
            # Create tabs for different metric views
            tab1, tab2, tab3, tab4, tab5 = st.tabs([
                "Basic Metrics", "Advanced Metrics", "Shot Distribution", "Confidence Intervals"
            ])
            
            panel_state = {}
            
            with tab1:
                self.render_basic_metrics(shots)
                panel_state['basic_metrics'] = True
            
            with tab2:
                self.render_advanced_metrics(shots)
                panel_state['advanced_metrics'] = True
            
            with tab3:
                self.render_shot_distribution(shots)
                panel_state['shot_distribution'] = True
            
            with tab4:
                self.render_confidence_intervals(shots)
                panel_state['confidence_intervals'] = True
            
            # Additional sections
            st.markdown("---")
            
            # Flyer analysis
            self.render_flyer_analysis(shots)
            panel_state['flyer_analysis'] = True
            
            # Scoring metrics
            self.render_scoring_metrics(shots)
            panel_state['scoring_metrics'] = True
            
            # Export options
            st.markdown("---")
            self.render_export_options(shots)
            panel_state['export_options'] = True
            
            logger.info("Metrics panel rendered successfully")
            return panel_state
            
        except Exception as e:
            logger.error(f"Failed to render metrics panel: {e}")
            st.error(f"Error rendering metrics panel: {e}")
            return {}


# Global metrics panel component instance
metrics_panel_component = MetricsPanelComponent()
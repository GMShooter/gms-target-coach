"""Image display component for GMShoot application."""

import streamlit as st
from typing import Optional, List
from PIL import Image

from src.utils.logging import get_logger
from src.utils.image_processing import draw_shots_on_image, create_image_grid
from src.analysis_engine.models import Shot, Point

logger = get_logger("image_display")


class ImageDisplay:
    """Component for displaying images with shot annotations."""
    
    def __init__(self):
        """Initialize image display component."""
        logger.debug("ImageDisplay component initialized")
    
    def display_single_image(
        self, 
        image: Image.Image, 
        shots: List[Shot], 
        mpi: Optional[Point] = None,
        title: str = "Target Analysis",
        use_container: bool = True
    ) -> None:
        """
        Display a single image with shot annotations.
        
        Args:
            image: PIL Image to display
            shots: List of shots to annotate
            mpi: Mean Point of Impact to highlight
            title: Title for the display
            use_container: Whether to use container layout
        """
        try:
            logger.info(f"Displaying image with {len(shots)} shots")
            
            # Draw shots and MPI on image
            annotated_image = draw_shots_on_image(
                image, shots, mpi, 
                shot_color="blue", mpi_color="red"
            )
            
            if use_container:
                st.container()
            
            st.title(title)
            st.image(annotated_image, use_column_width=True)
            
            # Display shot information
            if shots:
                with st.expander("Shot Details"):
                    for i, shot in enumerate(shots):
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            st.write(f"Shot {i+1}")
                        with col2:
                            st.write(f"X: {shot.x:.1f}")
                        with col3:
                            st.write(f"Y: {shot.y:.1f}")
                            st.write(f"Confidence: {shot.confidence:.2f}")
            
            # Display MPI information
            if mpi:
                st.subheader("Mean Point of Impact (MPI)")
                col1, col2 = st.columns(2)
                with col1:
                    st.metric("X Coordinate", f"{mpi.x:.1f}")
                with col2:
                    st.metric("Y Coordinate", f"{mpi.y:.1f}")
            
        except Exception as e:
            logger.error(f"Failed to display image: {e}")
            st.error(f"Error displaying image: {e}")
    
    def display_image_comparison(
        self, 
        original_image: Image.Image,
        annotated_image: Image.Image,
        shots: List[Shot],
        title: str = "Image Comparison"
    ) -> None:
        """
        Display side-by-side comparison of original and annotated images.
        
        Args:
            original_image: Original PIL Image
            annotated_image: Annotated PIL Image
            shots: List of shots detected
            title: Title for the display
        """
        try:
            logger.info(f"Displaying image comparison with {len(shots)} shots")
            
            st.title(title)
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("Original Image")
                st.image(original_image, use_column_width=True)
            
            with col2:
                st.subheader("Annotated Image")
                st.image(annotated_image, use_column_width=True)
                
                # Display shot count
                st.success(f"Detected {len(shots)} shots")
            
        except Exception as e:
            logger.error(f"Failed to display image comparison: {e}")
            st.error(f"Error displaying image comparison: {e}")
    
    def display_image_grid(
        self, 
        images: List[Image.Image],
        titles: Optional[List[str]] = None,
        max_cols: int = 3
    ) -> None:
        """
        Display multiple images in a grid layout.
        
        Args:
            images: List of PIL Images to display
            titles: Optional list of titles for images
            max_cols: Maximum number of columns in grid
        """
        try:
            logger.info(f"Displaying image grid with {len(images)} images")
            
            if not images:
                st.warning("No images to display")
                return
            
            if titles is None:
                titles = [f"Image {i+1}" for i in range(len(images))]
            
            # Create image grid
            grid_image = create_image_grid(images, max_cols)
            
            st.title("Image Grid")
            st.image(grid_image, use_column_width=True)
            
            # Display image information
            for i, (image, title) in enumerate(zip(images, titles)):
                with st.expander(title):
                    st.write(f"Size: {image.size}")
                    st.write(f"Mode: {image.mode}")
            
        except Exception as e:
            logger.error(f"Failed to display image grid: {e}")
            st.error(f"Error displaying image grid: {e}")
    
    def display_shot_table(self, shots: List[Shot]) -> None:
        """
        Display shot data in a table format.
        
        Args:
            shots: List of shots to display
        """
        try:
            logger.info(f"Displaying shot table with {len(shots)} shots")
            
            if not shots:
                st.info("No shots to display")
                return
            
            st.subheader("Shot Data Table")
            
            # Prepare data for table
            shot_data = []
            for i, shot in enumerate(shots):
                shot_data.append({
                    "Shot #": i + 1,
                    "X": f"{shot.x:.1f}",
                    "Y": f"{shot.y:.1f}",
                    "Confidence": f"{shot.confidence:.2f}",
                    "Frame": shot.frame_index if shot.frame_index else "N/A"
                })
            
            st.dataframe(shot_data, use_container_width=True)
            
        except Exception as e:
            logger.error(f"Failed to display shot table: {e}")
            st.error(f"Error displaying shot table: {e}")
    
    def display_shot_statistics(self, shots: List[Shot]) -> None:
        """
        Display basic statistics for shots.
        
        Args:
            shots: List of shots to analyze
        """
        try:
            logger.info(f"Displaying shot statistics for {len(shots)} shots")
            
            if not shots:
                st.info("No shots to analyze")
                return
            
            st.subheader("Shot Statistics")
            
            # Calculate basic statistics
            x_coords = [shot.x for shot in shots]
            y_coords = [shot.y for shot in shots]
            confidences = [shot.confidence for shot in shots]
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("Total Shots", len(shots))
            
            with col2:
                st.metric("Avg X", f"{sum(x_coords)/len(x_coords):.1f}")
            
            with col3:
                st.metric("Avg Y", f"{sum(y_coords)/len(y_coords):.1f}")
            
            with col4:
                st.metric("Avg Confidence", f"{sum(confidences)/len(confidences):.2f}")
            
            # Display coordinate ranges
            st.subheader("Coordinate Ranges")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.write(f"X Range: {min(x_coords):.1f} to {max(x_coords):.1f}")
            
            with col2:
                st.write(f"Y Range: {min(y_coords):.1f} to {max(y_coords):.1f}")
            
        except Exception as e:
            logger.error(f"Failed to display shot statistics: {e}")
            st.error(f"Error displaying shot statistics: {e}")


# Global image display instance
image_display = ImageDisplay()
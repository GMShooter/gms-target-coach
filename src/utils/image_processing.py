"""Image processing utilities for GMShoot application."""

import io
import tempfile
from typing import Tuple, Optional, List, TYPE_CHECKING
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from .logging import get_logger
from .exceptions import ImageProcessingError

if TYPE_CHECKING:
    from ..analysis_engine.models import Shot, Point

logger = get_logger("image_processing")


def save_temp_image(image: Image.Image, suffix: str = ".jpg") -> str:
    """
    Save PIL Image to temporary file and return path.
    
    Args:
        image: PIL Image to save
        suffix: File suffix for temporary file
        
    Returns:
        Path to temporary file
        
    Raises:
        ImageProcessingError: If saving fails
    """
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            image.save(tmp.name)
            logger.debug(f"Saved temporary image to {tmp.name}")
            return tmp.name
    except Exception as e:
        logger.error(f"Failed to save temporary image: {e}")
        raise ImageProcessingError(f"Failed to save temporary image: {e}")


def resize_image(image: Image.Image, max_size: Tuple[int, int] = (1024, 1024)) -> Image.Image:
    """
    Resize image while maintaining aspect ratio.
    
    Args:
        image: PIL Image to resize
        max_size: Maximum width and height
        
    Returns:
        Resized PIL Image
        
    Raises:
        ImageProcessingError: If resizing fails
    """
    try:
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        logger.debug(f"Resized image to {image.size}")
        return image
    except Exception as e:
        logger.error(f"Failed to resize image: {e}")
        raise ImageProcessingError(f"Failed to resize image: {e}")


def convert_to_rgb(image: Image.Image) -> Image.Image:
    """
    Convert image to RGB format.
    
    Args:
        image: PIL Image to convert
        
    Returns:
        RGB PIL Image
        
    Raises:
        ImageProcessingError: If conversion fails
    """
    try:
        if image.mode != "RGB":
            image = image.convert("RGB")
            logger.debug("Converted image to RGB format")
        return image
    except Exception as e:
        logger.error(f"Failed to convert image to RGB: {e}")
        raise ImageProcessingError(f"Failed to convert image to RGB: {e}")


def draw_shots_on_image(
    image: Image.Image,
    shots: List["Shot"],
    mpi: Optional["Point"] = None,
    shot_color: str = "blue",
    mpi_color: str = "red",
    shot_radius: int = 5,
    mpi_size: int = 15
) -> Image.Image:
    """
    Draw shots and MPI on image.
    
    Args:
        image: Base PIL Image
        shots: List of Shot objects to draw
        mpi: Mean Point of Impact to draw
        shot_color: Color for shot markers
        mpi_color: Color for MPI marker
        shot_radius: Radius for shot circles
        mpi_size: Size for MPI cross
        
    Returns:
        PIL Image with annotations
        
    Raises:
        ImageProcessingError: If drawing fails
    """
    try:
        # Create a copy to avoid modifying original
        annotated_image = image.copy()
        draw = ImageDraw.Draw(annotated_image)
        
        # Draw all shots as circles
        for shot in shots:
            x, y = int(shot.x), int(shot.y)
            draw.ellipse(
                [x - shot_radius, y - shot_radius, x + shot_radius, y + shot_radius],
                outline=shot_color,
                width=2
            )
        
        # Draw MPI as a cross if provided
        if mpi:
            mx, my = int(mpi.x), int(mpi.y)
            draw.line([mx - mpi_size, my, mx + mpi_size, my], fill=mpi_color, width=3)
            draw.line([mx, my - mpi_size, mx, my + mpi_size], fill=mpi_color, width=3)
        
        logger.debug(f"Drew {len(shots)} shots and MPI on image")
        return annotated_image
    except Exception as e:
        logger.error(f"Failed to draw shots on image: {e}")
        raise ImageProcessingError(f"Failed to draw shots on image: {e}")


def create_image_grid(images: List[Image.Image], cols: int = 2) -> Image.Image:
    """
    Create a grid layout from multiple images.
    
    Args:
        images: List of PIL Images to arrange
        cols: Number of columns in grid
        
    Returns:
        Combined PIL Image
        
    Raises:
        ImageProcessingError: If grid creation fails
    """
    try:
        if not images:
            raise ImageProcessingError("No images provided for grid creation")
        
        # Calculate grid dimensions
        cols = min(cols, len(images))
        rows = (len(images) + cols - 1) // cols
        
        # Get dimensions from first image
        img_width, img_height = images[0].size
        
        # Create new image for grid
        grid_width = img_width * cols
        grid_height = img_height * rows
        grid_image = Image.new("RGB", (grid_width, grid_height), "white")
        
        # Paste images into grid
        for i, img in enumerate(images):
            row = i // cols
            col = i % cols
            x = col * img_width
            y = row * img_height
            grid_image.paste(img, (x, y))
        
        logger.debug(f"Created {cols}x{rows} grid from {len(images)} images")
        return grid_image
    except Exception as e:
        logger.error(f"Failed to create image grid: {e}")
        raise ImageProcessingError(f"Failed to create image grid: {e}")


def validate_image_format(image: Image.Image) -> bool:
    """
    Validate that image is in acceptable format.
    
    Args:
        image: PIL Image to validate
        
    Returns:
        True if format is acceptable, False otherwise
    """
    try:
        # Check if image is in a supported format
        supported_modes = ["RGB", "RGBA", "L"]
        if image.mode not in supported_modes:
            logger.warning(f"Unsupported image mode: {image.mode}")
            return False
        
        # Check minimum size
        min_size = (100, 100)
        if image.size[0] < min_size[0] or image.size[1] < min_size[1]:
            logger.warning(f"Image too small: {image.size}")
            return False
        
        logger.debug(f"Image format validation passed: {image.mode}, {image.size}")
        return True
    except Exception as e:
        logger.error(f"Image validation failed: {e}")
        return False
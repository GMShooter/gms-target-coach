"""Data models for GMShoot analysis engine."""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import numpy as np


@dataclass
class Shot:
    """Represents a single shot detection."""
    x: float
    y: float
    confidence: float = 0.0
    frame_index: Optional[int] = None
    timestamp: Optional[datetime] = None
    radius: float = 5.0  # Default shot radius for visualization
    
    def distance_to(self, other: 'Shot') -> float:
        """Calculate Euclidean distance to another shot."""
        return np.sqrt((self.x - other.x)**2 + (self.y - other.y)**2)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            'x': self.x,
            'y': self.y,
            'confidence': self.confidence,
            'frame_index': self.frame_index,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }


@dataclass
class Point:
    """Represents a 2D point."""
    x: float
    y: float
    
    def distance_to(self, other: 'Point') -> float:
        """Calculate Euclidean distance to another point."""
        return np.sqrt((self.x - other.x)**2 + (self.y - other.y)**2)


@dataclass
class SOTAMetrics:
    """State-of-the-Art metrics for shot analysis."""
    total_shots: int = 0
    
    # Group Characteristics
    mpi: Optional[Point] = None  # Mean Point of Impact
    extreme_spread: float = 0.0
    mean_radius: float = 0.0
    convex_hull_area: float = 0.0
    std_dev_x: float = 0.0
    std_dev_y: float = 0.0
    
    # Sequential Analysis
    first_shot_displacement: float = 0.0
    shot_to_shot_displacement: float = 0.0
    flyer_count: int = 0
    
    # Scoring (if target rings are defined)
    total_score: int = 0
    average_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            'total_shots': self.total_shots,
            'mpi': {'x': self.mpi.x, 'y': self.mpi.y} if self.mpi else None,
            'extreme_spread': self.extreme_spread,
            'mean_radius': self.mean_radius,
            'convex_hull_area': self.convex_hull_area,
            'std_dev_x': self.std_dev_x,
            'std_dev_y': self.std_dev_y,
            'first_shot_displacement': self.first_shot_displacement,
            'shot_to_shot_displacement': self.shot_to_shot_displacement,
            'flyer_count': self.flyer_count,
            'total_score': self.total_score,
            'average_score': self.average_score
        }


@dataclass
class ShotGroup:
    """Represents a group of shots for analysis."""
    shots: List[Shot] = field(default_factory=list)
    target_center: Optional[Point] = None
    target_ring_radii: Optional[List[float]] = None  # Radii for scoring rings
    
    def add_shot(self, shot: Shot) -> None:
        """Add a shot to the group."""
        self.shots.append(shot)
    
    def get_shot_coordinates(self) -> np.ndarray:
        """Get shot coordinates as numpy array."""
        return np.array([[shot.x, shot.y] for shot in self.shots])
    
    def is_empty(self) -> bool:
        """Check if group has no shots."""
        return len(self.shots) == 0
    
    def has_sufficient_shots(self, min_shots: int = 2) -> bool:
        """Check if group has sufficient shots for analysis."""
        return len(self.shots) >= min_shots
    
    def get_shot_count(self) -> int:
        """Get the number of shots in the group."""
        return len(self.shots)


@dataclass
class AnalysisSession:
    """Represents a complete analysis session."""
    session_id: str
    shot_groups: List[ShotGroup] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def add_shot_group(self, group: ShotGroup) -> None:
        """Add a shot group to the session."""
        self.shot_groups.append(group)
    
    def get_all_shots(self) -> List[Shot]:
        """Get all shots from all groups."""
        all_shots = []
        for group in self.shot_groups:
            all_shots.extend(group.shots)
        return all_shots
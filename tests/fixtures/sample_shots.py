"""Sample shot data for testing."""

from src.analysis_engine.models import Shot, Point, ShotGroup


def get_sample_shots_5() -> list[Shot]:
    """Get 5 sample shots in a tight group."""
    return [
        Shot(x=512, y=512, confidence=0.95),
        Shot(x=518, y=508, confidence=0.92),
        Shot(x=508, y=518, confidence=0.88),
        Shot(x=520, y=520, confidence=0.94),
        Shot(x=515, y=525, confidence=0.91)
    ]


def get_sample_shots_10() -> list[Shot]:
    """Get 10 sample shots with some spread."""
    return [
        Shot(x=512, y=512, confidence=0.95),
        Shot(x=518, y=508, confidence=0.92),
        Shot(x=508, y=518, confidence=0.88),
        Shot(x=520, y=520, confidence=0.94),
        Shot(x=515, y=525, confidence=0.91),
        Shot(x=525, y=515, confidence=0.89),
        Shot(x=505, y=505, confidence=0.93),
        Shot(x=530, y=530, confidence=0.87),
        Shot(x=495, y=495, confidence=0.90),
        Shot(x=540, y=540, confidence=0.85)
    ]


def get_sample_shot_group() -> ShotGroup:
    """Get a sample shot group with target center."""
    group = ShotGroup()
    group.target_center = Point(x=512, y=512)
    group.target_ring_radii = [50, 100, 150, 200]  # 10, 9, 7, 5 rings
    
    for shot in get_sample_shots_5():
        group.add_shot(shot)
    
    return group


def get_wide_shot_group() -> ShotGroup:
    """Get a sample shot group with wide spread."""
    group = ShotGroup()
    group.target_center = Point(x=512, y=512)
    
    wide_shots = [
        Shot(x=480, y=480, confidence=0.95),
        Shot(x=544, y=480, confidence=0.92),
        Shot(x=480, y=544, confidence=0.88),
        Shot(x=544, y=544, confidence=0.94),
        Shot(x=512, y=512, confidence=0.91)
    ]
    
    for shot in wide_shots:
        group.add_shot(shot)
    
    return group


def get_flier_shot_group() -> ShotGroup:
    """Get a sample shot group with one clear flier."""
    group = ShotGroup()
    group.target_center = Point(x=512, y=512)
    
    # Tight group with one flier
    tight_shots = [
        Shot(x=512, y=512, confidence=0.95),
        Shot(x=515, y=515, confidence=0.92),
        Shot(x=509, y=509, confidence=0.88),
        Shot(x=518, y=518, confidence=0.94),
        Shot(x=600, y=600, confidence=0.91)  # Clear flier
    ]
    
    for shot in tight_shots:
        group.add_shot(shot)
    
    return group
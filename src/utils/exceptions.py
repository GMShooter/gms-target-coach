"""Custom exceptions for GMShoot application."""


class GMShootError(Exception):
    """Base exception for GMShoot application."""

    pass


class ConfigurationError(GMShootError):
    """Raised when configuration is invalid or missing."""

    pass


class ImageProcessingError(GMShootError):
    """Raised when image processing fails."""

    pass


class RoboflowError(GMShootError):
    """Raised when Roboflow API interaction fails."""

    pass


class NetworkError(GMShootError):
    """Raised when network operations fail."""

    pass


class AnalysisError(GMShootError):
    """Raised when statistical analysis fails."""

    pass


class ValidationError(GMShootError):
    """Raised when data validation fails."""

    pass


class TimeoutError(GMShootError):
    """Raised when operations timeout."""

    pass


class InsufficientDataError(GMShootError):
    """Raised when there's insufficient data for analysis."""

    pass

"""Configuration management for GMShoot application."""

import os
from typing import Optional
from dataclasses import dataclass
from .exceptions import ConfigurationError


@dataclass
class RoboflowConfig:
    """Roboflow API configuration."""

    api_key: str
    model_id: str = "shooting-target-detection"
    url: str = "https://api.roboflow.com"


@dataclass
class NgrokConfig:
    """ngrok server configuration."""

    base_url: str
    username: Optional[str] = None
    password: Optional[str] = None


@dataclass
class AppConfig:
    """Application configuration."""

    log_level: str = "INFO"
    max_memory_mb: int = 500
    image_processing_timeout_s: float = 2.0
    stats_calculation_timeout_s: float = 0.5
    debug: bool = False
    test_mode: bool = False


class Config:
    """Main configuration class for GMShoot."""

    def __init__(self):
        self.roboflow = RoboflowConfig(
            api_key=os.getenv("VITE_ROBOFLOW_API_KEY", ""),
            model_id=os.getenv("VITE_ROBOFLOW_MODEL_ID", "shooting-target-detection"),
            url=os.getenv("VITE_ROBOFLOW_URL", "https://serverless.roboflow.com"),
        )

        base_url = os.getenv("BASE", "https://your-ngrok-url.ngrok-free.app")
        print(f"[CONFIG DEBUG] BASE environment variable: {base_url}")

        self.ngrok = NgrokConfig(
            base_url=base_url,
            username=os.getenv("NGROK_USER"),
            password=os.getenv("NGROK_PASS"),
        )

        print(f"[CONFIG DEBUG] ngrok.base_url: {self.ngrok.base_url}")

        self.app = AppConfig(
            log_level=os.getenv("LOG_LEVEL", "DEBUG"),
            max_memory_mb=int(os.getenv("MAX_MEMORY_MB", "500")),
            image_processing_timeout_s=float(os.getenv("IMAGE_PROCESSING_TIMEOUT_S", "2.0")),
            stats_calculation_timeout_s=float(os.getenv("STATS_CALCULATION_TIMEOUT_S", "0.5")),
            debug=os.getenv("DEBUG", "False").lower() == "true",
            test_mode=os.getenv("TEST_MODE", "False").lower() == "true",
        )

        # Gemini API key for AI features
        self.gemini_api_key = os.getenv("VITE_GEMINI_API_KEY", "")

    def validate(self) -> bool:
        """
        Validate configuration settings.

        Returns:
            True if configuration is valid, False otherwise

        Raises:
            ConfigurationError: If configuration is invalid
        """
        errors = []

        # Validate Roboflow configuration
        if not self.roboflow.api_key:
            errors.append("Roboflow API key is required")
        elif len(self.roboflow.api_key) < 10:
            errors.append("Roboflow API key appears to be invalid (too short)")
        elif self.roboflow.api_key.startswith("rf_"):
            errors.append(
                "Invalid API key type: Using Publishable API key (rf_*) for "
                "server-side operations. Please use a Private API key instead."
            )

        if not self.roboflow.model_id:
            errors.append("Roboflow model ID is required")

        if not self.roboflow.url:
            errors.append("Roboflow URL is required")
        elif not self.roboflow.url.startswith(("http://", "https://")):
            errors.append("Roboflow URL must be a valid HTTP/HTTPS URL")

        # Validate ngrok configuration
        if not self.ngrok.base_url:
            errors.append("ngrok base URL is required")
        elif not self.ngrok.base_url.startswith(("http://", "https://")):
            errors.append("ngrok base URL must be a valid HTTP/HTTPS URL")
        elif "your-ngrok-url" in self.ngrok.base_url:
            errors.append("ngrok base URL appears to be a placeholder")

        # Validate application configuration
        if self.app.max_memory_mb < 100:
            errors.append("Max memory should be at least 100 MB")

        if self.app.image_processing_timeout_s <= 0:
            errors.append("Image processing timeout must be positive")

        if self.app.stats_calculation_timeout_s <= 0:
            errors.append("Stats calculation timeout must be positive")

        # Validate log level
        valid_log_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if self.app.log_level not in valid_log_levels:
            errors.append(
                f"Invalid log level: {self.app.log_level}. Must be one of: {valid_log_levels}"
            )

        if errors:
            raise ConfigurationError("\n".join(errors))

        return True

    def get_auth_tuple(self) -> Optional[tuple]:
        """
        Get authentication tuple for ngrok if credentials are provided.

        Returns:
            Tuple of (username, password) or None if not configured
        """
        if self.ngrok.username and self.ngrok.password:
            return (self.ngrok.username, self.ngrok.password)
        return None


# Global configuration instance
config = Config()

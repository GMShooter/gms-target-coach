# GMShoot SOTA Analysis

A state-of-the-art shooting analysis application that uses computer vision to detect bullet holes in targets and performs comprehensive statistical analysis.

## Features

- **Computer Vision Integration**: Uses Roboflow API for accurate bullet hole detection
- **Statistical Analysis**: Comprehensive SOTA metrics for shot groupings
- **Real-time Processing**: Support for both local files and live camera feeds
- **Interactive Visualization**: Streamlit-based interface with image annotation
- **Modular Architecture**: Clean separation of concerns with testable components

## Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (recommended) or conda
- Roboflow API key (for production use)

### Installation

1. **Clone or download the project**:
   ```bash
   git clone <repository-url>
   cd gmshooter-v2
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Run the application**:
   
   **Windows**:
   ```bash
   run_app.bat
   ```
   
   **Linux/Mac**:
   ```bash
   chmod +x run_app.sh
   ./run_app.sh
   ```

### Configuration

Edit the `.env` file with your settings:

```env
# Roboflow Configuration
VITE_ROBOFLOW_API_KEY=your_roboflow_api_key_here
VITE_ROBOFLOW_MODEL_ID=shooting-target-detection
VITE_ROBOFLOW_URL=https://api.roboflow.com

# ngrok Server Configuration (for live camera)
BASE=https://your-ngrok-url.ngrok-free.app
NGROK_USER=your_ngrok_username
NGROK_PASS=your_ngrok_password

# Application Configuration
LOG_LEVEL=INFO
MAX_MEMORY_MB=500
```

## Usage

1. Launch the application using the appropriate script for your platform
2. Upload target images or connect to live camera feed
3. Adjust analysis parameters using the sidebar controls
4. View detected shots and statistical analysis
5. Export results for further analysis

## Development

### Running Tests

```bash
# Run all tests
pytest tests/ --cov=src --cov-report=html

# Run specific test modules
pytest tests/unit/test_shot_analysis.py -v
pytest tests/integration/test_roboflow_client.py -v
```

### Code Quality

```bash
# Format code
black src/ tests/

# Check code style
flake8 src/ tests/

# Type checking
mypy src/
```

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **`src/utils/`**: Shared utilities (logging, configuration, exceptions, image processing)
- **`src/analysis_engine/`**: Core analysis logic (models, shot analysis)
- **`src/clients/`**: External API integrations (Roboflow)
- **`src/data_acquisition/`**: Data sources (local files, network client)
- **`src/ui_layer/`**: User interface (Streamlit app, components)
- **`tests/`**: Test suites (unit, integration, fixtures)

## Constitution

This project follows the GMShoot Constitution principles:
- Data-Driven Architecture
- Separation of Concerns
- Test-First Development
- External API Isolation
- State Management Protocol
- Statistical Integrity

See `gmshooter-v2/.specify/memory/constitution.md` for complete development guidelines.

## License

MIT License - see LICENSE file for details.
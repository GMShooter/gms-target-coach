Excellent. Capturing that design is the most critical first step. Now, let's translate that principal-level design into a concrete file structure. This structure is designed for clarity, separation of concerns, and easy testing.

Here are the files you'll need to create to build this robust Streamlit prototype, following the architecture we designed.

### Project Directory Structure

```
sota_prototype/
├── .streamlit/
│   └── config.toml           # (Optional) For theming and advanced Streamlit settings.
│
├── test_frames/              # Folder for your local testing images.
│   ├── frame_1.jpg
│   ├── frame_2.jpg
│   └── ...
│
├── app.py                    # The main entry point for the Streamlit application (UI Layer).
├── analysis.py               # All SOTA calculations and logic (Analysis Engine).
├── data_source.py            # Logic for fetching frames, live or local (Data Acquisition Layer).
├── roboflow_client.py        # A dedicated client for interacting with the Roboflow API.
├── utils.py                  # Helper functions (e.g., drawing on images, logging setup).
├── requirements.txt          # Lists all the Python packages needed to run the project.
└── README.md                 # Instructions on how to set up and run the application.
```

---

### File-by-File Breakdown (What to Tell Your Coding Agent)

Here is a detailed description of what goes into each new file.

#### 1. `requirements.txt`
**Purpose:** Defines the project's dependencies. This is the first file to create.
**Content:**
```
streamlit
requests
pandas
numpy
scipy
Pillow
opencv-python
```
**Agent Instruction:** "Create a `requirements.txt` file with the following packages: streamlit, requests, pandas, numpy, scipy, Pillow, and opencv-python. The user can then run `pip install -r requirements.txt` to set up the environment."

---

#### 2. `roboflow_client.py`
**Purpose:** Encapsulates all logic for communicating with Roboflow. This isolates the external API call, making it easy to mock or update.
**Content:** A Python class or function.
```python
# roboflow_client.py
import os
from inference_sdk import InferenceHTTPClient

# It's better to load API keys from environment variables
API_KEY = os.getenv("ROBOFLOW_API_KEY", "YOUR_FALLBACK_API_KEY_HERE")
API_URL = "https://serverless.roboflow.com"

client = InferenceHTTPClient(api_url=API_URL, api_key=API_KEY)

def get_hole_predictions(image_path: str) -> list:
    """
    Analyzes an image file using the Roboflow workflow and returns a list of predictions.

    Args:
        image_path: The path to the image file to analyze.

    Returns:
        A list of prediction dictionaries, or an empty list if an error occurs.
    """
    try:
        result = client.run_workflow(
            workspace_name="gmshooter",
            workflow_id="production-inference-sahi-detr-2-2",
            images={"image": image_path},
            use_cache=True
        )
        # Extract the relevant prediction data from the complex Roboflow output
        predictions = result[0]['output']['predictions']['predictions']
        return predictions
    except Exception as e:
        print(f"Error calling Roboflow API: {e}") # Replace with proper logging
        return []
```

---

#### 3. `data_source.py`
**Purpose:** Provides a clean interface for getting image data, whether from a live camera or local files.
**Content:**
```python
# data_source.py
import os
import requests
from PIL import Image
from io import BytesIO

# Configuration from your ngrok_server.py
BASE = os.getenv("BASE", "https://f92126526c77.ngrok-free.app")
HDRS = {"ngrok-skip-browser-warning": "true"}
NGROK_BASIC_USER = os.getenv("NGROK_USER")
NGROK_BASIC_PASS = os.getenv("NGROK_PASS")
AUTH = (NGROK_BASIC_USER, NGROK_BASIC_PASS) if (NGROK_BASIC_USER and NGROK_BASIC_PASS) else None

def get_local_frame(frame_index: int, folder: str = "test_frames") -> Image.Image:
    """Loads a frame from a local directory."""
    image_path = os.path.join(folder, f"frame_{frame_index}.jpg")
    if os.path.exists(image_path):
        return Image.open(image_path)
    return None

def get_live_frame() -> Image.Image:
    """Fetches the latest frame from the live ngrok server."""
    url = f"{BASE}/frame/latest"
    try:
        response = requests.get(url, headers=HDRS, auth=AUTH, timeout=10)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        return image
    except requests.RequestException as e:
        print(f"Error fetching live frame: {e}") # Replace with proper logging
        return None
```

---

#### 4. `analysis.py`
**Purpose:** The core number-crunching engine. Contains all the SOTA calculations. **Crucially, this file should not import Streamlit.** This keeps it pure and easy to unit test.
**Content:**
```python
# analysis.py
import numpy as np
from scipy.spatial import ConvexHull, distance

def find_new_shots(previous_shots: list, current_detections: list, threshold: int = 15) -> list:
    """
    Compares current detections to a list of known shots to find new ones.
    
    Args:
        previous_shots: List of shot dicts {'x': float, 'y': float, ...}.
        current_detections: List of detection dicts from Roboflow.
        threshold: The pixel distance to consider a detection as a duplicate.

    Returns:
        A list of new shot detections.
    """
    # ... implementation using Euclidean distance ...
    new_shots = []
    # (Your logic here)
    return new_shots


def calculate_sota_metrics(shots: list) -> dict:
    """
    Takes a list of all unique shots and returns a dictionary of SOTA metrics.
    """
    if not shots or len(shots) < 2:
        return {} # Not enough data to calculate metrics

    coords = np.array([[s['x'], s['y']] for s in shots])

    # Category 1: Group Characteristics
    mpi = np.mean(coords, axis=0)
    pairwise_dists = distance.pdist(coords)
    extreme_spread = np.max(pairwise_dists) if pairwise_dists.size > 0 else 0
    
    # ... implement Mean Radius, Convex Hull, Std Dev ...

    metrics = {
        "total_shots": len(shots),
        "mpi": {"x": mpi[0], "y": mpi[1]},
        "extreme_spread": extreme_spread,
        # ... add all other calculated metrics here ...
    }
    return metrics
```

---

#### 5. `utils.py`
**Purpose:** A place for miscellaneous helper functions to keep other files clean.
**Content:**
```python
# utils.py
from PIL import Image, ImageDraw
import logging

def setup_logging():
    """Configures a basic logger."""
    # ... logging configuration from previous prompt ...

def draw_on_image(image: Image.Image, shots: list, metrics: dict) -> Image.Image:
    """
    Draws shot detections and MPI on a copy of the image.
    
    Args:
        image: The original PIL Image.
        shots: List of shot dictionaries.
        metrics: The calculated metrics dictionary containing MPI.

    Returns:
        A new PIL Image with annotations.
    """
    annotated_image = image.copy().convert("RGB")
    draw = ImageDraw.Draw(annotated_image)
    
    # Draw all shots as blue circles
    for shot in shots:
        x, y, r = shot['x'], shot['y'], 10 # radius
        draw.ellipse((x-r, y-r, x+r, y+r), outline="blue", width=2)
        
    # Draw MPI as a red cross
    if 'mpi' in metrics:
        mx, my, mr = metrics['mpi']['x'], metrics['mpi']['y'], 15
        draw.line((mx-mr, my, mx+mr, my), fill="red", width=3)
        draw.line((mx, my-mr, mx, my+mr), fill="red", width=3)

    return annotated_image
```

---

#### 6. `app.py`
**Purpose:** The main application. It ties everything together, manages the state, and handles all the UI rendering with Streamlit.
**Content:** This file will be the most complex, orchestrating the calls to all other modules.
```python
# app.py
import streamlit as st
import tempfile
import os

# Import our custom modules
import data_source
import roboflow_client
import analysis
import utils

# --- Page Config & State Initialization ---
st.set_page_config(layout="wide", page_title="GMShoot SOTA Analysis")

if 'shots' not in st.session_state:
    st.session_state.shots = []
if 'metrics' not in st.session_state:
    st.session_state.metrics = {}
# ... other state variables ...

# --- UI Layout ---
st.title("GMShoot SOTA Analysis 🎯")

# Sidebar for controls
st.sidebar.header("Controls")
analysis_mode = st.sidebar.radio("Analysis Mode", ["Local Files", "Live Camera"])
if st.sidebar.button("Analyze"):
    # --- The Main Reactive Loop ---
    # 1. Get Image
    if analysis_mode == "Live Camera":
        image = data_source.get_live_frame()
    else:
        # Logic to get next local frame index...
        image = data_source.get_local_frame(...)

    if image:
        # Save temp file for Roboflow
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            image.save(tmp.name)
            tmp_path = tmp.name

        # 2. Get Detections
        current_detections = roboflow_client.get_hole_predictions(tmp_path)
        os.remove(tmp_path) # Clean up temp file

        # 3. Find New Shots
        new_shots = analysis.find_new_shots(st.session_state.shots, current_detections)

        # 4. Update State
        if new_shots:
            # Add frame index, timestamp, etc. to each new shot before appending
            st.session_state.shots.extend(new_shots)

        # 5. Recalculate Metrics
        st.session_state.metrics = analysis.calculate_sota_metrics(st.session_state.shots)
        
        # Streamlit automatically re-runs from here, redrawing the UI below

# --- Display Area ---
col1, col2 = st.columns([0.6, 0.4])

with col1:
    st.header("Visual Analysis")
    if 'image' in st.session_state and st.session_state.image is not None:
         annotated_img = utils.draw_on_image(st.session_state.image, st.session_state.shots, st.session_state.metrics)
         st.image(annotated_img, use_column_width=True)
    else:
         st.info("Click 'Analyze' to start.")

with col2:
    st.header("SOTA Report")
    st.metric("Total Shots Detected", value=st.session_state.metrics.get('total_shots', 0))
    # ... display other metrics from st.session_state.metrics ...
    st.subheader("Raw Shot Data")
    st.dataframe(st.session_state.shots)
```

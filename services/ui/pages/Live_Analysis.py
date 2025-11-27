import streamlit as st
import requests
import json
import time
import os
from streamlit_drawable_canvas import st_canvas
from PIL import Image, ImageDraw
import io

# ========= Configuration =========
ANALYSIS_SERVICE_URL = os.getenv("ANALYSIS_SERVICE_URL", "http://analysis:8001")

st.set_page_config(page_title="Live Analysis", layout="wide")
st.title("Live Analysis")

# ========= Helper Functions =========
def render_dashboard(data):
    st.metric("Status", data.get("status", "UNKNOWN"))
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Target View")
        # Fetch latest frame
        try:
            r = requests.get("http://camera:8000/frame/latest", timeout=15)
            if r.status_code == 200:
                img_bytes = r.content
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            else:
                # Fallback to white background
                img = Image.new('RGB', (600, 600), color='white')
        except Exception:
            img = Image.new('RGB', (600, 600), color='white')

        # Draw shots on the image
        draw = ImageDraw.Draw(img)
        w, h = img.size
        
        for shot in data.get("shots", []):
            # Coordinates are normalized (0-1)
            cx = shot["x"] * w
            cy = shot["y"] * h
            
            # Draw shot marker (red circle)
            r_px = 5
            draw.ellipse((cx - r_px, cy - r_px, cx + r_px, cy + r_px), fill="red", outline="black")
            
            # Draw shot ID
            draw.text((cx + 10, cy - 10), f"R{shot['round_id']}", fill="red")

        # Draw calibration rings if available
        cal_data = data.get("calibration_data", {})
        if cal_data and "center_x" in cal_data:
            cx_cal = cal_data.get("center_x", 0.5) * w
            cy_cal = cal_data.get("center_y", 0.5) * h
            rw_cal = cal_data.get("ring_width", 0.1)
            
            # Draw center cross
            draw.line((cx_cal - 10, cy_cal, cx_cal + 10, cy_cal), fill="red", width=2)
            draw.line((cx_cal, cy_cal - 10, cx_cal, cy_cal + 10), fill="red", width=2)
            
            # Draw rings (10, 9, 8...)
            for score in [10, 9, 8, 7, 6]:
                d_norm = (10.9 - score) * rw_cal
                radius_px = d_norm * w
                if radius_px > 0:
                    left = cx_cal - radius_px
                    top = cy_cal - radius_px
                    right = cx_cal + radius_px
                    bottom = cy_cal + radius_px
                    draw.ellipse((left, top, right, bottom), outline="green", width=2)

        # Display the image with full width
        st.image(img, caption="Live Target View", use_container_width=True)
        
        st.write(f"Shots: {len(data.get('shots', []))}")

    with col2:
        st.subheader("Stats")
        st.metric("Total Score", f"{data.get('total_score', 0):.1f}")
        st.metric("Avg Score", f"{data.get('average_score', 0):.1f}")
        st.metric("Round", data.get("current_round", 1))

# ========= Session Control =========
col1, col2 = st.columns([1, 3])

with col1:
    session_id = st.text_input("Session ID", value="default")
    if st.button("Start Session"):
        try:
            requests.post(f"{ANALYSIS_SERVICE_URL}/session/start", json={"session_id": session_id})
            st.success("Session Started")
        except Exception as e:
            st.error(f"Error: {e}")

    if st.button("End Session"):
        try:
            requests.post(f"{ANALYSIS_SERVICE_URL}/session/end")
            st.warning("Session Ended")
        except Exception as e:
            st.error(f"Error: {e}")

# ========= Live View (SSE) =========
# We use a placeholder to update content
placeholder = st.empty()

# In Streamlit, real SSE is hard without custom components. 
# We will use a loop with short sleep for MVP "live" feel, fetching state.
# OR we can try to consume the stream.

if "monitoring" not in st.session_state:
    st.session_state.monitoring = False

if st.button("Toggle Live Monitor"):
    st.session_state.monitoring = not st.session_state.monitoring

if st.session_state.monitoring:
    # Connect to SSE stream
    try:
        # Using requests with stream=True
        response = requests.get(f"{ANALYSIS_SERVICE_URL}/stream", stream=True, timeout=5)
        
        for line in response.iter_lines():
            if not st.session_state.monitoring:
                break
                
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("data:"):
                    json_str = decoded_line.replace("data: ", "")
                    try:
                        data = json.loads(json_str)
                        
                        # Render UI based on data
                        with placeholder.container():
                            render_dashboard(data)
                            
                    except json.JSONDecodeError:
                        pass
    except Exception as e:
        st.error(f"Stream connection error: {e}")
        st.session_state.monitoring = False



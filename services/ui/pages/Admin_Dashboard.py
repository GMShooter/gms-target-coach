import streamlit as st
import requests
import os
import time
from PIL import Image, ImageDraw
import io

CAMERA_SERVICE_URL = os.getenv("CAMERA_SERVICE_URL", "http://camera:8000")
ANALYSIS_SERVICE_URL = os.getenv("ANALYSIS_SERVICE_URL", "http://analysis:8001")

st.set_page_config(page_title="Admin Dashboard", layout="wide")
st.title("Admin Dashboard")

st.subheader("Camera Control")
col_cam1, col_cam2 = st.columns(2)

with col_cam1:
    st.write("Zoom Presets")
    zoom_level = st.selectbox("Select Zoom Level", [1, 2, 3, 4, 5], index=0)
    if st.button("Apply Zoom"):
        try:
            requests.post(f"{CAMERA_SERVICE_URL}/zoom/preset", json={"number": zoom_level}, timeout=15)
            st.success(f"Zoom set to {zoom_level}")
            time.sleep(1) # Wait for camera to adjust
        except Exception as e:
            st.error(f"Zoom Failed: {e}")

with col_cam2:
    if st.button("Check Health"):
        try:
            r = requests.get(f"{CAMERA_SERVICE_URL}/health", timeout=15)
            st.json(r.json())
        except Exception as e:
            st.error(f"Camera Service Unreachable: {e}")

st.subheader("Calibration")
col1, col2 = st.columns(2)

with col1:
    center_x = st.slider("Center X", 0.0, 1.0, 0.5)
    center_y = st.slider("Center Y", 0.0, 1.0, 0.5)
    ring_width = st.slider("Ring Width (10 to 9)", 0.01, 0.2, 0.1)

    if st.button("Save Calibration"):
        try:
            payload = {
                "center_x": center_x,
                "center_y": center_y,
                "ring_width": ring_width
            }
            requests.post(f"{ANALYSIS_SERVICE_URL}/calibrate", json=payload, timeout=15)
            st.success("Calibration Saved")
        except Exception as e:
            st.error(f"Error: {e}")

with col2:
    st.write("Visual Preview")
    # Fetch latest frame to draw on
    try:
        r = requests.get(f"{CAMERA_SERVICE_URL}/frame/latest", timeout=15)
        
        if r.status_code == 200:
            image_bytes = r.content
            try:
                img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                draw = ImageDraw.Draw(img)
                w, h = img.size
                
                # Draw Crosshair
                cx = center_x * w
                cy = center_y * h
                draw.line((cx-20, cy, cx+20, cy), fill="red", width=3)
                draw.line((cx, cy-20, cx, cy+20), fill="red", width=3)
                
                # Draw Rings (10, 9, 8)
                for score in [10, 9, 8, 7, 6]:
                    d_norm = (10.9 - score) * ring_width
                    radius_px = d_norm * w
                    
                    if radius_px > 0:
                        draw.ellipse((cx-radius_px, cy-radius_px, cx+radius_px, cy+radius_px), outline="green", width=2)

                st.image(img, caption="Calibration Preview", use_container_width=True)
            except Exception as img_err:
                st.error(f"Invalid Image Data: {img_err}")
                st.text(f"Response Content (First 500 chars):\n{r.text[:500]}")
        else:
            st.error(f"Camera Error: {r.status_code}")
            st.text(r.text)

    except Exception as e:
        st.error(f"Could not fetch frame for preview: {e}")

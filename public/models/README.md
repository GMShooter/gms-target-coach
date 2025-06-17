
# YOLOv8 Model Files

To use real YOLOv8 detection instead of simulation, place your trained YOLOv8 ONNX model file here:

- `yolov8n.onnx` - Your trained YOLOv8 model for bullet hole detection

## How to convert your YOLOv8 model to ONNX:

1. Train your YOLOv8 model with bullet hole dataset
2. Export to ONNX format:
```python
from ultralytics import YOLO

# Load your trained model
model = YOLO('path/to/your/trained/model.pt')

# Export to ONNX
model.export(format='onnx', imgsz=640)
```

3. Place the exported `.onnx` file in this directory as `yolov8n.onnx`

The system will automatically detect the model file and use real inference instead of simulation.

export interface Detection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class?: string;
}

export interface FrameDetection {
  timestamp: number;
  frameNumber: number;
  detections: Detection[];
}

export interface DetectedShot {
  x: number;
  y: number;
  confidence?: number;
  timestamp?: number;
  coordinates?: {
    x: number;
    y: number;
  };
}
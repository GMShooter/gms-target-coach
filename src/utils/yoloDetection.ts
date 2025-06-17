
import { supabase } from '@/integrations/supabase/client';

export interface DetectedObject {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  center: [number, number]; // [x, y] center coordinates
}

export interface YOLODetectionResult {
  detections: DetectedObject[];
  timestamp: number;
  frameNumber: number;
  imageData: string;
}

export class YOLOv8Detector {
  private model: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load YOLOv8 model using ONNX Runtime Web
      const { InferenceSession, Tensor } = await import('onnxruntime-web');
      
      // Load our custom trained YOLOv8 model for bullet hole detection
      const modelUrl = '/models/yolov8_bullet_holes.onnx';
      this.model = await InferenceSession.create(modelUrl);
      this.isInitialized = true;
      console.log('✅ YOLOv8 model loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load YOLOv8 model:', error);
      throw new Error('Failed to initialize YOLOv8 model');
    }
  }

  async detectObjects(imageData: string): Promise<DetectedObject[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Convert base64 image to tensor
      const tensor = await this.preprocessImage(imageData);
      
      // Run inference
      const results = await this.model.run({ images: tensor });
      
      // Post-process results
      const detections = this.postprocessResults(results);
      
      console.log(`🎯 YOLOv8 detected ${detections.length} bullet holes`);
      return detections;
    } catch (error) {
      console.error('❌ YOLOv8 detection error:', error);
      return [];
    }
  }

  private async preprocessImage(imageData: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Resize to YOLOv8 input size (640x640)
        canvas.width = 640;
        canvas.height = 640;
        ctx.drawImage(img, 0, 0, 640, 640);
        
        // Get image data and normalize
        const imageData = ctx.getImageData(0, 0, 640, 640);
        const data = imageData.data;
        
        // Convert to RGB tensor format [1, 3, 640, 640]
        const float32Data = new Float32Array(3 * 640 * 640);
        
        for (let i = 0; i < 640 * 640; i++) {
          float32Data[i] = data[i * 4] / 255.0; // R
          float32Data[640 * 640 + i] = data[i * 4 + 1] / 255.0; // G
          float32Data[2 * 640 * 640 + i] = data[i * 4 + 2] / 255.0; // B
        }
        
        const { Tensor } = require('onnxruntime-web');
        const tensor = new Tensor('float32', float32Data, [1, 3, 640, 640]);
        resolve(tensor);
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }

  private postprocessResults(results: any): DetectedObject[] {
    const output = results.output0.data;
    const detections: DetectedObject[] = [];
    
    // YOLOv8 output format: [batch, 84, 8400] where 84 = 4 bbox + 80 classes
    // For bullet holes, we expect class 0 to be 'bullet_hole'
    const numDetections = 8400;
    const confidenceThreshold = 0.5;
    
    for (let i = 0; i < numDetections; i++) {
      const confidence = output[4 * numDetections + i]; // Class confidence for bullet_hole
      
      if (confidence > confidenceThreshold) {
        const x = output[i];
        const y = output[numDetections + i];
        const w = output[2 * numDetections + i];
        const h = output[3 * numDetections + i];
        
        detections.push({
          class: 'bullet_hole',
          confidence,
          bbox: [x - w/2, y - h/2, w, h],
          center: [x, y]
        });
      }
    }
    
    // Apply Non-Maximum Suppression to remove duplicate detections
    return this.applyNMS(detections);
  }

  private applyNMS(detections: DetectedObject[], iouThreshold = 0.5): DetectedObject[] {
    // Sort by confidence
    detections.sort((a, b) => b.confidence - a.confidence);
    
    const keep: DetectedObject[] = [];
    
    for (const detection of detections) {
      let shouldKeep = true;
      
      for (const kept of keep) {
        const iou = this.calculateIOU(detection.bbox, kept.bbox);
        if (iou > iouThreshold) {
          shouldKeep = false;
          break;
        }
      }
      
      if (shouldKeep) {
        keep.push(detection);
      }
    }
    
    return keep;
  }

  private calculateIOU(bbox1: number[], bbox2: number[]): number {
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;
    
    const x1_max = x1 + w1;
    const y1_max = y1 + h1;
    const x2_max = x2 + w2;
    const y2_max = y2 + h2;
    
    const intersect_x1 = Math.max(x1, x2);
    const intersect_y1 = Math.max(y1, y2);
    const intersect_x2 = Math.min(x1_max, x2_max);
    const intersect_y2 = Math.min(y1_max, y2_max);
    
    if (intersect_x2 <= intersect_x1 || intersect_y2 <= intersect_y1) {
      return 0;
    }
    
    const intersect_area = (intersect_x2 - intersect_x1) * (intersect_y2 - intersect_y1);
    const bbox1_area = w1 * h1;
    const bbox2_area = w2 * h2;
    const union_area = bbox1_area + bbox2_area - intersect_area;
    
    return intersect_area / union_area;
  }
}

export const yoloDetector = new YOLOv8Detector();

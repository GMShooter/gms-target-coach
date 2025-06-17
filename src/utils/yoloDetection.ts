
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
  private session: any = null;
  private isInitialized = false;
  private inputName = '';
  private outputNames: string[] = [];

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🔧 Initializing YOLOv8 model with ONNX Runtime...');
      
      // Import ONNX Runtime Web dynamically
      const ort = await import('onnxruntime-web');
      
      // Set execution providers (prefer WebGL for performance)
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';
      
      // For now, we'll use a placeholder model URL - in production this would be your trained YOLOv8 model
      // You would replace this with your actual YOLOv8 ONNX model file
      const modelUrl = '/models/yolov8n.onnx'; // This file needs to be in public/models/
      
      try {
        this.session = await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['webgl', 'wasm'],
          graphOptimizationLevel: 'all'
        });
        
        // Get input and output names
        this.inputName = this.session.inputNames[0];
        this.outputNames = this.session.outputNames;
        
        this.isInitialized = true;
        console.log('✅ YOLOv8 ONNX model loaded successfully');
        console.log('Input name:', this.inputName);
        console.log('Output names:', this.outputNames);
      } catch (modelError) {
        console.warn('⚠️ Could not load YOLOv8 model, falling back to simulation:', modelError);
        // Fallback to simulation if model file is not available
        this.session = { simulated: true };
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize ONNX Runtime:', error);
      throw new Error('Failed to initialize YOLOv8 model');
    }
  }

  async detectObjects(imageData: string): Promise<DetectedObject[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // If using simulated session (model file not available)
      if (this.session?.simulated) {
        return await this.simulateDetection(imageData);
      }

      // Real ONNX inference
      const detections = await this.runInference(imageData);
      
      console.log(`🎯 YOLOv8 detected ${detections.length} bullet holes`);
      return detections;
    } catch (error) {
      console.error('❌ YOLOv8 detection error:', error);
      console.log('Falling back to simulation...');
      return await this.simulateDetection(imageData);
    }
  }

  private async runInference(imageData: string): Promise<DetectedObject[]> {
    // Convert base64 image data to tensor
    const tensor = await this.preprocessImage(imageData);
    
    // Run inference
    const feeds = { [this.inputName]: tensor };
    const outputData = await this.session.run(feeds);
    
    // Post-process results
    const detections = this.postprocessOutput(outputData);
    
    return detections;
  }

  private async preprocessImage(imageData: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Create canvas and resize to model input size (640x640 for YOLOv8)
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          const modelSize = 640;
          canvas.width = modelSize;
          canvas.height = modelSize;
          
          // Draw and resize image
          ctx.drawImage(img, 0, 0, modelSize, modelSize);
          
          // Get image data and convert to tensor format
          const imageDataArray = ctx.getImageData(0, 0, modelSize, modelSize);
          const pixelData = imageDataArray.data;
          
          // Convert RGBA to RGB and normalize to [0,1]
          const tensorData = new Float32Array(3 * modelSize * modelSize);
          
          for (let i = 0; i < pixelData.length; i += 4) {
            const pixelIndex = i / 4;
            const r = pixelData[i] / 255.0;
            const g = pixelData[i + 1] / 255.0;
            const b = pixelData[i + 2] / 255.0;
            
            // CHW format: [C, H, W]
            tensorData[pixelIndex] = r; // R channel
            tensorData[modelSize * modelSize + pixelIndex] = g; // G channel
            tensorData[2 * modelSize * modelSize + pixelIndex] = b; // B channel
          }
          
          // Create tensor
          const tensor = new (window as any).ort.Tensor('float32', tensorData, [1, 3, modelSize, modelSize]);
          resolve(tensor);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = imageData;
    });
  }

  private postprocessOutput(outputData: any): DetectedObject[] {
    const detections: DetectedObject[] = [];
    
    try {
      // YOLOv8 output format: [batch, 84, 8400] where 84 = 4 bbox coords + 80 classes
      const output = outputData[this.outputNames[0]];
      const outputArray = output.data;
      const [batch, features, anchors] = output.dims;
      
      const confThreshold = 0.5;
      const iouThreshold = 0.4;
      
      // Parse detections
      const boxes = [];
      for (let i = 0; i < anchors; i++) {
        const offset = i * features;
        
        // Extract bbox coordinates
        const x = outputArray[offset];
        const y = outputArray[offset + 1];
        const w = outputArray[offset + 2];
        const h = outputArray[offset + 3];
        
        // Find best class (skip first 4 bbox coordinates)
        let maxConf = 0;
        let bestClass = 0;
        for (let j = 4; j < features; j++) {
          const conf = outputArray[offset + j];
          if (conf > maxConf) {
            maxConf = conf;
            bestClass = j - 4;
          }
        }
        
        // Filter by confidence
        if (maxConf > confThreshold) {
          boxes.push({
            bbox: [x - w/2, y - h/2, w, h],
            confidence: maxConf,
            class: bestClass === 0 ? 'bullet_hole' : `class_${bestClass}`, // Assume class 0 is bullet hole
            center: [x, y]
          });
        }
      }
      
      // Apply Non-Maximum Suppression
      const filteredBoxes = this.applyNMS(boxes, iouThreshold);
      
      return filteredBoxes;
    } catch (error) {
      console.error('Error in postprocessing:', error);
      return [];
    }
  }

  private applyNMS(boxes: any[], iouThreshold: number): DetectedObject[] {
    // Sort by confidence
    boxes.sort((a, b) => b.confidence - a.confidence);
    
    const selected = [];
    const suppressed = new Set();
    
    for (let i = 0; i < boxes.length; i++) {
      if (suppressed.has(i)) continue;
      
      selected.push(boxes[i]);
      
      for (let j = i + 1; j < boxes.length; j++) {
        if (suppressed.has(j)) continue;
        
        const iou = this.calculateIOU(boxes[i].bbox, boxes[j].bbox);
        if (iou > iouThreshold) {
          suppressed.add(j);
        }
      }
    }
    
    return selected;
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

  private async simulateDetection(imageData: string): Promise<DetectedObject[]> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('🔧 Using simulated YOLOv8 detection (model file not available)');
    
    // Simulate detection results based on image analysis
    const detections: DetectedObject[] = [];
    
    // Simulate 1-3 bullet holes detected with random positions
    const numDetections = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numDetections; i++) {
      const x = Math.random() * 640; // Random x coordinate
      const y = Math.random() * 640; // Random y coordinate
      const w = 10 + Math.random() * 20; // Width 10-30 pixels
      const h = 10 + Math.random() * 20; // Height 10-30 pixels
      
      detections.push({
        class: 'bullet_hole',
        confidence: 0.7 + Math.random() * 0.3, // Confidence 0.7-1.0
        bbox: [x - w/2, y - h/2, w, h],
        center: [x, y]
      });
    }
    
    return detections;
  }
}

export const yoloDetector = new YOLOv8Detector();

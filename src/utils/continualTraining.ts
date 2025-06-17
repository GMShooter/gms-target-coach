
import { supabase } from '@/integrations/supabase/client';
import { VideoStorageManager } from './videoStorage';
import { yoloDetector } from './yoloDetection';

export interface TrainingData {
  id: string;
  videoId: string;
  detections: any[];
  annotations: any[];
  createdAt: string;
  isValidated: boolean;
}

export class ContinualTrainingManager {
  static async extractTrainingData(videoId: string): Promise<TrainingData | null> {
    try {
      // Get video from storage
      const { data: video } = await supabase
        .from('training_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (!video) {
        throw new Error('Video not found');
      }

      // Extract frames and run YOLOv8 detection
      const frames = await this.extractVideoFrames(video.storageUrl);
      const detections = [];

      for (const frame of frames) {
        const frameDetections = await yoloDetector.detectObjects(frame.imageData);
        detections.push({
          timestamp: frame.timestamp,
          detections: frameDetections
        });
      }

      // Save training data
      const trainingData: Omit<TrainingData, 'id'> = {
        videoId,
        detections,
        annotations: [], // Will be filled by human validation
        createdAt: new Date().toISOString(),
        isValidated: false
      };

      const { data: savedData, error } = await supabase
        .from('training_data')
        .insert(trainingData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Training data extracted:', savedData);
      return savedData;
    } catch (error) {
      console.error('❌ Training data extraction error:', error);
      return null;
    }
  }

  private static async extractVideoFrames(videoUrl: string): Promise<Array<{imageData: string, timestamp: number}>> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const frames: Array<{imageData: string, timestamp: number}> = [];
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const duration = video.duration;
        const frameInterval = 1; // Extract one frame per second
        let currentTime = 0;
        
        const extractFrame = () => {
          if (currentTime >= duration) {
            resolve(frames);
            return;
          }
          
          video.currentTime = currentTime;
        };
        
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.9);
          frames.push({ imageData, timestamp: currentTime });
          
          currentTime += frameInterval;
          extractFrame();
        };
        
        extractFrame();
      };
      
      video.onerror = reject;
      video.src = videoUrl;
    });
  }

  static async scheduleModelRetraining(): Promise<void> {
    try {
      // Trigger model retraining edge function
      const { data, error } = await supabase.functions.invoke('retrain-yolo-model', {
        body: { trigger: 'scheduled' }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Model retraining scheduled:', data);
    } catch (error) {
      console.error('❌ Model retraining error:', error);
    }
  }

  static async validateTrainingData(trainingDataId: string, annotations: any[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('training_data')
        .update({
          annotations,
          isValidated: true
        })
        .eq('id', trainingDataId);

      if (error) {
        throw error;
      }

      console.log('✅ Training data validated');
      return true;
    } catch (error) {
      console.error('❌ Training data validation error:', error);
      return false;
    }
  }
}

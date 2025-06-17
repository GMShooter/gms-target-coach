
import { supabase } from '@/integrations/supabase/client';
import { VideoStorageManager } from './videoStorage';
import { yoloDetector } from './yoloDetection';

export interface TrainingData {
  id: string;
  video_id: string;
  detections: any[];
  annotations: any[];
  created_at: string;
  is_validated: boolean;
  used_for_training: boolean;
}

export class ContinualTrainingManager {
  static async extractTrainingData(videoId: string): Promise<TrainingData | null> {
    try {
      // Get video from storage using raw query
      const { data: video, error: videoError } = await supabase
        .from('training_videos' as any)
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError || !video) {
        throw new Error(`Video not found: ${videoError?.message}`);
      }

      // Extract frames and run YOLOv8 detection
      const frames = await this.extractVideoFrames(video.storage_url);
      const detections = [];

      for (const frame of frames) {
        const frameDetections = await yoloDetector.detectObjects(frame.imageData);
        detections.push({
          timestamp: frame.timestamp,
          detections: frameDetections
        });
      }

      // Save training data using raw query
      const trainingData = {
        video_id: videoId,
        detections,
        annotations: [],
        created_at: new Date().toISOString(),
        is_validated: false,
        used_for_training: false
      };

      const { data: savedData, error } = await supabase
        .from('training_data' as any)
        .insert(trainingData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Training data extracted:', savedData);
      return savedData as TrainingData;
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
        .from('training_data' as any)
        .update({
          annotations,
          is_validated: true
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

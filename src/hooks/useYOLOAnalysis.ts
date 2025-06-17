
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { yoloDetector, YOLODetectionResult } from '@/utils/yoloDetection';
import { VideoStorageManager } from '@/utils/videoStorage';
import { ContinualTrainingManager } from '@/utils/continualTraining';

export const useYOLOAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');

  const analyzeVideo = async (file: File, isDrillMode: boolean = false): Promise<string | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      setAnalysisProgress('📹 Uploading video to training storage...');
      
      // Upload video to storage (with deduplication)
      const videoMetadata = await VideoStorageManager.uploadVideo(file, user?.id || 'anonymous');
      if (!videoMetadata) {
        throw new Error('Failed to upload video');
      }

      setAnalysisProgress('🧠 Initializing YOLOv8 model...');
      
      // Initialize YOLOv8 detector
      await yoloDetector.initialize();

      setAnalysisProgress('🎯 Detecting bullet holes with YOLOv8...');
      
      // Extract frames and detect objects
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const detectionResults: YOLODetectionResult[] = [];
      
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = async () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const duration = video.duration;
          const frameInterval = 0.5; // Analyze every 0.5 seconds
          let currentTime = 0;
          let frameNumber = 0;
          
          const processFrame = async () => {
            if (currentTime >= duration) {
              resolve();
              return;
            }
            
            video.currentTime = currentTime;
          };
          
          video.onseeked = async () => {
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            
            // Run YOLOv8 detection
            const detections = await yoloDetector.detectObjects(imageData);
            
            if (detections.length > 0) {
              detectionResults.push({
                detections,
                timestamp: currentTime,
                frameNumber,
                imageData
              });
            }
            
            frameNumber++;
            currentTime += frameInterval;
            setAnalysisProgress(`🎯 Processing frame ${frameNumber}... (${detections.length} holes detected)`);
            
            processFrame();
          };
          
          processFrame();
        };
        
        video.onerror = reject;
        video.src = URL.createObjectURL(file);
      });

      if (detectionResults.length === 0) {
        throw new Error('No bullet holes detected in video');
      }

      setAnalysisProgress('🤖 Analyzing detections with Gemini...');
      
      // Send detection results to Gemini for analysis
      const { data: result, error: analysisError } = await supabase.functions.invoke('analyze-yolo-detections', {
        body: {
          detectionResults,
          videoMetadata,
          userId: user?.id || null,
          drillMode: isDrillMode
        }
      });

      if (analysisError) {
        throw analysisError;
      }

      // Extract training data for continual learning
      setAnalysisProgress('📚 Extracting training data...');
      await ContinualTrainingManager.extractTrainingData(videoMetadata.id);

      if (result?.sessionId) {
        toast({
          title: "YOLOv8 Analysis Complete!",
          description: `Detected ${detectionResults.reduce((sum, r) => sum + r.detections.length, 0)} bullet holes across ${detectionResults.length} frames!`,
        });
        
        return result.sessionId;
      }

      return null;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred in YOLOv8 analysis';
      setError(errorMessage);
      console.error('YOLOv8 analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  return { 
    analyzeVideo, 
    isAnalyzing, 
    error, 
    analysisProgress
  };
};

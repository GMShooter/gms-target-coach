
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DetectedShot {
  timestamp: number;
  coordinates: { x: number; y: number };
}

interface FrameDetection {
  timestamp: number;
  detections: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
  }>;
  frameNumber: number;
}

export const useVideoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [detectedBounds, setDetectedBounds] = useState<Array<any>>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [frameNumber, setFrameNumber] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [totalDetectedShots, setTotalDetectedShots] = useState(0);
  const [shouldStop, setShouldStop] = useState(false);

  const analyzeVideo = async (file: File, isDrillMode: boolean = false): Promise<{sessionId: string, firstFrameBase64?: string, lastFrameBase64?: string} | null> => {
    if (isAnalyzing) {
      console.log('Analysis already in progress, skipping...');
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('🎯 Starting REAL frame-by-frame analysis...');
      setAnalysisProgress('🎯 Extracting frames and initializing analysis...');

      // Create video and canvas elements for frame extraction
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas to 640x640 as specified
      canvas.width = 640;
      canvas.height = 640;

      // Load video file
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      const duration = video.duration;
      const frameRate = 1; // 1 FPS as specified
      const totalFramesCalc = Math.floor(duration * frameRate);
      setTotalFrames(totalFramesCalc);
      setTotalDetectedShots(0);
      setShouldStop(false);
      
      console.log(`📊 Video duration: ${duration}s, extracting ${totalFramesCalc} frames at ${frameRate} FPS`);

      // Extract and save first frame for validation
      video.currentTime = 0;
      await new Promise(resolve => video.onseeked = resolve);
      
      ctx.drawImage(video, 0, 0, 640, 640);
      const firstFrameBase64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // Initialize tracking variables
      let previousHoles = new Set<string>();
      let newShotsData: DetectedShot[] = [];
      let allDetectedFrames: FrameDetection[] = [];
      let lastFrameBase64 = firstFrameBase64;

      setAnalysisProgress('🔍 Starting frame-by-frame Roboflow detection...');

      // GENERALIZED ANALYSIS LOOP - NO HARDCODED SHOT COUNTS
      for (let frameIndex = 0; frameIndex < totalFramesCalc; frameIndex++) {
        // Check for pause or stop
        while (isPaused && !shouldStop) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (shouldStop) {
          console.log('Analysis stopped by user');
          break;
        }
        
        const timestamp = frameIndex / frameRate;
        video.currentTime = timestamp;
        
        await new Promise(resolve => video.onseeked = resolve);
        
        // Extract and resize frame
        ctx.drawImage(video, 0, 0, 640, 640);
        const frameBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        // Update UI with current frame and progress
        setCurrentFrame(frameBase64);
        setFrameNumber(frameIndex + 1);
        setCurrentTimestamp(timestamp);
        setAnalysisProgress(`🎯 Analyzing frame ${frameIndex + 1}/${totalFramesCalc} (${timestamp.toFixed(1)}s)`);
        
        console.log(`🔍 Processing frame ${frameIndex + 1}/${totalFramesCalc} at ${timestamp.toFixed(2)}s`);

        // Call Roboflow detection
        const { data: detectionResult, error: detectionError } = await supabase.functions.invoke('analyze-frame', {
          body: {
            frameBase64,
            timestamp,
            frameNumber: frameIndex
          }
        });

        if (detectionError) {
          console.error('Roboflow detection error:', detectionError);
          continue; // Continue with next frame instead of failing completely
        }

        const detections = detectionResult?.detections || [];
        
        // Store all detections for context
        allDetectedFrames.push({
          timestamp,
          detections,
          frameNumber: frameIndex
        });

        // Update UI with detection bounding boxes
        setDetectedBounds(detections);

        // GENERALIZED SHOT DETECTION LOGIC
        const currentHoles = new Set<string>();
        
        // Create coordinate keys for current frame detections
        detections.forEach((detection: any) => {
          const x = Math.round(detection.x);
          const y = Math.round(detection.y);
          const key = `${x}_${y}`;
          currentHoles.add(key);
        });

        // Find new shots by comparing with previous frame
        for (const holeKey of currentHoles) {
          if (!previousHoles.has(holeKey)) {
            // This is a new shot!
            const [x, y] = holeKey.split('_').map(Number);
            newShotsData.push({
              timestamp,
              coordinates: { x, y }
            });
            setTotalDetectedShots(prev => prev + 1);
            console.log(`🎯 NEW SHOT DETECTED at frame ${frameIndex + 1}: (${x}, ${y}) at ${timestamp.toFixed(2)}s`);
          }
        }

        // Update previous holes for next iteration
        previousHoles = new Set(currentHoles);
        lastFrameBase64 = frameBase64;
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`🎯 Frame analysis complete! Found ${newShotsData.length} new shots`);
      
      if (newShotsData.length === 0) {
        setAnalysisProgress('⚠️ No new shots detected in video');
        toast({
          title: "No New Shots Detected",
          description: "The video analysis completed but no new bullet impacts were found.",
          variant: "destructive"
        });
        return { sessionId: '', firstFrameBase64, lastFrameBase64 };
      }

      setAnalysisProgress('🤖 Generating comprehensive report with Gemini...');

      // Send complete data to Gemini for final analysis
      const { data: result, error: analysisError } = await supabase.functions.invoke('generate-report', {
        body: {
          allDetectedFrames,
          newShotsData,
          userId: user?.id || null,
          drillMode: isDrillMode,
          videoDuration: duration
        }
      });

      if (analysisError) {
        throw analysisError;
      }

      if (result?.sessionId) {
        toast({
          title: "SOTA Analysis Complete!",
          description: `Real-time analysis detected ${newShotsData.length} new shots with full context!`,
        });
        
        return {
          sessionId: result.sessionId,
          firstFrameBase64,
          lastFrameBase64
        };
      }

      return null;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred in video analysis';
      setError(errorMessage);
      console.error('SOTA Video analysis error:', err);
      toast({
        title: "Analysis Error",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
      setCurrentFrame(null);
      setDetectedBounds([]);
      setIsPaused(false);
      setFrameNumber(0);
      setTotalFrames(0);
      setCurrentTimestamp(0);
      setTotalDetectedShots(0);
      setShouldStop(false);
    }
  };

  const pauseAnalysis = () => setIsPaused(true);
  const resumeAnalysis = () => setIsPaused(false);
  const stopAnalysis = () => setShouldStop(true);

  // Simple stub methods for API management compatibility
  const getRemainingRequests = () => 10;
  const getTimeUntilReset = () => 0;
  const isInCooldown = false;

  return { 
    analyzeVideo, 
    isAnalyzing, 
    error, 
    analysisProgress,
    currentFrame,
    detectedBounds,
    isPaused,
    frameNumber,
    totalFrames,
    currentTimestamp,
    totalDetectedShots,
    pauseAnalysis,
    resumeAnalysis,
    stopAnalysis,
    getRemainingRequests,
    getTimeUntilReset,
    isInCooldown
  };
};


import { useState, useCallback, useRef } from 'react';
import { Detection, FrameDetection, DetectedShot } from '@/types/detection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useVideoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [detectedBounds, setDetectedBounds] = useState<Detection[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [frameNumber, setFrameNumber] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [totalDetectedShots, setTotalDetectedShots] = useState(0);
  const [shouldStop, setShouldStop] = useState(false);

  // Use refs for values that need to be accessed in async loops
  const pausedRef = useRef(false);
  const stopRef = useRef(false);

  const analyzeVideo = async (file: File, isDrillMode: boolean = false): Promise<{sessionId: string, firstFrameBase64?: string, lastFrameBase64?: string} | null> => {
    if (isAnalyzing) {
      console.log('Analysis already in progress, skipping...');
      return null;
    }

    setIsAnalyzing(true);
    setError(null);
    
    let videoUrl: string | undefined;

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
      try {
        videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;
        
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
        });
      } catch (videoError) {
        throw new Error(`Failed to load video file: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`);
      }

      const duration = video.duration;
      const frameRate = 1; // 1 FPS as specified
      const totalFramesCalc = Math.floor(duration * frameRate);
      setTotalFrames(totalFramesCalc);
      setTotalDetectedShots(0);
      setShouldStop(false);
      stopRef.current = false;
      pausedRef.current = false;
      
      console.log(`📊 Video duration: ${duration}s, extracting ${totalFramesCalc} frames at ${frameRate} FPS`);

      // Create a proper session first
      if (!user?.id) {
        throw new Error('User must be logged in to analyze videos');
      }

      // Create session using start-session function
      const { data: sessionResult, error: sessionError } = await supabase.functions.invoke('start-session', {
        body: {
          userId: user.id,
          drillMode: isDrillMode
        }
      });

      if (sessionError || !sessionResult?.session_id) {
        throw new Error(`Failed to create session: ${sessionError?.message || 'Unknown error'}`);
      }

      const sessionId = sessionResult.session_id;
      console.log(`📊 Created session: ${sessionId}`);

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
        // Check for pause or stop using refs for fresh values
        while (pausedRef.current && !stopRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (stopRef.current) {
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

        // Call Supabase analyze-frame function (unified workflow)
        const { data: logResult, error: logError } = await supabase.functions.invoke('analyze-frame', {
          body: {
            frameBase64,
            session_id: sessionId, // Use the real session ID
            frameNumber: frameIndex,
            timestamp
          }
        });

        if (logError) {
          console.error('Frame analysis error:', logError);
          continue; // Continue with next frame instead of failing completely
        }

        const detections = logResult?.detections || [];
        
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
              x,
              y,
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

      setAnalysisProgress('🤖 Generating final session report...');

      // Generate final report using end-session function
      if (newShotsData.length > 0) {
        const { data: finalResult, error: finalError } = await supabase.functions.invoke('end-session', {
          body: {
            session_id: sessionId,
            user_id: user.id
          }
        });

        if (!finalError) {
          toast({
            title: "Analysis Complete!",
            description: `Detected ${newShotsData.length} shots with comprehensive analysis!`,
          });
          
          return {
            sessionId: sessionId,
            firstFrameBase64,
            lastFrameBase64
          };
        } else {
          console.error('Error generating final report:', finalError);
        }
      }

      return { sessionId: '', firstFrameBase64, lastFrameBase64 };

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
      // Clean up video URL to prevent memory leaks
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      
      setIsAnalyzing(false);
      setAnalysisProgress('');
      setCurrentFrame(null);
      setDetectedBounds([]);
      setIsPaused(false);
      pausedRef.current = false;
      setFrameNumber(0);
      setTotalFrames(0);
      setCurrentTimestamp(0);
      setTotalDetectedShots(0);
      setShouldStop(false);
      stopRef.current = false;
    }
  };

  const pauseAnalysis = useCallback(() => {
    setIsPaused(true);
    pausedRef.current = true;
  }, []);
  
  const resumeAnalysis = useCallback(() => {
    setIsPaused(false);
    pausedRef.current = false;
  }, []);
  
  const stopAnalysis = useCallback(() => {
    setShouldStop(true);
    stopRef.current = true;
  }, []);

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

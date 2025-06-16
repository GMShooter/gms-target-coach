
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { detectShotsVisually, DetectedShot } from '@/utils/visualShotDetection';
import { useAPIOrchestration } from './useAPIOrchestration';

export const useVideoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [fallbackAvailable, setFallbackAvailable] = useState(false);
  const { determineModelChoice, recordGeminiRequest, getRemainingRequests, getTimeUntilReset, isInCooldown } = useAPIOrchestration();

  const analyzeVideo = async (file: File, isDrillMode: boolean = false, forceFallback: boolean = false): Promise<string | null> => {
    setIsAnalyzing(true);
    setError(null);
    setFallbackAvailable(false);

    try {
      let detectedShots: DetectedShot[] = [];

      if (!forceFallback) {
        // Step 1: ViBe-inspired Visual Shot Detection
        setAnalysisProgress('🎯 Performing ViBe-inspired shot detection with ROI analysis...');
        console.log('🚀 Starting ViBe-inspired visual shot detection...');
        
        detectedShots = await detectShotsVisually(file, {
          motionThreshold: 0.08, // 8% pixel change threshold
          minTimeBetweenShots: 0.3, // minimum 300ms between shots
          maxShots: 30,
          roiCenterX: 0.5, // Center of frame
          roiCenterY: 0.5, // Center of frame  
          roiWidth: 0.6, // 60% of frame width
          roiHeight: 0.6 // 60% of frame height
        });
        
        console.log(`🎯 ViBe detection complete: ${detectedShots.length} shots found`);
        
        if (detectedShots.length === 0) {
          setFallbackAvailable(true);
          toast({
            title: "No Shots Detected by ViBe Algorithm",
            description: "ROI-based detection found no bullet impacts. Try the fallback option for full video analysis.",
            variant: "destructive",
          });
          throw new Error('No shots detected by ViBe visual analysis. ROI-based detection found no bullet impacts in the target area.');
        }
      } else {
        // Fallback: Full video sampling
        setAnalysisProgress('📹 Fallback mode: Sampling full video for comprehensive analysis...');
        console.log('🔄 Using fallback: full video sampling...');
        
        detectedShots = await sampleFullVideo(file);
        console.log(`📹 Full video sampling complete: ${detectedShots.length} frames extracted`);
      }

      // Step 2: API Orchestration
      const { model, reason } = forceFallback ? 
        { model: 'gemma' as const, reason: 'Fallback mode - using Gemma for comprehensive analysis' } :
        determineModelChoice();
        
      setAnalysisProgress(`🤖 ${reason} - analyzing ${detectedShots.length} ${forceFallback ? 'sampled frames' : 'detected shots'}...`);
      
      console.log('🔧 API Choice:', { model, reason, remainingRequests: getRemainingRequests() });

      if (model === 'gemini' && !forceFallback) {
        recordGeminiRequest();
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Step 3: Send data to AI
      const requestPayload = {
        detectedShots: detectedShots.map(shot => ({
          frameNumber: shot.frameNumber,
          timestamp: shot.timestamp,
          keyFrame: shot.keyFrame,
          confidenceScore: shot.confidenceScore
        })),
        modelChoice: model,
        userId: user?.id || null,
        drillMode: isDrillMode,
        fallbackMode: forceFallback,
        totalOriginalFrames: detectedShots.length > 0 ? detectedShots[detectedShots.length - 1].frameNumber : 0
      };

      const payloadSize = JSON.stringify(requestPayload).length;
      console.log('📦 Optimized payload:', { 
        keyFrames: detectedShots.length,
        modelChoice: model,
        payloadSizeKB: Math.round(payloadSize / 1024),
        fallbackMode: forceFallback
      });

      setAnalysisProgress(`⚡ Processing ${detectedShots.length} ${forceFallback ? 'frames' : 'key frames'} with ${model.toUpperCase()}...`);

      // Call the Edge Function
      const timeoutDuration = model === 'gemini' ? 45000 : 60000; // Longer timeout for Gemma fallback
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${model.toUpperCase()} analysis timed out`)), timeoutDuration);
      });

      try {
        const analysisPromise = supabase.functions.invoke('analyze-video', {
          body: requestPayload
        });

        const result = await Promise.race([analysisPromise, timeoutPromise]);
        const { data: analysisData, error: analysisError } = result as any;

        console.log(`${model.toUpperCase()} analysis response - data:`, analysisData);
        console.log(`${model.toUpperCase()} analysis response - error:`, analysisError);

        if (analysisError) {
          console.error(`${model.toUpperCase()} analysis error:`, analysisError);
          
          if (analysisData && typeof analysisData === 'object' && analysisData.error) {
            const errorMessage = analysisData.error;
            const errorType = analysisData.errorType || 'UNKNOWN_ERROR';
            
            if (errorType === 'QUOTA_EXCEEDED' || errorMessage.includes('quota')) {
              const timeUntilReset = getTimeUntilReset();
              toast({
                title: "Analysis Quota Exceeded",
                description: `${model.toUpperCase()} service quota reached. ${timeUntilReset > 0 ? `Try again in ${timeUntilReset}s` : 'Please try again later'}`,
                variant: "destructive",
              });
              throw new Error(`${model.toUpperCase()} quota exceeded. Try again later.`);
            }
            
            if (errorType === 'NO_SHOTS_DETECTED_BY_AI') {
              if (!forceFallback) {
                setFallbackAvailable(true);
                toast({
                  title: "No Impacts Confirmed by AI",
                  description: `${model.toUpperCase()} couldn't confirm bullet impacts. Try fallback analysis.`,
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "No Impacts Found",
                  description: `Comprehensive ${model.toUpperCase()} analysis found no bullet impacts in this video.`,
                  variant: "destructive",
                });
              }
              throw new Error(`No shots confirmed by ${model.toUpperCase()} analysis.`);
            }

            throw new Error(errorMessage);
          }
          
          throw new Error(analysisError.message || `${model.toUpperCase()} analysis service error`);
        }

        if (!analysisData || !analysisData.sessionId) {
          throw new Error(`Invalid response from ${model.toUpperCase()} analysis service`);
        }

        console.log(`${model.toUpperCase()} analysis completed successfully, session ID:`, analysisData.sessionId);

        const modelName = model === 'gemini' ? 'Gemini 2.5 Flash' : 'Gemma 3';
        const modeDescription = forceFallback ? 'comprehensive fallback' : 'ViBe-optimized';
        toast({
          title: "Analysis Complete!",
          description: `${modelName} successfully analyzed ${detectedShots.length} ${forceFallback ? 'frames' : 'detected shots'} with ${modeDescription} processing!`,
        });

        return analysisData.sessionId;

      } catch (fetchError) {
        if (fetchError.message.includes('timed out')) {
          throw new Error(`${model.toUpperCase()} analysis timed out. ${forceFallback ? 'The video may be too complex for analysis.' : `The ViBe detection found ${detectedShots.length} shots - try fallback mode.`}`);
        }
        throw fetchError;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred in video analysis';
      setError(errorMessage);
      console.error('Video analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  // Fallback: Full video sampling
  const sampleFullVideo = async (file: File): Promise<DetectedShot[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context for fallback sampling'));
        return;
      }

      const frames: DetectedShot[] = [];

      video.onloadedmetadata = () => {
        canvas.width = Math.min(video.videoWidth, 640);
        canvas.height = Math.min(video.videoHeight, 480);
        
        const duration = video.duration;
        const sampleInterval = Math.max(0.5, duration / 50); // Sample every 0.5s or ensure max 50 frames
        const totalSamples = Math.min(50, Math.floor(duration / sampleInterval));
        
        console.log(`📹 Fallback sampling: ${totalSamples} frames every ${sampleInterval.toFixed(2)}s from ${duration}s video`);
        
        let currentTime = 0;
        let frameNumber = 0;
        
        const extractNextFrame = () => {
          if (currentTime >= duration || frames.length >= totalSamples) {
            console.log(`📹 Fallback sampling complete: ${frames.length} frames extracted`);
            resolve(frames);
            return;
          }
          
          video.currentTime = currentTime;
          
          video.onseeked = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg', 0.7);
            
            frames.push({
              frameNumber: frameNumber++,
              timestamp: parseFloat(currentTime.toFixed(3)),
              keyFrame: imageData,
              confidenceScore: 0.5 // Default confidence for sampled frames
            });
            
            currentTime += sampleInterval;
            setTimeout(extractNextFrame, 100);
          };
        };
        
        extractNextFrame();
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video for fallback sampling'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  return { 
    analyzeVideo, 
    isAnalyzing, 
    error, 
    analysisProgress,
    fallbackAvailable,
    getRemainingRequests,
    getTimeUntilReset,
    isInCooldown
  };
};


import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { detectShotsVisually, DetectedShot } from '@/utils/visualShotDetection';
import { useAPIOrchestration } from './useAPIOrchestration';

export const useVideoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const { determineModelChoice, recordGeminiRequest, getRemainingRequests, getTimeUntilReset, isInCooldown } = useAPIOrchestration();

  const analyzeVideo = async (file: File, isDrillMode: boolean = false): Promise<string | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Step 1: Visual Shot Detection
      setAnalysisProgress('🔍 Performing intelligent shot detection...');
      console.log('Starting visual shot detection with frame differencing...');
      
      const detectedShots = await detectShotsVisually(file, {
        motionThreshold: 0.12, // 12% pixel change threshold
        minTimeBetweenShots: 0.3, // minimum 300ms between shots
        maxShots: 30
      });
      
      console.log(`Visual detection complete: ${detectedShots.length} shots found`);
      
      if (detectedShots.length === 0) {
        toast({
          title: "No Shots Detected",
          description: "Visual analysis couldn't detect any bullet impacts. Ensure clear target visibility and adequate lighting.",
          variant: "destructive",
        });
        throw new Error('No shots detected by visual analysis. Please check video quality and target visibility.');
      }

      // Step 2: API Orchestration
      const { model, reason } = determineModelChoice();
      setAnalysisProgress(`🤖 ${reason} - analyzing ${detectedShots.length} detected shots...`);
      
      console.log('API Choice:', { model, reason, remainingRequests: getRemainingRequests() });

      if (model === 'gemini') {
        recordGeminiRequest();
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Step 3: Send only key frames to AI
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
        totalOriginalFrames: detectedShots.length > 0 ? detectedShots[detectedShots.length - 1].frameNumber : 0
      };

      const payloadSize = JSON.stringify(requestPayload).length;
      console.log('Optimized payload:', { 
        keyFrames: detectedShots.length,
        modelChoice: model,
        payloadSizeKB: Math.round(payloadSize / 1024)
      });

      setAnalysisProgress(`⚡ Processing ${detectedShots.length} key frames with ${model.toUpperCase()}...`);

      // Call the Edge Function
      const timeoutDuration = model === 'gemini' ? 45000 : 30000; // Different timeouts for different models
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
            
            if (errorType === 'NO_SHOTS_DETECTED') {
              toast({
                title: "No Impacts Confirmed",
                description: `${model.toUpperCase()} couldn't confirm bullet impacts from the detected frames.`,
                variant: "destructive",
              });
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
        toast({
          title: "Analysis Complete!",
          description: `${modelName} successfully analyzed ${detectedShots.length} detected shots with optimized frame processing!`,
        });

        return analysisData.sessionId;

      } catch (fetchError) {
        if (fetchError.message.includes('timed out')) {
          throw new Error(`${model.toUpperCase()} analysis timed out. The visual detection found ${detectedShots.length} shots - try with a shorter video segment.`);
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

  return { 
    analyzeVideo, 
    isAnalyzing, 
    error, 
    analysisProgress,
    getRemainingRequests,
    getTimeUntilReset,
    isInCooldown
  };
};

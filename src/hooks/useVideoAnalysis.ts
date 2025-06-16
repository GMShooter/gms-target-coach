
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { extractFramesAt10FPS } from '@/utils/frameExtractor';
import { useAPIManager } from './useAPIManager';

export const useVideoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const { getModelChoice, recordGeminiRequest, getRemainingRequests, getTimeUntilReset, isInCooldown } = useAPIManager();

  const analyzeVideo = async (file: File, isDrillMode: boolean = false): Promise<string | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Extract frames at 10 FPS
      setAnalysisProgress('📹 Extracting frames at 10 FPS...');
      console.log('🚀 Starting frame extraction at 10 FPS...');
      
      const frames = await extractFramesAt10FPS(file);
      console.log(`📹 Frame extraction complete: ${frames.length} frames extracted`);
      
      if (frames.length === 0) {
        throw new Error('No frames could be extracted from the video');
      }

      // API Orchestration
      const { model, reason } = getModelChoice();
      setAnalysisProgress(`🤖 ${reason} - analyzing ${frames.length} frames...`);
      
      console.log('🔧 API Choice:', { model, reason, remainingRequests: getRemainingRequests() });

      if (model === 'gemini') {
        recordGeminiRequest();
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Send to AI
      const requestPayload = {
        frames: frames.map(frame => ({
          imageData: frame.imageData,
          timestamp: frame.timestamp,
          frameNumber: frame.frameNumber
        })),
        modelChoice: model,
        userId: user?.id || null,
        drillMode: isDrillMode
      };

      const payloadSize = JSON.stringify(requestPayload).length;
      console.log('📦 Payload details:', { 
        frameCount: frames.length,
        modelChoice: model,
        payloadSizeKB: Math.round(payloadSize / 1024)
      });

      setAnalysisProgress(`⚡ Processing ${frames.length} frames with ${model.toUpperCase()}...`);

      // Call the Edge Function
      const timeoutDuration = model === 'gemini' ? 45000 : 60000;
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
              toast({
                title: "No Impacts Found",
                description: `${model.toUpperCase()} analysis found no bullet impacts in this video.`,
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

        const modelName = model === 'gemini' ? 'Gemini 2.5 Flash Preview' : 'Gemma 3 27B';
        toast({
          title: "Analysis Complete!",
          description: `${modelName} successfully analyzed ${frames.length} frames!`,
        });

        return analysisData.sessionId;

      } catch (fetchError) {
        if (fetchError.message.includes('timed out')) {
          throw new Error(`${model.toUpperCase()} analysis timed out. The video may be too complex for analysis.`);
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

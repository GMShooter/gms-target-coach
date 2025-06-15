import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { extractFramesAtFPS } from '@/utils/videoFrameExtractor';

export const useVideoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');

  const analyzeVideo = async (file: File, isDrillMode: boolean = false): Promise<string | null> => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress('Extracting frames for expert analysis...');

    try {
      console.log('Starting expert video analysis with optimized frame extraction...');
      
      // Extract frames at 8 FPS for balanced performance and accuracy
      const frames = await extractFramesAtFPS(file, 8);
      console.log(`Expert system extracted ${frames.length} frames for detailed analysis`);
      
      if (frames.length === 0) {
        throw new Error('No frames could be extracted from the video');
      }

      setAnalysisProgress(`Expert analysis in progress: ${frames.length} frames with Gemini 2.5 Flash...`);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      console.log('Calling expert analysis edge function...');

      // Call the Edge Function with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      try {
        const { data: analysisData, error: analysisError } = await supabase.functions
          .invoke('analyze-video', {
            body: {
              frames: frames,
              userId: user?.id || null,
              drillMode: isDrillMode
            },
            headers: {
              'Content-Type': 'application/json'
            }
          });

        clearTimeout(timeoutId);

        console.log('Expert analysis response - data:', analysisData);
        console.log('Expert analysis response - error:', analysisError);

        if (analysisError) {
          console.error('Expert analysis error details:', analysisError);
          
          if (analysisData && typeof analysisData === 'object' && analysisData.error) {
            const errorMessage = analysisData.error;
            const errorType = analysisData.errorType || 'UNKNOWN_ERROR';
            
            console.log('Specific error from expert analysis:', errorMessage, errorType);
            
            // Handle specific error types with expert-level feedback
            if (errorType === 'QUOTA_EXCEEDED' || errorMessage.includes('quota') || errorMessage.includes('QUOTA_EXCEEDED')) {
              toast({
                title: "Expert Analysis Quota Exceeded",
                description: "The Gemini 2.5 Flash service has reached its limit. Please try again later.",
                variant: "destructive",
              });
              throw new Error('Expert analysis quota exceeded. Please try again later.');
            }
            
            if (errorType === 'NO_SHOTS_DETECTED' || errorMessage.includes('NO_SHOTS_DETECTED')) {
              toast({
                title: "No Impacts Detected",
                description: "Expert analysis couldn't detect bullet impacts. Ensure optimal lighting and target contrast.",
                variant: "destructive",
              });
              throw new Error('No shots detected by expert analysis. Please check video quality and lighting.');
            }
            
            if (errorType === 'INVALID_VIDEO' || errorMessage.includes('INVALID_VIDEO')) {
              toast({
                title: "Invalid Video Format",
                description: "Expert analysis requires MP4 format under 500MB with clear target visibility.",
                variant: "destructive",
              });
              throw new Error('Invalid video format for expert analysis.');
            }

            if (errorType === 'API_KEY_MISSING') {
              toast({
                title: "Expert Analysis Configuration Error",
                description: "Gemini 2.5 Flash API key not configured. Please contact support.",
                variant: "destructive",
              });
              throw new Error('Expert analysis API configuration error.');
            }

            throw new Error(errorMessage);
          }
          
          const errorMessage = analysisError.message || 'Expert analysis service returned an error';
          
          toast({
            title: "Expert Analysis Failed",
            description: errorMessage,
            variant: "destructive",
          });
          
          throw new Error(errorMessage);
        }

        if (!analysisData || !analysisData.sessionId) {
          console.error('No session ID in expert analysis response:', analysisData);
          throw new Error('Invalid response from expert analysis service');
        }

        console.log('Expert analysis completed successfully, session ID:', analysisData.sessionId);

        toast({
          title: "Expert Analysis Complete",
          description: `Professional marksmanship analysis completed with ${frames.length} frame sequence analysis!`,
        });

        return analysisData.sessionId;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Expert analysis timed out. Please try with a shorter video.');
        }
        throw fetchError;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred in expert analysis';
      setError(errorMessage);
      console.error('Expert video analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  return { analyzeVideo, isAnalyzing, error, analysisProgress };
};

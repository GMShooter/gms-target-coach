
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
    setAnalysisProgress('Extracting frames from video...');

    try {
      console.log('Starting video frame extraction and analysis...');
      
      // Extract frames at 2 FPS
      const frames = await extractFramesAtFPS(file, 2);
      console.log(`Extracted ${frames.length} frames for analysis`);
      
      if (frames.length === 0) {
        throw new Error('No frames could be extracted from the video');
      }

      setAnalysisProgress(`Analyzing ${frames.length} frames with AI...`);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      console.log('Calling edge function for frame analysis...');

      // Call the Edge Function for analysis with frames
      const { data: analysisData, error: analysisError } = await supabase.functions
        .invoke('analyze-video', {
          body: {
            frames: frames,
            userId: user?.id || null,
            drillMode: isDrillMode
          }
        });

      console.log('Edge function response - data:', analysisData);
      console.log('Edge function response - error:', analysisError);

      if (analysisError) {
        console.error('Edge Function error details:', analysisError);
        
        // If there's data in the response despite the error, use that for specific error handling
        if (analysisData && typeof analysisData === 'object' && analysisData.error) {
          const errorMessage = analysisData.error;
          const errorType = analysisData.errorType || 'UNKNOWN_ERROR';
          
          console.log('Specific error from edge function:', errorMessage, errorType);
          
          // Handle specific error types with user-friendly messages
          if (errorType === 'QUOTA_EXCEEDED' || errorMessage.includes('quota') || errorMessage.includes('QUOTA_EXCEEDED')) {
            toast({
              title: "API Quota Exceeded",
              description: "The Gemini AI service has reached its daily limit. Please try again later or contact support.",
              variant: "destructive",
            });
            throw new Error('Gemini API quota exceeded. Please try again later.');
          }
          
          if (errorType === 'NO_SHOTS_DETECTED' || errorMessage.includes('NO_SHOTS_DETECTED')) {
            toast({
              title: "No Shots Detected",
              description: "The AI couldn't detect any bullet impacts. Ensure good lighting and clear target visibility.",
              variant: "destructive",
            });
            throw new Error('No shots detected in the video. Please check video quality and target visibility.');
          }
          
          if (errorType === 'INVALID_VIDEO' || errorMessage.includes('INVALID_VIDEO')) {
            toast({
              title: "Invalid Video Format",
              description: "Please use MP4 format and ensure the file is under 500MB.",
              variant: "destructive",
            });
            throw new Error('Invalid video format. Please use MP4 and ensure file is under 500MB.');
          }

          if (errorType === 'API_KEY_MISSING') {
            toast({
              title: "Configuration Error",
              description: "Gemini API key is not configured. Please contact support.",
              variant: "destructive",
            });
            throw new Error('API configuration error. Please contact support.');
          }

          if (errorType === 'NO_FRAMES') {
            toast({
              title: "Frame Extraction Error",
              description: "Could not extract frames from the video. Please check the video format.",
              variant: "destructive",
            });
            throw new Error('Frame extraction failed. Please check video format.');
          }

          throw new Error(errorMessage);
        }
        
        // If no specific error data, show generic error
        const errorMessage = analysisError.message || 'Edge Function returned a non-2xx status code';
        
        toast({
          title: "Analysis Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        throw new Error(errorMessage);
      }

      if (!analysisData || !analysisData.sessionId) {
        console.error('No session ID in response:', analysisData);
        throw new Error('Invalid response from analysis service');
      }

      console.log('Analysis completed successfully, session ID:', analysisData.sessionId);

      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${frames.length} frames and detected shooting performance!`,
      });

      return analysisData.sessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Video analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  return { analyzeVideo, isAnalyzing, error, analysisProgress };
};

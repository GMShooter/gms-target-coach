
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useVideoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeVideo = async (file: File, isDrillMode: boolean = false): Promise<string | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Upload video to Supabase storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL for the video
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(uploadData.path);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Call the Edge Function for analysis
      const { data: analysisData, error: analysisError } = await supabase.functions
        .invoke('analyze-video', {
          body: {
            videoUrl: publicUrl,
            userId: user?.id || null,
            drillMode: isDrillMode
          }
        });

      if (analysisError) {
        console.error('Edge Function error:', analysisError);
        
        // Try to get the actual error message from the response
        let errorMessage = 'Analysis failed';
        let errorType = 'UNKNOWN_ERROR';
        
        if (analysisError.message) {
          // Parse the error message if it contains JSON
          try {
            const errorData = JSON.parse(analysisError.message);
            errorMessage = errorData.error || errorMessage;
            errorType = errorData.errorType || errorType;
          } catch (parseError) {
            errorMessage = analysisError.message;
          }
        }
        
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

        throw new Error(errorMessage);
      }

      toast({
        title: "Analysis Complete",
        description: "Your shooting performance has been successfully analyzed!",
      });

      return analysisData.sessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Video analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analyzeVideo, isAnalyzing, error };
};

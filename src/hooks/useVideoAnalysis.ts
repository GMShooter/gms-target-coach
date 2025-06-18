
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useVideoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');

  const analyzeVideo = async (file: File, isDrillMode: boolean = false): Promise<{sessionId: string, firstFrameBase64?: string, lastFrameBase64?: string} | null> => {
    if (isAnalyzing) {
      console.log('Analysis already in progress, skipping...');
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      setAnalysisProgress('📤 Uploading video to storage...');
      
      // Upload video to Supabase Storage
      const fileName = `video_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload video: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      setAnalysisProgress('🎯 Starting SOTA analysis with Roboflow + Gemini...');

      // Call the new SOTA analysis function
      const { data: result, error: analysisError } = await supabase.functions.invoke('analyze-video', {
        body: {
          videoUrl: publicUrl,
          userId: user?.id || null,
          drillMode: isDrillMode
        }
      });

      if (analysisError) {
        throw analysisError;
      }

      if (result?.sessionId) {
        const shotsCount = result.shotsCount || 0;
        toast({
          title: "SOTA Analysis Complete!",
          description: `State-of-the-art Roboflow + Gemini analysis detected ${shotsCount} shots!`,
        });
        
        return {
          sessionId: result.sessionId,
          firstFrameBase64: result.firstFrameBase64,
          lastFrameBase64: result.lastFrameBase64
        };
      }

      return null;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred in video analysis';
      setError(errorMessage);
      console.error('Video analysis error:', err);
      toast({
        title: "Analysis Error",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  // Simple stub methods for API management compatibility
  const getRemainingRequests = () => 10; // Always return 10 since we don't need rate limiting
  const getTimeUntilReset = () => 0; // No cooldown needed
  const isInCooldown = false; // Never in cooldown

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


import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { detectShotKeyframes } from '@/utils/shotDetection';
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check model choice
      let { model, reason } = getModelChoice();
      console.log('🔧 API Choice:', { model, reason, remainingRequests: getRemainingRequests() });

      if (model === 'gemini') {
        recordGeminiRequest();
      }

      let sessionId: string | null = null;
      let retryWithGemma = false;

      // PRIMARY STRATEGY: Direct Video Analysis (Gemini)
      if (model === 'gemini') {
        setAnalysisProgress('📹 Uploading video for direct AI analysis...');
        
        try {
          // Upload video to Supabase Storage
          const fileName = `video_${Date.now()}_${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('videos')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Video upload failed: ${uploadError.message}`);
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('videos')
            .getPublicUrl(fileName);

          setAnalysisProgress('🤖 Gemini analyzing entire video...');
          console.log('🚀 Starting direct video analysis with Gemini...');

          // Call backend with video URL
          const { data: result, error: analysisError } = await supabase.functions.invoke('analyze-video', {
            body: {
              videoUrl: publicUrl,
              modelChoice: 'gemini',
              userId: user?.id || null,
              drillMode: isDrillMode
            }
          });

          if (analysisError) {
            if (analysisError.message?.includes('503') || analysisError.message?.includes('overloaded')) {
              console.log('🔄 Gemini overloaded, switching to Gemma fallback...');
              retryWithGemma = true;
            } else {
              throw analysisError;
            }
          } else if (result?.sessionId) {
            sessionId = result.sessionId;
            
            // Clean up uploaded video
            await supabase.storage.from('videos').remove([fileName]);
            
            const shotsCount = result.shotsCount || 0;
            toast({
              title: "Analysis Complete!",
              description: `Gemini 2.5 Flash analyzed your video and found ${shotsCount} shots!`,
            });
          }
        } catch (error) {
          console.error('Gemini analysis failed:', error);
          retryWithGemma = true;
        }
      } else {
        retryWithGemma = true;
      }

      // FALLBACK STRATEGY: Smart Frame-Pair Sampling (Gemma)
      if (retryWithGemma || model === 'gemma') {
        setAnalysisProgress('🔍 Detecting shot moments with visual analysis...');
        console.log('🚀 Starting smart frame-pair detection...');
        
        const framePairs = await detectShotKeyframes(file);
        console.log(`📹 Shot detection complete: ${framePairs.length} key moments detected`);
        
        if (framePairs.length === 0) {
          throw new Error('No significant changes detected in video. Please ensure clear bullet impacts are visible.');
        }

        setAnalysisProgress(`⚡ Analyzing ${framePairs.length} key moments with Gemma...`);
        
        const { data: result, error: analysisError } = await supabase.functions.invoke('analyze-video', {
          body: {
            framePairs: framePairs,
            modelChoice: 'gemma',
            userId: user?.id || null,
            drillMode: isDrillMode
          }
        });

        if (analysisError) {
          throw analysisError;
        }

        if (result?.sessionId) {
          sessionId = result.sessionId;
          
          const shotsCount = result.shotsCount || 0;
          const modelName = retryWithGemma ? 'Gemma 3 27B (fallback)' : 'Gemma 3 27B';
          toast({
            title: "Analysis Complete!",
            description: `${modelName} analyzed ${framePairs.length} key moments and found ${shotsCount} shots!`,
          });
        }
      }

      return sessionId;

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

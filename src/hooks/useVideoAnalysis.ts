
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useYOLOAnalysis } from './useYOLOAnalysis';
import { useAPIManager } from './useAPIManager';

export const useVideoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const { getModelChoice, recordGeminiRequest, getRemainingRequests, getTimeUntilReset, isInCooldown } = useAPIManager();
  const { analyzeVideo: analyzeWithYOLO } = useYOLOAnalysis();

  const analyzeVideo = async (file: File, isDrillMode: boolean = false): Promise<string | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check model choice for fallback
      let { model, reason } = getModelChoice();
      console.log('🔧 Analysis Strategy:', { 
        primary: 'YOLOv8 + Gemini', 
        fallback: model, 
        reason, 
        remainingRequests: getRemainingRequests() 
      });

      setAnalysisProgress('🚀 Starting YOLOv8 + Gemini analysis...');

      // PRIMARY STRATEGY: YOLOv8 Object Detection + Gemini Analysis
      try {
        const sessionId = await analyzeWithYOLO(file, isDrillMode);
        
        if (sessionId) {
          toast({
            title: "YOLOv8 Analysis Complete!",
            description: "State-of-the-art object detection with Gemini analysis completed successfully!",
          });
          return sessionId;
        }
      } catch (yoloError) {
        console.error('YOLOv8 analysis failed, falling back to legacy method:', yoloError);
        setAnalysisProgress('⚠️ YOLOv8 unavailable, using legacy detection...');
      }

      // FALLBACK STRATEGY: Legacy image subtraction method
      setAnalysisProgress('🔄 Using legacy frame detection as fallback...');
      
      if (model === 'gemini') {
        recordGeminiRequest();
      }

      // Legacy video analysis as fallback
      setAnalysisProgress('📹 Converting video for AI analysis...');
      
      const arrayBuffer = await file.arrayBuffer();
      const base64Video = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      setAnalysisProgress('🤖 Analyzing with legacy method...');

      const { data: result, error: analysisError } = await supabase.functions.invoke('analyze-video', {
        body: {
          videoData: base64Video,
          mimeType: file.type,
          modelChoice: model,
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
          title: "Legacy Analysis Complete!",
          description: `Fallback analysis found ${shotsCount} shots using ${model.toUpperCase()}!`,
        });
        return result.sessionId;
      }

      return null;

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

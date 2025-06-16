
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { detectShotKeyframes } from '@/utils/shotDetection';
import { processFramePairToDifference } from '@/utils/imageProcessor';
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
        setAnalysisProgress('📹 Converting video for AI analysis...');
        
        try {
          // Convert video to base64 for Gemini API
          const arrayBuffer = await file.arrayBuffer();
          const base64Video = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

          setAnalysisProgress('🤖 Gemini analyzing entire video...');
          console.log('🚀 Starting direct video analysis with Gemini...');

          // Call backend with base64 video data
          const { data: result, error: analysisError } = await supabase.functions.invoke('analyze-video', {
            body: {
              videoData: base64Video,
              mimeType: file.type,
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

      // FALLBACK STRATEGY: Smart Image Subtraction (Gemma)
      if (retryWithGemma || model === 'gemma') {
        setAnalysisProgress('🔍 Detecting shot moments with advanced frame analysis...');
        console.log('🚀 Starting smart frame-pair detection...');
        
        const framePairs = await detectShotKeyframes(file);
        console.log(`📹 Shot detection complete: ${framePairs.length} key moments detected`);
        
        if (framePairs.length === 0) {
          throw new Error('No significant changes detected in video. Please ensure clear bullet impacts are visible and try adjusting camera angle or lighting.');
        }

        setAnalysisProgress(`⚡ Processing ${framePairs.length} moments with image subtraction...`);
        
        // NEW: Convert frame pairs to difference images
        const differenceImages = [];
        for (let i = 0; i < framePairs.length; i++) {
          setAnalysisProgress(`🔬 Creating difference image ${i + 1}/${framePairs.length}...`);
          try {
            const diffImage = await processFramePairToDifference(framePairs[i]);
            differenceImages.push(diffImage);
            console.log(`✅ Difference image ${i + 1} created successfully`);
          } catch (err) {
            console.error(`❌ Failed to create difference image ${i + 1}:`, err);
            // Continue with remaining images
          }
        }

        if (differenceImages.length === 0) {
          throw new Error('Failed to create difference images. Please ensure the video shows clear bullet impacts with good contrast.');
        }

        setAnalysisProgress(`🤖 Analyzing ${differenceImages.length} difference images with Gemma...`);
        
        const { data: result, error: analysisError } = await supabase.functions.invoke('analyze-video', {
          body: {
            differenceImages: differenceImages,
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
          const modelName = retryWithGemma ? 'Gemma 3 27B (with image subtraction)' : 'Gemma 3 27B';
          toast({
            title: "Analysis Complete!",
            description: `${modelName} analyzed ${differenceImages.length} difference images and found ${shotsCount} shots!`,
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

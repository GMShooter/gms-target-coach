
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { detectShotsVisually, extractFramePairsForFallback, DetectedShot, FramePair } from '@/utils/visualShotDetection';
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
      let framePairs: FramePair[] = [];
      let isFallbackMode = forceFallback;

      if (!forceFallback) {
        // Step 1: Enhanced ViBe-inspired Visual Shot Detection
        setAnalysisProgress('🎯 Performing enhanced ViBe-inspired shot detection with ROI analysis...');
        console.log('🚀 Starting enhanced ViBe-inspired visual shot detection...');
        
        detectedShots = await detectShotsVisually(file, {
          motionThreshold: 0.05, // Enhanced sensitivity
          minTimeBetweenShots: 0.25, // Reduced minimum time
          maxShots: 30,
          roiCenterX: 0.5,
          roiCenterY: 0.5,
          roiWidth: 0.7, // Increased ROI size
          roiHeight: 0.7
        });
        
        console.log(`🎯 Enhanced ViBe detection complete: ${detectedShots.length} shots found`);
        
        if (detectedShots.length === 0) {
          setFallbackAvailable(true);
          toast({
            title: "No Shots Detected by Enhanced ViBe Algorithm",
            description: "Enhanced ROI-based detection found no bullet impacts. Try the fallback option for contextual frame analysis.",
            variant: "destructive",
          });
          throw new Error('No shots detected by enhanced ViBe visual analysis. Enhanced ROI-based detection found no bullet impacts in the target area.');
        }
      } else {
        // Enhanced Fallback: Extract frame pairs for contextual analysis
        setAnalysisProgress('📹 Enhanced fallback mode: Extracting frame pairs for contextual analysis...');
        console.log('🔄 Using enhanced fallback: frame pair extraction...');
        
        framePairs = await extractFramePairsForFallback(file);
        console.log(`📹 Enhanced fallback complete: ${framePairs.length} frame pairs extracted`);
        isFallbackMode = true;
      }

      // Step 2: Enhanced API Orchestration
      const { model, reason } = forceFallback ? 
        { model: 'gemma' as const, reason: 'Enhanced fallback mode - using Gemma for contextual analysis' } :
        determineModelChoice();
        
      setAnalysisProgress(`🤖 ${reason} - analyzing ${isFallbackMode ? framePairs.length + ' frame pairs' : detectedShots.length + ' detected shots'}...`);
      
      console.log('🔧 Enhanced API Choice:', { model, reason, remainingRequests: getRemainingRequests() });

      if (model === 'gemini' && !forceFallback) {
        recordGeminiRequest();
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Step 3: Send enhanced data to AI
      const requestPayload = isFallbackMode ? {
        framePairs: framePairs,
        modelChoice: model,
        userId: user?.id || null,
        drillMode: isDrillMode,
        fallbackMode: true,
        totalOriginalFrames: framePairs.length * 2
      } : {
        detectedShots: detectedShots.map(shot => ({
          frameNumber: shot.frameNumber,
          timestamp: shot.timestamp,
          keyFrame: shot.keyFrame,
          confidenceScore: shot.confidenceScore
        })),
        modelChoice: model,
        userId: user?.id || null,
        drillMode: isDrillMode,
        fallbackMode: false,
        totalOriginalFrames: detectedShots.length > 0 ? detectedShots[detectedShots.length - 1].frameNumber : 0
      };

      const payloadSize = JSON.stringify(requestPayload).length;
      console.log('📦 Enhanced optimized payload:', { 
        keyFrames: isFallbackMode ? framePairs.length : detectedShots.length,
        modelChoice: model,
        payloadSizeKB: Math.round(payloadSize / 1024),
        fallbackMode: isFallbackMode
      });

      setAnalysisProgress(`⚡ Processing ${isFallbackMode ? framePairs.length + ' frame pairs' : detectedShots.length + ' key frames'} with ${model.toUpperCase()}...`);

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

        console.log(`${model.toUpperCase()} enhanced analysis response - data:`, analysisData);
        console.log(`${model.toUpperCase()} enhanced analysis response - error:`, analysisError);

        if (analysisError) {
          console.error(`${model.toUpperCase()} enhanced analysis error:`, analysisError);
          
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
                  description: `${model.toUpperCase()} couldn't confirm bullet impacts. Try enhanced fallback analysis.`,
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "No Impacts Found",
                  description: `Comprehensive ${model.toUpperCase()} contextual analysis found no bullet impacts in this video.`,
                  variant: "destructive",
                });
              }
              throw new Error(`No shots confirmed by ${model.toUpperCase()} enhanced analysis.`);
            }

            throw new Error(errorMessage);
          }
          
          throw new Error(analysisError.message || `${model.toUpperCase()} enhanced analysis service error`);
        }

        if (!analysisData || !analysisData.sessionId) {
          throw new Error(`Invalid response from ${model.toUpperCase()} enhanced analysis service`);
        }

        console.log(`${model.toUpperCase()} enhanced analysis completed successfully, session ID:`, analysisData.sessionId);

        const modelName = model === 'gemini' ? 'Gemini 2.5 Flash Preview' : 'Gemma 3 27B';
        const modeDescription = forceFallback ? 'enhanced contextual fallback' : 'ViBe-optimized';
        toast({
          title: "Enhanced Analysis Complete!",
          description: `${modelName} successfully analyzed ${isFallbackMode ? framePairs.length + ' frame pairs' : detectedShots.length + ' detected shots'} with ${modeDescription} processing!`,
        });

        return analysisData.sessionId;

      } catch (fetchError) {
        if (fetchError.message.includes('timed out')) {
          throw new Error(`${model.toUpperCase()} enhanced analysis timed out. ${forceFallback ? 'The video may be too complex for contextual analysis.' : `The enhanced ViBe detection found ${detectedShots.length} shots - try enhanced fallback mode.`}`);
        }
        throw fetchError;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred in enhanced video analysis';
      setError(errorMessage);
      console.error('Enhanced video analysis error:', err);
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
    fallbackAvailable,
    getRemainingRequests,
    getTimeUntilReset,
    isInCooldown
  };
};

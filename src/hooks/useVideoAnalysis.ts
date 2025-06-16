
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
      console.log('🔧 API Choice:', { model, reason, remainingRequests: getRemainingRequests() });

      if (model === 'gemini') {
        recordGeminiRequest();
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Process frames in batches to avoid overwhelming the API
      const BATCH_SIZE = model === 'gemini' ? 50 : 30; // Smaller batches for reliability
      const batches = [];
      
      for (let i = 0; i < frames.length; i += BATCH_SIZE) {
        batches.push(frames.slice(i, i + BATCH_SIZE));
      }

      console.log(`📦 Processing ${frames.length} frames in ${batches.length} batches (${BATCH_SIZE} frames each)`);

      let allDetectedShots: any[] = [];

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchProgress = `⚡ Processing batch ${batchIndex + 1}/${batches.length} with ${model.toUpperCase()} (${batch.length} frames)...`;
        setAnalysisProgress(batchProgress);
        
        console.log(`Processing batch ${batchIndex + 1}/${batches.length}: frames ${batch[0].frameNumber}-${batch[batch.length-1].frameNumber}`);

        const requestPayload = {
          frames: batch.map(frame => ({
            imageData: frame.imageData,
            timestamp: frame.timestamp,
            frameNumber: frame.frameNumber
          })),
          modelChoice: model,
          userId: user?.id || null,
          drillMode: isDrillMode,
          batchInfo: {
            batchIndex: batchIndex + 1,
            totalBatches: batches.length,
            framesInBatch: batch.length
          }
        };

        try {
          const { data: batchResult, error: batchError } = await supabase.functions.invoke('analyze-video', {
            body: requestPayload
          });

          if (batchError) {
            console.error(`Batch ${batchIndex + 1} error:`, batchError);
            
            if (batchResult && batchResult.errorType === 'NO_SHOTS_DETECTED_BY_AI') {
              console.log(`Batch ${batchIndex + 1}: No shots detected, continuing...`);
              continue;
            }
            
            throw new Error(batchError.message || `Batch ${batchIndex + 1} analysis failed`);
          }

          if (batchResult && batchResult.shots && Array.isArray(batchResult.shots)) {
            allDetectedShots = allDetectedShots.concat(batchResult.shots);
            console.log(`Batch ${batchIndex + 1} complete: ${batchResult.shots.length} shots detected`);
          }

        } catch (batchError) {
          console.error(`Batch ${batchIndex + 1} processing failed:`, batchError);
          // Continue with next batch instead of failing completely
          continue;
        }

        // Small delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`All batches processed. Total shots detected: ${allDetectedShots.length}`);

      if (allDetectedShots.length === 0) {
        throw new Error('No shots detected in any batch');
      }

      // Combine results and save to database
      setAnalysisProgress('💾 Saving analysis results...');

      // Sort shots by timestamp and renumber them
      allDetectedShots.sort((a, b) => a.timestamp - b.timestamp);
      allDetectedShots.forEach((shot, index) => {
        shot.shot_number = index + 1;
      });

      // Calculate split times
      const splitTimes = [];
      for (let i = 1; i < allDetectedShots.length; i++) {
        const splitTime = allDetectedShots[i].timestamp - allDetectedShots[i-1].timestamp;
        splitTimes.push(parseFloat(splitTime.toFixed(3)));
      }

      // Save session data
      const finalRequestPayload = {
        finalizeSession: true,
        shots: allDetectedShots,
        splitTimes,
        userId: user?.id || null,
        drillMode: isDrillMode,
        modelChoice: model,
        totalFramesProcessed: frames.length,
        batchesProcessed: batches.length
      };

      const { data: sessionResult, error: sessionError } = await supabase.functions.invoke('analyze-video', {
        body: finalRequestPayload
      });

      if (sessionError || !sessionResult?.sessionId) {
        throw new Error('Failed to save analysis session');
      }

      const modelName = model === 'gemini' ? 'Gemini 2.5 Flash Preview' : 'Gemma 3 27B';
      toast({
        title: "Analysis Complete!",
        description: `${modelName} analyzed ${frames.length} frames in ${batches.length} batches and found ${allDetectedShots.length} shots!`,
      });

      return sessionResult.sessionId;

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

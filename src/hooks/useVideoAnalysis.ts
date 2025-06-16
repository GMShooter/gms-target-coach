
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { extractFramesAt10FPS, createFramePairs } from '@/utils/frameExtractor';
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

      // API Orchestration with fallback handling
      let { model, reason } = getModelChoice();
      console.log('🔧 Initial API Choice:', { model, reason, remainingRequests: getRemainingRequests() });

      if (model === 'gemini') {
        recordGeminiRequest();
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      let allDetectedShots: any[] = [];
      let switchedToGemma = false;

      if (model === 'gemini') {
        // For Gemini: Use traditional frame analysis (single frames) with de-duplication and fallback
        const BATCH_SIZE = 50;
        const batches = [];
        
        for (let i = 0; i < frames.length; i += BATCH_SIZE) {
          batches.push(frames.slice(i, i + BATCH_SIZE));
        }

        console.log(`📦 Processing ${frames.length} frames in ${batches.length} batches (${BATCH_SIZE} frames each) with GEMINI`);

        // Track unique shots to avoid duplicates
        const uniqueShotCoordinates = new Set<string>();
        let consecutiveFailures = 0;

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const batchProgress = `⚡ Processing batch ${batchIndex + 1}/${batches.length} with ${switchedToGemma ? 'GEMMA' : 'GEMINI'} (${batch.length} frames)...`;
          setAnalysisProgress(batchProgress);
          
          console.log(`Processing ${switchedToGemma ? 'GEMMA' : 'GEMINI'} batch ${batchIndex + 1}/${batches.length}: frames ${batch[0].frameNumber}-${batch[batch.length-1].frameNumber}`);

          let requestPayload;
          
          if (switchedToGemma) {
            // Create frame pairs for Gemma
            const batchFramePairs = createFramePairs(batch);
            requestPayload = {
              framePairs: batchFramePairs,
              modelChoice: 'gemma',
              userId: user?.id || null,
              drillMode: isDrillMode,
              batchInfo: {
                batchIndex: batchIndex + 1,
                totalBatches: batches.length,
                pairsInBatch: batchFramePairs.length
              }
            };
          } else {
            requestPayload = {
              frames: batch.map(frame => ({
                imageData: frame.imageData,
                timestamp: frame.timestamp,
                frameNumber: frame.frameNumber
              })),
              modelChoice: 'gemini',
              userId: user?.id || null,
              drillMode: isDrillMode,
              batchInfo: {
                batchIndex: batchIndex + 1,
                totalBatches: batches.length,
                framesInBatch: batch.length
              }
            };
          }

          let retryCount = 0;
          const maxRetries = 2;
          let batchResult = null;

          while (retryCount <= maxRetries && !batchResult) {
            try {
              const { data: result, error: batchError } = await supabase.functions.invoke('analyze-video', {
                body: requestPayload
              });

              if (batchError) {
                console.error(`${switchedToGemma ? 'GEMMA' : 'GEMINI'} Batch ${batchIndex + 1} error:`, batchError);
                
                // Check if it's a 503 overload error and we haven't switched yet
                if (!switchedToGemma && batchError.message?.includes('503')) {
                  console.log('🔄 Gemini overloaded, switching to Gemma for remaining batches...');
                  switchedToGemma = true;
                  setAnalysisProgress('🔄 Gemini overloaded - switching to Gemma...');
                  
                  // Recreate payload for Gemma
                  const batchFramePairs = createFramePairs(batch);
                  requestPayload = {
                    framePairs: batchFramePairs,
                    modelChoice: 'gemma',
                    userId: user?.id || null,
                    drillMode: isDrillMode,
                    batchInfo: {
                      batchIndex: batchIndex + 1,
                      totalBatches: batches.length,
                      pairsInBatch: batchFramePairs.length
                    }
                  };
                  retryCount = 0; // Reset retry count for new model
                  continue;
                }
                
                throw batchError;
              }

              if (result && result.shots) {
                batchResult = result;
                consecutiveFailures = 0;
              } else {
                console.warn(`${switchedToGemma ? 'GEMMA' : 'GEMINI'} Batch ${batchIndex + 1} returned no content`);
                retryCount++;
                
                if (retryCount <= maxRetries) {
                  console.log(`Retrying batch ${batchIndex + 1}, attempt ${retryCount + 1}/${maxRetries + 1}`);
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
              }
            } catch (batchError) {
              console.error(`${switchedToGemma ? 'GEMMA' : 'GEMINI'} Batch ${batchIndex + 1} processing failed:`, batchError);
              retryCount++;
              
              if (retryCount <= maxRetries) {
                console.log(`Retrying batch ${batchIndex + 1}, attempt ${retryCount + 1}/${maxRetries + 1}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
            }
          }

          if (batchResult && batchResult.shots && Array.isArray(batchResult.shots)) {
            if (switchedToGemma) {
              // Gemma returns unique shots, add them directly
              allDetectedShots = allDetectedShots.concat(batchResult.shots);
              console.log(`GEMMA Batch ${batchIndex + 1} complete: ${batchResult.shots.length} shots detected`);
            } else {
              // Gemini returns all holes, need de-duplication
              let newShotsInBatch = 0;
              
              batchResult.shots.forEach((shot: any) => {
                // Create a unique key for each shot based on its approximate coordinates
                // Round to nearest 5mm to account for small variations in detection
                const shotKey = `${Math.round(shot.x_coordinate / 5)}_${Math.round(shot.y_coordinate / 5)}`;
                
                // If we haven't seen a shot at this location before, add it
                if (!uniqueShotCoordinates.has(shotKey)) {
                  uniqueShotCoordinates.add(shotKey);
                  allDetectedShots.push(shot);
                  newShotsInBatch++;
                }
              });

              console.log(`GEMINI Batch ${batchIndex + 1} complete: ${newShotsInBatch} NEW unique shots detected (${batchResult.shots.length} total detected, ${allDetectedShots.length} total unique)`);
            }
          } else {
            consecutiveFailures++;
            console.warn(`Batch ${batchIndex + 1} failed after all retries`);
            
            // If we have too many consecutive failures and haven't switched to Gemma yet, try switching
            if (consecutiveFailures >= 2 && !switchedToGemma) {
              console.log('🔄 Multiple Gemini failures, switching to Gemma for remaining batches...');
              switchedToGemma = true;
              setAnalysisProgress('🔄 Switching to Gemma due to failures...');
            }
          }

          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else {
        // For Gemma: Use paired frame analysis for better context
        setAnalysisProgress('🔄 Creating frame pairs for contextual analysis...');
        const framePairs = createFramePairs(frames);
        
        if (framePairs.length === 0) {
          throw new Error('Cannot create frame pairs from single frame');
        }

        const BATCH_SIZE = 25; // Smaller batches for paired frames
        const batches = [];
        
        for (let i = 0; i < framePairs.length; i += BATCH_SIZE) {
          batches.push(framePairs.slice(i, i + BATCH_SIZE));
        }

        console.log(`📦 Processing ${framePairs.length} frame pairs in ${batches.length} batches (${BATCH_SIZE} pairs each) with GEMMA`);

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const batchProgress = `⚡ Processing batch ${batchIndex + 1}/${batches.length} with GEMMA (${batch.length} frame pairs)...`;
          setAnalysisProgress(batchProgress);
          
          console.log(`Processing GEMMA batch ${batchIndex + 1}/${batches.length}: frame pairs ${batch[0].frameNumber}-${batch[batch.length-1].frameNumber}`);

          const requestPayload = {
            framePairs: batch,
            modelChoice: 'gemma',
            userId: user?.id || null,
            drillMode: isDrillMode,
            batchInfo: {
              batchIndex: batchIndex + 1,
              totalBatches: batches.length,
              pairsInBatch: batch.length
            }
          };

          try {
            const { data: batchResult, error: batchError } = await supabase.functions.invoke('analyze-video', {
              body: requestPayload
            });

            if (batchError) {
              console.error(`GEMMA Batch ${batchIndex + 1} error:`, batchError);
              continue;
            }

            if (batchResult && batchResult.shots && Array.isArray(batchResult.shots)) {
              allDetectedShots = allDetectedShots.concat(batchResult.shots);
              console.log(`GEMMA Batch ${batchIndex + 1} complete: ${batchResult.shots.length} shots detected`);
            }
          } catch (batchError) {
            console.error(`GEMMA Batch ${batchIndex + 1} processing failed:`, batchError);
            continue;
          }

          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      console.log(`All batches processed. Total shots detected: ${allDetectedShots.length}`);

      if (allDetectedShots.length === 0) {
        throw new Error('No shots detected in any batch. Please ensure the video shows clear bullet impacts on a target with good contrast.');
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
        modelChoice: switchedToGemma ? 'gemma' : model,
        totalFramesProcessed: frames.length,
        batchesProcessed: model === 'gemini' ? Math.ceil(frames.length / 50) : Math.ceil(createFramePairs(frames).length / 25)
      };

      const { data: sessionResult, error: sessionError } = await supabase.functions.invoke('analyze-video', {
        body: finalRequestPayload
      });

      if (sessionError || !sessionResult?.sessionId) {
        throw new Error('Failed to save analysis session');
      }

      const finalModelName = switchedToGemma ? 'Gemma 3 27B (fallback)' : (model === 'gemini' ? 'Gemini 2.5 Flash Preview' : 'Gemma 3 27B');
      toast({
        title: "Analysis Complete!",
        description: `${finalModelName} analyzed ${frames.length} frames and found ${allDetectedShots.length} shots!`,
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

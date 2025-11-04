import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../utils/supabase';
import { env } from '../utils/env';
import { geometricScoring } from '../services/GeometricScoring';
import { sequentialShotDetection, FrameData as SequentialFrameData, ShotDetection as SequentialShotDetectionType } from '../services/SequentialShotDetection';


export interface Shot {
  id: string;
  x: number;
  y: number;
  score: number;
  timestamp: Date;
  confidence: number;
  scoringZone?: string;
}

export interface LiveAnalysisState {
  isAnalyzing: boolean;
  currentFrame: string | null;
  shots: Shot[];
  metrics: {
    totalShots: number;
    averageScore: number;
    highestScore: number;
    accuracy: number;
    groupSize: number;
    mpi: number; // Mean Point Impact
  };
  error: string | null;
}

export interface FrameAnalysis {
  frameUrl: string;
  predictions: any[];
  confidence: number;
  timestamp: number;
  latency?: number; // Optional latency measurement in milliseconds
}

const initialState: LiveAnalysisState = {
  isAnalyzing: false,
  currentFrame: null,
  shots: [],
  metrics: {
    totalShots: 0,
    averageScore: 0,
    highestScore: 0,
    accuracy: 0,
    groupSize: 0,
    mpi: 0,
  },
  error: null,
};

export function useLiveAnalysis(sessionId?: string) {
  const [state, setState] = useState<LiveAnalysisState>(initialState);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const frameCountRef = useRef(0);
  const lastFrameRef = useRef<string | null>(null);
  const lastFrameHashRef = useRef<string | null>(null);
  const unchangedFrameCountRef = useRef(0);
  const maxUnchangedFramesRef = useRef(5); // Stop after 5 unchanged frames
  const isAnalyzingRef = useRef(false); // Add ref to track analysis state

  // Initialize services
  const shotDetection = sequentialShotDetection;
  const scoringService = geometricScoring;

  // Calculate metrics from shots
  const calculateMetrics = useCallback((shots: Shot[]) => {
    if (shots.length === 0) {
      return {
        totalShots: 0,
        averageScore: 0,
        highestScore: 0,
        accuracy: 0,
        groupSize: 0,
        mpi: 0,
      };
    }

    const scores = shots.map((shot) => shot.score);
    const totalShots = shots.length;
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalShots;
    const highestScore = Math.max(...scores);
    
    // Calculate accuracy based on scoring zones
    const accurateShots = shots.filter((shot) => shot.score >= 7).length;
    const accuracy = (accurateShots / totalShots) * 100;

    // Calculate group size (shots within 2cm of each other)
    const groupSize = calculateGroupSize(shots);

    // Calculate MPI (Mean Point Impact)
    const mpi = calculateMPI(shots);

    return {
      totalShots,
      averageScore: Math.round(averageScore * 10) / 10,
      highestScore,
      accuracy: Math.round(accuracy * 10) / 10,
      groupSize,
      mpi: Math.round(mpi * 100) / 100,
    };
  }, []);

  // Calculate group size (shots within 2cm of each other)
  const calculateGroupSize = (shots: Shot[]): number => {
    if (shots.length < 2) return 1;
    
    let maxGroupSize = 1;
    const threshold = 2.0; // 2cm threshold
    
    for (let i = 0; i < shots.length; i++) {
      let currentGroupSize = 1;
      
      for (let j = i + 1; j < shots.length; j++) {
        const distance = Math.sqrt(
          Math.pow(shots[i].x - shots[j].x, 2) +
          Math.pow(shots[i].y - shots[j].y, 2)
        );
        
        if (distance <= threshold) {
          currentGroupSize++;
        } else {
          break;
        }
      }
      
      maxGroupSize = Math.max(maxGroupSize, currentGroupSize);
    }
    
    return maxGroupSize;
  };

  // Calculate MPI (Mean Point Impact)
  const calculateMPI = (shots: Shot[]): number => {
    if (shots.length === 0) return 0;
    
    // Standard target scoring zones with impact factors
    const zoneImpacts: Record<number, number> = {
      10: 1.0, // Bullseye
      9: 0.9,  // Inner ring
      8: 0.8,  // Middle ring
      7: 0.7,  // Outer ring
      6: 0.6,  // Edge
      5: 0.5,  // Further out
      4: 0.4,
      3: 0.3,
      2: 0.2,
      1: 0.1,
    };
    
    const totalImpact = shots.reduce((sum, shot) => {
      return sum + (zoneImpacts[shot.score] || 0);
    }, 0);
    
    return totalImpact / shots.length;
  };

  // Simple hash function for frame comparison
  const hashFrame = async (frameUrl: string): Promise<string> => {
    try {
      const response = await fetch(frameUrl);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // Failed to hash frame
      return Date.now().toString(); // Fallback to timestamp
    }
  };

  // Store frame analysis in database
  const storeFrameAnalysis = useCallback(async (
    sessionId: string | undefined,
    frameNumber: number,
    frameUrl: string,
    analysisResult: any
  ) => {
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from('session_frames')
        .insert({
          session_id: sessionId,
          frame_number: frameNumber,
          frame_url: frameUrl,
          frame_data: analysisResult,
          analysis_data: {
            predictions: analysisResult.predictions,
            confidence: analysisResult.confidence,
            processed_at: new Date().toISOString(),
          },
          predictions: analysisResult.predictions,
        });

      if (error) {
        // console.error('Failed to store frame analysis:', error);
      }
    } catch (error) {
      // console.error('Database error storing frame analysis:', error);
    }
  }, []);

  // Fetch and analyze next frame with change detection - NO MOCKS
  const fetchAndAnalyzeNextFrame = useCallback(async (): Promise<FrameAnalysis | null> => {
    const startTime = performance.now(); // Start timing for latency measurement
    
    try {
      setState(prev => ({ ...prev, error: null }));
      
      frameCountRef.current += 1;
      const frameNumber = frameCountRef.current;
      
      console.log('🔍 REAL: fetchAndAnalyzeNextFrame called');
      console.log('🔍 REAL: sessionId:', sessionId);
      console.log('🔍 REAL: frameNumber:', frameNumber);
      
      // Validate required environment variables
      if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Missing Supabase configuration. Check environment variables.');
      }
      
      // Step 1: Get next frame from camera proxy - REAL HARDWARE ONLY
      const cameraProxyUrl = `${env.VITE_SUPABASE_URL}/functions/v1/camera-proxy`;
      console.log('🔍 REAL: Calling camera proxy URL:', cameraProxyUrl);
      
      const frameResponse = await fetch(cameraProxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'frame_next',
          payload: {
            sessionId,
            frameNumber,
          }
        }),
      });

      console.log('🔍 REAL: Camera proxy response status:', frameResponse.status);
      
      if (!frameResponse.ok) {
        const errorText = await frameResponse.text();
        console.error('🔍 REAL: Camera proxy response not OK:', frameResponse.statusText, errorText);
        throw new Error(`Failed to fetch frame from camera: ${frameResponse.status} ${frameResponse.statusText}. ${errorText}`);
      }

      const frameData = await frameResponse.json();
      console.log('🔍 REAL: Camera proxy response data:', frameData);
      
      if (!frameData.frameUrl && !frameData.frame) {
        console.log('🔍 REAL: No frame data in response, stopping analysis');
        return null; // No more frames available
      }

      // Use frame data from response (could be frameUrl or frame)
      const frameUrl = frameData.frameUrl || frameData.frame;
      
      // Step 1.5: Check if frame has actually changed
      const currentFrameHash = await hashFrame(frameUrl);
      
      if (lastFrameHashRef.current === currentFrameHash) {
        unchangedFrameCountRef.current++;
        console.log(`🔍 REAL: Frame ${frameNumber} unchanged (${unchangedFrameCountRef.current}/${maxUnchangedFramesRef.current})`);
        
        // Stop analysis after max unchanged frames
        if (unchangedFrameCountRef.current >= maxUnchangedFramesRef.current) {
          console.log('🔍 REAL: Max unchanged frames reached, stopping analysis');
          setState(prev => ({ ...prev, isAnalyzing: false }));
          return null;
        }
        
        // Return early without processing
        return {
          frameUrl: frameUrl,
          predictions: [],
          confidence: 0,
          timestamp: Date.now(),
        };
      }

      // Frame has changed, reset counter and update hash
      unchangedFrameCountRef.current = 0;
      lastFrameHashRef.current = currentFrameHash;
      console.log(`🔍 REAL: Frame ${frameNumber} changed, processing analysis`);

      // Step 2: Analyze frame using our Supabase edge function - REAL ROBOFLOW ONLY
      const analysisUrl = `${env.VITE_SUPABASE_URL}/functions/v1/analyze-frame`;
      console.log('🔍 REAL: Calling analysis edge function URL:', analysisUrl);
      
      // Create AbortController for 15-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
      
      try {
        const analysisResponse = await fetch(analysisUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            frameBase64: frameUrl.replace(/^data:image\/[a-z]+;base64,/, ''), // Remove any data URL prefix
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('🔍 REAL: Analysis response status:', analysisResponse.status);
        
        if (!analysisResponse.ok) {
          const errorText = await analysisResponse.text();
          console.error('🔍 REAL: Analysis response not OK:', analysisResponse.statusText, errorText);
          throw new Error(`Analysis API error: ${analysisResponse.status} ${analysisResponse.statusText}. ${errorText}`);
        }

        const analysisResult = await analysisResponse.json();
        console.log('🔍 REAL: Analysis response data:', analysisResult);
        
        // Validate analysis result structure
        if (!analysisResult || typeof analysisResult !== 'object') {
          console.error('🔍 REAL: Invalid analysis result structure from edge function');
          throw new Error('Invalid analysis result structure from edge function');
        }
        
        // Our edge function returns { shots: [], confidence: number }
        if (!Array.isArray(analysisResult.shots)) {
          console.error('🔍 REAL: Edge function returned non-array shots');
          console.log('🔍 REAL: Shots type:', typeof analysisResult.shots);
          console.log('🔍 REAL: Shots value:', analysisResult.shots);
          throw new Error('Invalid shots data from analysis service');
        }
        
        // Convert shots to predictions for compatibility with existing code
        analysisResult.predictions = analysisResult.shots;
        console.log('🔍 REAL: Number of shots/predictions:', analysisResult.predictions.length);
        
        // Step 3: Process REAL shots through Sequential Shot Detection
        const detectedShots: SequentialShotDetectionType[] = [];
        
        // Process each REAL prediction
        for (const prediction of analysisResult.predictions) {
          console.log('🔍 REAL: Processing prediction:', prediction);
          
          // Create frame data for shot detection
          const frameData: SequentialFrameData = {
            id: `frame-${frameNumber}-${Date.now()}`,
            timestamp: Date.now(),
            imageData: frameUrl,
            width: 640,
            height: 480
          };
          
          // Initialize session if not already done
          if (sessionId && !shotDetection.hasSession(sessionId)) {
            shotDetection.initializeSession(sessionId);
          }
          
          // Process the frame to detect shots
          const shot = await shotDetection.processFrame(sessionId || 'demo-session', frameData);
          if (shot && shot.isNewShot) {
            detectedShots.push(shot);
            console.log('🔍 REAL: New shot detected:', shot);
          }
        }
        
        // Step 4: Apply Geometric Scoring to REAL shots
        const scoredShots = detectedShots.map((shot: SequentialShotDetectionType) => {
          // Analyze shot with geometric scoring
          const shotAnalysis = scoringService.analyzeShot(
            shot.frameId,
            shot.position,
            {
              targetDistance: 25, // Default target distance
              targetSize: 0.5, // Default target size
              targetType: 'circular',
              scoringZones: scoringService.getDefaultScoringZones('competition')
            },
            [] // No previous shots for now
          );
          
          return {
            id: shot.frameId,
            x: shot.position.x,
            y: shot.position.y,
            score: shotAnalysis.score,
            scoringZone: shotAnalysis.scoringZone.name,
            confidence: shot.confidence,
            timestamp: new Date(shot.timestamp),
          };
        });

        console.log('🔍 REAL: Scored shots:', scoredShots);

        // Step 5: Update state with REAL shots
        setState(prev => {
          const allShots = [...prev.shots, ...scoredShots];
          const newMetrics = calculateMetrics(allShots);
          
          console.log('🔍 REAL: Updating state with', scoredShots.length, 'new shots');
          console.log('🔍 REAL: Total shots now:', allShots.length);
          console.log('🔍 REAL: New metrics:', newMetrics);
          
          return {
            ...prev,
            currentFrame: frameUrl,
            shots: allShots,
            metrics: newMetrics,
          };
        });

        // Step 6: Store frame analysis in database (only if we have actual predictions)
        if (analysisResult.predictions && analysisResult.predictions.length > 0) {
          await storeFrameAnalysis(sessionId, frameNumber, frameUrl, analysisResult);
        }

        const endTime = performance.now();
        const latency = endTime - startTime;
        
        // Log latency and warn if exceeding 500ms requirement
        console.log(`🔍 REAL: Frame ${frameNumber} processed in ${latency.toFixed(2)}ms`);
        if (latency > 500) {
          console.warn(`⚠️ PRODUCTION: Latency warning - ${latency.toFixed(2)}ms exceeds 500ms requirement`);
        }
        
        return {
          frameUrl: frameUrl,
          predictions: analysisResult.predictions || [],
          confidence: analysisResult.confidence || 0.8,
          timestamp: Date.now(),
          latency: latency, // Include latency in response for monitoring
        };
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle different error types with specific user-friendly messages
        let errorMessage = 'Analysis failed';
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = 'Analysis timeout - frame processing took too long';
          } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error - unable to reach analysis service';
          } else if (error.message.includes('Roboflow API error')) {
            errorMessage = 'Analysis service error - please try again';
          } else {
            errorMessage = error.message;
          }
        }
        
        console.error('🔍 REAL: Error in fetchAndAnalyzeNextFrame:', error);
        
        // Stop analysis on critical errors
        setState(prev => ({
          ...prev,
          isAnalyzing: false, // Stop analysis on error
          error: errorMessage
        }));
        
        return null;
      }
    } catch (error) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      console.error(`🔍 REAL: Error in fetchAndAnalyzeNextFrame after ${latency.toFixed(2)}ms:`, error);
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
      return null;
    }
  }, [sessionId, shotDetection, scoringService, calculateMetrics, storeFrameAnalysis]);


  // Start real-time analysis
  const startAnalysis = useCallback(() => {
    console.log('🚀 DEBUG: startAnalysis called');
    console.log('🚀 DEBUG: sessionId:', sessionId);
    
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));
    isAnalyzingRef.current = true; // Update ref when starting analysis
    
    // Set up real-time subscription
    if (sessionId) {
      console.log('🚀 DEBUG: Setting up Supabase realtime subscription for session:', sessionId);
      const channel = supabase
        .channel(`session:${sessionId}`)
        .on('broadcast', { event: 'frame_processed' }, (payload) => {
          console.log('🚀 DEBUG: Received realtime broadcast:', payload);
          setState(prev => {
            const newShot: Shot = {
              id: payload.newShot.id,
              x: payload.newShot.x,
              y: payload.newShot.y,
              score: payload.newShot.score,
              timestamp: new Date(payload.newShot.timestamp),
              confidence: payload.newShot.confidence,
              scoringZone: payload.newShot.scoringZone,
            };
           
            const allShots = [...prev.shots, newShot];
            const newMetrics = calculateMetrics(allShots);
           
            return {
              ...prev,
              shots: allShots,
              metrics: newMetrics,
              currentFrame: payload.frameUrl,
            };
          });
        });

      channelRef.current = channel;
      channel.subscribe();
      console.log('🚀 DEBUG: Realtime subscription active');
    } else {
      console.warn('🚀 DEBUG: No sessionId provided, skipping realtime subscription');
    }

    // Start frame processing loop with change detection
    const processFrames = async () => {
      console.log('🚀 DEBUG: Starting frame processing loop');
      while (true) { // Use true instead of state.isAnalyzing to avoid stale closure
        // Use a ref to check current state and avoid stale closure
        const isCurrentlyAnalyzing = isAnalyzingRef.current;
        console.log('🚀 DEBUG: Current analysis state:', isCurrentlyAnalyzing);
        if (!isCurrentlyAnalyzing) {
          console.log('🚀 DEBUG: Analysis stopped, breaking loop');
          break;
        }
        
        console.log('🚀 DEBUG: Processing next frame...');
        const result = await fetchAndAnalyzeNextFrame();
        
        if (!result) {
          // No more frames available
          console.log('🚀 DEBUG: No more frames available, stopping analysis');
          setState(prev => ({ ...prev, isAnalyzing: false }));
          isAnalyzingRef.current = false; // Update ref when stopping analysis
          break;
        }
        
        console.log('🚀 DEBUG: Frame processed, predictions:', result.predictions.length);
        
        // Log latency if available
        if (result && 'latency' in result) {
          console.log(`🚀 PRODUCTION: Frame latency: ${(result as any).latency?.toFixed(2)}ms`);
        }
        
        // If frame was unchanged, add longer delay
        if (result.predictions.length === 0) {
          console.log('🚀 DEBUG: No predictions, waiting 500ms');
          await new Promise(resolve => setTimeout(resolve, 500)); // Longer delay for unchanged frames
        } else {
          console.log('🚀 DEBUG: Found predictions, waiting 100ms');
          await new Promise(resolve => setTimeout(resolve, 100)); // Normal delay for changed frames
        }
      }
    };

    processFrames();
  }, [sessionId, fetchAndAnalyzeNextFrame, calculateMetrics]);

  // Stop analysis
  const stopAnalysis = useCallback(() => {
    setState(prev => ({ ...prev, isAnalyzing: false }));
    isAnalyzingRef.current = false; // Update ref when stopping analysis
    
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  // Reset analysis
  const resetAnalysis = useCallback(() => {
    setState(initialState);
    isAnalyzingRef.current = false; // Update ref when resetting analysis
    frameCountRef.current = 0;
    lastFrameRef.current = null;
    lastFrameHashRef.current = null;
    unchangedFrameCountRef.current = 0;
    
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    ...state,
    startAnalysis,
    stopAnalysis,
    resetAnalysis,
    fetchAndAnalyzeNextFrame,
  };
}
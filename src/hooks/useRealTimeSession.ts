import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DetectedShot {
  x: number;
  y: number;
  confidence?: number;
}

interface SessionData {
  sessionId: string | null;
  totalShots: number;
  lastShots: DetectedShot[];
  isActive: boolean;
}

interface AnalysisResult {
  sessionMetrics: {
    accuracy: string;
    groupSize: string;
    totalScore: string;
    directionalTrend: string;
    performanceGrade: string;
  };
  detailedShots: Array<{
    shot_num: number;
    score: number;
    direction: string;
    comment: string;
  }>;
  coachingAnalysis: {
    strengths: string[];
    areasForImprovement: string[];
    performanceSummary: string;
    coachingAdvice: string;
  };
}

export const useRealTimeSession = () => {
  const [sessionData, setSessionData] = useState<SessionData>({
    sessionId: null,
    totalShots: 0,
    lastShots: [],
    isActive: false
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const framePollingRef = useRef<boolean>(false);
  const lastFrameIdRef = useRef<number | null>(null);

  // Start a new session
  const startSession = useCallback(async (distance?: string) => {
    try {
      setError(null);
      
      // Start camera session
      const cameraResponse = await fetch('https://55def892e79c.ngrok-free.app/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ distance: distance || "15", fps: 1 })
      });

      if (!cameraResponse.ok) {
        throw new Error('Failed to start camera session');
      }

      const cameraData = await cameraResponse.json();
      console.log('🎥 Camera session started:', cameraData.session_id);

      // Create database session
      const { data: dbSession, error: dbError } = await supabase
        .from('sessions')
        .insert([{ 
          video_url: `camera_session_${cameraData.session_id}`,
          drill_mode: false 
        }])
        .select()
        .single();

      if (dbError) {
        throw new Error(`Failed to create database session: ${dbError.message}`);
      }

      setSessionData({
        sessionId: dbSession.id,
        totalShots: 0,
        lastShots: [],
        isActive: true
      });

      // Start frame polling
      framePollingRef.current = true;
      lastFrameIdRef.current = null;
      startFramePolling(dbSession.id);

      return dbSession.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      setError(errorMessage);
      console.error('Session start error:', err);
      throw err;
    }
  }, []);

  // Frame polling logic
  const startFramePolling = useCallback(async (sessionId: string) => {
    while (framePollingRef.current) {
      try {
        const params = new URLSearchParams({ timeout: "10" });
        if (lastFrameIdRef.current !== null) {
          params.append("since", lastFrameIdRef.current.toString());
        }

        const frameResponse = await fetch(`https://55def892e79c.ngrok-free.app/frame/next?${params}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
          signal: AbortSignal.timeout(15000)
        });

        if (frameResponse.status === 204) {
          continue; // No new frame, continue polling
        }

        if (!frameResponse.ok) {
          console.error('Frame fetch error:', frameResponse.status);
          continue;
        }

        const frameId = parseInt(frameResponse.headers.get("X-Frame-Id") || "0");
        const frameTs = parseFloat(frameResponse.headers.get("X-Frame-Ts") || "0");
        lastFrameIdRef.current = frameId;

        // Convert frame to base64
        const frameBlob = await frameResponse.blob();
        const frameBase64 = await blobToBase64(frameBlob);

        // Call Roboflow for detection
        await processFrameForDetection(sessionId, frameBase64, frameTs);

      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Frame polling error:', err);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
      }
    }
  }, []);

  // Process frame for shot detection
  const processFrameForDetection = useCallback(async (sessionId: string, frameBase64: string, timestamp: number) => {
    try {
      // Call Roboflow model
      const roboflowResponse = await fetch('https://serverless.roboflow.com/gmshooter/production-inference-sahi-detr-2-2/run_workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer E2X6kPlh0hSSidTZ23ak'
        },
        body: JSON.stringify({
          images: { image: frameBase64 },
          use_cache: true
        })
      });

      if (!roboflowResponse.ok) {
        console.warn('Roboflow detection failed:', roboflowResponse.status);
        return;
      }

      const detectionData = await roboflowResponse.json();
      const detections = detectionData.predictions || [];

      if (detections.length > 0) {
        // Log shots to database
        const { data: logResult, error: logError } = await supabase.functions.invoke('log-shot-data', {
          body: {
            session_id: sessionId,
            detections: detections.map((d: any) => ({
              x: d.x,
              y: d.y,
              confidence: d.confidence
            })),
            frame_timestamp: timestamp
          }
        });

        if (logError) {
          console.error('Shot logging error:', logError);
          return;
        }

        // Update UI with new shots
        if (logResult.newShotsDetected > 0) {
          setSessionData(prev => ({
            ...prev,
            totalShots: logResult.totalShots,
            lastShots: logResult.newShots
          }));
        }
      }
    } catch (err) {
      console.error('Frame processing error:', err);
    }
  }, []);

  // End session and get analysis
  const endSession = useCallback(async (userId?: string) => {
    if (!sessionData.sessionId) {
      throw new Error('No active session');
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      // Stop frame polling
      framePollingRef.current = false;

      // Close camera session
      await fetch('https://55def892e79c.ngrok-free.app/session/close', {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      // Get final analysis
      const { data: analysis, error: analysisError } = await supabase.functions.invoke('end-session', {
        body: {
          session_id: sessionData.sessionId,
          user_id: userId
        }
      });

      if (analysisError) {
        throw new Error(`Analysis failed: ${analysisError.message}`);
      }

      setAnalysisResult(analysis.analysis);
      setSessionData(prev => ({ ...prev, isActive: false }));

      return analysis.analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end session';
      setError(errorMessage);
      console.error('Session end error:', err);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [sessionData.sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      framePollingRef.current = false;
    };
  }, []);

  return {
    sessionData,
    startSession,
    endSession,
    isAnalyzing,
    analysisResult,
    error,
    clearError: () => setError(null)
  };
};

// Helper function to convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
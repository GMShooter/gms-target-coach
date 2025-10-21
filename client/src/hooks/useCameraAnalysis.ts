import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export const useCameraAnalysis = (userId: string | null) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestFrame, setLatestFrame] = useState<string | null>(null);
  const [lastFrameId, setLastFrameId] = useState<number | null>(null);

  const isPolling = useRef(false);

  const pollFrames = useCallback(async () => {
    isPolling.current = true;
    while (isPolling.current) {
      try {
        const { data, error } = await supabase.functions.invoke('camera-proxy', {
          body: { action: 'frame_next', payload: { since: lastFrameId } },
        });

        if (error) throw new Error(error.message);

        if (data) {
          setLatestFrame(data.frame);
          setLastFrameId(data.frameId);
        }
        // Add a small delay to prevent overwhelming the server/browser
        await new Promise(resolve => setTimeout(resolve, 100)); 
      } catch (err: any) {
        setError(`Failed to fetch frame: ${err.message}`);
        // Stop polling on error to avoid spamming requests
        isPolling.current = false;
      }
    }
  }, [lastFrameId]);

  const startAnalysis = useCallback(async () => {
    if (!userId) return;
    setError(null);
    setIsAnalyzing(true);

    try {
      const { error } = await supabase.functions.invoke('camera-proxy', {
        body: { action: 'start_session', payload: { fps: 1 } },
      });
      if (error) throw new Error(error.message);
      pollFrames(); // Start polling for frames
    } catch (err: any) {
      setError(`Failed to start session: ${err.message}`);
      setIsAnalyzing(false);
    }
  }, [userId, pollFrames]);

  const stopAnalysis = useCallback(async () => {
    isPolling.current = false; // This will stop the polling loop
    setIsAnalyzing(false);
    setError(null);
    setLatestFrame(null);
    setLastFrameId(null);

    try {
      await supabase.functions.invoke('camera-proxy', {
        body: { action: 'stop_session' },
      });
    } catch (err: any) {
      // This is a best-effort stop, so we don't need to bother the user if it fails.
      console.error("Failed to explicitly stop session:", err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        if(isPolling.current) {
            stopAnalysis();
        }
    };
  }, [stopAnalysis]);

  return { isAnalyzing, error, startAnalysis, stopAnalysis, latestFrame };
};
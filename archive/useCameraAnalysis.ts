import { useState, useEffect, useRef, useCallback } from 'react';

import { supabase } from '../utils/supabase';

export const useCameraAnalysis = (userId: string | null) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestFrame, setLatestFrame] = useState<string | null>(null);
  const [lastFrameId, setLastFrameId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const isPolling = useRef(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pollForFrame = useCallback(async () => {
    if (!isPolling.current) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('camera-proxy', {
        body: { action: 'frame_next', payload: { since: lastFrameId } },
      });

      if (error) throw new Error(error.message);

      if (data) {
        setLatestFrame(data.frame);
        setLastFrameId(data.frameId);
      }
    } catch (err: any) {
      setError(`Failed to fetch frame: ${err.message}`);
      // Stop polling on error to avoid spamming requests
      isPolling.current = false;
      setIsAnalyzing(false);
      return;
    }

    // Schedule next poll if still polling
    if (isPolling.current) {
      pollingTimeoutRef.current = setTimeout(pollForFrame, 100);
    }
  }, [lastFrameId]);

  const startPolling = useCallback(() => {
    isPolling.current = true;
    pollForFrame();
  }, [pollForFrame]);

  const stopPolling = useCallback(() => {
    isPolling.current = false;
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!userId) {
      setError('You must be authenticated to start camera analysis');
      return;
    }
    setError(null);
    setIsAnalyzing(true);

    try {
      // Generate a unique session ID
      const newSessionId = `session-${userId}-${Date.now()}`;
      setSessionId(newSessionId);
      const { error } = await supabase.functions.invoke('camera-proxy', {
        body: { action: 'start_session', payload: { sessionId: newSessionId, fps: 1 } },
      });
      if (error) throw new Error(error.message);
      
      // Start polling for frames
      startPolling();
    } catch (err: any) {
      setError(`Failed to start session: ${err.message}`);
      setIsAnalyzing(false);
      setSessionId(null);
    }
  }, [userId, startPolling]);

  const stopAnalysis = useCallback(async () => {
    // Stop polling first
    stopPolling();
    setIsAnalyzing(false);
    setError(null);
    setLatestFrame(null);
    setLastFrameId(null);
    
    const currentSessionId = sessionId;
    setSessionId(null);

    try {
      if (currentSessionId) {
        await supabase.functions.invoke('camera-proxy', {
          body: { action: 'stop_session', payload: { sessionId: currentSessionId } },
        });
      }
    } catch (err: any) {
      // This is a best-effort stop, so we don't need to bother the user if it fails.
      console.error("Failed to explicitly stop session:", err);
    }
  }, [sessionId, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop polling and call stopAnalysis to ensure session is properly closed
      stopPolling();
      if (sessionId && isAnalyzing) {
        // Directly call stop session without updating state since component is unmounting
        supabase.functions.invoke('camera-proxy', {
          body: { action: 'stop_session', payload: { sessionId } },
        }).catch(err => {
          // Silently ignore errors during cleanup
          console.error("Failed to stop session during cleanup:", err);
        });
      }
    };
  }, [stopPolling, sessionId, isAnalyzing]);

  return { isAnalyzing, error, startAnalysis, stopAnalysis, latestFrame };
};
import { useState, useCallback } from 'react';

const BASE_URL = "https://55def892e79c.ngrok-free.app";
const HEADERS = { "ngrok-skip-browser-warning": "true" };
const TIMEOUT_LONGPOLL = 10;

interface SessionResponse {
  session_id: string;
  status: string;
  fps: number;
}

interface FrameResponse {
  frameId: number;
  sessionId: string;
  imageData: Blob;
  timestamp: number;
}

export const useCameraAPI = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async (distance?: string, fps: number = 1): Promise<string | null> => {
    try {
      setError(null);
      const payload: any = { fps };
      if (distance) {
        payload.distance = distance;
      }

      const response = await fetch(`${BASE_URL}/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...HEADERS
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.status}`);
      }

      const data: SessionResponse = await response.json();
      setCurrentSessionId(data.session_id);
      setIsSessionActive(true);
      
      return data.session_id;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start session';
      setError(errorMsg);
      console.error('Start session error:', err);
      return null;
    }
  }, []);

  const stopSession = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch(`${BASE_URL}/session/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...HEADERS
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`Failed to stop session: ${response.status}`);
      }

      const data = await response.json();
      setIsSessionActive(false);
      setCurrentSessionId(null);
      
      return data.stopped;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to stop session';
      setError(errorMsg);
      console.error('Stop session error:', err);
      return false;
    }
  }, []);

  const checkSessionStatus = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);
      const response = await fetch(`${BASE_URL}/session/status`, {
        method: 'GET',
        headers: HEADERS
      });

      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.status}`);
      }

      const data = await response.json();
      const activeSession = data.active_session;
      
      setIsSessionActive(!!activeSession);
      setCurrentSessionId(activeSession);
      
      return activeSession;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check session status';
      setError(errorMsg);
      console.error('Check status error:', err);
      return null;
    }
  }, []);

  const fetchNextFrame = useCallback(async (sinceId?: number): Promise<FrameResponse | null> => {
    try {
      setError(null);
      const params = new URLSearchParams({
        timeout: TIMEOUT_LONGPOLL.toString()
      });
      
      if (sinceId !== undefined) {
        params.append('since', sinceId.toString());
      }

      const response = await fetch(`${BASE_URL}/frame/next?${params}`, {
        method: 'GET',
        headers: HEADERS,
        signal: AbortSignal.timeout((TIMEOUT_LONGPOLL + 5) * 1000)
      });

      if (response.status === 204) {
        // No new frame within timeout
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch frame: ${response.status}`);
      }

      const frameId = parseInt(response.headers.get("X-Frame-Id") || "0");
      const sessionId = response.headers.get("X-Session-Id") || "";
      const timestamp = parseInt(response.headers.get("X-Frame-Ts") || "0");
      const imageData = await response.blob();

      return {
        frameId,
        sessionId,
        imageData,
        timestamp
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Timeout is expected, not an error
        return null;
      }
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch frame';
      setError(errorMsg);
      console.error('Fetch frame error:', err);
      return null;
    }
  }, []);

  const fetchLatestFrame = useCallback(async (): Promise<FrameResponse | null> => {
    try {
      setError(null);
      const response = await fetch(`${BASE_URL}/frame/latest`, {
        method: 'GET',
        headers: HEADERS
      });

      if (response.status === 503) {
        // No frame yet - session just started
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch latest frame: ${response.status}`);
      }

      const frameId = parseInt(response.headers.get("X-Frame-Id") || "0");
      const sessionId = response.headers.get("X-Session-Id") || "";
      const timestamp = parseInt(response.headers.get("X-Frame-Ts") || "0");
      const imageData = await response.blob();

      return {
        frameId,
        sessionId,
        imageData,
        timestamp
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch latest frame';
      setError(errorMsg);
      console.error('Fetch latest frame error:', err);
      return null;
    }
  }, []);

  return {
    isSessionActive,
    currentSessionId,
    error,
    startSession,
    stopSession,
    checkSessionStatus,
    fetchNextFrame,
    fetchLatestFrame,
    clearError: () => setError(null)
  };
};
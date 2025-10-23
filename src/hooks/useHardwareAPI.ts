import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  HardwareAPI, 
  PiDevice, 
  SessionData, 
  ShotData, 
  FrameData, 
  ScoringZone,
  SessionStartRequest,
  SessionStopRequest
} from '@/services/HardwareAPI';

export interface UseHardwareAPIState {
  isConnected: boolean;
  isConnecting: boolean;
  device: PiDevice | null;
  sessionId: string | null;
  isSessionActive: boolean;
  lastShot: ShotData | null;
  lastFrame: FrameData | null;
  sessions: SessionData[];
  error: string | null;
}

export interface UseHardwareAPIActions {
  connectViaQRCode: (qrData: string) => Promise<void>;
  disconnect: () => Promise<void>;
  startSession: (request: SessionStartRequest) => Promise<void>;
  stopSession: (reason?: 'user' | 'timeout' | 'error') => Promise<void>;
  getLatestFrame: () => Promise<void>;
  getNextFrame: () => Promise<void>;
  clearError: () => void;
}

export function useHardwareAPI(): UseHardwareAPIState & UseHardwareAPIActions {
  const [state, setState] = useState<UseHardwareAPIState>({
    isConnected: false,
    isConnecting: false,
    device: null,
    sessionId: null,
    isSessionActive: false,
    lastShot: null,
    lastFrame: null,
    sessions: [],
    error: null,
  });

  const hardwareAPIRef = useRef<HardwareAPI | null>(null);

  // Initialize hardware API
  useEffect(() => {
    if (!hardwareAPIRef.current) {
      hardwareAPIRef.current = new HardwareAPI();
      
      // Set up event listeners
      const handleDeviceConnected = (device: PiDevice) => {
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          device,
          isConnecting: false 
        }));
      };
      
      const handleDeviceDisconnected = () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          device: null,
          sessionId: null,
          isSessionActive: false,
          lastShot: null,
          lastFrame: null,
        }));
      };
      
      const handleSessionStarted = (session: SessionData) => {
        setState(prev => ({ 
          ...prev, 
          sessionId: session.sessionId,
          isSessionActive: true,
          sessions: [...prev.sessions, session]
        }));
      };
      
      const handleSessionEnded = (session: SessionData) => {
        setState(prev => ({ 
          ...prev, 
          sessionId: null,
          isSessionActive: false,
          sessions: prev.sessions.map(s => 
            s.sessionId === session.sessionId ? session : s
          )
        }));
      };
      
      const handleShotDetected = (shot: ShotData) => {
        setState(prev => ({ ...prev, lastShot: shot }));
      };
      
      const handleFrameUpdated = (frame: FrameData) => {
        setState(prev => ({ ...prev, lastFrame: frame }));
      };
      
      const handleError = (error: any) => {
        setState(prev => ({ 
          ...prev, 
          error: error.message || 'Hardware error occurred' 
        }));
      };

      const api = hardwareAPIRef.current;
      api.addEventListener('deviceConnected', handleDeviceConnected);
      api.addEventListener('deviceDisconnected', handleDeviceDisconnected);
      api.addEventListener('sessionStarted', handleSessionStarted);
      api.addEventListener('sessionEnded', handleSessionEnded);
      api.addEventListener('shotDetected', handleShotDetected);
      api.addEventListener('frameUpdated', handleFrameUpdated);
      api.addEventListener('error', handleError);
      
      return () => {
        api.removeEventListener('deviceConnected', handleDeviceConnected);
        api.removeEventListener('deviceDisconnected', handleDeviceDisconnected);
        api.removeEventListener('sessionStarted', handleSessionStarted);
        api.removeEventListener('sessionEnded', handleSessionEnded);
        api.removeEventListener('shotDetected', handleShotDetected);
        api.removeEventListener('frameUpdated', handleFrameUpdated);
        api.removeEventListener('error', handleError);
        api.cleanup();
      };
    }
  }, []);

  const connectViaQRCode = useCallback(async (qrData: string) => {
    if (!hardwareAPIRef.current) {
      setState(prev => ({
        ...prev,
        error: 'Hardware API not initialized',
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      const device = await hardwareAPIRef.current.connectViaQRCode(qrData);
      // The event listener will handle state updates
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect via QR code',
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!hardwareAPIRef.current || !state.device) {
      return;
    }

    try {
      await hardwareAPIRef.current.disconnectDevice(state.device.id);
      // The event listener will handle state updates
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disconnect',
      }));
    }
  }, [state.device]);

  const startSession = useCallback(async (request: SessionStartRequest) => {
    if (!hardwareAPIRef.current || !state.device) {
      setState(prev => ({
        ...prev,
        error: 'Not connected to hardware',
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      await hardwareAPIRef.current.startSession(state.device.id, request);
      // The event listener will handle state updates
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to start session',
      }));
    }
  }, [state.device]);

  const stopSession = useCallback(async (reason: 'user' | 'timeout' | 'error' = 'user') => {
    if (!hardwareAPIRef.current || !state.sessionId) {
      return;
    }

    try {
      await hardwareAPIRef.current.stopSession(state.sessionId, reason);
      // The event listener will handle state updates
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop session',
      }));
    }
  }, [state.sessionId]);

  const getLatestFrame = useCallback(async () => {
    if (!hardwareAPIRef.current || !state.device) {
      setState(prev => ({
        ...prev,
        error: 'Not connected to hardware',
      }));
      return;
    }

    try {
      const frame = await hardwareAPIRef.current.getLatestFrame(state.device.id);
      setState(prev => ({ ...prev, lastFrame: frame }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get latest frame',
      }));
    }
  }, [state.device]);

  const getNextFrame = useCallback(async () => {
    if (!hardwareAPIRef.current || !state.device) {
      setState(prev => ({
        ...prev,
        error: 'Not connected to hardware',
      }));
      return;
    }

    try {
      const frame = await hardwareAPIRef.current.getNextFrame(state.device.id);
      setState(prev => ({ ...prev, lastFrame: frame }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get next frame',
      }));
    }
  }, [state.device]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    connectViaQRCode,
    disconnect,
    startSession,
    stopSession,
    getLatestFrame,
    getNextFrame,
    clearError,
  };
}
import { useState, useEffect, useCallback } from 'react';
import { hardwareAPI, type SessionData, type PiDevice } from '../services/HardwareAPI';

export interface SessionManagerState {
  currentSession: SessionData | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  sessionHistory: SessionData[];
}

export interface SessionManagerActions {
  startSession: (deviceId: string, config: any) => Promise<void>;
  stopSession: (sessionId: string) => Promise<void>;
  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  emergencyStop: (sessionId: string) => Promise<void>;
  clearError: () => void;
  refreshSessionStatus: () => Promise<void>;
}

export const useSessionManager = (deviceId?: string): SessionManagerState & SessionManagerActions => {
  const [state, setState] = useState<SessionManagerState>({
    currentSession: null,
    isConnected: false,
    isLoading: false,
    error: null,
    sessionHistory: []
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<SessionManagerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Start session
  const startSession = useCallback(async (targetDeviceId: string, config: any) => {
    updateState({ isLoading: true, error: null });

    try {
      const sessionId = `session_${Date.now()}`;
      const userId = 'current_user'; // Get from auth context

      const session = await hardwareAPI.startSession(targetDeviceId, {
        sessionId,
        userId,
        settings: config
      });

      updateState({ 
        currentSession: session,
        isLoading: false 
      });
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to start session',
        isLoading: false 
      });
    }
  }, [updateState]);

  // Stop session
  const stopSession = useCallback(async (sessionId: string) => {
    updateState({ isLoading: true, error: null });

    try {
      await hardwareAPI.stopSession(sessionId, 'user');
      
      setState(prev => ({
        ...prev,
        currentSession: null,
        sessionHistory: prev.currentSession ? [...prev.sessionHistory, prev.currentSession] : prev.sessionHistory,
        isLoading: false
      }));
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to stop session',
        isLoading: false 
      });
    }
  }, [updateState]);

  // Pause session
  const pauseSession = useCallback(async (sessionId: string) => {
    updateState({ isLoading: true, error: null });

    try {
      await hardwareAPI.toggleSessionPause(sessionId);
      
      setState(prev => ({
        ...prev,
        currentSession: prev.currentSession ? { ...prev.currentSession, status: 'paused' } : null,
        isLoading: false
      }));
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to pause session',
        isLoading: false 
      });
    }
  }, [updateState]);

  // Resume session
  const resumeSession = useCallback(async (sessionId: string) => {
    updateState({ isLoading: true, error: null });

    try {
      await hardwareAPI.toggleSessionPause(sessionId);
      
      setState(prev => ({
        ...prev,
        currentSession: prev.currentSession ? { ...prev.currentSession, status: 'active' } : null,
        isLoading: false
      }));
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to resume session',
        isLoading: false 
      });
    }
  }, [updateState]);

  // Emergency stop
  const emergencyStop = useCallback(async (sessionId: string) => {
    if (!confirm('Are you sure you want to emergency stop the session? This will immediately terminate all operations.')) {
      return;
    }

    updateState({ isLoading: true, error: null });

    try {
      await hardwareAPI.emergencyStop(sessionId);
      
      setState(prev => ({
        ...prev,
        currentSession: null,
        sessionHistory: prev.currentSession ? [...prev.sessionHistory, prev.currentSession] : prev.sessionHistory,
        isLoading: false
      }));
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to emergency stop session',
        isLoading: false 
      });
    }
  }, [updateState]);

  // Refresh session status
  const refreshSessionStatus = useCallback(async () => {
    if (!state.currentSession) return;

    try {
      const status = await hardwareAPI.getSessionStatus(state.currentSession.sessionId);
      
      // Update connection status based on session status
      updateState({ 
        isConnected: status.isActive 
      });
    } catch (error) {
      console.error('Failed to refresh session status:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to get session status'
      });
    }
  }, [state.currentSession, updateState]);

  // Set up event listeners
  useEffect(() => {
    const handleSessionStarted = (session: SessionData) => {
      updateState({ currentSession: session });
    };

    const handleSessionEnded = (session: SessionData) => {
      setState(prev => ({
        ...prev,
        currentSession: null,
        sessionHistory: [...prev.sessionHistory, session]
      }));
    };

    const handleSessionStatusChanged = ({ status }: { sessionId: string; status: string }) => {
      if (state.currentSession) {
        setState(prev => ({
          ...prev,
          currentSession: prev.currentSession ? { ...prev.currentSession, status: status as any } : null
        }));
      }
    };

    const handleDeviceConnected = () => {
      updateState({ isConnected: true });
    };

    const handleDeviceDisconnected = () => {
      updateState({ isConnected: false });
    };

    const handleError = (error: any) => {
      updateState({ 
        error: error.error || 'An unknown error occurred'
      });
    };

    // Register event listeners
    hardwareAPI.addEventListener('sessionStarted', handleSessionStarted);
    hardwareAPI.addEventListener('sessionEnded', handleSessionEnded);
    hardwareAPI.addEventListener('sessionStatusChanged', handleSessionStatusChanged);
    hardwareAPI.addEventListener('deviceConnected', handleDeviceConnected);
    hardwareAPI.addEventListener('deviceDisconnected', handleDeviceDisconnected);
    hardwareAPI.addEventListener('error', handleError);

    // Cleanup
    return () => {
      hardwareAPI.removeEventListener('sessionStarted', handleSessionStarted);
      hardwareAPI.removeEventListener('sessionEnded', handleSessionEnded);
      hardwareAPI.removeEventListener('sessionStatusChanged', handleSessionStatusChanged);
      hardwareAPI.removeEventListener('deviceConnected', handleDeviceConnected);
      hardwareAPI.removeEventListener('deviceDisconnected', handleDeviceDisconnected);
      hardwareAPI.removeEventListener('error', handleError);
    };
  }, [state.currentSession, updateState]);

  // Auto-refresh session status
  useEffect(() => {
    if (!state.currentSession) return;

    const interval = setInterval(() => {
      refreshSessionStatus();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [state.currentSession, refreshSessionStatus]);

  // Check device connection status
  useEffect(() => {
    if (!deviceId) return;

    const checkDeviceConnection = async () => {
      try {
        const device = hardwareAPI.getDevice(deviceId);
        updateState({ 
          isConnected: device?.status === 'online' 
        });
      } catch (error) {
        updateState({ isConnected: false });
      }
    };

    checkDeviceConnection();
    const interval = setInterval(checkDeviceConnection, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [deviceId]);

  return {
    ...state,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    emergencyStop,
    clearError,
    refreshSessionStatus
  };
};
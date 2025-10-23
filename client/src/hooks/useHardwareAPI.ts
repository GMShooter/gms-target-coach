/**
 * useHardwareAPI Hook
 * 
 * React hook for interacting with the HardwareAPI service.
 * Provides state management and event handling for hardware integration.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  hardwareAPI, 
  PiDevice, 
  SessionData, 
  FrameData, 
  ShotData, 
  SessionStartRequest,
  SessionStopRequest 
} from '../services/HardwareAPI';

export interface UseHardwareAPIState {
  // Device state
  connectedDevices: PiDevice[];
  selectedDevice: PiDevice | null;
  isConnecting: boolean;
  connectionError: string | null;

  // Session state
  activeSession: SessionData | null;
  isSessionActive: boolean;
  sessionError: string | null;

  // Frame state
  currentFrame: FrameData | null;
  isLoadingFrame: boolean;
  frameError: string | null;

  // Shot detection state
  recentShots: ShotData[];
  shotDetectionEnabled: boolean;
}

export interface UseHardwareAPIActions {
  // Device actions
  connectViaQRCode: (qrData: string) => Promise<PiDevice>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  selectDevice: (device: PiDevice) => void;
  refreshDevices: () => void;

  // Session actions
  startSession: (request: SessionStartRequest) => Promise<SessionData>;
  stopSession: (reason?: 'user' | 'timeout' | 'error') => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;

  // Frame actions
  getLatestFrame: () => Promise<FrameData>;
  getNextFrame: () => Promise<FrameData>;
  setZoomPreset: (preset: number) => Promise<void>;

  // Shot detection actions
  enableShotDetection: () => void;
  disableShotDetection: () => void;
  clearRecentShots: () => void;

  // Utility actions
  clearErrors: () => void;
  reset: () => void;
}

export const useHardwareAPI = (): UseHardwareAPIState & UseHardwareAPIActions => {
  const [state, setState] = useState<UseHardwareAPIState>({
    // Device state
    connectedDevices: [],
    selectedDevice: null,
    isConnecting: false,
    connectionError: null,

    // Session state
    activeSession: null,
    isSessionActive: false,
    sessionError: null,

    // Frame state
    currentFrame: null,
    isLoadingFrame: false,
    frameError: null,

    // Shot detection state
    recentShots: [],
    shotDetectionEnabled: true,
  });

  const framePollingInterval = useRef<NodeJS.Timeout | null>(null);
  const shotDetectionTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize event listeners
  useEffect(() => {
    // Device events
    hardwareAPI.addEventListener('deviceConnected', handleDeviceConnected);
    hardwareAPI.addEventListener('deviceDisconnected', handleDeviceDisconnected);

    // Session events
    hardwareAPI.addEventListener('sessionStarted', handleSessionStarted);
    hardwareAPI.addEventListener('sessionEnded', handleSessionEnded);

    // Frame events
    hardwareAPI.addEventListener('frameUpdated', handleFrameUpdated);

    // Shot events
    hardwareAPI.addEventListener('shotDetected', handleShotDetected);

    // Error events
    hardwareAPI.addEventListener('error', handleError);

    // Refresh devices on mount
    refreshDevices();

    return () => {
      // Cleanup event listeners
      hardwareAPI.removeEventListener('deviceConnected', handleDeviceConnected);
      hardwareAPI.removeEventListener('deviceDisconnected', handleDeviceDisconnected);
      hardwareAPI.removeEventListener('sessionStarted', handleSessionStarted);
      hardwareAPI.removeEventListener('sessionEnded', handleSessionEnded);
      hardwareAPI.removeEventListener('frameUpdated', handleFrameUpdated);
      hardwareAPI.removeEventListener('shotDetected', handleShotDetected);
      hardwareAPI.removeEventListener('error', handleError);

      // Clear intervals
      if (framePollingInterval.current) {
        clearInterval(framePollingInterval.current);
      }
      if (shotDetectionTimeout.current) {
        clearTimeout(shotDetectionTimeout.current);
      }
    };
  }, []);

  // Event handlers
  const handleDeviceConnected = useCallback((device: PiDevice) => {
    setState(prev => ({
      ...prev,
      connectedDevices: [...prev.connectedDevices, device],
      connectionError: null,
      isConnecting: false
    }));
  }, []);

  const handleDeviceDisconnected = useCallback((device: PiDevice) => {
    setState(prev => ({
      ...prev,
      connectedDevices: prev.connectedDevices.filter(d => d.id !== device.id),
      selectedDevice: prev.selectedDevice?.id === device.id ? null : prev.selectedDevice
    }));
  }, []);

  const handleSessionStarted = useCallback((session: SessionData) => {
    setState(prev => ({
      ...prev,
      activeSession: session,
      isSessionActive: true,
      sessionError: null
    }));

    // Start frame polling when session starts
    startFramePolling();
  }, []);

  const handleSessionEnded = useCallback((session: SessionData) => {
    setState(prev => ({
      ...prev,
      activeSession: null,
      isSessionActive: false
    }));

    // Stop frame polling when session ends
    stopFramePolling();
  }, []);

  const handleFrameUpdated = useCallback((frame: FrameData) => {
    setState(prev => ({
      ...prev,
      currentFrame: frame,
      isLoadingFrame: false,
      frameError: null
    }));
  }, []);

  const handleShotDetected = useCallback((shot: ShotData) => {
    setState(prev => ({
      ...prev,
      recentShots: [...prev.recentShots, shot].slice(-10) // Keep last 10 shots
    }));
  }, []);

  const handleError = useCallback((error: any) => {
    console.error('HardwareAPI error:', error);
    
    setState(prev => ({
      ...prev,
      connectionError: error.type === 'connection_error' ? error.message : prev.connectionError,
      sessionError: error.type === 'session_error' ? error.message : prev.sessionError,
      frameError: error.type === 'frame_error' ? error.message : prev.frameError,
      isLoadingFrame: false,
      isConnecting: false
    }));
  }, []);

  // Frame polling
  const startFramePolling = useCallback(() => {
    if (framePollingInterval.current) {
      clearInterval(framePollingInterval.current);
    }

    framePollingInterval.current = setInterval(async () => {
      if (state.selectedDevice && state.isSessionActive && state.shotDetectionEnabled) {
        try {
          await getNextFrame();
        } catch (error) {
          console.error('Frame polling error:', error);
        }
      }
    }, 1000); // Poll every second
  }, [state.selectedDevice, state.isSessionActive, state.shotDetectionEnabled]);

  const stopFramePolling = useCallback(() => {
    if (framePollingInterval.current) {
      clearInterval(framePollingInterval.current);
      framePollingInterval.current = null;
    }
  }, []);

  // Device actions
  const connectViaQRCode = useCallback(async (qrData: string): Promise<PiDevice> => {
    setState(prev => ({ ...prev, isConnecting: true, connectionError: null }));
    
    try {
      const device = await hardwareAPI.connectViaQRCode(qrData);
      setState(prev => ({ ...prev, selectedDevice: device }));
      return device;
    } catch (error) {
      setState(prev => ({
        ...prev,
        connectionError: error instanceof Error ? error.message : 'Failed to connect',
        isConnecting: false
      }));
      throw error;
    }
  }, []);

  const disconnectDevice = useCallback(async (deviceId: string): Promise<void> => {
    try {
      await hardwareAPI.disconnectDevice(deviceId);
    } catch (error) {
      setState(prev => ({
        ...prev,
        connectionError: error instanceof Error ? error.message : 'Failed to disconnect'
      }));
      throw error;
    }
  }, []);

  const selectDevice = useCallback((device: PiDevice) => {
    setState(prev => ({ ...prev, selectedDevice: device }));
  }, []);

  const refreshDevices = useCallback(() => {
    const devices = hardwareAPI.getConnectedDevices();
    setState(prev => ({ ...prev, connectedDevices: devices }));
  }, []);

  // Session actions
  const startSession = useCallback(async (request: SessionStartRequest): Promise<SessionData> => {
    if (!state.selectedDevice) {
      throw new Error('No device selected');
    }

    setState(prev => ({ ...prev, sessionError: null }));
    
    try {
      const session = await hardwareAPI.startSession(state.selectedDevice.id, request);
      return session;
    } catch (error) {
      setState(prev => ({
        ...prev,
        sessionError: error instanceof Error ? error.message : 'Failed to start session'
      }));
      throw error;
    }
  }, [state.selectedDevice]);

  const stopSession = useCallback(async (reason: 'user' | 'timeout' | 'error' = 'user'): Promise<void> => {
    if (!state.activeSession) {
      return;
    }

    try {
      await hardwareAPI.stopSession(state.activeSession.sessionId, reason);
    } catch (error) {
      setState(prev => ({
        ...prev,
        sessionError: error instanceof Error ? error.message : 'Failed to stop session'
      }));
      throw error;
    }
  }, [state.activeSession]);

  const pauseSession = useCallback(() => {
    stopFramePolling();
    setState(prev => ({ ...prev, isSessionActive: false }));
  }, []);

  const resumeSession = useCallback(() => {
    if (state.activeSession) {
      setState(prev => ({ ...prev, isSessionActive: true }));
      startFramePolling();
    }
  }, [state.activeSession, startFramePolling]);

  // Frame actions
  const getLatestFrame = useCallback(async (): Promise<FrameData> => {
    if (!state.selectedDevice) {
      throw new Error('No device selected');
    }

    setState(prev => ({ ...prev, isLoadingFrame: true, frameError: null }));
    
    try {
      const frame = await hardwareAPI.getLatestFrame(state.selectedDevice.id);
      return frame;
    } catch (error) {
      setState(prev => ({
        ...prev,
        frameError: error instanceof Error ? error.message : 'Failed to get frame',
        isLoadingFrame: false
      }));
      throw error;
    }
  }, [state.selectedDevice]);

  const getNextFrame = useCallback(async (): Promise<FrameData> => {
    if (!state.selectedDevice) {
      throw new Error('No device selected');
    }

    setState(prev => ({ ...prev, isLoadingFrame: true, frameError: null }));
    
    try {
      const frame = await hardwareAPI.getNextFrame(state.selectedDevice.id);
      return frame;
    } catch (error) {
      setState(prev => ({
        ...prev,
        frameError: error instanceof Error ? error.message : 'Failed to get frame',
        isLoadingFrame: false
      }));
      throw error;
    }
  }, [state.selectedDevice]);

  const setZoomPreset = useCallback(async (preset: number): Promise<void> => {
    if (!state.selectedDevice) {
      throw new Error('No device selected');
    }

    try {
      await hardwareAPI.setZoomPreset(state.selectedDevice.id, preset);
    } catch (error) {
      setState(prev => ({
        ...prev,
        frameError: error instanceof Error ? error.message : 'Failed to set zoom'
      }));
      throw error;
    }
  }, [state.selectedDevice]);

  // Shot detection actions
  const enableShotDetection = useCallback(() => {
    setState(prev => ({ ...prev, shotDetectionEnabled: true }));
    if (state.isSessionActive) {
      startFramePolling();
    }
  }, [state.isSessionActive, startFramePolling]);

  const disableShotDetection = useCallback(() => {
    setState(prev => ({ ...prev, shotDetectionEnabled: false }));
    stopFramePolling();
  }, [stopFramePolling]);

  const clearRecentShots = useCallback(() => {
    setState(prev => ({ ...prev, recentShots: [] }));
  }, []);

  // Utility actions
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      connectionError: null,
      sessionError: null,
      frameError: null
    }));
  }, []);

  const reset = useCallback(() => {
    stopFramePolling();
    setState({
      connectedDevices: [],
      selectedDevice: null,
      isConnecting: false,
      connectionError: null,
      activeSession: null,
      isSessionActive: false,
      sessionError: null,
      currentFrame: null,
      isLoadingFrame: false,
      frameError: null,
      recentShots: [],
      shotDetectionEnabled: true,
    });
  }, []);

  return {
    ...state,
    // Device actions
    connectViaQRCode,
    disconnectDevice,
    selectDevice,
    refreshDevices,
    // Session actions
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    // Frame actions
    getLatestFrame,
    getNextFrame,
    setZoomPreset,
    // Shot detection actions
    enableShotDetection,
    disableShotDetection,
    clearRecentShots,
    // Utility actions
    clearErrors,
    reset,
  };
};

export default useHardwareAPI;
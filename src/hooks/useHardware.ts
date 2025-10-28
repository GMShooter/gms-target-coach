import { useEffect, useRef, useCallback } from 'react';

import { useHardwareStore } from '../store/hardwareStore';
import { hardwareAPI , PiDevice, SessionData, FrameData, ShotData } from '../services/HardwareAPI';
import { mockHardwareAPI } from '../services/MockHardwareAPI';
import { analysisService } from '../services/AnalysisService';
import { supabase } from '../utils/supabase';

export interface UseHardwareReturn {
  // Connection state
  connectedDevice: PiDevice | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Session state
  activeSession: SessionData | null;
  isSessionActive: boolean;
  
  // Real-time data
  latestFrame: FrameData | null;
  recentShots: ShotData[];
  analysisResult: any | null;
  isAnalyzing: boolean;
  
  // Actions
  connectToDevice: (qrData: string) => Promise<PiDevice | null>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  startSession: (deviceId: string, userId: string) => Promise<SessionData | null>;
  stopSession: (sessionId: string) => Promise<void>;
  pollForFrames: (deviceId: string, sessionId: string) => void;
  stopPolling: () => void;
}

export const useHardware = (): UseHardwareReturn => {
  const store = useHardwareStore();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Choose API based on environment variable
  const api = import.meta.env.VITE_USE_MOCK_HARDWARE === 'true' ? mockHardwareAPI : hardwareAPI;

  // Connect to device via QR code
  const connectToDevice = useCallback(async (qrData: string): Promise<PiDevice | null> => {
    try {
      store.setConnectionStatus(false, true, null);
      const device = await api.connectViaQRCode(qrData);
      
      if (device) {
        store.setConnectedDevice(device);
        store.setNgrokUrl(device.ngrokUrl || device.url);
        store.setConnectionStatus(true, false, null);
        return device;
      } else {
        store.setConnectionStatus(false, false, 'Failed to connect to device');
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      store.setConnectionStatus(false, false, errorMessage);
      return null;
    }
  }, [store]);

  // Disconnect from device
  const disconnectDevice = useCallback(async (deviceId: string): Promise<void> => {
    try {
      await api.disconnectDevice(deviceId);
      store.setConnectedDevice(null);
      store.setNgrokUrl(null);
      store.setConnectionStatus(false, false, null);
      store.setActiveSession(null);
      store.setSessionActive(false);
      stopPolling();
    } catch (error) {
      console.error('Failed to disconnect device:', error);
    }
  }, [store]);

  // Start shooting session
  const startSession = useCallback(async (deviceId: string, userId: string): Promise<SessionData | null> => {
    try {
      // First create session in Supabase
      const { data: supabaseSession, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          session_type: 'camera',
          drill_mode: false,
          status: 'processing'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Failed to create session in Supabase:', sessionError);
        return null;
      }

      // Then start hardware session
      const sessionRequest = {
        sessionId: supabaseSession.id,
        userId,
        settings: {
          targetDistance: 10, // Default values
          targetSize: 100,
          scoringZones: [], // Will be populated by hardware
          zoomPreset: undefined,
          detectionSensitivity: 0.7
        }
      };

      const sessionData = await api.startSession(deviceId, sessionRequest);
      
      if (sessionData) {
        // Create combined session data
        const combinedSessionData: SessionData = {
          sessionId: supabaseSession.id,
          deviceId: deviceId, // Add deviceId property
          startTime: new Date(),
          shotCount: 0,
          status: 'active',
          settings: sessionRequest.settings
        };
        
        store.setActiveSession(combinedSessionData);
        store.setSessionActive(true);
        return combinedSessionData;
      } else {
        // Clean up Supabase session if hardware session failed
        await supabase
          .from('sessions')
          .delete()
          .eq('id', supabaseSession.id);
        return null;
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      return null;
    }
  }, [store]);

  // Stop shooting session
  const stopSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      // Stop hardware session first
      await api.stopSession(sessionId);
      
      // Update session in Supabase to mark as completed
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Failed to update session in Supabase:', updateError);
      }

      // Save any remaining shots to detections table
      if (store.recentShots.length > 0) {
        const shotsToInsert = store.recentShots.map(shot => ({
          session_id: sessionId,
          shot_number: shot.sequentialShotNumber || 1,
          x_coordinate: shot.coordinates?.x || 0,
          y_coordinate: shot.coordinates?.y || 0,
          score: shot.score || 0,
          direction: shot.scoringZone || 'center',
          created_at: shot.timestamp || new Date().toISOString()
        }));

        const { error: shotsError } = await supabase
          .from('detections')
          .insert(shotsToInsert);

        if (shotsError) {
          console.error('Failed to save shots to Supabase:', shotsError);
        }
      }

      store.setActiveSession(null);
      store.setSessionActive(false);
      stopPolling();
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  }, [store]);

  // Poll for new frames
  const pollForFrames = useCallback((deviceId: string, sessionId: string): void => {
    const poll = async () => {
      try {
        const frame = await api.getLatestFrame(deviceId);
        store.setLatestFrame(frame);
        
        // If frame has shot data, add to recent shots
        if (frame.hasShot && frame.shotData) {
          store.addShot(frame.shotData);
        }
        
        // If frame has shot data, call analysis function
        if (frame.hasShot && frame.shotData) {
          try {
            store.setAnalyzing(true);
            
            // Use the new AnalysisService for both mock and production modes
            const analysisResult = await analysisService.analyzeFrame(frame.imageUrl, {
              useMock: import.meta.env.VITE_USE_MOCK_HARDWARE === 'true'
            });
            
            // Store analysis result in state for UI display
            store.setAnalysisResult(analysisResult);
          } catch (analysisError) {
            console.error('Failed to analyze frame:', analysisError);
          } finally {
            store.setAnalyzing(false);
          }
        }
      } catch (error) {
        console.error('Failed to poll for frames:', error);
      }
    };

    // Start polling
    pollingIntervalRef.current = setInterval(poll, 1000); // Poll every second
  }, [store]);

  // Stop polling
  const stopPolling = useCallback((): void => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Auto-start polling when session is active
  useEffect(() => {
    if (store.isSessionActive && store.activeSession && store.connectedDevice) {
      pollForFrames(store.connectedDevice.id, store.activeSession.sessionId);
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [store.isSessionActive, store.activeSession, store.connectedDevice, pollForFrames, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // Connection state
    connectedDevice: store.connectedDevice,
    isConnected: store.isConnected,
    isConnecting: store.isConnecting,
    connectionError: store.connectionError,
    
    // Session state
    activeSession: store.activeSession,
    isSessionActive: store.isSessionActive,
    
    // Real-time data
    latestFrame: store.latestFrame,
    recentShots: store.recentShots,
    analysisResult: store.analysisResult,
    isAnalyzing: store.isAnalyzing,
    
    // Actions
    connectToDevice,
    disconnectDevice,
    startSession,
    stopSession,
    pollForFrames,
    stopPolling
  };
};

export default useHardware;
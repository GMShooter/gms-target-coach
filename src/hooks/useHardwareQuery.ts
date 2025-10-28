import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '../lib/query-client';
import { useHardwareStore } from '../store/hardwareStore';
import { hardwareAPI, PiDevice, SessionData, FrameData, ShotData } from '../services/HardwareAPI';
import { mockHardwareAPI } from '../services/MockHardwareAPI';
import { supabase } from '../utils/supabase';

export interface UseHardwareQueryReturn {
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

export const useHardwareQuery = (): UseHardwareQueryReturn => {
  const store = useHardwareStore();
  const queryClient = useQueryClient();
  
  // Choose API based on environment variable
  const isMockMode = process.env.NODE_ENV === 'test' ||
    (typeof window !== 'undefined' && (window as any).__VITE_USE_MOCK_HARDWARE === 'true');
  const api = isMockMode ? mockHardwareAPI : hardwareAPI;

  // Query for connection status
  const { data: connectionStatus } = useQuery({
    queryKey: ['hardware-connection'],
    queryFn: () => ({
      connectedDevice: store.connectedDevice,
      isConnected: store.isConnected,
      isConnecting: store.isConnecting,
      connectionError: store.connectionError,
    }),
    staleTime: 0,
    refetchOnMount: false,
  });

  // Query for session status
  const { data: sessionStatus } = useQuery({
    queryKey: ['hardware-session'],
    queryFn: () => ({
      activeSession: store.activeSession,
      isSessionActive: store.isSessionActive,
    }),
    staleTime: 0,
    refetchOnMount: false,
  });

  // Query for real-time data
  const { data: realTimeData } = useQuery({
    queryKey: ['hardware-realtime'],
    queryFn: () => ({
      latestFrame: store.latestFrame,
      recentShots: store.recentShots,
      analysisResult: store.analysisResult,
      isAnalyzing: store.isAnalyzing,
    }),
    staleTime: 0,
    refetchOnMount: false,
  });

  // Mutation for connecting to device
  const connectMutation = useMutation({
    mutationFn: async (qrData: string) => {
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
    },
    onSuccess: (device: any) => {
      if (device) {
        queryClient.invalidateQueries({ queryKey: ['hardware-connection'] });
      }
    },
    onError: (error: any) => {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      store.setConnectionStatus(false, false, errorMessage);
      queryClient.invalidateQueries({ queryKey: ['hardware-connection'] });
    },
  });

  // Mutation for disconnecting device
  const disconnectMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      await api.disconnectDevice(deviceId);
      store.setConnectedDevice(null);
      store.setNgrokUrl(null);
      store.setConnectionStatus(false, false, null);
      store.setActiveSession(null);
      store.setSessionActive(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware-connection', 'hardware-session', 'hardware-realtime'] });
    },
  });

  // Mutation for starting session
  const startSessionMutation = useMutation({
    mutationFn: async ({ deviceId, userId }: { deviceId: string; userId: string }) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware-session', 'hardware-realtime'] });
    },
  });

  // Mutation for stopping session
  const stopSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware-session', 'hardware-realtime'] });
    },
  });

  // Mutation for frame polling
  const framePollingMutation = useMutation({
    mutationFn: async ({ deviceId, sessionId }: { deviceId: string; sessionId: string }) => {
      try {
        const frame = await api.getLatestFrame(deviceId);
        store.setLatestFrame(frame);
        
        // If frame has shot data, add to recent shots
        if (frame.hasShot && frame.shotData) {
          store.addShot(frame.shotData);
        }
        
        // If frame has shot data, call analysis function
        if (frame.hasShot && frame.shotData) {
          // Skip Edge Function call in mock mode - use client-side analysis
          if (process.env.NODE_ENV === 'test' ||
            (typeof window !== 'undefined' && (window as any).__VITE_USE_MOCK_HARDWARE === 'true')) {
            // Use client-side mock analysis
            const { generateMockAnalysis } = await import('../services/MockAnalysisService');
            const mockAnalysis = generateMockAnalysis(frame.frameNumber);
             
            // Transform mock result to match expected format
            const transformedResult = {
              frameId: mockAnalysis.frameId,
              shots: [{
                x: mockAnalysis.location.x,
                y: mockAnalysis.location.y,
                score: mockAnalysis.score,
                confidence: mockAnalysis.confidence
              }],
              confidence: mockAnalysis.confidence,
              timestamp: new Date().toISOString()
            };
           
            store.setAnalysisResult(transformedResult);
            store.setAnalyzing(false);
          } else {
            // Call Supabase Edge Function for analysis
            try {
              store.setAnalyzing(true);
              const { data, error } = await supabase.functions.invoke('analyze-frame', {
                body: {
                  frameBase64: frame.imageUrl // Pass frame data for analysis
                }
              });
             
              if (error) {
                console.error('Analysis failed:', error);
              } else if (data) {
                // Store analysis result in state for UI display
                store.setAnalysisResult({
                  frameId: Math.random().toString(36).substring(7),
                  shots: data.shots || [],
                  confidence: data.confidence || 0,
                  timestamp: new Date().toISOString()
                });
              }
            } catch (analysisError) {
              console.error('Failed to call analysis function:', analysisError);
            } finally {
              store.setAnalyzing(false);
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll for frames:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware-realtime'] });
    },
  });

  // Simplified polling function
  const pollForFrames = useCallback((deviceId: string, sessionId: string): void => {
    framePollingMutation.mutate({ deviceId, sessionId });
  }, [framePollingMutation]);

  const stopPolling = useCallback((): void => {
    // In TanStack Query, we don't need manual polling management
    // Queries will be refetched when needed
  }, []);

  return {
    // Connection state
    connectedDevice: connectionStatus?.connectedDevice || null,
    isConnected: connectionStatus?.isConnected || false,
    isConnecting: connectionStatus?.isConnecting || false,
    connectionError: connectionStatus?.connectionError || null,
    
    // Session state
    activeSession: sessionStatus?.activeSession || null,
    isSessionActive: sessionStatus?.isSessionActive || false,
    
    // Real-time data
    latestFrame: realTimeData?.latestFrame || null,
    recentShots: realTimeData?.recentShots || [],
    analysisResult: realTimeData?.analysisResult || null,
    isAnalyzing: realTimeData?.isAnalyzing || false,
    
    // Actions
    connectToDevice: connectMutation.mutateAsync,
    disconnectDevice: disconnectMutation.mutateAsync,
    startSession: startSessionMutation.mutateAsync,
    stopSession: stopSessionMutation.mutateAsync,
    pollForFrames,
    stopPolling
  };
};

export default useHardwareQuery;
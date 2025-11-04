import { useState, useEffect, useCallback } from 'react';

import { type ShotData } from '../services/HardwareAPI';
import { env } from '../utils/env';

// Define types locally since they were removed
interface Device {
  id: string;
  name: string;
  type: string;
  ipAddress: string;
  port: number;
  status: string;
  lastSeen: string;
  capabilities: string[];
  version: string;
}

interface Session {
  sessionId: string;
  deviceId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'paused';
  settings: {
    targetDistance: number;
    targetSize: number;
    analysisMode: string;
  };
  shotCount?: number;
}

interface UseHardwareReturn {
  connectedDevice: Device | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  activeSession: Session | null;
  isSessionActive: boolean;
  latestFrame: { imageUrl: string; timestamp: number } | null;
  recentShots: ShotData[];
  analysisResult: any;
  // isAnalyzing: boolean;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  startSession: (deviceId: string, userId: string) => Promise<void>;
  stopSession: (sessionId: string) => Promise<void>;
}

export const useHardware = (): UseHardwareReturn => {
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [latestFrame, setLatestFrame] = useState<{ imageUrl: string; timestamp: number } | null>(null);
  const [recentShots, setRecentShots] = useState<ShotData[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  // const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isConnected = !!connectedDevice;
  const isSessionActive = !!activeSession && activeSession.status === 'active';

  const connectToDevice = useCallback(async (deviceId: string) => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Production-ready: Connect to real hardware via Supabase edge function
      const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/hardware-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ deviceId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to connect to device: ${response.statusText}`);
      }

      const device = await response.json();
      setConnectedDevice(device);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect to device');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectDevice = useCallback(async (deviceId: string) => {
    try {
      // Production-ready: Disconnect from real hardware via Supabase edge function
      const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/hardware-disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ deviceId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to disconnect from device: ${response.statusText}`);
      }

      setConnectedDevice(null);
      setActiveSession(null);
      setLatestFrame(null);
      setRecentShots([]);
      setAnalysisResult(null);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to disconnect from device');
    }
  }, []);

  const startSession = useCallback(async (deviceId: string, userId: string) => {
    try {
      // Production-ready: Start session via Supabase edge function
      const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/session-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ deviceId, userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.statusText}`);
      }

      const session = await response.json();
      setActiveSession(session);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to start session');
    }
  }, []);

  const stopSession = useCallback(async (sessionId: string) => {
    try {
      // Production-ready: Stop session via Supabase edge function
      const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/session-stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to stop session: ${response.statusText}`);
      }

      if (activeSession) {
        setActiveSession({
          ...activeSession,
          status: 'completed',
          endTime: new Date().toISOString()
        });
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to stop session');
    }
  }, [activeSession]);

  return {
    connectedDevice,
    isConnected,
    isConnecting,
    connectionError,
    activeSession,
    isSessionActive,
    latestFrame,
    recentShots,
    analysisResult,
    // isAnalyzing,
    connectToDevice,
    disconnectDevice,
    startSession,
    stopSession
  };
};
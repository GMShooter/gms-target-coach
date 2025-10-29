import { useState, useEffect, useCallback } from 'react';

import { type ShotData } from '../services/HardwareAPI';

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

  // Mock demo data for development
  useEffect(() => {
    // Simulate a demo frame after connection
    if (isConnected) {
      const timer = setTimeout(() => {
        setLatestFrame({
          imageUrl: 'https://picsum.photos/seed/gmshoot-demo/640/480.jpg',
          timestamp: Date.now()
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  const connectToDevice = useCallback(async (deviceId: string) => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock device connection
      const mockDevice: Device = {
        id: deviceId,
        name: 'Demo Target System',
        type: 'raspberry-pi',
        ipAddress: '192.168.1.100',
        port: 8080,
        status: 'online',
        lastSeen: new Date().toISOString(),
        capabilities: ['video-stream', 'shot-detection', 'analysis'],
        version: '1.0.0'
      };
      
      setConnectedDevice(mockDevice);
    } catch (error) {
      setConnectionError('Failed to connect to device');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectDevice = useCallback(async (deviceId: string) => {
    try {
      // Simulate disconnection
      await new Promise(resolve => setTimeout(resolve, 500));
      setConnectedDevice(null);
      setActiveSession(null);
      setLatestFrame(null);
      setRecentShots([]);
      setAnalysisResult(null);
    } catch (error) {
      setConnectionError('Failed to disconnect from device');
    }
  }, []);

  const startSession = useCallback(async (deviceId: string, userId: string) => {
    try {
      // Simulate session start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockSession: Session = {
        sessionId: `session-${Date.now()}`,
        deviceId,
        userId,
        startTime: new Date().toISOString(),
        status: 'active',
        settings: {
          targetDistance: 10,
          targetSize: 0.5,
          analysisMode: 'geometric'
        },
        shotCount: 0
      };
      
      setActiveSession(mockSession);
    } catch (error) {
      setConnectionError('Failed to start session');
    }
  }, []);

  const stopSession = useCallback(async (sessionId: string) => {
    try {
      // Simulate session stop
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (activeSession) {
        setActiveSession({
          ...activeSession,
          status: 'completed',
          endTime: new Date().toISOString()
        });
      }
    } catch (error) {
      setConnectionError('Failed to stop session');
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
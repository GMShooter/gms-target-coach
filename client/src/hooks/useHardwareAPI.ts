import { useState, useEffect, useRef, useCallback } from 'react';
import { HardwareAPI, type HardwareConnection, type ShotDetection, type TargetConfiguration } from '@/services/HardwareAPI';

export interface UseHardwareAPIReturn {
  // Connection state
  connection: HardwareConnection | null;
  isConnected: boolean;
  isConnecting: boolean;
  
  // Session state
  isSessionActive: boolean;
  sessionId: string | null;
  shots: ShotDetection[];
  
  // Configuration
  targetConfig: TargetConfiguration | null;
  streamUrl: string;
  
  // Error state
  error: string | null;
  
  // Functions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  startSession: (sessionId: string) => Promise<void>;
  stopSession: () => Promise<void>;
  updateConfiguration: (config: Partial<TargetConfiguration>) => Promise<void>;
  clearError: () => void;
  clearShots: () => void;
}

export const useHardwareAPI = (): UseHardwareAPIReturn => {
  const [connection, setConnection] = useState<HardwareConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [shots, setShots] = useState<ShotDetection[]>([]);
  const [targetConfig, setTargetConfig] = useState<TargetConfiguration | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const hardwareAPIRef = useRef<HardwareAPI | null>(null);
  
  // Initialize hardware API
  useEffect(() => {
    hardwareAPIRef.current = new HardwareAPI();
    
    // Setup event listeners
    const api = hardwareAPIRef.current;
    
    const handleConnectionChange = (conn: HardwareConnection) => {
      setConnection(conn);
      
      if (conn.status === 'connected') {
        setStreamUrl(conn.streamUrl || '');
        setError(null);
      } else if (conn.status === 'error') {
        setError(conn.error || 'Connection error');
        setStreamUrl('');
      } else if (conn.status === 'disconnected') {
        setStreamUrl('');
        setIsSessionActive(false);
      }
    };
    
    const handleShotDetected = (shot: ShotDetection) => {
      setShots(prev => [...prev, shot]);
    };
    
    api.on('connectionChange', handleConnectionChange);
    api.on('shotDetected', handleShotDetected);
    
    // Cleanup on unmount
    return () => {
      api.off('connectionChange', handleConnectionChange);
      api.off('shotDetected', handleShotDetected);
      api.disconnect();
    };
  }, []);
  
  // Connect to hardware
  const connect = useCallback(async () => {
    if (!hardwareAPIRef.current || isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      await hardwareAPIRef.current.connect();
      
      // Get current configuration
      const config = await hardwareAPIRef.current.getTargetConfiguration();
      setTargetConfig(config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to hardware';
      setError(errorMessage);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);
  
  // Disconnect from hardware
  const disconnect = useCallback(async () => {
    if (!hardwareAPIRef.current) return;
    
    try {
      await hardwareAPIRef.current.disconnect();
      setSessionId(null);
      setIsSessionActive(false);
      setShots([]);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from hardware';
      setError(errorMessage);
      throw err;
    }
  }, []);
  
  // Start shooting session
  const startSession = useCallback(async (newSessionId: string) => {
    if (!hardwareAPIRef.current || !isConnected) {
      throw new Error('Not connected to hardware');
    }
    
    try {
      setError(null);
      await hardwareAPIRef.current.startSession(newSessionId);
      setSessionId(newSessionId);
      setIsSessionActive(true);
      setShots([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      setError(errorMessage);
      throw err;
    }
  }, [isConnected]);
  
  // Stop shooting session
  const stopSession = useCallback(async () => {
    if (!hardwareAPIRef.current) return;
    
    try {
      setError(null);
      await hardwareAPIRef.current.stopSession();
      setIsSessionActive(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop session';
      setError(errorMessage);
      throw err;
    }
  }, []);
  
  // Update target configuration
  const updateConfiguration = useCallback(async (config: Partial<TargetConfiguration>) => {
    if (!hardwareAPIRef.current || !isConnected) {
      throw new Error('Not connected to hardware');
    }
    
    try {
      setError(null);
      const updatedConfig = await hardwareAPIRef.current.setTargetConfiguration(config);
      setTargetConfig(updatedConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
      throw err;
    }
  }, [isConnected]);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Clear shots
  const clearShots = useCallback(() => {
    setShots([]);
  }, []);
  
  return {
    // Connection state
    connection,
    isConnected: connection?.status === 'connected',
    isConnecting,
    
    // Session state
    isSessionActive,
    sessionId,
    shots,
    
    // Configuration
    targetConfig,
    streamUrl,
    
    // Error state
    error,
    
    // Functions
    connect,
    disconnect,
    startSession,
    stopSession,
    updateConfiguration,
    clearError,
    clearShots
  };
};
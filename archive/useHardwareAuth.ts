/**
 * Hardware Authentication Hook
 *
 * This hook provides a simple interface for hardware authentication
 * functionality, including device pairing, token management, and credential storage.
 */

import { useState, useEffect, useCallback } from 'react';

import { hardwareAuth, type HardwareAuthToken, type HardwareCredentials } from '../services/HardwareAuth';
import { hardwareAPI, type PiDevice } from '../services/HardwareAPI';

export interface UseHardwareAuthReturn {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Device management
  connectedDevices: PiDevice[];
  pairedDevices: HardwareCredentials[];
  
  // Authentication methods
  connectDevice: (qrData: string) => Promise<PiDevice>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  generateApiKey: (deviceId: string, permissions?: string[]) => string;
  revokeAccess: (deviceId: string) => void;
  
  // Token management
  getToken: (deviceId: string) => HardwareAuthToken | null;
  refreshToken: (deviceId: string) => Promise<HardwareAuthToken>;
  
  // Cleanup
  cleanup: () => void;
}

export const useHardwareAuth = (): UseHardwareAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<PiDevice[]>([]);
  const [pairedDevices, setPairedDevices] = useState<HardwareCredentials[]>([]);

  // Initialize hardware auth and load stored credentials
  useEffect(() => {
    try {
      // Cleanup expired tokens and challenges
      hardwareAuth.cleanup();
      
      // Load stored credentials (will be called with user ID from HardwareAPI)
      const devices = hardwareAuth.getAuthenticatedDevices('current_user'); // This will be updated by HardwareAPI
      setPairedDevices(devices);
      
      // Get currently connected devices
      const connected = hardwareAPI.getConnectedDevices();
      setConnectedDevices(connected);
      
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize hardware authentication');
      setIsAuthenticated(false);
    }
  }, []);

  // Connect to device via QR code
  const connectDevice = useCallback(async (qrData: string): Promise<PiDevice> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const device = await hardwareAPI.connectViaQRCode(qrData);
      setConnectedDevices(prev => [...prev.filter(d => d.id !== device.id), device]);
      return device;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to device';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect from device
  const disconnectDevice = useCallback(async (deviceId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await hardwareAPI.disconnectDevice(deviceId);
      setConnectedDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from device';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate API key for device
  const generateApiKey = useCallback((deviceId: string, permissions: string[] = ['read', 'write']): string => {
    try {
      // This will use the current user ID from HardwareAPI
      return hardwareAuth.generateApiKey(deviceId, 'current_user', permissions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate API key';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Revoke access to device
  const revokeAccess = useCallback((deviceId: string): void => {
    try {
      hardwareAuth.revokeAccess(deviceId, 'current_user');
      setPairedDevices(prev => prev.filter(d => d.deviceId !== deviceId));
      setConnectedDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke access';
      setError(errorMessage);
    }
  }, []);

  // Get token for device
  const getToken = useCallback((deviceId: string): HardwareAuthToken | null => {
    try {
      return hardwareAuth.getToken(deviceId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get token';
      setError(errorMessage);
      return null;
    }
  }, []);

  // Refresh token for device
  const refreshToken = useCallback(async (deviceId: string): Promise<HardwareAuthToken> => {
    setIsLoading(true);
    setError(null);
    
    try {
      return await hardwareAuth.refreshToken(deviceId, 'current_user');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh token';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cleanup resources
  const cleanup = useCallback((): void => {
    try {
      hardwareAuth.cleanup();
      hardwareAPI.cleanup();
      setIsAuthenticated(false);
      setConnectedDevices([]);
      setPairedDevices([]);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cleanup hardware authentication';
      setError(errorMessage);
    }
  }, []);

  return {
    // Authentication state
    isAuthenticated,
    isLoading,
    error,
    
    // Device management
    connectedDevices,
    pairedDevices,
    
    // Authentication methods
    connectDevice,
    disconnectDevice,
    generateApiKey,
    revokeAccess,
    
    // Token management
    getToken,
    refreshToken,
    
    // Cleanup
    cleanup
  };
};

export default useHardwareAuth;
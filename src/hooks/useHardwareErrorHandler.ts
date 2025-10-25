import { useState, useCallback, useEffect, useRef } from 'react';
import { HardwareAPI, PiDevice } from '../services/HardwareAPI';

export interface HardwareError {
  id: string;
  type: 'connection' | 'device' | 'session' | 'data' | 'permission';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved?: boolean;
  autoRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
  nextRetryTime?: Date;
}

export interface HardwareErrorHandlerOptions {
  enableAutoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  retryBackoffMultiplier?: number;
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  onError?: (error: HardwareError) => void;
  onErrorResolved?: (errorId: string) => void;
}

export const useHardwareErrorHandler = (options: HardwareErrorHandlerOptions = {}) => {
  const {
    enableAutoRetry = true,
    maxRetries = 5,
    retryDelay = 1000,
    retryBackoffMultiplier = 2,
    onConnectionLost,
    onConnectionRestored,
    onError,
    onErrorResolved
  } = options;

  const [errors, setErrors] = useState<HardwareError[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastConnectedTime, setLastConnectedTime] = useState<Date | null>(null);
  const [connectionDowntime, setConnectionDowntime] = useState<number>(0);
  const [connectedDevices, setConnectedDevices] = useState<PiDevice[]>([]);
  
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const downtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hardwareAPIRef = useRef<HardwareAPI | null>(null);

  // Calculate downtime when disconnected
  useEffect(() => {
    if (connectionStatus === 'disconnected' && lastConnectedTime) {
      downtimeIntervalRef.current = setInterval(() => {
        setConnectionDowntime(Date.now() - lastConnectedTime.getTime());
      }, 1000);
    } else {
      if (downtimeIntervalRef.current) {
        clearInterval(downtimeIntervalRef.current);
        downtimeIntervalRef.current = null;
      }
      setConnectionDowntime(0);
    }

    return () => {
      if (downtimeIntervalRef.current) {
        clearInterval(downtimeIntervalRef.current);
      }
    };
  }, [connectionStatus, lastConnectedTime]);

  // Add new error to the list
  const addError = useCallback((error: Omit<HardwareError, 'id' | 'timestamp'>) => {
    const newError: HardwareError = {
      ...error,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: error.autoRetry ? maxRetries : 0
    };

    setErrors(prev => [...prev, newError]);
    onError?.(newError);

    // Auto-retry if enabled
    if (error.autoRetry && enableAutoRetry) {
      scheduleRetry(newError);
    }

    return newError.id;
  }, [enableAutoRetry, maxRetries, onError]);

  // Schedule retry for an error
  const scheduleRetry = useCallback((error: HardwareError) => {
    if (error.retryCount! >= error.maxRetries!) {
      return;
    }

    const delay = retryDelay * Math.pow(retryBackoffMultiplier, error.retryCount!);
    const nextRetryTime = new Date(Date.now() + delay);

    // Update error with next retry time
    setErrors(prev => prev.map(e => 
      e.id === error.id 
        ? { ...e, nextRetryTime }
        : e
    ));

    const timeoutId = setTimeout(() => {
      retryError(error.id);
    }, delay);

    retryTimeoutsRef.current.set(error.id, timeoutId);
  }, [retryDelay, retryBackoffMultiplier]);

  // Retry an error
  const retryError = useCallback((errorId: string) => {
    setErrors(prev => prev.map(error => {
      if (error.id !== errorId) return error;

      const updatedError = {
        ...error,
        retryCount: (error.retryCount || 0) + 1,
        nextRetryTime: undefined
      };

      // Clear the timeout
      const timeoutId = retryTimeoutsRef.current.get(errorId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        retryTimeoutsRef.current.delete(errorId);
      }

      // Attempt to resolve based on error type
      switch (error.type) {
        case 'connection':
          // Try to reconnect by checking device status
          if (hardwareAPIRef.current) {
            const devices = hardwareAPIRef.current.getConnectedDevices();
            if (devices.length > 0) {
              resolveError(errorId);
            } else {
              addError({
                type: 'connection',
                severity: 'high',
                message: `Connection retry ${updatedError.retryCount} failed`,
                autoRetry: updatedError.retryCount! < updatedError.maxRetries!
              });
            }
          }
          break;
        
        case 'device':
          if (hardwareAPIRef.current) {
            const devices = hardwareAPIRef.current.getConnectedDevices();
            if (devices.length > 0) {
              resolveError(errorId);
            } else {
              addError({
                type: 'device',
                severity: 'medium',
                message: `Device still not responding (retry ${updatedError.retryCount})`,
                autoRetry: updatedError.retryCount! < updatedError.maxRetries!
              });
            }
          }
          break;
        
        default:
          // For other error types, just mark as resolved after retry
          if (updatedError.retryCount! >= updatedError.maxRetries!) {
            resolveError(errorId);
          } else {
            scheduleRetry(updatedError);
          }
          break;
      }

      return updatedError;
    }));
  }, [addError, scheduleRetry]);

  // Resolve an error
  const resolveError = useCallback((errorId: string) => {
    setErrors(prev => prev.map(error => 
      error.id === errorId 
        ? { ...error, resolved: true, nextRetryTime: undefined }
        : error
    ));

    // Clear any pending retry
    const timeoutId = retryTimeoutsRef.current.get(errorId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      retryTimeoutsRef.current.delete(errorId);
    }

    onErrorResolved?.(errorId);

    // Remove resolved errors after 5 seconds
    setTimeout(() => {
      setErrors(prev => prev.filter(error => error.id !== errorId));
    }, 5000);
  }, [onErrorResolved]);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    // Clear all pending retries
    retryTimeoutsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    retryTimeoutsRef.current.clear();

    setErrors([]);
  }, []);

  // Handle connection status changes
  const handleConnectionStatusChange = useCallback((devices: PiDevice[]) => {
    const previousStatus = connectionStatus;
    const currentlyConnected = devices.length > 0;
    const newStatus = currentlyConnected ? 'connected' : 'disconnected';
    
    setConnectionStatus(newStatus);
    setConnectedDevices(devices);

    if (newStatus === 'connected' && previousStatus !== 'connected') {
      setLastConnectedTime(new Date());
      setIsReconnecting(false);
      onConnectionRestored?.();
      
      // Resolve all connection-related errors
      setErrors(prev => prev.filter(error => {
        if (error.type === 'connection' && !error.resolved) {
          resolveError(error.id);
          return false;
        }
        return true;
      }));
    } else if (newStatus === 'disconnected' && previousStatus === 'connected') {
      onConnectionLost?.();
      
      addError({
        type: 'connection',
        severity: 'critical',
        message: 'Connection to hardware lost',
        autoRetry: true
      });
    }
  }, [connectionStatus, onConnectionLost, onConnectionRestored, addError, resolveError]);

  // Initialize hardware API and set up event listeners
  const initializeHardwareAPI = useCallback((hardwareAPI: HardwareAPI) => {
    hardwareAPIRef.current = hardwareAPI;

    // Set up event listeners
    hardwareAPI.addEventListener('deviceConnected', (device: PiDevice) => {
      const devices = hardwareAPI.getConnectedDevices();
      handleConnectionStatusChange(devices);
    });
    
    hardwareAPI.addEventListener('deviceDisconnected', (device: PiDevice) => {
      const devices = hardwareAPI.getConnectedDevices();
      handleConnectionStatusChange(devices);
    });
    
    hardwareAPI.addEventListener('error', (error: any) => {
      addError({
        type: 'device',
        severity: 'medium',
        message: error.message || 'Unknown device error',
        autoRetry: false
      });
    });

    // Get initial connection status
    const devices = hardwareAPI.getConnectedDevices();
    handleConnectionStatusChange(devices);
  }, [addError, handleConnectionStatusChange]);

  // Manual retry for all connection errors
  const retryAllConnections = useCallback(() => {
    if (hardwareAPIRef.current) {
      setIsReconnecting(true);
      // Check if any devices are connected
      const devices = hardwareAPIRef.current.getConnectedDevices();
      if (devices.length > 0) {
        setIsReconnecting(false);
        clearAllErrors();
        handleConnectionStatusChange(devices);
      } else {
        // Simulate reconnection attempt
        setTimeout(() => {
          setIsReconnecting(false);
          addError({
            type: 'connection',
            severity: 'high',
            message: 'No devices available for reconnection',
            autoRetry: false
          });
        }, 2000);
      }
    }
  }, [clearAllErrors, handleConnectionStatusChange, addError]);

  // Get error statistics
  const getErrorStats = useCallback(() => {
    const unresolved = errors.filter(e => !e.resolved);
    const byType = unresolved.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bySeverity = unresolved.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: errors.length,
      unresolved: unresolved.length,
      resolved: errors.length - unresolved.length,
      byType,
      bySeverity,
      isReconnecting,
      connectionDowntime
    };
  }, [errors, isReconnecting, connectionDowntime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all pending retries
      retryTimeoutsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      
      if (downtimeIntervalRef.current) {
        clearInterval(downtimeIntervalRef.current);
      }
    };
  }, []);

  return {
    errors,
    connectionStatus,
    isReconnecting,
    lastConnectedTime,
    connectionDowntime,
    addError,
    resolveError,
    clearAllErrors,
    retryError,
    retryAllConnections,
    initializeHardwareAPI,
    getErrorStats
  };
};
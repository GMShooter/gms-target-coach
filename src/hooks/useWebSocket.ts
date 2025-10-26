import { useState, useEffect, useCallback, useRef } from 'react';

import { hardwareAPI } from '../services/HardwareAPI';

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: any;
  reconnectAttempts: number;
}

export interface WebSocketActions {
  connect: (deviceId: string, sessionId: string) => void;
  disconnect: (deviceId: string) => void;
  sendMessage: (deviceId: string, message: any) => void;
  reconnect: (deviceId: string) => void;
  clearError: () => void;
}

export const useWebSocket = (): WebSocketState & WebSocketActions => {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastMessage: null,
    reconnectAttempts: 0
  });

  const reconnectTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const maxReconnectAttempts = 5;
  const reconnectDelay = 5000; // 5 seconds

  // Update state helper
  const updateState = useCallback((updates: Partial<WebSocketState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Connect to WebSocket
  const connect = useCallback((deviceId: string, sessionId: string) => {
    updateState({ connecting: true, error: null });

    try {
      // Get device info
      const device = hardwareAPI.getDevice(deviceId);
      if (!device) {
        updateState({ 
          connecting: false, 
          error: 'Device not found' 
        });
        return;
      }

      // Determine WebSocket URL
      const wsUrl = device.ngrokUrl 
        ? device.ngrokUrl.replace('http', 'ws')
        : device.url.replace('http', 'ws');

      // Create WebSocket connection
      const ws = new WebSocket(`${wsUrl}/ws/${sessionId}`);

      // Set up event handlers
      ws.onopen = () => {
        console.log(`WebSocket connected to device ${deviceId}`);
        updateState({ 
          connected: true, 
          connecting: false, 
          error: null,
          reconnectAttempts: 0 
        });

        // Clear any existing reconnect timeout
        const timeout = reconnectTimeouts.current.get(deviceId);
        if (timeout) {
          clearTimeout(timeout);
          reconnectTimeouts.current.delete(deviceId);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          updateState({ lastMessage: data });
          
          // Handle different message types
          switch (data.type) {
            case 'frame_update':
              console.log('Frame update received:', data.payload);
              break;
            case 'shot_detected':
              console.log('Shot detected:', data.payload);
              break;
            case 'session_status':
              console.log('Session status update:', data.payload);
              break;
            case 'device_status':
              console.log('Device status update:', data.payload);
              break;
            case 'error':
              console.error('Hardware error:', data.payload);
              updateState({ error: data.payload.error || 'Hardware error occurred' });
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          updateState({ error: 'Failed to parse message' });
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for device ${deviceId}:`, error);
        updateState({ 
          connected: false, 
          connecting: false, 
          error: `WebSocket error: ${error}` 
        });
      };

      ws.onclose = (event) => {
        console.log(`WebSocket disconnected from device ${deviceId}, code: ${event.code}, reason: ${event.reason}`);
        updateState({ 
          connected: false, 
          connecting: false 
        });

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000) {
          const currentAttempts = state.reconnectAttempts + 1;
          updateState({ reconnectAttempts: currentAttempts });

          if (currentAttempts < maxReconnectAttempts) {
            console.log(`Attempting to reconnect WebSocket for device ${deviceId} (attempt ${currentAttempts + 1}/${maxReconnectAttempts})...`);
            
            const timeout = setTimeout(() => {
              connect(deviceId, sessionId);
            }, reconnectDelay);
            
            reconnectTimeouts.current.set(deviceId, timeout);
          } else {
            console.error(`Max reconnection attempts reached for device ${deviceId}`);
            updateState({ 
              error: 'Connection failed - max reconnection attempts reached' 
            });
          }
        }
      };

      // Store connection in hardware API
      (hardwareAPI as any).wsConnections.set(deviceId, ws);
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      updateState({ 
        connecting: false, 
        error: error instanceof Error ? error.message : 'Failed to connect' 
      });
    }
  }, [state.reconnectAttempts, updateState]);

  // Disconnect from WebSocket
  const disconnect = useCallback((deviceId: string) => {
    // Clear any reconnect timeout
    const timeout = reconnectTimeouts.current.get(deviceId);
    if (timeout) {
      clearTimeout(timeout);
      reconnectTimeouts.current.delete(deviceId);
    }

    // Close WebSocket connection
    hardwareAPI.closeWebSocketConnection(deviceId);
    
    updateState({ 
      connected: false, 
      connecting: false, 
      error: null,
      reconnectAttempts: 0 
    });
  }, [updateState]);

  // Send message through WebSocket
  const sendMessage = useCallback((deviceId: string, message: any) => {
    try {
      hardwareAPI.sendWebSocketMessage(deviceId, message);
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      });
    }
  }, [updateState]);

  // Manually reconnect
  const reconnect = useCallback((deviceId: string) => {
    updateState({ reconnectAttempts: 0, error: null });
    
    // Get current session to reconnect
    const sessions = hardwareAPI.getActiveSessions();
    const session = sessions.find(s => s.deviceId === deviceId);
    
    if (session) {
      connect(deviceId, session.sessionId);
    } else {
      updateState({ error: 'No active session found for device' });
    }
  }, [connect, updateState]);

  // Set up event listeners for hardware API events
  useEffect(() => {
    const handleWebSocketConnected = ({ deviceId }: { deviceId: string }) => {
      console.log(`WebSocket connected event received for device ${deviceId}`);
      updateState({ 
        connected: true, 
        connecting: false, 
        error: null 
      });
    };

    const handleWebSocketDisconnected = ({ deviceId, code, reason }: { 
      deviceId: string; 
      code: number; 
      reason: string 
    }) => {
      console.log(`WebSocket disconnected event received for device ${deviceId}, code: ${code}, reason: ${reason}`);
      updateState({ 
        connected: false, 
        connecting: false 
      });

      // Clear reconnect timeout for this device
      const timeout = reconnectTimeouts.current.get(deviceId);
      if (timeout) {
        clearTimeout(timeout);
        reconnectTimeouts.current.delete(deviceId);
      }
    };

    const handleError = (error: any) => {
      console.error('Hardware API error:', error);
      
      if (error.type === 'websocket_error' || error.type === 'hardware_error') {
        updateState({ error: error.error || 'WebSocket error occurred' });
      }
    };

    // Register event listeners
    hardwareAPI.addEventListener('websocketConnected', handleWebSocketConnected);
    hardwareAPI.addEventListener('websocketDisconnected', handleWebSocketDisconnected);
    hardwareAPI.addEventListener('error', handleError);

    // Cleanup
    return () => {
      hardwareAPI.removeEventListener('websocketConnected', handleWebSocketConnected);
      hardwareAPI.removeEventListener('websocketDisconnected', handleWebSocketDisconnected);
      hardwareAPI.removeEventListener('error', handleError);
      
      // Clear all reconnect timeouts
      reconnectTimeouts.current.forEach(timeout => clearTimeout(timeout));
      reconnectTimeouts.current.clear();
    };
  }, [updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reconnectTimeouts.current.forEach(timeout => clearTimeout(timeout));
      reconnectTimeouts.current.clear();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    reconnect,
    clearError
  };
};
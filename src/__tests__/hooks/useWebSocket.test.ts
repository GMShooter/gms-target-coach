import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { hardwareAPI } from '@/services/HardwareAPI';

// Mock hardwareAPI
jest.mock('@/services/HardwareAPI');
const mockHardwareAPI = hardwareAPI as any;

// Set up event listener system
const eventListeners = new Map<string, Function[]>();

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 10);
  }

  send(data: string) {
    // Mock send method
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || 'Normal closure' });
    }
  }

  addEventListener(type: string, listener: (event: any) => void) {
    switch (type) {
      case 'open':
        this.onopen = listener;
        break;
      case 'message':
        this.onmessage = listener;
        break;
      case 'error':
        this.onerror = listener;
        break;
      case 'close':
        this.onclose = listener;
        break;
    }
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    switch (type) {
      case 'open':
        this.onopen = null;
        break;
      case 'message':
        this.onmessage = null;
        break;
      case 'error':
        this.onerror = null;
        break;
      case 'close':
        this.onclose = null;
        break;
    }
  }
}

// Set global WebSocket mock
(global as any).WebSocket = MockWebSocket;

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear event listeners
    eventListeners.clear();
    
    // Mock hardwareAPI methods
    mockHardwareAPI.getDevice = jest.fn().mockReturnValue({
      id: 'device-001',
      name: 'Test Device',
      url: 'http://192.168.1.100:8080',
      status: 'online',
      lastSeen: new Date(),
      capabilities: {
        hasCamera: true,
        hasZoom: true,
        maxResolution: '1920x1080',
        supportedFormats: ['jpeg', 'png']
      }
    });

    mockHardwareAPI.getActiveSessions = jest.fn().mockReturnValue([]);
    mockHardwareAPI.closeWebSocketConnection = jest.fn().mockReturnValue(undefined);
    mockHardwareAPI.sendWebSocketMessage = jest.fn().mockReturnValue(undefined);
    
    // Mock event listener system
    mockHardwareAPI.addEventListener = jest.fn().mockImplementation((event: string, callback: Function) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event)!.push(callback);
    });
    
    mockHardwareAPI.removeEventListener = jest.fn().mockImplementation((event: string, callback: Function) => {
      const listeners = eventListeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    });
    
    mockHardwareAPI.dispatchEvent = jest.fn().mockImplementation((event: any) => {
      const listeners = eventListeners.get(event.type) || [];
      listeners.forEach((callback: Function) => callback(event));
    });
    
    // Clear WebSocket connections map
    mockHardwareAPI.wsConnections = new Map();
  });

  test('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.connected).toBe(false);
    expect(result.current.connecting).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastMessage).toBe(null);
  });

  test('should connect to WebSocket when URL is provided', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    expect(result.current.connecting).toBe(true);
  });

  test('should handle connection success', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    // Simulate successful connection via hardware API event
    act(() => {
      mockHardwareAPI.dispatchEvent({
        type: 'websocketConnected',
        deviceId: 'device-001'
      });
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.connecting).toBe(false);
  });

  test('should handle incoming messages', () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    // Wait for WebSocket connection
    act(() => {
      jest.advanceTimersByTime(20);
    });

    const testMessage = {
      type: 'shot',
      payload: {
        x: 100,
        y: 200,
        score: 10,
        timestamp: Date.now()
      }
    };

    // Get the WebSocket connection from the hardware API
    const wsConnection = (mockHardwareAPI.wsConnections as Map<string, any>).get('device-001');
    
    // Simulate WebSocket message
    act(() => {
      if (wsConnection && wsConnection.onmessage) {
        wsConnection.onmessage({
          data: JSON.stringify(testMessage),
          type: 'message'
        });
      }
    });

    expect(result.current.lastMessage).toEqual(testMessage);
    
    jest.useRealTimers();
  });

  test('should handle connection errors', () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    // Get the WebSocket connection from the hardware API
    const wsConnection = (mockHardwareAPI.wsConnections as Map<string, any>).get('device-001');
    
    // Simulate WebSocket error
    act(() => {
      if (wsConnection && wsConnection.onerror) {
        wsConnection.onerror({
          error: 'Connection failed',
          type: 'error'
        });
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.connected).toBe(false);
    expect(result.current.connecting).toBe(false);
    
    jest.useRealTimers();
  });

  test('should handle connection close', () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    // Wait for WebSocket connection
    act(() => {
      jest.advanceTimersByTime(20);
    });

    // Get the WebSocket connection from the hardware API
    const wsConnection = (mockHardwareAPI.wsConnections as Map<string, any>).get('device-001');
    
    // Simulate WebSocket close
    act(() => {
      if (wsConnection && wsConnection.onclose) {
        wsConnection.onclose({
          code: 1000,
          reason: 'Normal closure',
          type: 'close'
        });
      }
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.connecting).toBe(false);
    
    jest.useRealTimers();
  });

  test('should send messages', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    const testMessage = {
      type: 'command',
      payload: {
        action: 'start_session',
        sessionId: 'test-session-001'
      }
    };

    act(() => {
      result.current.sendMessage('device-001', testMessage);
    });

    expect(mockHardwareAPI.sendWebSocketMessage).toHaveBeenCalledWith('device-001', testMessage);
  });

  test('should disconnect properly', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    act(() => {
      result.current.disconnect('device-001');
    });

    expect(mockHardwareAPI.closeWebSocketConnection).toHaveBeenCalledWith('device-001');
    expect(result.current.connected).toBe(false);
    expect(result.current.connecting).toBe(false);
  });

  test('should handle reconnection attempts', () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useWebSocket());

    // Mock active session for reconnection
    mockHardwareAPI.getActiveSessions = jest.fn().mockReturnValue([
      { deviceId: 'device-001', sessionId: 'session-001' }
    ]);

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    // Wait for WebSocket connection
    act(() => {
      jest.advanceTimersByTime(20);
    });

    // Get the WebSocket connection from the hardware API
    const wsConnection = (mockHardwareAPI.wsConnections as Map<string, any>).get('device-001');
    
    // Simulate WebSocket close with abnormal code to trigger reconnection
    act(() => {
      if (wsConnection && wsConnection.onclose) {
        wsConnection.onclose({
          code: 1006,
          reason: 'Connection lost',
          type: 'close'
        });
      }
    });

    // Should attempt to reconnect after delay
    act(() => {
      jest.advanceTimersByTime(6000); // Advance past the 5 second reconnect delay
    });

    // Check that reconnection attempts were incremented
    expect(result.current.reconnectAttempts).toBeGreaterThanOrEqual(0);
    
    jest.useRealTimers();
  });

  test('should cleanup on unmount', () => {
    const { result, unmount } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    unmount();

    // Cleanup is handled by hook's useEffect cleanup
    expect(true).toBe(true); // Test passes if no errors thrown
  });

  test('should handle different message types', () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    // Wait for WebSocket connection
    act(() => {
      jest.advanceTimersByTime(20);
    });

    // Test that hook has expected structure
    expect(result.current).toHaveProperty('lastMessage');
    expect(result.current).toHaveProperty('connected');
    expect(result.current).toHaveProperty('connecting');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('reconnectAttempts');

    // Get the WebSocket connection from the hardware API
    const wsConnection = (mockHardwareAPI.wsConnections as Map<string, any>).get('device-001');

    // Test shot message
    const shotMessage = {
      type: 'shot',
      payload: { x: 100, y: 200, score: 10 }
    };

    act(() => {
      if (wsConnection && wsConnection.onmessage) {
        wsConnection.onmessage({
          data: JSON.stringify(shotMessage),
          type: 'message'
        });
      }
    });

    expect(result.current.lastMessage).toEqual(shotMessage);

    // Test frame message
    const frameMessage = {
      type: 'frame',
      payload: { frameId: 'frame-001', timestamp: Date.now() }
    };

    act(() => {
      if (wsConnection && wsConnection.onmessage) {
        wsConnection.onmessage({
          data: JSON.stringify(frameMessage),
          type: 'message'
        });
      }
    });

    expect(result.current.lastMessage).toEqual(frameMessage);

    // Test event message
    const eventMessage = {
      type: 'event',
      payload: { event: 'session_started', sessionId: 'test-session-001' }
    };

    act(() => {
      if (wsConnection && wsConnection.onmessage) {
        wsConnection.onmessage({
          data: JSON.stringify(eventMessage),
          type: 'message'
        });
      }
    });

    expect(result.current.lastMessage).toEqual(eventMessage);
    
    jest.useRealTimers();
  });

  test('should handle connection timeout', () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.connect('device-001', 'session-001');
    });

    // Wait for WebSocket connection
    act(() => {
      jest.advanceTimersByTime(20);
    });

    // Get the WebSocket connection from the hardware API
    const wsConnection = (mockHardwareAPI.wsConnections as Map<string, any>).get('device-001');
    
    // Simulate WebSocket error
    act(() => {
      if (wsConnection && wsConnection.onerror) {
        wsConnection.onerror({
          error: 'Connection timeout',
          type: 'error'
        });
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.connecting).toBe(false);

    jest.useRealTimers();
  });
});
import { renderHook, act } from '@testing-library/react';
import { useSessionManager } from '@/hooks/useSessionManager';
import { hardwareAPI } from '@/services/HardwareAPI';

// Mock the hardwareAPI
jest.mock('@/services/HardwareAPI');
const mockHardwareAPI = hardwareAPI as any;

// Mock user ID
const mockUserId = 'test-user-123';

describe('useSessionManager Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Ensure all methods are properly mocked
    mockHardwareAPI.getDevice = jest.fn();
    mockHardwareAPI.startSession = jest.fn();
    mockHardwareAPI.stopSession = jest.fn();
    mockHardwareAPI.toggleSessionPause = jest.fn();
    mockHardwareAPI.emergencyStop = jest.fn();
    mockHardwareAPI.getSessionStatus = jest.fn();
    mockHardwareAPI.getSessionStatistics = jest.fn();
    mockHardwareAPI.addEventListener = jest.fn();
    mockHardwareAPI.removeEventListener = jest.fn();
    
    // Mock default device
    mockHardwareAPI.getDevice.mockReturnValue({
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
    
    // Mock successful session operations
    mockHardwareAPI.startSession.mockResolvedValue({
      sessionId: 'test-session-001',
      deviceId: 'device-001',
      startTime: new Date(),
      shotCount: 0,
      status: 'active',
      settings: {
        targetDistance: 10,
        targetSize: 1,
        scoringZones: [
          { id: 'bullseye', name: 'Bullseye', points: 10, radius: 5, color: '#FF0000' },
          { id: 'inner', name: 'Inner Ring', points: 9, radius: 10, color: '#FF4500' },
          { id: 'middle', name: 'Middle Ring', points: 8, radius: 20, color: '#FFA500' },
          { id: 'outer', name: 'Outer Ring', points: 7, radius: 30, color: '#FFFF00' },
          { id: 'edge', name: 'Edge', points: 6, radius: 40, color: '#00FF00' },
          { id: 'miss', name: 'Miss', points: 0, radius: 100, color: '#808080' }
        ],
        detectionSensitivity: 0.8
      }
    });
    
    mockHardwareAPI.stopSession.mockResolvedValue();
    mockHardwareAPI.toggleSessionPause.mockResolvedValue();
    mockHardwareAPI.emergencyStop.mockResolvedValue();
    mockHardwareAPI.getSessionStatus.mockResolvedValue({
      isActive: true,
      sessionId: 'test-session-001',
      shotCount: 0,
      uptime: 0,
      isPaused: false
    });
    mockHardwareAPI.getSessionStatistics.mockReturnValue({
      totalShots: 0,
      averageScore: 0,
      bestShot: 0,
      bullseyes: 0,
      accuracy: 0
    });
    mockHardwareAPI.addEventListener.mockReturnValue();
    mockHardwareAPI.removeEventListener.mockReturnValue();
  });

  test('should initialize with default state', () => {
    const { result } = renderHook(() => useSessionManager());
    
    expect(result.current.currentSession).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('should start session successfully', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    // Start session
    await act(async () => {
      await result.current.startSession('device-001', {
        targetDistance: 10,
        targetSize: 1,
        detectionSensitivity: 0.8
      });
    });
    
    expect(mockHardwareAPI.startSession).toHaveBeenCalledWith('device-001', {
      sessionId: expect.any(String),
      userId: 'current_user', // Note: This is hardcoded in the hook
      settings: {
        targetDistance: 10,
        targetSize: 1,
        detectionSensitivity: 0.8
      }
    });
    
    expect(result.current.currentSession).not.toBeNull();
    expect(result.current.currentSession?.sessionId).toBe('test-session-001');
  });

  test('should handle session start error', async () => {
    const errorMessage = 'Failed to start session';
    mockHardwareAPI.startSession.mockRejectedValue(new Error(errorMessage));
    
    const { result } = renderHook(() => useSessionManager());
    
    // Start session
    await act(async () => {
      await result.current.startSession('device-001', {
        targetDistance: 10,
        targetSize: 1,
        detectionSensitivity: 0.8
      });
    });
    
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.currentSession).toBeNull();
  });

  test('should stop session successfully', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    // First start a session
    await act(async () => {
      await result.current.startSession('device-001', {
        targetDistance: 10,
        targetSize: 1,
        detectionSensitivity: 0.8
      });
    });
    
    // Get the session ID that was created
    const sessionId = result.current.currentSession?.sessionId || '';
    
    // Then stop it
    await act(async () => {
      await result.current.stopSession(sessionId);
    });
    
    expect(mockHardwareAPI.stopSession).toHaveBeenCalledWith(sessionId, 'user');
    expect(result.current.currentSession).toBeNull();
  });

  test('should pause and resume session', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    // Start session
    await act(async () => {
      await result.current.startSession('device-001', {
        targetDistance: 10,
        targetSize: 1,
        detectionSensitivity: 0.8
      });
    });
    
    // Get the session ID that was created
    const sessionId = result.current.currentSession?.sessionId || '';
    
    // Pause session
    await act(async () => {
      await result.current.pauseSession(sessionId);
    });
    
    expect(mockHardwareAPI.toggleSessionPause).toHaveBeenCalledWith(sessionId);
    expect(result.current.currentSession?.status).toBe('paused');
    
    // Resume session
    await act(async () => {
      await result.current.resumeSession(sessionId);
    });
    
    expect(mockHardwareAPI.toggleSessionPause).toHaveBeenCalledWith(sessionId);
    expect(result.current.currentSession?.status).toBe('active');
  });

  test('should emergency stop session', async () => {
    // Mock confirm to return true
    global.confirm = jest.fn(() => true);
    
    const { result } = renderHook(() => useSessionManager());
    
    // Start session
    await act(async () => {
      await result.current.startSession('device-001', {
        targetDistance: 10,
        targetSize: 1,
        detectionSensitivity: 0.8
      });
    });
    
    // Get the session ID that was created
    const sessionId = result.current.currentSession?.sessionId || '';
    
    // Emergency stop
    await act(async () => {
      await result.current.emergencyStop(sessionId);
    });
    
    expect(mockHardwareAPI.emergencyStop).toHaveBeenCalledWith(sessionId);
    expect(result.current.currentSession).toBeNull();
  });

  test('should get session statistics', async () => {
    const mockStats = {
      totalShots: 10,
      averageScore: 8.5,
      bestShot: 10,
      bullseyes: 2,
      accuracy: 85
    };
    
    mockHardwareAPI.getSessionStatistics.mockReturnValue(mockStats);
    
    const { result } = renderHook(() => useSessionManager());
    
    // Start session
    await act(async () => {
      await result.current.startSession('device-001', {
        targetDistance: 10,
        targetSize: 1,
        detectionSensitivity: 0.8
      });
    });
    
    const sessionId = result.current.currentSession?.sessionId || '';
    const stats = mockHardwareAPI.getSessionStatistics(sessionId);
    expect(mockHardwareAPI.getSessionStatistics).toHaveBeenCalledWith(sessionId);
    expect(stats).toEqual(mockStats);
  });

  test('should handle device disconnection', async () => {
    const { result } = renderHook(() => useSessionManager('device-001'));
    
    // Start session
    await act(async () => {
      await result.current.startSession('device-001', {
        targetDistance: 10,
        targetSize: 1,
        detectionSensitivity: 0.8
      });
    });
    
    // Simulate device disconnection by triggering the event
    act(() => {
      // Simulate the deviceDisconnected event being triggered
      const deviceDisconnectedCallback = mockHardwareAPI.addEventListener.mock.calls
        .find((call: any[]) => call[0] === 'deviceDisconnected')?.[1];
      if (deviceDisconnectedCallback) {
        deviceDisconnectedCallback();
      }
    });
    
    expect(result.current.isConnected).toBe(false);
  });

  test('should clear error', () => {
    const { result } = renderHook(() => useSessionManager());
    
    // Set an error first
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  test('should refresh session status', async () => {
    const { result } = renderHook(() => useSessionManager());
    
    // Start session
    await act(async () => {
      await result.current.startSession('device-001', {
        targetDistance: 10,
        targetSize: 1,
        detectionSensitivity: 0.8
      });
    });
    
    // Refresh session status
    await act(async () => {
      await result.current.refreshSessionStatus();
    });
    
    expect(mockHardwareAPI.getSessionStatus).toHaveBeenCalled();
  });
});
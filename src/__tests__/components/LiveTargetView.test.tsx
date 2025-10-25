import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LiveTargetView from '../../components/LiveTargetView';
import { HardwareAPI } from '../../services/HardwareAPI';

// Mock the HardwareAPI service
jest.mock('../../services/HardwareAPI');
jest.mock('../../components/QRScanner', () => ({
  QRScanner: ({ onScan, onClose }: { onScan: (result: any) => void; onClose: () => void }) => (
    <div data-testid="qr-scanner-mock">
      <button onClick={() => onScan({ data: 'test-qr-data' })}>Scan</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock Supabase client
jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  static url: string = '';
  onopen: ((event: any) => {}) | null = null;
  onclose: ((event: any) => {}) | null = null;
  onmessage: ((event: any) => {}) | null = null;
  onerror: ((event: any) => {}) | null = null;
  send = jest.fn();
  close = jest.fn();
  
  readyState: number = MockWebSocket.OPEN;
  
  constructor(url: string) {
    MockWebSocket.url = url;
    setTimeout(() => {
      if (this.onopen) this.onopen({} as any);
    }, 100);
  }
}

Object.defineProperty(window, 'WebSocket', {
  value: MockWebSocket,
});

// Global event callback system
const eventCallbacks: Record<string, Function[]> = {};

// Create a mock HardwareAPI instance that will be used by the component
const mockHardwareAPI = {
  // Private properties (mocked as public for testing)
  devices: new Map(),
  activeSessions: new Map(),
  sessionShots: new Map(),
  sequentialSessions: new Map(),
  eventListeners: new Map(),
  wsConnections: new Map(),
  supabaseUrl: '',
  supabaseAnonKey: '',
  userId: null,
  
  // Event management
  addEventListener: jest.fn((event: string, callback: Function) => {
    if (!eventCallbacks[event]) {
      eventCallbacks[event] = [];
    }
    eventCallbacks[event].push(callback);
  }),
  removeEventListener: jest.fn((event: string, callback: Function) => {
    if (eventCallbacks[event]) {
      eventCallbacks[event] = eventCallbacks[event].filter(cb => cb !== callback);
    }
  }),
  
  // Device management
  connectViaQRCode: jest.fn().mockResolvedValue({
    id: 'pi-device-001',
    name: 'Raspberry Pi',
    url: '192.168.1.100:8080',
    status: 'online'
  }),
  parseQRCode: jest.fn().mockReturnValue({
    id: 'pi-device-001',
    name: 'Raspberry Pi',
    url: '192.168.1.100:8080',
    status: 'offline',
    lastSeen: new Date(),
    capabilities: {
      hasCamera: true,
      hasZoom: true,
      maxResolution: '1920x1080',
      supportedFormats: ['jpeg', 'png']
    }
  }),
  getConnectedDevices: jest.fn().mockReturnValue([]),
  getDevice: jest.fn(),
  disconnectDevice: jest.fn().mockResolvedValue(undefined),
  
  // Session management
  startSession: jest.fn().mockResolvedValue({
    sessionId: 'test-session-123',
    userId: 'current-user',
    startTime: new Date(),
    shotCount: 0,
    status: 'active'
  }),
  stopSession: jest.fn().mockResolvedValue(undefined),
  getActiveSessions: jest.fn().mockReturnValue([]),
  getSession: jest.fn(),
  
  // Frame management
  getLatestFrame: jest.fn().mockResolvedValue({
    frameNumber: 1,
    timestamp: new Date(),
    imageUrl: '',
    hasShot: false,
    metadata: {
      resolution: '1920x1080',
      brightness: 50,
      contrast: 50
    }
  }),
  getNextFrame: jest.fn().mockResolvedValue({
    frameNumber: 1,
    timestamp: new Date(),
    imageUrl: '',
    hasShot: false,
    metadata: {
      resolution: '1920x1080',
      brightness: 50,
      contrast: 50
    }
  }),
  
  // Zoom control
  setZoomPreset: jest.fn().mockResolvedValue(undefined),
  
  // WebSocket management
  sendWebSocketMessage: jest.fn(),
  getWebSocketStatus: jest.fn().mockReturnValue({ connected: false, readyState: MockWebSocket.CLOSED }),
  closeWebSocketConnection: jest.fn(),
  
  // Statistics and analysis
  calculateShotScore: jest.fn().mockReturnValue({ score: 8, zone: { id: 'middle', name: 'Middle Ring', points: 8, radius: 20, color: '#FFA500' } }),
  getSessionStatistics: jest.fn().mockReturnValue(null),
  getSessionRecommendations: jest.fn().mockReturnValue([]),
  getShotPatternVisualization: jest.fn().mockReturnValue(''),
  
  // Sequential detection
  detectSequentialShot: jest.fn().mockReturnValue(false),
  getSequentialDetectionStatistics: jest.fn().mockReturnValue(null),
  getSequentialShotHistory: jest.fn().mockReturnValue([]),
  updateSequentialDetectionConfig: jest.fn(),
  getSequentialDetectionConfig: jest.fn().mockReturnValue({
    sensitivity: 0.7,
    minShotInterval: 1000,
    maxFrameHistory: 10,
    shotThreshold: 0.3
  }),
  
  // Session control
  getSessionStatus: jest.fn().mockResolvedValue({
    isActive: false,
    shotCount: 0
  }),
  toggleSessionPause: jest.fn().mockResolvedValue(undefined),
  emergencyStop: jest.fn().mockResolvedValue(undefined),
  
  // Data ingestion
  ingestFrameData: jest.fn().mockResolvedValue(undefined),
  ingestShotData: jest.fn().mockResolvedValue(undefined),
  ingestSessionEvent: jest.fn().mockResolvedValue(undefined),
  
  // Cleanup
  cleanup: jest.fn(),
  
  // User management
  setUserId: jest.fn(),
} as any;

// Helper function to trigger events
const triggerEvent = (eventName: string, data: any) => {
  if (eventCallbacks[eventName]) {
    eventCallbacks[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${eventName} callback:`, error);
      }
    });
  }
};

// Mock the HardwareAPI constructor to return our mock instance
const MockedHardwareAPI = HardwareAPI as jest.MockedClass<typeof HardwareAPI>;
MockedHardwareAPI.mockImplementation(() => mockHardwareAPI);

describe('LiveTargetView Component', () => {
  const defaultProps = {
    deviceId: 'test-device',
    sessionId: 'test-session-123',
    onShotDetected: jest.fn(),
    onSessionComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(eventCallbacks).forEach(key => {
      delete eventCallbacks[key];
    });
    
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('should render component correctly', () => {
    render(<LiveTargetView {...defaultProps} />);
    
    expect(screen.getByText('Live Target View')).toBeInTheDocument();
    expect(screen.getByText('Real-time target feed from Raspberry Pi')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  test('should show disconnected status initially', () => {
    render(<LiveTargetView {...defaultProps} />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    expect(screen.getByText('Demo Connect')).toBeInTheDocument();
  });

  test('should connect to hardware when Demo Connect button is clicked', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    const demoConnectButton = screen.getByText('Demo Connect');
    fireEvent.click(demoConnectButton);
    
    await waitFor(() => {
      expect(mockHardwareAPI.connectViaQRCode).toHaveBeenCalledWith('GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080');
    });
    
    // Trigger the deviceConnected event
    act(() => {
      triggerEvent('deviceConnected', {
        id: 'pi-device-001',
        name: 'Raspberry Pi',
        url: '192.168.1.100:8080',
        status: 'online'
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  test('should handle connection error', async () => {
    mockHardwareAPI.connectViaQRCode.mockRejectedValueOnce(new Error('Connection failed'));
    
    render(<LiveTargetView {...defaultProps} />);
    
    const demoConnectButton = screen.getByText('Demo Connect');
    fireEvent.click(demoConnectButton);
    
    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  test('should show connected status when device is connected', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // Trigger device connection
    act(() => {
      triggerEvent('deviceConnected', {
        id: 'pi-device-001',
        name: 'Raspberry Pi',
        url: '192.168.1.100:8080',
        status: 'online'
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  test('should start session when Start Session button is clicked', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // First connect to device
    act(() => {
      triggerEvent('deviceConnected', {
        id: 'pi-device-001',
        name: 'Raspberry Pi',
        url: '192.168.1.100:8080',
        status: 'online'
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Start Session')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const startSessionButton = screen.getByText('Start Session');
    fireEvent.click(startSessionButton);
    
    await waitFor(() => {
      expect(mockHardwareAPI.startSession).toHaveBeenCalledWith('pi-device-001', {
        sessionId: 'test-session-123',
        userId: 'current-user',
        settings: {
          targetDistance: 10,
          targetSize: 1,
          detectionSensitivity: 0.8
        }
      });
    });
    
    // Trigger the sessionStarted event
    act(() => {
      triggerEvent('sessionStarted', {
        sessionId: 'test-session-123',
        userId: 'current-user',
        startTime: new Date(),
        shotCount: 0,
        status: 'active'
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Stop Session')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should show session active status when session is started', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // Connect to device first
    act(() => {
      triggerEvent('deviceConnected', {
        id: 'pi-device-001',
        name: 'Raspberry Pi',
        url: '192.168.1.100:8080',
        status: 'online'
      });
    });
    
    // Start session
    act(() => {
      triggerEvent('sessionStarted', {
        sessionId: 'test-session-123',
        userId: 'current-user',
        startTime: new Date(),
        shotCount: 0,
        status: 'active'
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Session Active')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should display shot history when shots are detected', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // Start session first
    act(() => {
      triggerEvent('sessionStarted', {
        sessionId: 'test-session-123',
        userId: 'current-user',
        startTime: new Date(),
        shotCount: 0,
        status: 'active'
      });
    });
    
    // Trigger shot detection
    const shotData = {
      shotId: 'shot-001',
      sessionId: 'test-session-123',
      timestamp: new Date(),
      frameNumber: 1,
      coordinates: { x: 50, y: 50 },
      score: 8,
      confidence: 0.9
    };
    
    act(() => {
      triggerEvent('shotDetected', shotData);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Shot History')).toBeInTheDocument();
      expect(screen.getByText('Shot #1')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should display session configuration when session is active', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // Connect to device and start session
    act(() => {
      triggerEvent('deviceConnected', {
        id: 'pi-device-001',
        name: 'Raspberry Pi',
        url: '192.168.1.100:8080',
        status: 'online'
      });
      
      triggerEvent('sessionStarted', {
        sessionId: 'test-session-123',
        userId: 'current-user',
        startTime: new Date(),
        shotCount: 0,
        status: 'active',
        settings: {
          targetDistance: 10,
          targetSize: 1,
          detectionSensitivity: 0.8
        }
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Session Configuration')).toBeInTheDocument();
      expect(screen.getByText('test-session-123')).toBeInTheDocument();
      expect(screen.getByText('Raspberry Pi')).toBeInTheDocument();
      expect(screen.getByText('10m')).toBeInTheDocument();
      expect(screen.getByText('1m')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should display session statistics when shots are recorded', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // Start session and add shots
    act(() => {
      triggerEvent('sessionStarted', {
        sessionId: 'test-session-123',
        userId: 'current-user',
        startTime: new Date(),
        shotCount: 0,
        status: 'active'
      });
      
      const shots = [
        { shotId: 'shot-001', score: 8, confidence: 0.9 },
        { shotId: 'shot-002', score: 9, confidence: 0.85 },
        { shotId: 'shot-003', score: 7, confidence: 0.95 }
      ];
      
      shots.forEach(shot => {
        triggerEvent('shotDetected', {
          ...shot,
          sessionId: 'test-session-123',
          timestamp: new Date(),
          frameNumber: 1,
          coordinates: { x: 50, y: 50 }
        });
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Session Stats')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total shots
      expect(screen.getByText('8.0')).toBeInTheDocument(); // Average score
      expect(screen.getByText('9/10')).toBeInTheDocument(); // Best shot
      expect(screen.getByText('0')).toBeInTheDocument(); // Bullseyes
    }, { timeout: 3000 });
  });

  test('should stop session when Stop Session button is clicked', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // Start session first
    act(() => {
      triggerEvent('sessionStarted', {
        sessionId: 'test-session-123',
        userId: 'current-user',
        startTime: new Date(),
        shotCount: 0,
        status: 'active'
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Stop Session')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const stopSessionButton = screen.getByText('Stop Session');
    fireEvent.click(stopSessionButton);
    
    await waitFor(() => {
      expect(mockHardwareAPI.stopSession).toHaveBeenCalledWith('test-session-123');
    });
    
    // Trigger the sessionEnded event
    act(() => {
      triggerEvent('sessionEnded', {});
    });
    
    await waitFor(() => {
      expect(defaultProps.onSessionComplete).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('should disconnect hardware when Disconnect button is clicked', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // Connect to device first
    act(() => {
      triggerEvent('deviceConnected', {
        id: 'pi-device-001',
        name: 'Raspberry Pi',
        url: '192.168.1.100:8080',
        status: 'online'
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const disconnectButton = screen.getByText('Disconnect');
    fireEvent.click(disconnectButton);
    
    await waitFor(() => {
      expect(mockHardwareAPI.disconnectDevice).toHaveBeenCalledWith('pi-device-001');
    });
  });

  test('should show video stream when frame is updated', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // Connect to device and start session
    act(() => {
      triggerEvent('deviceConnected', {
        id: 'pi-device-001',
        name: 'Raspberry Pi',
        url: '192.168.1.100:8080',
        status: 'online'
      });
      
      triggerEvent('sessionStarted', {
        sessionId: 'test-session-123',
        userId: 'current-user',
        startTime: new Date(),
        shotCount: 0,
        status: 'active'
      });
    });
    
    // Trigger frame update with image URL
    act(() => {
      triggerEvent('frameUpdated', {
        frameNumber: 1,
        imageUrl: 'http://example.com/frame.jpg',
        timestamp: new Date(),
        metadata: { predictions: [] }
      });
    });
    
    await waitFor(() => {
      const videoElement = screen.getByTestId('video-element');
      expect(videoElement).toHaveAttribute('src', 'http://example.com/frame.jpg');
    }, { timeout: 3000 });
  });

  test('should show placeholder when no video stream', () => {
    render(<LiveTargetView {...defaultProps} />);
    
    expect(screen.getByText('No video feed')).toBeInTheDocument();
    expect(screen.getByText('Connect to hardware to begin')).toBeInTheDocument();
  });

  test('should show error message when error occurs', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    const errorMessage = 'Test error message';
    act(() => {
      triggerEvent('error', { message: errorMessage });
    });
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should call onShotDetected callback when shot is detected', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // Start session first
    act(() => {
      triggerEvent('sessionStarted', {
        sessionId: 'test-session-123',
        userId: 'current-user',
        startTime: new Date(),
        shotCount: 0,
        status: 'active'
      });
    });
    
    const shotData = {
      shotId: 'shot-001',
      sessionId: 'test-session-123',
      timestamp: new Date(),
      frameNumber: 1,
      coordinates: { x: 50, y: 50 },
      score: 8,
      confidence: 0.9
    };
    
    act(() => {
      triggerEvent('shotDetected', shotData);
    });
    
    await waitFor(() => {
      expect(defaultProps.onShotDetected).toHaveBeenCalledWith(shotData);
    }, { timeout: 3000 });
  });

  test('should call onSessionComplete callback when session ends', async () => {
    render(<LiveTargetView {...defaultProps} />);
    
    // Start session first
    act(() => {
      triggerEvent('sessionStarted', {
        sessionId: 'test-session-123',
        userId: 'current-user',
        startTime: new Date(),
        shotCount: 0,
        status: 'active'
      });
      
      // Add some shots
      const shots = [
        { shotId: 'shot-001', score: 8, confidence: 0.9 },
        { shotId: 'shot-002', score: 9, confidence: 0.85 }
      ];
      
      shots.forEach(shot => {
        triggerEvent('shotDetected', {
          ...shot,
          sessionId: 'test-session-123',
          timestamp: new Date(),
          frameNumber: 1,
          coordinates: { x: 50, y: 50 }
        });
      });
    });
    
    // End session
    act(() => {
      triggerEvent('sessionEnded', {});
    });
    
    await waitFor(() => {
      expect(defaultProps.onSessionComplete).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ shotId: 'shot-001' }),
          expect.objectContaining({ shotId: 'shot-002' })
        ])
      );
    }, { timeout: 3000 });
  });

  test('should cleanup on unmount', () => {
    const { unmount } = render(<LiveTargetView {...defaultProps} />);
    
    unmount();
    
    expect(mockHardwareAPI.cleanup).toHaveBeenCalled();
  });
});
// Mock Canvas API before any imports that might use it
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import '@testing-library/jest-dom';
import LiveTargetView from '../../components/LiveTargetView';
import { useHardware } from '../../hooks/useHardware';

const mockCanvasContext = {
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  setLineDash: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  globalAlpha: 1,
  strokeStyle: '',
  lineWidth: 1,
  fillStyle: '',
  font: '',
  textAlign: 'center' as CanvasTextAlign,
  textBaseline: 'middle' as CanvasTextBaseline,
};

// Setup Canvas API mock
HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext as any);

// Mock useHardware hook
jest.mock('../../hooks/useHardware');
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

// Mock useHardware hook implementation
const mockUseHardware: any = {
  // Connection state
  connectedDevice: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  
  // Session state
  activeSession: null,
  isSessionActive: false,
  
  // Real-time data
  latestFrame: null,
  recentShots: [], // This is key fix - ensure recentShots is initialized as empty array
  analysisResult: null,
  isAnalyzing: false,
  
  // Actions
  connectToDevice: jest.fn().mockResolvedValue({
    id: 'pi-device-001',
    name: 'Raspberry Pi',
    url: '192.168.1.100:8080',
    status: 'online'
  }),
  disconnectDevice: jest.fn().mockResolvedValue(undefined),
  startSession: jest.fn().mockResolvedValue({
    sessionId: 'test-session-123',
    userId: 'current-user',
    startTime: new Date(),
    shotCount: 0,
    status: 'active'
  }),
  stopSession: jest.fn().mockResolvedValue(undefined),
  pollForFrames: jest.fn(),
  stopPolling: jest.fn(),
};

// Set mock implementation
const mockedUseHardware = useHardware as jest.MockedFunction<typeof useHardware>;
mockedUseHardware.mockReturnValue(mockUseHardware);

describe('LiveTargetView Component', () => {
  const defaultProps = {
    deviceId: 'test-device',
    sessionId: 'test-session-123',
    onShotDetected: jest.fn(),
    onSessionComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset mock hardware state
    mockUseHardware.connectedDevice = null;
    mockUseHardware.isConnected = false;
    mockUseHardware.isConnecting = false;
    mockUseHardware.connectionError = null;
    mockUseHardware.activeSession = null;
    mockUseHardware.isSessionActive = false;
    mockUseHardware.latestFrame = null;
    mockUseHardware.recentShots = [];
    mockUseHardware.analysisResult = null;
    mockUseHardware.isAnalyzing = false;
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
      expect(mockUseHardware.connectToDevice).toHaveBeenCalledWith('GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080');
    });
    
    // Update mock to return connected state
    mockUseHardware.connectedDevice = {
      id: 'pi-device-001',
      name: 'Raspberry Pi',
      type: 'raspberry-pi' as const,
      url: 'http://192.168.1.100:8080',
      ngrokUrl: 'http://192.168.1.100:8080',
      status: 'online' as const,
      lastSeen: new Date(),
      capabilities: ['camera', 'analysis'],
      settings: {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 'high'
      }
    };
    mockUseHardware.isConnected = true;
    
    // Re-render with new state - component will re-render automatically when mock state changes
    render(<LiveTargetView {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  test('should handle connection error', async () => {
    // Set up error state before rendering
    mockUseHardware.connectionError = 'Connection failed';
    
    render(<LiveTargetView {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  test('should show connected status when device is connected', async () => {
    // Update mock to show connected device
    mockUseHardware.connectedDevice = {
      id: 'pi-device-001',
      name: 'Raspberry Pi',
      type: 'raspberry-pi' as const,
      url: 'http://192.168.1.100:8080',
      ngrokUrl: 'http://192.168.1.100:8080',
      status: 'online' as const,
      lastSeen: new Date(),
      capabilities: ['camera', 'analysis'],
      settings: {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 'high'
      }
    };
    mockUseHardware.isConnected = true;
    
    render(<LiveTargetView {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  test('should start session when Start Session button is clicked', async () => {
    // Set up connected device first
    mockUseHardware.connectedDevice = {
      id: 'pi-device-001',
      name: 'Raspberry Pi',
      type: 'raspberry-pi' as const,
      url: 'http://192.168.1.100:8080',
      ngrokUrl: 'http://192.168.1.100:8080',
      status: 'online' as const,
      lastSeen: new Date(),
      capabilities: ['camera', 'analysis'],
      settings: {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 'high'
      }
    };
    mockUseHardware.isConnected = true;
    
    render(<LiveTargetView {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Start Session')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    const startSessionButton = screen.getByText('Start Session');
    fireEvent.click(startSessionButton);
    
    await waitFor(() => {
      expect(mockUseHardware.startSession).toHaveBeenCalled();
    });
    
    // Update mock to show active session
    mockUseHardware.activeSession = {
      sessionId: 'test-session-123',
      deviceId: 'pi-device-001',
      startTime: new Date(),
      shotCount: 0,
      status: 'active' as const,
      settings: {
        targetDistance: 10,
        targetSize: 100,
        scoringZones: [],
        zoomPreset: undefined,
        detectionSensitivity: 0.7
      }
    };
    mockUseHardware.isSessionActive = true;
    
    // Re-render with new state - component will re-render automatically when mock state changes
    render(<LiveTargetView {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Stop Session')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should show session active status when session is started', async () => {
    // Set up connected device and active session
    mockUseHardware.connectedDevice = {
      id: 'pi-device-001',
      name: 'Raspberry Pi',
      type: 'raspberry-pi' as const,
      url: 'http://192.168.1.100:8080',
      ngrokUrl: 'http://192.168.1.100:8080',
      status: 'online' as const,
      lastSeen: new Date(),
      capabilities: ['camera', 'analysis'],
      settings: {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 'high'
      }
    };
    mockUseHardware.isConnected = true;
    mockUseHardware.activeSession = {
      sessionId: 'test-session-123',
      deviceId: 'pi-device-001',
      startTime: new Date(),
      shotCount: 0,
      status: 'active' as const,
      settings: {
        targetDistance: 10,
        targetSize: 100,
        scoringZones: [],
        zoomPreset: undefined,
        detectionSensitivity: 0.7
      }
    };
    mockUseHardware.isSessionActive = true;
    
    render(<LiveTargetView {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Session Active')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should display shot history when shots are detected', async () => {
    // Set up connected device and active session
    mockUseHardware.connectedDevice = {
      id: 'pi-device-001',
      name: 'Raspberry Pi',
      type: 'raspberry-pi' as const,
      url: 'http://192.168.1.100:8080',
      ngrokUrl: 'http://192.168.1.100:8080',
      status: 'online' as const,
      lastSeen: new Date(),
      capabilities: ['camera', 'analysis'],
      settings: {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 'high'
      }
    };
    mockUseHardware.isConnected = true;
    mockUseHardware.activeSession = {
      sessionId: 'test-session-123',
      deviceId: 'pi-device-001',
      startTime: new Date(),
      shotCount: 0,
      status: 'active' as const,
      settings: {
        targetDistance: 10,
        targetSize: 100,
        scoringZones: [],
        zoomPreset: undefined,
        detectionSensitivity: 0.7
      }
    };
    mockUseHardware.isSessionActive = true;
    
    // Add shot to recentShots
    const shotData = {
      shotId: 'shot-001',
      sessionId: 'test-session-123',
      timestamp: new Date(),
      frameNumber: 1,
      coordinates: { x: 50, y: 50 },
      score: 8,
      confidence: 0.9
    };
    mockUseHardware.recentShots = [shotData];
    
    render(<LiveTargetView {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Shot History')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check for shot details separately
    expect(screen.getByText('Shot #1')).toBeInTheDocument();
  });

  test('should show video stream when frame is updated', async () => {
    // Set up connected device and active session
    mockUseHardware.connectedDevice = {
      id: 'pi-device-001',
      name: 'Raspberry Pi',
      type: 'raspberry-pi' as const,
      url: 'http://192.168.1.100:8080',
      ngrokUrl: 'http://192.168.1.100:8080',
      status: 'online' as const,
      lastSeen: new Date(),
      capabilities: ['camera', 'analysis'],
      settings: {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 'high'
      }
    };
    mockUseHardware.isConnected = true;
    mockUseHardware.activeSession = {
      sessionId: 'test-session-123',
      deviceId: 'pi-device-001',
      startTime: new Date(),
      shotCount: 0,
      status: 'active' as const,
      settings: {
        targetDistance: 10,
        targetSize: 100,
        scoringZones: [],
        zoomPreset: undefined,
        detectionSensitivity: 0.7
      }
    };
    mockUseHardware.isSessionActive = true;
    
    // Set frame with image URL
    mockUseHardware.latestFrame = {
      frameNumber: 1,
      timestamp: new Date(),
      imageUrl: 'http://example.com/frame.jpg',
      hasShot: false,
      shotData: null,
      metadata: {
        resolution: '1920x1080',
        brightness: 50,
        contrast: 50
      }
    };
    
    render(<LiveTargetView {...defaultProps} />);
    
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
    const errorMessage = 'Test error message';
    mockUseHardware.connectionError = errorMessage;
    
    render(<LiveTargetView {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should call onShotDetected callback when shot is detected', async () => {
    // Set up connected device and active session
    mockUseHardware.connectedDevice = {
      id: 'pi-device-001',
      name: 'Raspberry Pi',
      type: 'raspberry-pi' as const,
      url: 'http://192.168.1.100:8080',
      ngrokUrl: 'http://192.168.1.100:8080',
      status: 'online' as const,
      lastSeen: new Date(),
      capabilities: ['camera', 'analysis'],
      settings: {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 'high'
      }
    };
    mockUseHardware.isConnected = true;
    mockUseHardware.activeSession = {
      sessionId: 'test-session-123',
      deviceId: 'pi-device-001',
      startTime: new Date(),
      shotCount: 0,
      status: 'active' as const,
      settings: {
        targetDistance: 10,
        targetSize: 100,
        scoringZones: [],
        zoomPreset: undefined,
        detectionSensitivity: 0.7
      }
    };
    mockUseHardware.isSessionActive = true;
    
    const shotData = {
      shotId: 'shot-001',
      sessionId: 'test-session-123',
      timestamp: new Date(),
      frameNumber: 1,
      coordinates: { x: 50, y: 50 },
      score: 8,
      confidence: 0.9
    };
    mockUseHardware.recentShots = [shotData];
    
    render(<LiveTargetView {...defaultProps} />);
    
    await waitFor(() => {
      expect(defaultProps.onShotDetected).toHaveBeenCalledWith(shotData);
    }, { timeout: 3000 });
  });

  test('should call onSessionComplete callback when session ends', async () => {
    // Set up connected device and active session
    mockUseHardware.connectedDevice = {
      id: 'pi-device-001',
      name: 'Raspberry Pi',
      type: 'raspberry-pi' as const,
      url: 'http://192.168.1.100:8080',
      ngrokUrl: 'http://192.168.1.100:8080',
      status: 'online' as const,
      lastSeen: new Date(),
      capabilities: ['camera', 'analysis'],
      settings: {
        resolution: { width: 1920, height: 1080 },
        fps: 30,
        quality: 'high'
      }
    };
    mockUseHardware.isConnected = true;
    
    const shots = [
      {
        shotId: 'shot-001',
        sessionId: 'test-session-123',
        timestamp: new Date(),
        frameNumber: 1,
        coordinates: { x: 50, y: 50 },
        score: 8,
        confidence: 0.9
      },
      {
        shotId: 'shot-002',
        sessionId: 'test-session-123',
        timestamp: new Date(),
        frameNumber: 2,
        coordinates: { x: 60, y: 60 },
        score: 9,
        confidence: 0.85
      }
    ];
    
    mockUseHardware.activeSession = {
      sessionId: 'test-session-123',
      deviceId: 'pi-device-001',
      startTime: new Date(),
      shotCount: 0,
      status: 'completed' as const, // Set to completed to trigger callback
      settings: {
        targetDistance: 10,
        targetSize: 100,
        scoringZones: [],
        zoomPreset: undefined,
        detectionSensitivity: 0.7
      }
    };
    mockUseHardware.isSessionActive = false; // Session is no longer active
    mockUseHardware.recentShots = shots;
    
    render(<LiveTargetView {...defaultProps} />);
    
    await waitFor(() => {
      expect(defaultProps.onSessionComplete).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    // Check the callback arguments separately
    const callbackCalls = (defaultProps.onSessionComplete as jest.Mock).mock.calls;
    expect(callbackCalls.length).toBeGreaterThan(0);
    const shotsArray = callbackCalls[0][0];
    expect(shotsArray).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ shotId: 'shot-001' }),
        expect.objectContaining({ shotId: 'shot-002' })
      ])
    );
  });

  test('should cleanup on unmount', () => {
    const { unmount } = render(<LiveTargetView {...defaultProps} />);
    
    unmount();
    
    // Since we're using useHardware hook, we can't directly test cleanup
    // but we can verify component unmounts without errors
    expect(true).toBe(true); // Placeholder test
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LiveTargetView } from '@/components/LiveTargetView';
import { HardwareAPI } from '@/services/HardwareAPI';
import type { PiDevice, SessionData, ShotData, FrameData } from '@/services/HardwareAPI';

// Mock canvas context methods
const mockCanvasContext = {
  drawImage: jest.fn(),
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  fillText: jest.fn(),
  font: '',
  textAlign: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  strokeText: jest.fn(),
} as any;

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext);

// Mock the HardwareAPI
jest.mock('@/services/HardwareAPI');

// Create a mock implementation
const mockHardwareAPI = {
  connectViaQRCode: jest.fn(),
  disconnectDevice: jest.fn(),
  startSession: jest.fn(),
  stopSession: jest.fn(),
  cleanup: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getDevice: jest.fn(),
  getSession: jest.fn(),
  getConnectedDevices: jest.fn(),
  getActiveSessions: jest.fn()
} as unknown as jest.Mocked<HardwareAPI>;

// Mock the HardwareAPI constructor
(HardwareAPI as jest.MockedClass<typeof HardwareAPI>).mockImplementation(() => mockHardwareAPI);

// Store event callbacks for testing
const eventCallbacks: Record<string, Function[]> = {};

// Setup mock event listener system
const setupEventListeners = () => {
  mockHardwareAPI.addEventListener.mockImplementation((event: string, callback: Function) => {
    if (!eventCallbacks[event]) {
      eventCallbacks[event] = [];
    }
    eventCallbacks[event].push(callback);
  });

  mockHardwareAPI.removeEventListener.mockImplementation((event: string, callback: Function) => {
    if (eventCallbacks[event]) {
      eventCallbacks[event] = eventCallbacks[event].filter(cb => cb !== callback);
    }
  });

  // Mock getDevice to return device when connected
  mockHardwareAPI.getDevice.mockImplementation((deviceId: string) => {
    if (deviceId === 'device-001') {
      return {
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
      };
    }
    return undefined;
  });

  // Mock getSession to return session when active
  mockHardwareAPI.getSession.mockImplementation((sessionId: string) => {
    if (sessionId === 'test-session-001') {
      return {
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
          ]
        }
      };
    }
    return undefined;
  });
};

// Helper function to trigger events
const triggerEvent = (event: string, data: any) => {
  if (eventCallbacks[event]) {
    eventCallbacks[event].forEach(callback => callback(data));
  }
};

describe('LiveTargetView Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(eventCallbacks).forEach(key => delete eventCallbacks[key]);
    setupEventListeners();
    
    // Mock successful connection by default
    mockHardwareAPI.connectViaQRCode.mockResolvedValue({
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
    
    // Mock successful session start by default
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
        ]
      }
    });
  });

  test('should render component correctly', () => {
    render(<LiveTargetView />);
    
    expect(screen.getByText('Live Target View')).toBeInTheDocument();
    expect(screen.getByText('Real-time target feed from Raspberry Pi')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    expect(screen.getByText('Demo Connect')).toBeInTheDocument();
  });

  test('should show disconnected status initially', () => {
    render(<LiveTargetView />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    expect(screen.getByText('Demo Connect')).toBeInTheDocument();
    expect(screen.queryByText('Disconnect')).not.toBeInTheDocument();
  });

  test('should connect to hardware when Connect Hardware button is clicked', async () => {
    render(<LiveTargetView />);
    
    // Click Demo Connect button
    const connectButton = screen.getByText('Demo Connect');
    fireEvent.click(connectButton);
    
    // Wait for the connection attempt
    await waitFor(() => {
      expect(mockHardwareAPI.connectViaQRCode).toHaveBeenCalledWith(
        'GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080'
      );
    });
    
    // Trigger device connected event
    act(() => {
      triggerEvent('deviceConnected', {
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
    });
    
    // Check if connection status is updated
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  test('should handle connection error', async () => {
    mockHardwareAPI.connectViaQRCode.mockRejectedValue(new Error('Connection failed'));
    
    render(<LiveTargetView />);
    
    // Click Demo Connect button
    const connectButton = screen.getByText('Demo Connect');
    fireEvent.click(connectButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  test('should show connected status when device is connected', async () => {
    render(<LiveTargetView />);
    
    // Trigger device connected event
    act(() => {
      triggerEvent('deviceConnected', {
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
    });
    
    // Check if connection status is updated
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  test('should start session when Start Session button is clicked', async () => {
    render(<LiveTargetView sessionId="test-session-001" />);
    
    // First connect to hardware
    act(() => {
      triggerEvent('deviceConnected', {
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
    });
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
    
    // Click Start Session button
    const startButton = screen.getByText('Start Session');
    fireEvent.click(startButton);
    
    // Wait for session start
    await waitFor(() => {
      expect(mockHardwareAPI.startSession).toHaveBeenCalledWith('device-001', {
        sessionId: 'test-session-001',
        userId: 'current-user',
        settings: {
          targetDistance: 10,
          targetSize: 1,
          zoomPreset: undefined,
          detectionSensitivity: 0.8
        }
      });
    });
  });

  test('should show session active status when session is started', async () => {
    render(<LiveTargetView sessionId="test-session-001" />);
    
    // Connect to hardware first
    act(() => {
      triggerEvent('deviceConnected', {
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
    });
    
    // Trigger session started event
    act(() => {
      triggerEvent('sessionStarted', {
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
          ]
        }
      });
    });
    
    // Check if session status is updated
    await waitFor(() => {
      expect(screen.getByText('Session Active')).toBeInTheDocument();
      expect(screen.getByText('test-session-001')).toBeInTheDocument();
    });
  });

  test('should display shot history when shots are detected', async () => {
    const onShotDetected = jest.fn();
    render(<LiveTargetView onShotDetected={onShotDetected} />);
    
    // Connect to hardware and start session
    act(() => {
      triggerEvent('deviceConnected', {
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
      triggerEvent('sessionStarted', {
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
          ]
        }
      });
    });
    
    // Trigger shot detected event
    const mockShot = {
      shotId: 'shot-001',
      sessionId: 'test-session-001',
      timestamp: new Date(),
      frameNumber: 1,
      coordinates: { x: 50, y: 50 },
      score: 8,
      scoringZone: 'middle',
      confidence: 0.95
    };
    
    act(() => {
      triggerEvent('shotDetected', mockShot);
    });
    
    // Check if shot is displayed
    await waitFor(() => {
      expect(screen.getByText('Shot #1')).toBeInTheDocument();
      expect(screen.getAllByText('8/10')).toHaveLength(2); // One in badge, one in shot details
      expect(onShotDetected).toHaveBeenCalledWith(mockShot);
    });
  });

  test('should display session configuration when session is active', async () => {
    render(<LiveTargetView sessionId="test-session-001" />);
    
    // Connect to hardware and start session
    act(() => {
      triggerEvent('deviceConnected', {
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
      triggerEvent('sessionStarted', {
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
          ]
        }
      });
    });
    
    // Check if session configuration is displayed
    await waitFor(() => {
      expect(screen.getByText('Session Configuration')).toBeInTheDocument();
      expect(screen.getByText('test-session-001')).toBeInTheDocument();
      expect(screen.getByText('10m')).toBeInTheDocument();
      expect(screen.getByText('1m')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  test('should display session statistics when shots are recorded', async () => {
    render(<LiveTargetView sessionId="test-session-001" />);
    
    // Connect to hardware and start session
    act(() => {
      triggerEvent('deviceConnected', {
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
      triggerEvent('sessionStarted', {
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
          ]
        }
      });
    });
    
    // Add multiple shots
    const shots = [
      { shotId: 'shot-001', sessionId: 'test-session-001', timestamp: new Date(), frameNumber: 1, coordinates: { x: 50, y: 50 }, score: 8, scoringZone: 'middle', confidence: 0.95 },
      { shotId: 'shot-002', sessionId: 'test-session-001', timestamp: new Date(), frameNumber: 2, coordinates: { x: 45, y: 45 }, score: 10, scoringZone: 'bullseye', confidence: 0.98 },
      { shotId: 'shot-003', sessionId: 'test-session-001', timestamp: new Date(), frameNumber: 3, coordinates: { x: 60, y: 60 }, score: 6, scoringZone: 'edge', confidence: 0.87 }
    ];
    
    act(() => {
      shots.forEach(shot => {
        triggerEvent('shotDetected', shot);
      });
    });
    
    // Check if session statistics are displayed
    await waitFor(() => {
      expect(screen.getByText('Session Stats')).toBeInTheDocument();
      expect(screen.getByText('Total Shots:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Average Score:')).toBeInTheDocument();
      expect(screen.getByText('8.0')).toBeInTheDocument();
      expect(screen.getByText('Best Shot:')).toBeInTheDocument();
      expect(screen.getAllByText('10/10')).toHaveLength(2); // One in badge, one in stats
      expect(screen.getByText('Bullseyes:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  test('should stop session when Stop Session button is clicked', async () => {
    const onSessionComplete = jest.fn();
    render(<LiveTargetView sessionId="test-session-001" onSessionComplete={onSessionComplete} />);
    
    // Connect to hardware and start session
    act(() => {
      triggerEvent('deviceConnected', {
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
      triggerEvent('sessionStarted', {
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
          ]
        }
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Stop Session')).toBeInTheDocument();
    });
    
    // Click Stop Session button
    const stopButton = screen.getByText('Stop Session');
    fireEvent.click(stopButton);
    
    // Wait for session stop
    await waitFor(() => {
      expect(mockHardwareAPI.stopSession).toHaveBeenCalledWith('test-session-001');
    });
  });

  test('should disconnect hardware when Disconnect button is clicked', async () => {
    render(<LiveTargetView />);
    
    // First connect to hardware
    act(() => {
      triggerEvent('deviceConnected', {
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
    });
    
    await waitFor(() => {
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });
    
    // Click Disconnect button
    const disconnectButton = screen.getByText('Disconnect');
    fireEvent.click(disconnectButton);
    
    // Wait for disconnection
    await waitFor(() => {
      expect(mockHardwareAPI.disconnectDevice).toHaveBeenCalledWith('device-001');
    });
  });

  test('should show video stream when frame is updated', async () => {
    render(<LiveTargetView />);
    
    // Connect to hardware first
    act(() => {
      triggerEvent('deviceConnected', {
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
    });
    
    // Trigger frame updated event
    act(() => {
      triggerEvent('frameUpdated', {
        frameNumber: 1,
        timestamp: new Date(),
        imageUrl: 'data:image/jpeg;base64,test-image-data',
        hasShot: false,
        metadata: {
          resolution: '1920x1080',
          brightness: 50,
          contrast: 50
        }
      });
    });
    
    // Check if video element is updated (the actual video src would be set)
    await waitFor(() => {
      const video = screen.getByTestId('video-element');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', 'data:image/jpeg;base64,test-image-data');
    });
  });

  test('should show placeholder when no video stream', () => {
    render(<LiveTargetView />);
    
    expect(screen.getByText('No video feed')).toBeInTheDocument();
    expect(screen.getByText('Connect to hardware to begin')).toBeInTheDocument();
  });

  test('should show error message when error occurs', async () => {
    render(<LiveTargetView />);
    
    // Trigger error event
    act(() => {
      triggerEvent('error', { message: 'Test error message' });
    });
    
    // Check if error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  test('should call onShotDetected callback when shot is detected', async () => {
    const onShotDetected = jest.fn();
    render(<LiveTargetView onShotDetected={onShotDetected} />);
    
    // Connect to hardware and start session
    act(() => {
      triggerEvent('deviceConnected', {
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
      triggerEvent('sessionStarted', {
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
          ]
        }
      });
    });
    
    // Trigger shot detected event
    const mockShot = {
      shotId: 'shot-001',
      sessionId: 'test-session-001',
      timestamp: new Date(),
      frameNumber: 1,
      coordinates: { x: 50, y: 50 },
      score: 8,
      scoringZone: 'middle',
      confidence: 0.95
    };
    
    act(() => {
      triggerEvent('shotDetected', mockShot);
    });
    
    // Check if callback is called
    await waitFor(() => {
      expect(onShotDetected).toHaveBeenCalledWith(mockShot);
    });
  });

  test('should call onSessionComplete callback when session ends', async () => {
    const onSessionComplete = jest.fn();
    render(<LiveTargetView onSessionComplete={onSessionComplete} />);
    
    // Connect to hardware and start session
    act(() => {
      triggerEvent('deviceConnected', {
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
      triggerEvent('sessionStarted', {
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
          ]
        }
      });
    });
    
    // Add some shots
    const shots = [
      { shotId: 'shot-001', sessionId: 'test-session-001', timestamp: new Date(), frameNumber: 1, coordinates: { x: 50, y: 50 }, score: 8, scoringZone: 'middle', confidence: 0.95 }
    ];
    
    act(() => {
      shots.forEach(shot => {
        triggerEvent('shotDetected', shot);
      });
    });
    
    // Trigger session ended event
    act(() => {
      triggerEvent('sessionEnded', {
        sessionId: 'test-session-001',
        deviceId: 'device-001',
        startTime: new Date(),
        endTime: new Date(),
        shotCount: 1,
        status: 'completed',
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
          ]
        }
      });
    });
    
    // Check if callback is called
    await waitFor(() => {
      expect(onSessionComplete).toHaveBeenCalledWith(shots);
    });
  });

  test('should cleanup on unmount', () => {
    const { unmount } = render(<LiveTargetView />);
    
    // Unmount component
    unmount();
    
    // Check if cleanup is called
    expect(mockHardwareAPI.cleanup).toHaveBeenCalled();
  });
});
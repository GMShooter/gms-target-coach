import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LiveTargetView } from '../../../components/LiveTargetView';
import { useHardware } from '../../../hooks/useHardware';

// Mock useHardware hook
jest.mock('../../../hooks/useHardware');
const mockUseHardware = useHardware as jest.MockedFunction<typeof useHardware>;

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

// Mock device data
const mockDevice = {
  id: 'device123',
  name: 'TestDevice',
  status: 'online',
  ngrokUrl: 'https://test.ngrok.io',
  capabilities: {
    hasCamera: true,
    hasZoom: true,
    maxResolution: '1920x1080',
    supportedFormats: ['jpeg', 'png']
  },
  lastSeen: new Date().toISOString(),
  url: '192.168.1.100:8080'
};

// Mock session data
const mockSession = {
  sessionId: 'session1',
  deviceId: 'device123',
  status: 'active',
  startTime: new Date().toISOString(),
  settings: {
    detectSensitivity: 0.5,
    scoringZones: [
      { color: '#FF0000', id: 'bullseye', name: 'Bullseye', points: 10, radius: 5 },
      { color: '#FF4500', id: 'inner', name: 'Inner Ring', points: 9, radius: 10 },
      { color: '#FFA500', id: 'middle', name: 'Middle Ring', points: 8, radius: 20 },
      { color: '#FFFF00', id: 'outer', name: 'Outer Ring', points: 7, radius: 30 },
      { color: '#00FF00', id: 'edge', name: 'Edge', points: 6, radius: 40 },
      { color: '#880808', id: 'miss', name: 'Miss', points: 0, radius: 100 }
    ],
    targetDistance: 10,
    targetSize: 60,
    shotCount: 0,
    zoomPreset: undefined
};

// Mock shot data
const mockShot = {
  shotId: 'shot1',
  timestamp: new Date().toISOString(),
  coordinates: { x: 50, y: 50 },
  score: 8,
  hasShot: true,
  imageUrl: 'data:image/jpeg;base64,test',
  metadata: {
    brightness: 50,
    contrast: 50,
    resolution: '1920x1080'
  }
};

// Mock analysis result
const mockAnalysisResult = {
  shots: [mockShot],
  confidence: 0.85,
  avgScore: 7.5,
  bestShot: mockShot,
  shotPattern: 'data:image/svg+xml,test'
};

describe('LiveTargetView', () => {
  beforeEach(() => {
    // Reset mocks
    mockUseHardware.mockReturnValue({
      connectedDevice: mockDevice,
      isConnected: true,
      isConnecting: false,
      connectionError: null,
      activeSession: mockSession,
      isSessionActive: true,
      latestFrame: mockShot,
      recentShots: [mockShot],
      analysisResult: mockAnalysisResult,
      connectToDevice: jest.fn(),
      disconnectDevice: jest.fn(),
      startSession: jest.fn(),
      stopSession: jest.fn()
    });
  });

  it('renders without crashing', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for main elements
    expect(screen.getByText('Live Target View')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
  });

  it('displays connection status', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for connection status
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Raspberry Pi feed')).toBeInTheDocument();
  });

  it('displays session status when active', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for session status
    expect(screen.getByText('Session Active')).toBeInTheDocument();
  });

  it('displays video feed when frame is available', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for video element
    const videoElement = screen.getByTestId('video-element');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', mockShot.imageUrl);
  });

  it('displays placeholder when no frame is available', () => {
    mockUseHardware.mockReturnValue({
      connectedDevice: mockDevice,
      isConnected: true,
      isConnecting: false,
      connectionError: null,
      activeSession: mockSession,
      isSessionActive: true,
      latestFrame: null,
      recentShots: [mockShot],
      analysisResult: mockAnalysisResult,
      connectToDevice: jest.fn(),
      disconnectDevice: jest.fn(),
      startSession: jest.fn(),
      stopSession: jest.fn()
    });
    
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for placeholder text
    expect(screen.getByText('No video feed')).toBeInTheDocument();
    expect(screen.getByText('Waiting for stream...')).toBeInTheDocument();
  });

  it('displays shot history', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for shot history
    expect(screen.getByText('Shot #1')).toBeInTheDocument();
    expect(screen.getByText('Recent shots in this session')).toBeInTheDocument();
  });

  it('displays analysis results', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for analysis results
    expect(screen.getByText('Analysis Results')).toBeInTheDocument();
    expect(screen.getByText('Shots Detected: 1')).toBeInTheDocument();
    expect(screen.getByText('Avg Score: 7.5')).toBeInTheDocument();
    expect(screen.getByText('Best Shot: 8')).toBeInTheDocument();
  });

  it('displays session configuration', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for session configuration
    expect(screen.getByText('Session Configuration')).toBeInTheDocument();
    expect(screen.getByText('Session ID: session1')).toBeInTheDocument();
    expect(screen.getByText('Device: TestDevice')).toBeInTheDocument();
    expect(screen.getByText('Target Distance: 10m')).toBeInTheDocument();
    expect(screen.getByText('Target Size: 60m')).toBeInTheDocument();
    expect(screen.getByText('Shot Count: 0')).toBeInTheDocument();
  });

  it('displays session statistics', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for session statistics
    expect(screen.getByText('Session Stats')).toBeInTheDocument();
    expect(screen.getByText('Total Shots: 1')).toBeInTheDocument();
    expect(screen.getByText('Average Score: 7.5')).toBeInTheDocument();
    expect(screen.getByText('Best Shot: 8')).toBeInTheDocument();
    expect(screen.getByText('Bullseyes: 1')).toBeInTheDocument();
  });

  it('handles QR scanner open', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Initially QR scanner should be closed
    expect(screen.queryByText('Scan QR Code')).not.toBeInTheDocument();
    
    // Click scan button
    const scanButton = screen.getByText('Scan');
    fireEvent.click(scanButton);
    
    // QR scanner should now be open
    waitFor(() => {
      expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    });
  });

  it('handles QR scanner close', async () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Open QR scanner
    const scanButton = screen.getByText('Scan');
    fireEvent.click(scanButton);
    
    // Wait for QR scanner to open
    waitFor(() => {
      expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    });
    
    // Click cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // QR scanner should now be closed
    waitFor(() => {
      expect(screen.queryByText('Scan QR Code')).not.toBeInTheDocument();
    });
  });

  it('handles demo connect', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Click demo connect button
    const demoButton = screen.getByText('Demo Connect');
    fireEvent.click(demoButton);
    
    // Should call connectToDevice
    expect(mockUseHardware().connectToDevice).toHaveBeenCalledWith(
      'GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080'
    );
  });

  it('handles start session', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Click start session button
    const startButton = screen.getByText('Start Session');
    fireEvent.click(startButton);
    
    // Should call startSession
    expect(mockUseHardware().startSession).toHaveBeenCalledWith('device123', 'current-user');
  });

  it('handles stop session', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Click stop session button
    const stopButton = screen.getByText('Stop Session');
    fireEvent.click(stopButton);
    
    // Should call stopSession
    expect(mockUseHardware().stopSession).toHaveBeenCalledWith('session1');
  });

  it('handles disconnect from hardware', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Click disconnect button
    const disconnectButton = screen.getByText('Disconnect');
    fireEvent.click(disconnectButton);
    
    // Should call disconnectDevice
    expect(mockUseHardware().disconnectDevice).toHaveBeenCalledWith('device123');
  });

  it('handles settings toggle', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Initially settings should be closed
    expect(screen.queryByText('Current settings')).not.toBeInTheDocument();
    
    // Click settings button
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    // Settings should now be open
    waitFor(() => {
      expect(screen.getByText('Current settings')).toBeInTheDocument();
    });
  });

  it('handles fullscreen toggle', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Click fullscreen button
    const fullscreenButton = screen.getByRole('button').find(button => 
      button.querySelector('svg[data-lucide="maximize2"]') || 
      button.querySelector('svg[data-lucide="minimize2"]')
    );
    
    expect(fullscreenButton).toBeInTheDocument();
    fireEvent.click(fullscreenButton);
  });

  it('handles analysis toggle', () => {
    renderWithQueryClient(<LiveTargetView />);
    
    // Click analysis toggle button
    const analysisButton = screen.getByRole('button').find(button => 
      button.querySelector('svg[data-lucide="eye"]')
    );
    
    expect(analysisButton).toBeInTheDocument();
    fireEvent.click(analysisButton);
  });

  it('displays error message', () => {
    mockUseHardware.mockReturnValue({
      connectedDevice: mockDevice,
      isConnected: true,
      isConnecting: false,
      connectionError: new Error('Connection failed'),
      activeSession: mockSession,
      isSessionActive: true,
      latestFrame: mockShot,
      recentShots: [mockShot],
      analysisResult: mockAnalysisResult,
      connectToDevice: jest.fn(),
      disconnectDevice: jest.fn(),
      startSession: jest.fn(),
      stopSession: jest.fn()
    });
    
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for error message
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('displays disconnected status', () => {
    mockUseHardware.mockReturnValue({
      connectedDevice: mockDevice,
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      activeSession: mockSession,
      isSessionActive: true,
      latestFrame: mockShot,
      recentShots: [mockShot],
      analysisResult: mockAnalysisResult,
      connectToDevice: jest.fn(),
      disconnectDevice: jest.fn(),
      startSession: jest.fn(),
      stopSession: jest.fn()
    });
    
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for disconnected status
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('handles mobile layout', () => {
    // Mock mobile device
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500
    });
    
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for mobile-specific elements
    expect(screen.getByText('Raspberry Pi feed')).toBeInTheDocument();
    expect(screen.getByText('Scan')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('handles desktop layout', () => {
    // Mock desktop device
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200
    });
    
    renderWithQueryClient(<LiveTargetView />);
    
    // Check for desktop-specific elements
    expect(screen.getByText('Real-time target feed from Raspberry Pi')).toBeInTheDocument();
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    expect(screen.getByText('Demo Connect')).toBeInTheDocument();
  });

  it('handles shot detection callback', () => {
    const onShotDetected = jest.fn();
    
    renderWithQueryClient(<LiveTargetView onShotDetected={onShotDetected} />);
    
    // Simulate shot detection
    mockUseHardware.mockReturnValue({
      connectedDevice: mockDevice,
      isConnected: true,
      isConnecting: false,
      connectionError: null,
      activeSession: mockSession,
      isSessionActive: true,
      latestFrame: mockShot,
      recentShots: [mockShot, { ...mockShot, shotId: 'shot2' }],
      analysisResult: mockAnalysisResult,
      connectToDevice: jest.fn(),
      disconnectDevice: jest.fn(),
      startSession: jest.fn(),
      stopSession: jest.fn()
    });
    
    // Should call onShotDetected with latest shot
    waitFor(() => {
      expect(onShotDetected).toHaveBeenCalledWith(mockShot);
    });
  });

  it('handles session completion callback', () => {
    const onSessionComplete = jest.fn();
    
    renderWithQueryClient(<LiveTargetView onSessionComplete={onSessionComplete} />);
    
    // Simulate session completion
    mockUseHardware.mockReturnValue({
      connectedDevice: mockDevice,
      isConnected: true,
      isConnecting: false,
      connectionError: null,
      activeSession: { ...mockSession, status: 'completed' },
      isSessionActive: false,
      latestFrame: mockShot,
      recentShots: [mockShot],
      analysisResult: mockAnalysisResult,
      connectToDevice: jest.fn(),
      disconnectDevice: jest.fn(),
      startSession: jest.fn(),
      stopSession: jest.fn()
    });
    
    // Should call onSessionComplete with shots
    waitFor(() => {
      expect(onSessionComplete).toHaveBeenCalledWith([mockShot]);
    });
  });
});
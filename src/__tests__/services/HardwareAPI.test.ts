/**
 * HardwareAPI Service Tests
 *
 * This test suite covers hardware API functionality including:
 * - Device discovery and connection
 * - Session management
 * - Real-time frame processing
 * - WebSocket communication
 * - Shot detection and analysis
 * - Error handling
 */

import {
  HardwareAPI,
  type PiDevice,
  type SessionData,
  type FrameData,
  type ShotData,
  type SessionStartRequest,
  type SessionStopRequest
} from '../../services/HardwareAPI';

// Mock dependencies
jest.mock('../../services/GeometricScoring', () => ({
  geometricScoring: {
    analyzeShot: jest.fn(),
    calculateSessionStatistics: jest.fn(),
    generateRecommendations: jest.fn(),
    generateShotPatternVisualization: jest.fn()
  }
}));

jest.mock('../../services/SequentialShotDetection', () => ({
  sequentialShotDetection: {
    initializeSession: jest.fn(),
    clearSession: jest.fn(),
    processFrame: jest.fn(),
    getSessionStatistics: jest.fn(),
    getSessionShots: jest.fn(),
    updateConfig: jest.fn(),
    getConfig: jest.fn()
  }
}));

jest.mock('../../services/HardwareAuth', () => ({
  hardwareAuth: {
    loadStoredCredentials: jest.fn(),
    generateApiKey: jest.fn(),
    getToken: jest.fn(),
    refreshToken: jest.fn()
  }
}));

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  
  constructor(url: string) {
    this.url = url;
  }
  
  send(data: string): void {
    // Mock implementation
  }
  
  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason });
    }
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

// Mock fetch
global.fetch = jest.fn();

describe('HardwareAPI Service', () => {
  let hardwareAPI: HardwareAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    hardwareAPI = new HardwareAPI();
    hardwareAPI.setUserId('test-user-id');
  });

  afterEach(() => {
    hardwareAPI.cleanup();
  });

  describe('Device Management', () => {
    it('should parse valid QR code data', () => {
      const qrData = 'GMShoot://device123|TestDevice|192.168.1.100|8080';
      const device = hardwareAPI.parseQRCode(qrData);

      expect(device).not.toBeNull();
      expect(device?.id).toBe('device123');
      expect(device?.name).toBe('TestDevice');
      expect(device?.url).toBe('192.168.1.100:8080');
      expect(device?.status).toBe('offline');
      expect(device?.capabilities.hasCamera).toBe(true);
      expect(device?.capabilities.maxResolution).toBe('1920x1080');
    });

    it('should return null for invalid QR code format', () => {
      const invalidQrData = 'invalid-qr-code-format';
      const device = hardwareAPI.parseQRCode(invalidQrData);

      expect(device).toBeNull();
    });

    it('should connect to device via QR code', async () => {
      const qrData = 'GMShoot://device123|TestDevice|192.168.1.100|8080';
      
      // Mock successful ping response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { ngrokUrl: 'https://test.ngrok.io' }
        })
      });

      const device = await hardwareAPI.connectViaQRCode(qrData);

      expect(device).not.toBeNull();
      expect(device?.status).toBe('online');
      expect(device?.ngrokUrl).toBe('https://test.ngrok.io');
    });

    it('should throw error when user not authenticated', async () => {
      hardwareAPI.setUserId('');
      const qrData = 'GMShoot://device123|TestDevice|192.168.1.100|8080';

      await expect(hardwareAPI.connectViaQRCode(qrData))
        .rejects.toThrow('User must be authenticated to connect to devices');
    });

    it('should throw error for invalid QR code during connection', async () => {
      const invalidQrData = 'invalid-format';

      await expect(hardwareAPI.connectViaQRCode(invalidQrData))
        .rejects.toThrow('Invalid QR code data');
    });

    it('should get list of connected devices', () => {
      const device1: PiDevice = {
        id: 'device1',
        name: 'Device 1',
        url: '192.168.1.100:8080',
        status: 'online',
        lastSeen: new Date(),
        capabilities: {
          hasCamera: true,
          hasZoom: true,
          maxResolution: '1920x1080',
          supportedFormats: ['jpeg', 'png']
        }
      };

      const device2: PiDevice = {
        id: 'device2',
        name: 'Device 2',
        url: '192.168.1.101:8080',
        status: 'offline',
        lastSeen: new Date(),
        capabilities: {
          hasCamera: true,
          hasZoom: true,
          maxResolution: '1920x1080',
          supportedFormats: ['jpeg', 'png']
        }
      };

      // Manually add devices to test filtering
      (hardwareAPI as any).devices.set('device1', device1);
      (hardwareAPI as any).devices.set('device2', device2);

      const connectedDevices = hardwareAPI.getConnectedDevices();

      expect(connectedDevices).toHaveLength(1);
      expect(connectedDevices[0].id).toBe('device1');
    });

    it('should get device by ID', () => {
      const device: PiDevice = {
        id: 'device1',
        name: 'Device 1',
        url: '192.168.1.100:8080',
        status: 'online',
        lastSeen: new Date(),
        capabilities: {
          hasCamera: true,
          hasZoom: true,
          maxResolution: '1920x1080',
          supportedFormats: ['jpeg', 'png']
        }
      };

      (hardwareAPI as any).devices.set('device1', device);

      const foundDevice = hardwareAPI.getDevice('device1');

      expect(foundDevice).toBe(device);
      expect(hardwareAPI.getDevice('nonexistent')).toBeUndefined();
    });

    it('should disconnect from device', async () => {
      const device: PiDevice = {
        id: 'device1',
        name: 'Device 1',
        url: '192.168.1.100:8080',
        status: 'online',
        lastSeen: new Date(),
        capabilities: {
          hasCamera: true,
          hasZoom: true,
          maxResolution: '1920x1080',
          supportedFormats: ['jpeg', 'png']
        }
      };

      const session: SessionData = {
        sessionId: 'session1',
        deviceId: 'device1',
        startTime: new Date(),
        shotCount: 0,
        status: 'active',
        settings: {
          targetDistance: 10,
          targetSize: 60,
          scoringZones: [],
          detectionSensitivity: 0.5
        }
      };

      (hardwareAPI as any).devices.set('device1', device);
      (hardwareAPI as any).activeSessions.set('session1', session);

      // Mock successful session stop response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      });

      await hardwareAPI.disconnectDevice('device1');

      expect(device.status).toBe('offline');
      expect((hardwareAPI as any).activeSessions.has('session1')).toBe(false);
    });

    it('should throw error when disconnecting non-existent device', async () => {
      await expect(hardwareAPI.disconnectDevice('nonexistent'))
        .rejects.toThrow('Device not found');
    });
  });

  describe('Session Management', () => {
    const mockDevice: PiDevice = {
      id: 'device1',
      name: 'Device 1',
      url: '192.168.1.100:8080',
      status: 'online',
      lastSeen: new Date(),
      capabilities: {
        hasCamera: true,
        hasZoom: true,
        maxResolution: '1920x1080',
        supportedFormats: ['jpeg', 'png']
      }
    };

    beforeEach(() => {
      (hardwareAPI as any).devices.set('device1', mockDevice);
    });

    it('should start shooting session', async () => {
      const request: SessionStartRequest = {
        sessionId: 'session1',
        userId: 'test-user-id',
        settings: {
          targetDistance: 10,
          targetSize: 60,
          detectionSensitivity: 0.5
        }
      };

      // Mock successful session start response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      });

      // Mock Supabase registration
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const session = await hardwareAPI.startSession('device1', request);

      expect(session).not.toBeNull();
      expect(session.sessionId).toBe('session1');
      expect(session.deviceId).toBe('device1');
      expect(session.status).toBe('active');
      expect(session.shotCount).toBe(0);
    });

    it('should throw error when starting session on non-existent device', async () => {
      const request: SessionStartRequest = {
        sessionId: 'session1',
        userId: 'test-user-id',
        settings: {
          targetDistance: 10,
          targetSize: 60,
          detectionSensitivity: 0.5
        }
      };

      await expect(hardwareAPI.startSession('nonexistent', request))
        .rejects.toThrow('Device not found');
    });

    it('should throw error when starting session on offline device', async () => {
      mockDevice.status = 'offline';
      const request: SessionStartRequest = {
        sessionId: 'session1',
        userId: 'test-user-id',
        settings: {
          targetDistance: 10,
          targetSize: 60,
          detectionSensitivity: 0.5
        }
      };

      await expect(hardwareAPI.startSession('device1', request))
        .rejects.toThrow('Device is not online');
    });

    it('should stop shooting session', async () => {
      const session: SessionData = {
        sessionId: 'session1',
        deviceId: 'device1',
        startTime: new Date(),
        shotCount: 5,
        status: 'active',
        settings: {
          targetDistance: 10,
          targetSize: 60,
          scoringZones: [],
          detectionSensitivity: 0.5
        }
      };

      (hardwareAPI as any).activeSessions.set('session1', session);

      // Mock successful session stop response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      });

      await hardwareAPI.stopSession('session1');

      expect(session.status).toBe('completed');
      expect(session.endTime).toBeDefined();
    });

    it('should throw error when stopping non-existent session', async () => {
      await expect(hardwareAPI.stopSession('nonexistent'))
        .rejects.toThrow('Session not found');
    });

    it('should get active sessions', () => {
      const activeSession: SessionData = {
        sessionId: 'session1',
        deviceId: 'device1',
        startTime: new Date(),
        shotCount: 5,
        status: 'active',
        settings: {
          targetDistance: 10,
          targetSize: 60,
          scoringZones: [],
          detectionSensitivity: 0.5
        }
      };

      const completedSession: SessionData = {
        sessionId: 'session2',
        deviceId: 'device1',
        startTime: new Date(),
        endTime: new Date(),
        shotCount: 10,
        status: 'completed',
        settings: {
          targetDistance: 10,
          targetSize: 60,
          scoringZones: [],
          detectionSensitivity: 0.5
        }
      };

      (hardwareAPI as any).activeSessions.set('session1', activeSession);
      (hardwareAPI as any).activeSessions.set('session2', completedSession);

      const activeSessions = hardwareAPI.getActiveSessions();

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].sessionId).toBe('session1');
    });

    it('should get session by ID', () => {
      const session: SessionData = {
        sessionId: 'session1',
        deviceId: 'device1',
        startTime: new Date(),
        shotCount: 5,
        status: 'active',
        settings: {
          targetDistance: 10,
          targetSize: 60,
          scoringZones: [],
          detectionSensitivity: 0.5
        }
      };

      (hardwareAPI as any).activeSessions.set('session1', session);

      const foundSession = hardwareAPI.getSession('session1');

      expect(foundSession).toBe(session);
      expect(hardwareAPI.getSession('nonexistent')).toBeUndefined();
    });
  });

  describe('Frame Processing', () => {
    const mockDevice: PiDevice = {
      id: 'device1',
      name: 'Device 1',
      url: '192.168.1.100:8080',
      status: 'online',
      lastSeen: new Date(),
      capabilities: {
        hasCamera: true,
        hasZoom: true,
        maxResolution: '1920x1080',
        supportedFormats: ['jpeg', 'png']
      }
    };

    beforeEach(() => {
      (hardwareAPI as any).devices.set('device1', mockDevice);
    });

    it('should get latest frame', async () => {
      const mockFrameData = {
        frameNumber: 1,
        timestamp: '2023-01-01T00:00:00Z',
        imageUrl: 'http://example.com/frame1.jpg',
        hasShot: false,
        metadata: {
          resolution: '1920x1080',
          brightness: 50,
          contrast: 50
        }
      };

      // Mock successful frame response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFrameData)
      });

      const frame = await hardwareAPI.getLatestFrame('device1');

      expect(frame).not.toBeNull();
      expect(frame.frameNumber).toBe(1);
      expect(frame.hasShot).toBe(false);
      expect(frame.metadata.resolution).toBe('1920x1080');
    });

    it('should throw error when getting frame from non-existent device', async () => {
      await expect(hardwareAPI.getLatestFrame('nonexistent'))
        .rejects.toThrow('Device not found');
    });

    it('should get next frame with shot detection', async () => {
      const mockFrameData = {
        frameNumber: 2,
        timestamp: '2023-01-01T00:00:01Z',
        imageUrl: 'http://example.com/frame2.jpg',
        hasShot: true,
        shotData: {
          shotId: 'shot1',
          coordinates: { x: 50, y: 50 },
          score: 10,
          confidence: 0.95
        },
        metadata: {
          resolution: '1920x1080',
          brightness: 50,
          contrast: 50
        }
      };

      const session: SessionData = {
        sessionId: 'session1',
        deviceId: 'device1',
        startTime: new Date(),
        shotCount: 0,
        status: 'active',
        settings: {
          targetDistance: 10,
          targetSize: 60,
          scoringZones: [],
          detectionSensitivity: 0.5
        }
      };

      (hardwareAPI as any).activeSessions.set('session1', session);

      // Mock successful frame response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFrameData)
      });

      // Mock sequential detection
      const { sequentialShotDetection } = require('../../services/SequentialShotDetection');
      sequentialShotDetection.processFrame.mockResolvedValue({
        isNewShot: true,
        shotNumber: 1,
        position: { x: 50, y: 50 },
        confidence: 0.95
      });

      const frame = await hardwareAPI.getNextFrame('device1');

      expect(frame).not.toBeNull();
      expect(frame.hasShot).toBe(true);
      expect(frame.shotData).toBeDefined();
      expect(session.shotCount).toBe(1);
    });

    it('should set zoom preset', async () => {
      // Mock successful zoom response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      });

      await hardwareAPI.setZoomPreset('device1', 3);
      // If no error is thrown, test passes
    });

    it('should throw error when setting zoom on non-existent device', async () => {
      await expect(hardwareAPI.setZoomPreset('nonexistent', 3))
        .rejects.toThrow('Device not found');
    });
  });

  describe('Event Management', () => {
    it('should add and remove event listeners', () => {
      const callback = jest.fn();
      
      hardwareAPI.addEventListener('testEvent', callback);
      
      // Emit event
      (hardwareAPI as any).emit('testEvent', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
      
      // Remove listener
      hardwareAPI.removeEventListener('testEvent', callback);
      
      // Emit event again
      (hardwareAPI as any).emit('testEvent', { data: 'test2' });
      
      // Callback should not be called again
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      hardwareAPI.addEventListener('testEvent', callback1);
      hardwareAPI.addEventListener('testEvent', callback2);
      
      // Emit event
      (hardwareAPI as any).emit('testEvent', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should initialize default event listeners', () => {
      // Check that default events are initialized
      const eventListeners = (hardwareAPI as any).eventListeners;
      
      expect(eventListeners.has('deviceConnected')).toBe(true);
      expect(eventListeners.has('deviceDisconnected')).toBe(true);
      expect(eventListeners.has('sessionStarted')).toBe(true);
      expect(eventListeners.has('sessionEnded')).toBe(true);
      expect(eventListeners.has('shotDetected')).toBe(true);
      expect(eventListeners.has('frameUpdated')).toBe(true);
      expect(eventListeners.has('error')).toBe(true);
    });
  });

  describe('WebSocket Communication', () => {
    const mockDevice: PiDevice = {
      id: 'device1',
      name: 'Device 1',
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

    beforeEach(() => {
      (hardwareAPI as any).devices.set('device1', mockDevice);
    });

    it('should get WebSocket connection status', () => {
      const status = hardwareAPI.getWebSocketStatus('device1');
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('readyState');
      expect(typeof status.connected).toBe('boolean');
      expect(typeof status.readyState).toBe('number');
    });

    it('should send WebSocket message', () => {
      const message = { type: 'test', data: 'test data' };
      
      // Should not throw when WebSocket is not connected
      expect(() => hardwareAPI.sendWebSocketMessage('device1', message))
        .not.toThrow();
    });

    it('should close WebSocket connection', () => {
      // Should not throw when closing WebSocket
      expect(() => hardwareAPI.closeWebSocketConnection('device1'))
        .not.toThrow();
    });
  });

  describe('Shot Analysis', () => {
    it('should detect sequential shots', () => {
      const previousFrame: FrameData = {
        frameNumber: 1,
        timestamp: new Date(),
        imageUrl: 'frame1.jpg',
        hasShot: false,
        metadata: {
          resolution: '1920x1080',
          brightness: 50,
          contrast: 50
        }
      };

      const currentFrame: FrameData = {
        frameNumber: 2,
        timestamp: new Date(),
        imageUrl: 'frame2.jpg',
        hasShot: true,
        shotData: {
          shotId: 'shot1',
          sessionId: 'session1',
          timestamp: new Date(),
          frameNumber: 2,
          coordinates: { x: 50, y: 50 },
          score: 10,
          scoringZone: 'bullseye',
          confidence: 0.95
        },
        metadata: {
          resolution: '1920x1080',
          brightness: 50,
          contrast: 50
        }
      };

      const isSequentialShot = hardwareAPI.detectSequentialShot(previousFrame, currentFrame);

      expect(isSequentialShot).toBe(true);
    });

    it('should not detect sequential shot when both frames have no shot', () => {
      const previousFrame: FrameData = {
        frameNumber: 1,
        timestamp: new Date(),
        imageUrl: 'frame1.jpg',
        hasShot: false,
        metadata: {
          resolution: '1920x1080',
          brightness: 50,
          contrast: 50
        }
      };

      const currentFrame: FrameData = {
        frameNumber: 2,
        timestamp: new Date(),
        imageUrl: 'frame2.jpg',
        hasShot: false,
        metadata: {
          resolution: '1920x1080',
          brightness: 50,
          contrast: 50
        }
      };

      const isSequentialShot = hardwareAPI.detectSequentialShot(previousFrame, currentFrame);

      expect(isSequentialShot).toBe(false);
    });

    it('should calculate basic shot score', () => {
      const scoringZones = [
        { id: 'bullseye', name: 'Bullseye', points: 10, radius: 5, color: '#FF0000' },
        { id: 'inner', name: 'Inner Ring', points: 9, radius: 10, color: '#FF4500' },
        { id: 'miss', name: 'Miss', points: 0, radius: 100, color: '#808080' }
      ];

      const bullseyeResult = hardwareAPI.calculateShotScore(50, 50, scoringZones);
      expect(bullseyeResult.score).toBe(10);
      expect(bullseyeResult.zone.id).toBe('bullseye');

      const missResult = hardwareAPI.calculateShotScore(95, 95, scoringZones);
      expect(missResult.score).toBe(0);
      expect(missResult.zone.id).toBe('miss');
    });
  });

  describe('Session Statistics and Analysis', () => {
    it('should return null for session with no shots', () => {
      const stats = hardwareAPI.getSessionStatistics('nonexistent');
      expect(stats).toBeNull();
    });

    it('should get session recommendations', () => {
      const recommendations = hardwareAPI.getSessionRecommendations('nonexistent');
      expect(recommendations).toEqual(['No shots recorded yet']);
    });

    it('should get shot pattern visualization', () => {
      const visualization = hardwareAPI.getShotPatternVisualization('nonexistent');
      expect(typeof visualization).toBe('string');
    });

    it('should get sequential detection statistics', () => {
      const stats = hardwareAPI.getSequentialDetectionStatistics('nonexistent');
      expect(stats).toBeNull();
    });

    it('should get sequential shot history', () => {
      const history = hardwareAPI.getSequentialShotHistory('nonexistent');
      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(0);
    });

    it('should update sequential detection configuration', () => {
      const config = { minShotInterval: 500 };
      
      expect(() => hardwareAPI.updateSequentialDetectionConfig(config))
        .not.toThrow();
    });

    it('should get sequential detection configuration', () => {
      const config = hardwareAPI.getSequentialDetectionConfig();
      expect(config).toBeDefined();
    });
  });

  describe('Session Control', () => {
    const mockDevice: PiDevice = {
      id: 'device1',
      name: 'Device 1',
      url: '192.168.1.100:8080',
      status: 'online',
      lastSeen: new Date(),
      capabilities: {
        hasCamera: true,
        hasZoom: true,
        maxResolution: '1920x1080',
        supportedFormats: ['jpeg', 'png']
      }
    };

    const mockSession: SessionData = {
      sessionId: 'session1',
      deviceId: 'device1',
      startTime: new Date(),
      shotCount: 5,
      status: 'active',
      settings: {
        targetDistance: 10,
        targetSize: 60,
        scoringZones: [],
        detectionSensitivity: 0.5
      }
    };

    beforeEach(() => {
      (hardwareAPI as any).devices.set('device1', mockDevice);
      (hardwareAPI as any).activeSessions.set('session1', mockSession);
    });

    it('should get session status', async () => {
      const mockStatusResponse = {
        isActive: true,
        sessionId: 'session1',
        shotCount: 5,
        uptime: 300,
        isPaused: false
      };

      // Mock successful status response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatusResponse)
      });

      const status = await hardwareAPI.getSessionStatus('session1');

      expect(status).not.toBeNull();
      expect(status.isActive).toBe(true);
      expect(status.sessionId).toBe('session1');
      expect(status.shotCount).toBe(5);
    });

    it('should throw error when getting status for non-existent session', async () => {
      await expect(hardwareAPI.getSessionStatus('nonexistent'))
        .rejects.toThrow('Session not found');
    });

    it('should toggle session pause', async () => {
      // Mock successful pause response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      });

      await hardwareAPI.toggleSessionPause('session1');

      expect(mockSession.status).toBe('paused');
    });

    it('should toggle session resume', async () => {
      mockSession.status = 'paused';

      // Mock successful resume response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      });

      await hardwareAPI.toggleSessionPause('session1');

      expect(mockSession.status).toBe('active');
    });

    it('should emergency stop session', async () => {
      // Mock successful emergency stop response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      });

      await hardwareAPI.emergencyStop('session1');

      expect(mockSession.status).toBe('emergency_stopped');
      expect(mockSession.endTime).toBeDefined();
    });

    it('should throw error when emergency stopping non-existent session', async () => {
      await expect(hardwareAPI.emergencyStop('nonexistent'))
        .rejects.toThrow('Session not found');
    });
  });

  describe('Data Ingestion', () => {
    const mockSession: SessionData = {
      sessionId: 'session1',
      deviceId: 'device1',
      startTime: new Date(),
      shotCount: 0,
      status: 'active',
      settings: {
        targetDistance: 10,
        targetSize: 60,
        scoringZones: [],
        detectionSensitivity: 0.5
      }
    };

    beforeEach(() => {
      (hardwareAPI as any).activeSessions.set('session1', mockSession);
    });

    it('should ingest frame data', async () => {
      const frameData = {
        frameNumber: 1,
        timestamp: new Date(),
        imageUrl: 'frame1.jpg',
        hasShot: false,
        metadata: {
          resolution: '1920x1080',
          brightness: 50,
          contrast: 50
        }
      };

      // Mock successful ingestion
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await hardwareAPI.ingestFrameData('session1', frameData);
      // If no error is thrown, test passes
    });

    it('should ingest shot data', async () => {
      const shotData = {
        shotId: 'shot1',
        sessionId: 'session1',
        timestamp: new Date(),
        frameNumber: 1,
        coordinates: { x: 50, y: 50 },
        score: 10,
        scoringZone: 'bullseye',
        confidence: 0.95
      };

      // Mock successful ingestion
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await hardwareAPI.ingestShotData('session1', shotData);

      expect(mockSession.shotCount).toBe(1);
    });

    it('should ingest session event', async () => {
      const eventData = {
        eventType: 'session_paused',
        eventData: {
          timestamp: new Date().toISOString(),
          reason: 'user_request'
        }
      };

      // Mock successful ingestion
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await hardwareAPI.ingestSessionEvent('session1', 'session_paused', eventData.eventData);
      // If no error is thrown, test passes
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const qrData = 'GMShoot://device123|TestDevice|192.168.1.100|8080';
      
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(hardwareAPI.connectViaQRCode(qrData))
        .rejects.toThrow('Failed to connect to device: Error: Network error');
    });

    it('should handle API error responses', async () => {
      const mockDevice: PiDevice = {
        id: 'device1',
        name: 'Device 1',
        url: '192.168.1.100:8080',
        status: 'online',
        lastSeen: new Date(),
        capabilities: {
          hasCamera: true,
          hasZoom: true,
          maxResolution: '1920x1080',
          supportedFormats: ['jpeg', 'png']
        }
      };

      (hardwareAPI as any).devices.set('device1', mockDevice);

      // Mock API error response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: 'Device busy'
        })
      });

      await expect(hardwareAPI.getLatestFrame('device1'))
        .rejects.toThrow('Failed to get latest frame: Device busy');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all resources', () => {
      // Add some test data
      (hardwareAPI as any).devices.set('device1', {});
      (hardwareAPI as any).activeSessions.set('session1', {});
      (hardwareAPI as any).sessionShots.set('session1', []);
      (hardwareAPI as any).sequentialSessions.set('session1', true);

      // Cleanup
      hardwareAPI.cleanup();

      // Verify cleanup
      expect((hardwareAPI as any).devices.size).toBe(0);
      expect((hardwareAPI as any).activeSessions.size).toBe(0);
      expect((hardwareAPI as any).sessionShots.size).toBe(0);
      expect((hardwareAPI as any).sequentialSessions.size).toBe(0);
      expect((hardwareAPI as any).eventListeners.size).toBe(0);
    });
  });
  });
});

/**
 * HardwareAPI Service Tests
 * 
 * Tests for the HardwareAPI service that handles communication with Raspberry Pi devices.
 */

import { HardwareAPI, PiDevice, SessionData, FrameData, ShotData } from "../../services/HardwareAPI";

// Mock fetch for HTTP requests
global.fetch = jest.fn();

// Mock WebSocket for real-time communication
global.WebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  close: jest.fn(),
  send: jest.fn(),
  readyState: 1, // OPEN
})) as any;

describe('HardwareAPI Service', () => {
  let hardwareAPI: HardwareAPI;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    hardwareAPI = new HardwareAPI();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    jest.clearAllMocks();
    
    // Set up authenticated user context for tests
    hardwareAPI.setUserId('test-user-123');
  });

  afterEach(() => {
    hardwareAPI.cleanup();
  });

  describe('QR Code Parsing', () => {
    it('should parse valid QR code data correctly', () => {
      const qrData = 'GMShoot://device123|TestDevice|192.168.1.100|8080';
      const device = hardwareAPI.parseQRCode(qrData);

      expect(device).toEqual({
        id: 'device123',
        name: 'TestDevice',
        url: '192.168.1.100:8080',
        status: 'offline',
        lastSeen: expect.any(Date),
        capabilities: {
          hasCamera: true,
          hasZoom: true,
          maxResolution: '1920x1080',
          supportedFormats: ['jpeg', 'png']
        }
      });
    });

    it('should return null for invalid QR code format', () => {
      const invalidQR = 'invalid:qr:code';
      const device = hardwareAPI.parseQRCode(invalidQR);

      expect(device).toBeNull();
    });

    it('should return null for malformed QR code', () => {
      const malformedQR = 'GMShoot://device123|TestDevice|192.168.1.100';
      const device = hardwareAPI.parseQRCode(malformedQR);

      expect(device).toBeNull();
    });
  });

  describe('Device Connection', () => {
    const mockDevice: PiDevice = {
      id: 'device123',
      name: 'TestDevice',
      url: '192.168.1.100:8080',
      status: 'offline',
      lastSeen: new Date(),
      capabilities: {
        hasCamera: true,
        hasZoom: true,
        maxResolution: '1920x1080',
        supportedFormats: ['jpeg', 'png']
      }
    };

    it('should connect to device via QR code successfully', async () => {
      const qrData = 'GMShoot://device123|TestDevice|192.168.1.100|8080';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ngrokUrl: 'https://abc123.ngrok.io' })
      } as Response);

      const connectedDevice = await hardwareAPI.connectViaQRCode(qrData);

      expect(connectedDevice.status).toBe('online');
      expect(connectedDevice.ngrokUrl).toBe('https://abc123.ngrok.io');
      expect(mockFetch).toHaveBeenCalledWith(
        '192.168.1.100:8080/ping',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'GMShooter-Client/1.0'
          })
        })
      );
    });

    it('should handle connection failure', async () => {
      const qrData = 'GMShoot://device123|TestDevice|192.168.1.100|8080';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Connection failed' })
      } as Response);

      await expect(hardwareAPI.connectViaQRCode(qrData)).rejects.toThrow('Connection failed');
    });

    it('should handle network errors', async () => {
      const qrData = 'GMShoot://device123|TestDevice|192.168.1.100|8080';
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(hardwareAPI.connectViaQRCode(qrData)).rejects.toThrow('Network error');
    });

    it('should get connected devices', () => {
      const device1 = { ...mockDevice, id: 'device1', status: 'online' as const };
      const device2 = { ...mockDevice, id: 'device2', status: 'offline' as const };
      
      hardwareAPI['devices'].set('device1', device1);
      hardwareAPI['devices'].set('device2', device2);

      const connectedDevices = hardwareAPI.getConnectedDevices();

      expect(connectedDevices).toHaveLength(1);
      expect(connectedDevices[0].id).toBe('device1');
    });

    it('should disconnect device', async () => {
      hardwareAPI['devices'].set('device123', mockDevice);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await hardwareAPI.disconnectDevice('device123');

      const device = hardwareAPI.getDevice('device123');
      expect(device?.status).toBe('offline');
    });
  });

  describe('Session Management', () => {
    const mockDevice: PiDevice = {
      id: 'device123',
      name: 'TestDevice',
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

    const sessionRequest = {
      sessionId: 'session123',
      userId: 'user123',
      settings: {
        targetDistance: 10,
        targetSize: 5,
        zoomPreset: 2,
        detectionSensitivity: 0.8
      }
    };

    beforeEach(() => {
      hardwareAPI['devices'].set('device123', mockDevice);
    });

    it('should start session successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            deviceId: 'device123',
            sessionId: 'session123',
            status: 'active',
            startTime: new Date().toISOString(),
            settings: sessionRequest.settings,
            shotCount: 0
          }
        })
      } as Response);

      const session = await hardwareAPI.startSession('device123', sessionRequest);

      expect(session.sessionId).toBe('session123');
      expect(session.deviceId).toBe('device123');
      expect(session.status).toBe('active');
      expect(hardwareAPI.getActiveSessions()).toContain(session);
    });

    it('should handle session start failure', async () => {
      // Connect to device first
      const qrData = 'GMShoot://device123|TestDevice|192.168.1.100|8080';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, ngrokUrl: 'https://abc123.ngrok.io' })
      } as Response);
      await hardwareAPI.connectViaQRCode(qrData);

      // Reset mock for session start
      mockFetch.mockReset();
      
      // Mock a failed response - makeRequest returns success: false
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Session start failed' })
      } as Response);

      await expect(hardwareAPI.startSession('device123', sessionRequest)).rejects.toThrow('Session start failed');
    });

    it('should stop session successfully', async () => {
      // First start a session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            deviceId: 'device123',
            sessionId: 'session123',
            status: 'active',
            startTime: new Date().toISOString(),
            settings: sessionRequest.settings,
            shotCount: 0
          }
        })
      } as Response);

      const session = await hardwareAPI.startSession('device123', sessionRequest);

      // Then stop it
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          timestamp: new Date().toISOString()
        })
      } as Response);

      // stopSession returns void, not a boolean
      await hardwareAPI.stopSession(session.sessionId, 'user');

      const stoppedSession = hardwareAPI.getSession(session.sessionId);
      expect(stoppedSession?.status).toBe('completed');
      expect(stoppedSession?.endTime).toBeDefined();
    });

    it('should get active sessions', () => {
      const session1: SessionData = {
        sessionId: 'session1',
        deviceId: 'device123',
        startTime: new Date(),
        shotCount: 0,
        status: 'active',
        settings: {
          targetDistance: 10,
          targetSize: 5,
          scoringZones: [],
          detectionSensitivity: 0.8
        }
      };

      const session2: SessionData = {
        ...session1,
        sessionId: 'session2',
        status: 'completed' as const
      };

      hardwareAPI['activeSessions'].set('session1', session1);
      hardwareAPI['activeSessions'].set('session2', session2);

      const activeSessions = hardwareAPI.getActiveSessions();

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].sessionId).toBe('session1');
    });
  });

  describe('Frame Management', () => {
    const mockDevice: PiDevice = {
      id: 'device123',
      name: 'TestDevice',
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
      hardwareAPI['devices'].set('device123', mockDevice);
    });

    it('should get latest frame successfully', async () => {
      const mockFrameData = {
        frameNumber: 0, // API returns 0 for first frame
        timestamp: '2023-10-23T10:00:00Z',
        imageUrl: 'data:image/jpeg;base64,test', // Use simpler test data
        hasShot: false,
        previousFrameNumber: -1,
        metadata: {
          resolution: '1920x1080',
          brightness: 50,
          contrast: 50
        }
      };

      // Clear any previous mocks
      mockFetch.mockReset();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => (mockFrameData)
      } as Response);

      const frame = await hardwareAPI.getLatestFrame('device123');

      expect(frame.frameNumber).toBe(0);
      expect(frame.hasShot).toBe(false);
      expect(frame.imageUrl).toBe(mockFrameData.imageUrl);
    });

    it('should get next frame with shot detection', async () => {
      // Start a session first
      const sessionRequest = {
        sessionId: 'session123',
        userId: 'user123',
        settings: { targetDistance: 10, targetSize: 5, detectionSensitivity: 0.8 }
      };

      // Clear any previous mocks
      mockFetch.mockReset();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            deviceId: 'device123',
            sessionId: 'session123',
            status: 'active',
            startTime: new Date().toISOString(),
            settings: sessionRequest.settings,
            shotCount: 0
          }
        })
      } as Response);

      await hardwareAPI.startSession('device123', sessionRequest);

      const mockFrameData = {
        frameNumber: 2,
        timestamp: '2023-10-23T10:00:01Z',
        imageUrl: 'data:image/jpeg;base64,test', // Use simpler test data
        hasShot: true,
        previousFrameNumber: 1,
        shotData: {
          shotId: 'shot1',
          sessionId: 'session123',
          timestamp: '2023-10-23T10:00:01Z',
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

      // Get next frame
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => (mockFrameData)
      } as Response);

      const frame = await hardwareAPI.getNextFrame('device123');

      expect(frame.hasShot).toBe(true);
      expect(frame.shotData?.score).toBe(10);
      expect(frame.shotData?.scoringZone).toBe('bullseye');

      const session = hardwareAPI.getSession('session123');
      expect(session?.shotCount).toBe(1);
    });

    it('should set zoom preset', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await hardwareAPI.setZoomPreset('device123', 3);

      expect(mockFetch).toHaveBeenCalledWith(
        '192.168.1.100:8080/zoom/preset',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ preset: 3 })
        })
      );
    });
  });

  describe('Scoring Algorithm', () => {
    const scoringZones = [
      { id: 'bullseye', name: 'Bullseye', points: 10, radius: 5, color: '#FF0000' },
      { id: 'inner', name: 'Inner Ring', points: 9, radius: 10, color: '#FF4500' },
      { id: 'middle', name: 'Middle Ring', points: 8, radius: 20, color: '#FFA500' },
      { id: 'outer', name: 'Outer Ring', points: 7, radius: 30, color: '#FFFF00' },
      { id: 'edge', name: 'Edge', points: 6, radius: 40, color: '#00FF00' },
      { id: 'miss', name: 'Miss', points: 0, radius: 100, color: '#808080' }
    ];

    it('should calculate bullseye score correctly', () => {
      const result = hardwareAPI.calculateShotScore(50, 50, scoringZones);

      expect(result.score).toBe(10);
      expect(result.zone.id).toBe('bullseye');
    });

    it('should calculate inner ring score correctly', () => {
      const result = hardwareAPI.calculateShotScore(57, 50, scoringZones);

      expect(result.score).toBe(9);
      expect(result.zone.id).toBe('inner');
    });

    it('should calculate miss score correctly', () => {
      const result = hardwareAPI.calculateShotScore(95, 95, scoringZones);

      expect(result.score).toBe(0);
      expect(result.zone.id).toBe('miss');
    });
  });

  describe('Sequential Shot Detection', () => {
    it('should detect new shot correctly', () => {
      const previousFrame: FrameData = {
        frameNumber: 1,
        timestamp: new Date(),
        imageUrl: 'frame1.jpg',
        hasShot: false,
        metadata: { resolution: '1920x1080', brightness: 50, contrast: 50 }
      };

      const currentFrame: FrameData = {
        frameNumber: 2,
        timestamp: new Date(),
        imageUrl: 'frame2.jpg',
        hasShot: true,
        shotData: {
          shotId: 'shot1',
          sessionId: 'session123',
          timestamp: new Date(),
          frameNumber: 2,
          coordinates: { x: 50, y: 50 },
          score: 10,
          scoringZone: 'bullseye',
          confidence: 0.95
        },
        metadata: { resolution: '1920x1080', brightness: 50, contrast: 50 }
      };

      const hasNewShot = hardwareAPI.detectSequentialShot(previousFrame, currentFrame);

      expect(hasNewShot).toBe(true);
    });

    it('should not detect shot when none present', () => {
      const previousFrame: FrameData = {
        frameNumber: 1,
        timestamp: new Date(),
        imageUrl: 'frame1.jpg',
        hasShot: false,
        metadata: { resolution: '1920x1080', brightness: 50, contrast: 50 }
      };

      const currentFrame: FrameData = {
        frameNumber: 2,
        timestamp: new Date(),
        imageUrl: 'frame2.jpg',
        hasShot: false,
        metadata: { resolution: '1920x1080', brightness: 50, contrast: 50 }
      };

      const hasNewShot = hardwareAPI.detectSequentialShot(previousFrame, currentFrame);

      expect(hasNewShot).toBe(false);
    });
  });

  describe('Event System', () => {
    it('should add and trigger event listeners', () => {
      const mockCallback = jest.fn();
      
      hardwareAPI.addEventListener('deviceConnected', mockCallback);
      
      const device: PiDevice = {
        id: 'device123',
        name: 'TestDevice',
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

      hardwareAPI['emit']('deviceConnected', device);

      expect(mockCallback).toHaveBeenCalledWith(device);
    });

    it('should remove event listeners', () => {
      const mockCallback = jest.fn();
      
      hardwareAPI.addEventListener('deviceConnected', mockCallback);
      hardwareAPI.removeEventListener('deviceConnected', mockCallback);
      
      const device: PiDevice = {
        id: 'device123',
        name: 'TestDevice',
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

      hardwareAPI['emit']('deviceConnected', device);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all resources', () => {
      const device: PiDevice = {
        id: 'device123',
        name: 'TestDevice',
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
        sessionId: 'session123',
        deviceId: 'device123',
        startTime: new Date(),
        shotCount: 0,
        status: 'active',
        settings: {
          targetDistance: 10,
          targetSize: 5,
          scoringZones: [],
          detectionSensitivity: 0.8
        }
      };

      hardwareAPI['devices'].set('device123', device);
      hardwareAPI['activeSessions'].set('session123', session);

      hardwareAPI.cleanup();

      expect(hardwareAPI.getConnectedDevices()).toHaveLength(0);
      expect(hardwareAPI.getActiveSessions()).toHaveLength(0);
    });
  });
});
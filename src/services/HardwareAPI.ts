/**
 * HardwareAPI Service
 *
 * This service handles communication with the Raspberry Pi server for real-time shooting analysis.
 * It provides methods for device discovery, session management, and real-time data retrieval.
 */

import { geometricScoring, type Point, type TargetConfig, type ShotResult } from './GeometricScoring';
import { sequentialShotDetection, type SequentialDetectionConfig, type SessionShotHistory } from './SequentialShotDetection';
import { hardwareAuth, type HardwareAuthToken } from './HardwareAuth';

export interface PiDevice {
  id: string;
  name: string;
  url: string;
  ngrokUrl?: string;
  status: 'online' | 'offline' | 'connecting';
  lastSeen: Date;
  capabilities: {
    hasCamera: boolean;
    hasZoom: boolean;
    maxResolution: string;
    supportedFormats: string[];
  };
}

export interface SessionData {
  sessionId: string;
  deviceId: string;
  startTime: Date;
  endTime?: Date;
  shotCount: number;
  status: 'active' | 'paused' | 'completed' | 'emergency_stopped';
  settings: {
    targetDistance: number;
    targetSize: number;
    scoringZones: ScoringZone[];
    zoomPreset?: number;
    detectionSensitivity: number;
  };
}

export interface ScoringZone {
  id: string;
  name: string;
  points: number;
  radius: number; // Distance from center in percentage
  color: string;
}

export interface ShotData {
  shotId: string;
  sessionId: string;
  timestamp: Date;
  frameNumber: number;
  coordinates: {
    x: number; // 0-100 (percentage from left)
    y: number; // 0-100 (percentage from top)
  };
  score: number;
  scoringZone: string;
  confidence: number;
  imageUrl?: string;
  // Enhanced scoring data from GeometricScoring
  rawDistance?: number;
  correctedDistance?: number;
  isBullseye?: boolean;
  angleFromCenter?: number;
  compensatedScore?: number;
  analysis?: {
    precision: number;
    grouping?: number;
    trend?: 'improving' | 'declining' | 'stable';
  };
  // Sequential detection data
  sequentialShotNumber?: number;
  sequentialConfidence?: number;
}

export interface FrameData {
  frameNumber: number;
  timestamp: Date;
  imageUrl: string;
  hasShot: boolean;
  shotData?: ShotData;
  metadata: {
    resolution: string;
    brightness: number;
    contrast: number;
    predictions?: any[]; // Add predictions for ML analysis
  };
}

export interface PiServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface SessionStartRequest {
  sessionId: string;
  userId: string;
  settings: {
    targetDistance: number;
    targetSize: number;
    zoomPreset?: number;
    detectionSensitivity: number;
  };
}

export interface SessionStopRequest {
  sessionId: string;
  reason: 'user' | 'timeout' | 'error';
}

export class HardwareAPI {
  private devices: Map<string, PiDevice> = new Map();
  private activeSessions: Map<string, SessionData> = new Map();
  private sessionShots: Map<string, any[]> = new Map(); // Track shots per session for geometric analysis
  private sequentialSessions: Map<string, boolean> = new Map(); // Track sessions with sequential detection enabled
  private eventListeners: Map<string, Function[]> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();
  private supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
  private supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  private userId: string | null = null;

  constructor() {
    this.initializeEventListeners();
    // Load stored credentials for current user
    this.loadUserCredentials();
  }

  /**
   * Initialize event listeners for real-time updates
   */
  private initializeEventListeners(): void {
    // Set up default event listeners
    this.eventListeners.set('deviceConnected', []);
    this.eventListeners.set('deviceDisconnected', []);
    this.eventListeners.set('sessionStarted', []);
    this.eventListeners.set('sessionEnded', []);
    this.eventListeners.set('shotDetected', []);
    this.eventListeners.set('frameUpdated', []);
    this.eventListeners.set('error', []);
  }

  /**
   * Add event listener for hardware events
   */
  public addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Set current user ID for authentication
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    this.loadUserCredentials();
  }

  /**
   * Load stored credentials for current user
   */
  private loadUserCredentials(): void {
    if (this.userId) {
      hardwareAuth.loadStoredCredentials(this.userId);
    }
  }

  /**
   * Parse QR code data to extract Pi server information
   */
  public parseQRCode(qrData: string): PiDevice | null {
    try {
      // Expected QR code format: "GMShoot://device_id|name|url|port"
      const match = qrData.match(/^GMShoot:\/\/(.+?)\|(.+?)\|(.+?)\|(\d+)$/);
      if (!match) {
        throw new Error('Invalid QR code format');
      }

      const [, deviceId, name, url, port] = match;
      
      const device: PiDevice = {
        id: deviceId,
        name,
        url: `${url}:${port}`,
        status: 'offline',
        lastSeen: new Date(),
        capabilities: {
          hasCamera: true,
          hasZoom: true,
          maxResolution: '1920x1080',
          supportedFormats: ['jpeg', 'png']
        }
      };

      return device;
    } catch (error) {
      console.error('Failed to parse QR code:', error);
      return null;
    }
  }

  /**
   * Connect to Pi device via QR code
   */
  public async connectViaQRCode(qrData: string): Promise<PiDevice> {
    if (!this.userId) {
      throw new Error('User must be authenticated to connect to devices');
    }

    const device = this.parseQRCode(qrData);
    if (!device) {
      throw new Error('Invalid QR code data');
    }

    try {
      // Generate API key for this device
      const apiKey = hardwareAuth.generateApiKey(device.id, this.userId, ['read', 'write', 'session']);
      
      // Test connection to device
      const response = await this.makeAuthenticatedRequest(device.url, '/ping', 'GET', null, device.id);
      if (response.success) {
        device.status = 'online';
        device.lastSeen = new Date();
        
        // Check for ngrok URL
        if (response.data?.ngrokUrl) {
          device.ngrokUrl = response.data.ngrokUrl;
        }

        this.devices.set(device.id, device);
        this.emit('deviceConnected', device);
        
        return device;
      } else {
        throw new Error(response.error || 'Device connection failed');
      }
    } catch (error) {
      device.status = 'offline';
      // Don't double-wrap the error message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to connect to device: ${error}`);
    }
  }

  /**
   * Get list of connected devices
   */
  public getConnectedDevices(): PiDevice[] {
    return Array.from(this.devices.values()).filter(device => device.status === 'online');
  }

  /**
   * Get device by ID
   */
  public getDevice(deviceId: string): PiDevice | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Disconnect from device
   */
  public async disconnectDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Close WebSocket connection if exists
    const ws = this.wsConnections.get(deviceId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(deviceId);
    }

    // Stop any active sessions
    const deviceSessions = Array.from(this.activeSessions.values())
      .filter(session => session.deviceId === deviceId);
    
    for (const session of deviceSessions) {
      await this.stopSession(session.sessionId, 'user');
    }

    device.status = 'offline';
    this.emit('deviceDisconnected', device);
  }

  /**
   * Start shooting session
   */
  public async startSession(deviceId: string, request: SessionStartRequest): Promise<SessionData> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    if (device.status !== 'online') {
      throw new Error('Device is not online');
    }

    try {
      const response = await this.makeRequest(device.url, '/session/start', 'POST', request);
      
      if (response.success) {
        const sessionData: SessionData = {
          sessionId: request.sessionId,
          deviceId,
          startTime: new Date(),
          shotCount: 0,
          status: 'active',
          settings: {
            targetDistance: request.settings.targetDistance,
            targetSize: request.settings.targetSize,
            scoringZones: this.getDefaultScoringZones(),
            zoomPreset: request.settings.zoomPreset,
            detectionSensitivity: request.settings.detectionSensitivity
          }
        };

        this.activeSessions.set(request.sessionId, sessionData);
        this.sessionShots.set(request.sessionId, []); // Initialize shot tracking
        this.sequentialSessions.set(request.sessionId, true); // Enable sequential detection
        sequentialShotDetection.initializeSession(request.sessionId); // Initialize sequential detection
        
        // Register session with Supabase for real-time data ingestion
        await this.registerSessionWithSupabase(request.sessionId, deviceId, request.userId);
        
        this.emit('sessionStarted', sessionData);

        // Establish WebSocket connection for real-time updates
        this.establishWebSocketConnection(deviceId, request.sessionId);

        return sessionData;
      } else {
        throw new Error(response.error || 'Failed to start session');
      }
    } catch (error) {
      // Don't double-wrap the error message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to start session: ${error}`);
    }
  }

  /**
   * Stop shooting session
   */
  public async stopSession(sessionId: string, reason: 'user' | 'timeout' | 'error' = 'user'): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const device = this.devices.get(session.deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      const request: SessionStopRequest = { sessionId, reason };
      const response = await this.makeRequest(device.url, '/session/stop', 'POST', request);

      if (response.success) {
        session.endTime = new Date();
        session.status = 'completed';
        
        // Clean up sequential detection for this session
        if (this.sequentialSessions.get(sessionId)) {
          sequentialShotDetection.clearSession(sessionId);
          this.sequentialSessions.delete(sessionId);
        }
        
        this.emit('sessionEnded', session);

        // Close WebSocket connection
        const ws = this.wsConnections.get(session.deviceId);
        if (ws) {
          ws.close();
          this.wsConnections.delete(session.deviceId);
        }
      } else {
        throw new Error(response.error || 'Failed to stop session');
      }
    } catch (error) {
      throw new Error(`Failed to stop session: ${error}`);
    }
  }

  /**
   * Get latest frame from device
   */
  public async getLatestFrame(deviceId: string): Promise<FrameData> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      const response = await this.makeRequest(device.url, '/frame/latest', 'GET');
      
      if (response.success) {
        return this.parseFrameData(response.data);
      } else {
        throw new Error(response.error || 'Failed to get latest frame');
      }
    } catch (error) {
      throw new Error(`Failed to get latest frame: ${error}`);
    }
  }

  /**
   * Get next frame (with new shot detection)
   */
  public async getNextFrame(deviceId: string): Promise<FrameData> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      const response = await this.makeRequest(device.url, '/frame/next', 'GET');
      
      if (response.success) {
        const frameData = this.parseFrameData(response.data);
        
        // Process frame through sequential shot detection if enabled
        const session = Array.from(this.activeSessions.values())
          .find(s => s.deviceId === deviceId && s.status === 'active');
        
        if (session && this.sequentialSessions.get(session.sessionId)) {
          try {
            // Convert frame data to sequential detection format
            const seqFrameData = {
              id: `frame_${frameData.frameNumber}`,
              timestamp: frameData.timestamp.getTime(),
              imageData: frameData.imageUrl, // In real implementation, this would be actual image data
              width: 1920, // Default resolution
              height: 1080
            };
            
            // Process through sequential detection
            const sequentialResult = await sequentialShotDetection.processFrame(session.sessionId, seqFrameData);
            
            // If sequential detection found a new shot, enhance the frame data
            if (sequentialResult && sequentialResult.isNewShot) {
              console.log(`Sequential detection: Shot #${sequentialResult.shotNumber} detected at position (${sequentialResult.position.x}, ${sequentialResult.position.y})`);
              
              // Add sequential shot number to existing shot data or create new shot data
              if (frameData.shotData) {
                frameData.shotData.shotId = `${frameData.shotData.shotId}_seq${sequentialResult.shotNumber}`;
                // Store sequential shot number for reference
                (frameData.shotData as any).sequentialShotNumber = sequentialResult.shotNumber;
                (frameData.shotData as any).sequentialConfidence = sequentialResult.confidence;
              }
            }
          } catch (seqError) {
            console.warn('Sequential shot detection failed:', seqError);
            // Continue with normal processing if sequential detection fails
          }
        }
        
        if (frameData.hasShot && frameData.shotData) {
          // Update session shot count
          if (session) {
            session.shotCount++;
            this.emit('shotDetected', frameData.shotData);
          }
        }
        
        this.emit('frameUpdated', frameData);
        return frameData;
      } else {
        throw new Error(response.error || 'Failed to get next frame');
      }
    } catch (error) {
      throw new Error(`Failed to get next frame: ${error}`);
    }
  }

  /**
   * Set camera zoom preset
   */
  public async setZoomPreset(deviceId: string, preset: number): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      const response = await this.makeRequest(device.url, '/zoom/preset', 'POST', { preset });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to set zoom preset');
      }
    } catch (error) {
      throw new Error(`Failed to set zoom preset: ${error}`);
    }
  }

  /**
   * Get active sessions
   */
  public getActiveSessions(): SessionData[] {
    return Array.from(this.activeSessions.values()).filter(session => session.status === 'active');
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): SessionData | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Make HTTP request to Pi server
   */
  private async makeRequest(
    baseUrl: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<PiServerResponse> {
    return this.makeAuthenticatedRequest(baseUrl, endpoint, method, data);
  }

  /**
   * Make authenticated HTTP request to Pi server
   */
  private async makeAuthenticatedRequest(
    baseUrl: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    deviceId?: string
  ): Promise<PiServerResponse> {
    const url = `${baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GMShooter-Client/1.0'
      }
    };

    // Add authentication header if deviceId is provided
    if (deviceId && this.userId) {
      try {
        const token = hardwareAuth.getToken(deviceId);
        if (token) {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token.token}`
          };
        } else {
          // Try to refresh token
          const refreshedToken = await hardwareAuth.refreshToken(deviceId, this.userId);
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${refreshedToken.token}`
          };
        }
      } catch (error) {
        console.warn('Failed to authenticate request:', error);
        // Continue without auth for initial connection attempts
      }
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const responseData = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async registerSessionWithSupabase(sessionId: string, deviceId: string, userId: string): Promise<void> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) return;

      // Register device with Supabase for data ingestion
      const registrationData = {
        deviceId: device.id,
        apiKey: 'default-key', // In production, this should be securely generated
        userId,
        deviceData: {
          name: device.name,
          connectionUrl: device.url,
          qrCodeData: `GMShoot://${device.id}|${device.name}|${device.url}|8080`,
          config: device.capabilities
        }
      };

      const response = await fetch(`${this.supabaseUrl}/functions/v1/session-data/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`
        },
        body: JSON.stringify(registrationData)
      });

      if (!response.ok) {
        console.warn('Failed to register device with Supabase:', await response.text());
      }
    } catch (error) {
      console.error('Error registering session with Supabase:', error);
    }
  }

  private async sendSessionDataToSupabase(
    sessionId: string,
    deviceId: string,
    data: any
  ): Promise<void> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) return;

      const ingestionData = {
        sessionId,
        deviceId,
        timestamp: new Date().toISOString(),
        ...data
      };

      const response = await fetch(`${this.supabaseUrl}/functions/v1/session-data/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${device.id}:default-key`
        },
        body: JSON.stringify(ingestionData)
      });

      if (!response.ok) {
        console.error('Failed to send session data to Supabase:', await response.text());
      }
    } catch (error) {
      console.error('Error sending session data to Supabase:', error);
    }
  }

  /**
   * Parse frame data from Pi server response
   */
  private parseFrameData(data: any): FrameData {
    return {
      frameNumber: data.frameNumber || 0,
      timestamp: new Date(data.timestamp || Date.now()),
      imageUrl: data.imageUrl || '',
      hasShot: data.hasShot || false,
      shotData: data.shotData ? this.enhanceShotData(data.shotData) : undefined,
      metadata: {
        resolution: data.metadata?.resolution || '1920x1080',
        brightness: data.metadata?.brightness || 50,
        contrast: data.metadata?.contrast || 50
      }
    };
  }

  /**
   * Establish WebSocket connection for real-time updates
   */
  private establishWebSocketConnection(deviceId: string, sessionId: string): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const wsUrl = device.ngrokUrl
      ? device.ngrokUrl.replace('http', 'ws')
      : device.url.replace('http', 'ws');
    
    const ws = new WebSocket(`${wsUrl}/ws/${sessionId}`);

    ws.onopen = () => {
      console.log(`WebSocket connected to device ${deviceId}`);
      this.emit('websocketConnected', { deviceId, sessionId });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'frame_update') {
          const frameData = this.parseFrameData(data.payload);
          this.emit('frameUpdated', frameData);
          
          // Ingest frame data to Supabase
          this.ingestFrameData(sessionId, frameData);
        } else if (data.type === 'shot_detected') {
          const shotData = this.parseFrameData(data.payload).shotData;
          if (shotData) {
            this.emit('shotDetected', shotData);
            
            // Ingest shot data to Supabase
            this.ingestShotData(sessionId, shotData);
          }
        } else if (data.type === 'session_status') {
          this.emit('sessionStatusChanged', {
            sessionId,
            status: data.payload.status
          });
        } else if (data.type === 'device_status') {
          this.emit('deviceStatusChanged', {
            deviceId,
            status: data.payload.status
          });
        } else if (data.type === 'error') {
          this.emit('error', {
            type: 'hardware_error',
            deviceId,
            error: data.payload.error
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.emit('error', {
          type: 'websocket_parse_error',
          deviceId,
          error
        });
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for device ${deviceId}:`, error);
      this.emit('error', { type: 'websocket_error', deviceId, error });
      
      // Attempt to reconnect after delay
      setTimeout(() => {
        if (this.activeSessions.has(sessionId)) {
          console.log(`Attempting to reconnect WebSocket for device ${deviceId}...`);
          this.establishWebSocketConnection(deviceId, sessionId);
        }
      }, 5000); // Reconnect after 5 seconds
    };

    ws.onclose = (event) => {
      console.log(`WebSocket disconnected from device ${deviceId}, code: ${event.code}, reason: ${event.reason}`);
      this.wsConnections.delete(deviceId);
      this.emit('websocketDisconnected', { deviceId, sessionId, code: event.code, reason: event.reason });
      
      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && this.activeSessions.has(sessionId)) {
        setTimeout(() => {
          console.log(`Attempting to reconnect WebSocket for device ${deviceId}...`);
          this.establishWebSocketConnection(deviceId, sessionId);
        }, 5000); // Reconnect after 5 seconds
      }
    };

    this.wsConnections.set(deviceId, ws);
  }

  /**
   * Send message through WebSocket connection
   */
  public sendWebSocketMessage(deviceId: string, message: any): void {
    const ws = this.wsConnections.get(deviceId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn(`WebSocket not connected to device ${deviceId}`);
      return;
    }

    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send WebSocket message to device ${deviceId}:`, error);
      this.emit('error', {
        type: 'websocket_send_error',
        deviceId,
        error
      });
    }
  }

  /**
   * Get WebSocket connection status
   */
  public getWebSocketStatus(deviceId: string): {
    connected: boolean;
    readyState: number;
  } {
    const ws = this.wsConnections.get(deviceId);
    return {
      connected: ws?.readyState === WebSocket.OPEN,
      readyState: ws?.readyState || WebSocket.CLOSED
    };
  }

  /**
   * Close WebSocket connection
   */
  public closeWebSocketConnection(deviceId: string): void {
    const ws = this.wsConnections.get(deviceId);
    if (ws) {
      ws.close(1000, 'Connection closed by client');
      this.wsConnections.delete(deviceId);
    }
  }

  /**
   * Get default scoring zones for target
   */
  private getDefaultScoringZones(): ScoringZone[] {
    return [
      { id: 'bullseye', name: 'Bullseye', points: 10, radius: 5, color: '#FF0000' },
      { id: 'inner', name: 'Inner Ring', points: 9, radius: 10, color: '#FF4500' },
      { id: 'middle', name: 'Middle Ring', points: 8, radius: 20, color: '#FFA500' },
      { id: 'outer', name: 'Outer Ring', points: 7, radius: 30, color: '#FFFF00' },
      { id: 'edge', name: 'Edge', points: 6, radius: 40, color: '#00FF00' },
      { id: 'miss', name: 'Miss', points: 0, radius: 100, color: '#808080' }
    ];
  }

  /**
   * Enhance shot data with advanced geometric scoring
   */
  private enhanceShotData(shotData: any): ShotData {
    const point: Point = {
      x: shotData.coordinates?.x || 50,
      y: shotData.coordinates?.y || 50
    };

    // Get session data for target configuration
    const session = this.activeSessions.get(shotData.sessionId);
    if (!session) {
      // Fallback to basic scoring if session not found
      const basicScore = this.calculateBasicShotScore(point.x, point.y);
      return {
        shotId: shotData.shotId || `shot_${Date.now()}`,
        sessionId: shotData.sessionId || '',
        timestamp: new Date(shotData.timestamp || Date.now()),
        frameNumber: shotData.frameNumber || 0,
        coordinates: point,
        score: basicScore.score,
        scoringZone: basicScore.zone.id,
        confidence: shotData.confidence || 0,
        imageUrl: shotData.imageUrl
      };
    }

    // Create target configuration for geometric scoring
    const targetConfig: TargetConfig = {
      targetDistance: session.settings.targetDistance,
      targetSize: session.settings.targetSize,
      targetType: 'circular',
      scoringZones: session.settings.scoringZones.map(zone => ({
        ...zone,
        innerRadius: zone.id === 'bullseye' ? 0 : zone.radius - 5,
        outerRadius: zone.radius
      })),
      cameraAngle: 0, // Could be configured per device
      lensDistortion: 0 // Could be configured per device
    };

    // Get previous shots for analysis
    const previousShots = this.sessionShots.get(shotData.sessionId) || [];

    // Use geometric scoring for enhanced analysis
    const enhancedResult = geometricScoring.analyzeShot(
      shotData.shotId || `shot_${Date.now()}`,
      point,
      targetConfig,
      previousShots
    );

    // Store the enhanced shot for future analysis
    this.sessionShots.set(shotData.sessionId, [...previousShots, enhancedResult]);

    // Convert enhanced result back to ShotData format
    return {
      shotId: enhancedResult.shotId,
      sessionId: shotData.sessionId || '',
      timestamp: new Date(shotData.timestamp || Date.now()),
      frameNumber: shotData.frameNumber || 0,
      coordinates: enhancedResult.coordinates,
      score: enhancedResult.score,
      scoringZone: enhancedResult.scoringZone.id,
      confidence: enhancedResult.confidence,
      imageUrl: shotData.imageUrl,
      rawDistance: enhancedResult.rawDistance,
      correctedDistance: enhancedResult.correctedDistance,
      isBullseye: enhancedResult.isBullseye,
      angleFromCenter: enhancedResult.angleFromCenter,
      compensatedScore: enhancedResult.compensatedScore,
      analysis: enhancedResult.analysis
    };
  }

  /**
   * Calculate basic shot score (fallback method)
   */
  private calculateBasicShotScore(x: number, y: number): { score: number; zone: ScoringZone } {
    // Calculate distance from center (50, 50)
    const centerX = 50;
    const centerY = 50;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

    // Find the appropriate scoring zone - sort by radius (smallest first) to get correct zone
    const defaultZones = this.getDefaultScoringZones();
    const sortedZones = defaultZones.sort((a, b) => a.radius - b.radius);
    
    for (const zone of sortedZones) {
      if (distance <= zone.radius) {
        return { score: zone.points, zone };
      }
    }

    // If no zone matched, it's a miss
    const missZone = defaultZones.find(z => z.id === 'miss') || defaultZones[defaultZones.length - 1];
    return { score: missZone.points, zone: missZone };
  }

  /**
   * Calculate shot score based on coordinates (legacy method for compatibility)
   */
  public calculateShotScore(x: number, y: number, scoringZones: ScoringZone[]): { score: number; zone: ScoringZone } {
    return this.calculateBasicShotScore(x, y);
  }

  /**
   * Detect sequential shots by comparing frames with enhanced logic
   */
  public detectSequentialShot(previousFrame: FrameData, currentFrame: FrameData): boolean {
    if (!previousFrame || !currentFrame) return false;

    // Basic shot detection
    const prevHasShot = previousFrame.hasShot;
    const currHasShot = currentFrame.hasShot;

    // Enhanced detection: check if it's a new shot (not same shot persisting)
    if (!prevHasShot && currHasShot) {
      return true;
    }

    // Additional logic: detect shot sequence based on timing
    if (prevHasShot && currHasShot &&
        previousFrame.shotData && currentFrame.shotData &&
        previousFrame.shotData.shotId !== currentFrame.shotData.shotId) {
      return true;
    }

    return false;
  }

  /**
   * Get session statistics using geometric scoring
   */
  public getSessionStatistics(sessionId: string): any {
    const shots = this.sessionShots.get(sessionId) || [];
    if (shots.length === 0) {
      return null;
    }

    return geometricScoring.calculateSessionStatistics(shots);
  }

  /**
   * Get shooting recommendations for a session
   */
  public getSessionRecommendations(sessionId: string): string[] {
    const stats = this.getSessionStatistics(sessionId);
    if (!stats) {
      return ['No shots recorded yet'];
    }

    return geometricScoring.generateRecommendations(stats);
  }

  /**
   * Get shot pattern visualization
   */
  public getShotPatternVisualization(sessionId: string): string {
    const shots = this.sessionShots.get(sessionId) || [];
    return geometricScoring.generateShotPatternVisualization(shots);
  }

  /**
   * Get sequential shot detection statistics for a session
   */
  public getSequentialDetectionStatistics(sessionId: string): any {
    if (!this.sequentialSessions.get(sessionId)) {
      return null;
    }
    
    return sequentialShotDetection.getSessionStatistics(sessionId);
  }

  /**
   * Get sequential shot history for a session
   */
  public getSequentialShotHistory(sessionId: string): any[] {
    if (!this.sequentialSessions.get(sessionId)) {
      return [];
    }
    
    return sequentialShotDetection.getSessionShots(sessionId);
  }

  /**
   * Update sequential detection configuration
   */
  public updateSequentialDetectionConfig(config: Partial<SequentialDetectionConfig>): void {
    sequentialShotDetection.updateConfig(config);
  }

  /**
   * Get current sequential detection configuration
   */
  public getSequentialDetectionConfig(): SequentialDetectionConfig {
    return sequentialShotDetection.getConfig();
  }

  /**
   * Get session status from Pi server
   */
  public async getSessionStatus(sessionId: string): Promise<{
    isActive: boolean;
    sessionId?: string;
    shotCount?: number;
    uptime?: number;
    isPaused?: boolean;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const device = this.devices.get(session.deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      const response = await this.makeRequest(device.url, '/session/status', 'GET');
      
      if (response.success) {
        return {
          isActive: response.data.isActive || session.status === 'active',
          sessionId: response.data.sessionId || sessionId,
          shotCount: response.data.shotCount || session.shotCount,
          uptime: response.data.uptime || 0,
          isPaused: response.data.isPaused || session.status === 'paused'
        };
      } else {
        throw new Error(response.error || 'Failed to get session status');
      }
    } catch (error) {
      throw new Error(`Failed to get session status: ${error}`);
    }
  }

  /**
   * Pause/resume session
   */
  public async toggleSessionPause(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const device = this.devices.get(session.deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      const isCurrentlyPaused = session.status === 'paused';
      const response = await this.makeRequest(device.url, '/session/pause', 'POST', {
        pause: !isCurrentlyPaused
      });
      
      if (response.success) {
        // Update local session state
        session.status = isCurrentlyPaused ? 'active' : 'paused';
        
        // Ingest pause/resume event
        await this.ingestSessionEvent(sessionId, isCurrentlyPaused ? 'session_resumed' : 'session_paused', {
          timestamp: new Date().toISOString(),
          previousState: isCurrentlyPaused ? 'paused' : 'active'
        });
        
        this.emit('sessionStatusChanged', { sessionId, status: session.status });
      } else {
        throw new Error(response.error || 'Failed to toggle session pause');
      }
    } catch (error) {
      throw new Error(`Failed to toggle session pause: ${error}`);
    }
  }

  /**
   * Emergency stop session
   */
  public async emergencyStop(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const device = this.devices.get(session.deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      // Emergency stop on Pi server
      const response = await this.makeRequest(device.url, '/session/emergency-stop', 'POST', {});
      
      if (response.success) {
        // Update session status
        session.status = 'emergency_stopped';
        session.endTime = new Date();
        
        // Ingest emergency stop event
        await this.ingestSessionEvent(sessionId, 'session_emergency_stopped', {
          timestamp: new Date().toISOString(),
          reason: 'emergency_stop'
        });
        
        // Clean up sequential detection
        if (this.sequentialSessions.get(sessionId)) {
          sequentialShotDetection.clearSession(sessionId);
          this.sequentialSessions.delete(sessionId);
        }
        
        // Close WebSocket connection
        const ws = this.wsConnections.get(session.deviceId);
        if (ws) {
          ws.close();
          this.wsConnections.delete(session.deviceId);
        }
        
        this.emit('sessionEnded', session);
      } else {
        throw new Error(response.error || 'Failed to emergency stop session');
      }
    } catch (error) {
      console.error('Error during emergency stop:', error);
      // Even if Pi server communication fails, ensure local state is updated
      session.status = 'emergency_stopped';
      session.endTime = new Date();
      this.emit('sessionEnded', session);
      throw error;
    }
  }

  /**
   * Update session in Supabase
   */
  private async updateSessionInSupabase(
    sessionId: string,
    updates: Partial<{
      pi_session_id: string;
      status: string;
      started_at: string;
      ended_at: string;
    }>
  ): Promise<void> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/session-data/update-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
        },
        body: JSON.stringify({
          sessionId,
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating session in Supabase:', error);
      // Don't throw here - session update failures shouldn't stop the flow
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    // Close all WebSocket connections
    this.wsConnections.forEach(ws => ws.close());
    this.wsConnections.clear();

    // Clear all data
    this.devices.clear();
    this.activeSessions.clear();
    this.sessionShots.clear();
    this.sequentialSessions.clear();
    this.eventListeners.clear();
    
    // Cleanup sequential detection sessions
    sequentialShotDetection.getActiveSessions().forEach(sessionId => {
      sequentialShotDetection.clearSession(sessionId);
    });
  }

  // Enhanced session data ingestion methods
  public async ingestFrameData(sessionId: string, frameData: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Send to Supabase for real-time storage
    await this.sendSessionDataToSupabase(sessionId, session.deviceId, {
      frameData: {
        frameId: frameData.frameNumber,
        frameNumber: frameData.frameNumber,
        frameData: frameData.imageUrl || '', // Convert to base64 in production
        timestamp: frameData.timestamp.getTime(),
        predictions: frameData.predictions || []
      }
    });

    this.emit('frameUpdated', frameData);
  }

  public async ingestShotData(sessionId: string, shotData: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Process shot with geometric scoring
    const enhancedShot = this.enhanceShotData({
      ...shotData,
      sessionId
    });
    
    // Add to local session data
    const shots = this.sessionShots.get(sessionId) || [];
    shots.push(enhancedShot);
    this.sessionShots.set(sessionId, shots);
    
    // Update session shot count
    session.shotCount = shots.length;

    // Send to Supabase for real-time storage
    await this.sendSessionDataToSupabase(sessionId, session.deviceId, {
      shotData: {
        shotNumber: enhancedShot.shotId,
        x: enhancedShot.coordinates.x,
        y: enhancedShot.coordinates.y,
        score: enhancedShot.score,
        confidence: enhancedShot.confidence,
        frameId: enhancedShot.frameNumber,
        timestamp: enhancedShot.timestamp.toISOString(),
        sequentialData: {
          shotNumber: enhancedShot.shotId,
          confidence: enhancedShot.confidence
        },
        geometricData: {
          rawDistance: enhancedShot.rawDistance,
          correctedDistance: enhancedShot.correctedDistance,
          isBullseye: enhancedShot.isBullseye,
          angleFromCenter: enhancedShot.angleFromCenter,
          compensatedScore: enhancedShot.compensatedScore
        }
      }
    });

    this.emit('shotDetected', enhancedShot);
  }

  public async ingestSessionEvent(sessionId: string, eventType: string, eventData: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Send to Supabase for real-time storage
    await this.sendSessionDataToSupabase(sessionId, session.deviceId, {
      eventData: {
        eventType,
        eventData,
        timestamp: new Date().toISOString()
      }
    });

    this.emit('sessionEvent', { sessionId, eventType, eventData });
  }
}

// Export singleton instance
export const hardwareAPI = new HardwareAPI();
export default hardwareAPI;
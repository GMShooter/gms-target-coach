/**
 * HardwareAPI Service
 *
 * This service handles communication with the Raspberry Pi server for real-time shooting analysis.
 * It provides methods for device discovery, session management, and real-time data retrieval.
 */

import { geometricScoring, type Point, type TargetConfig, type ShotResult } from './GeometricScoring';
import { sequentialShotDetection, type SequentialDetectionConfig, type SessionShotHistory } from './SequentialShotDetection';

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
  status: 'active' | 'paused' | 'completed';
  settings: {
    targetDistance: number;
    targetSize: number;
    scoringZones: ScoringZone[];
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

  constructor() {
    this.initializeEventListeners();
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
    const device = this.parseQRCode(qrData);
    if (!device) {
      throw new Error('Invalid QR code data');
    }

    // Test connection to device
    try {
      const response = await this.makeRequest(device.url, '/ping', 'GET');
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
            scoringZones: this.getDefaultScoringZones()
          }
        };

        this.activeSessions.set(request.sessionId, sessionData);
        this.sessionShots.set(request.sessionId, []); // Initialize shot tracking
        this.sequentialSessions.set(request.sessionId, true); // Enable sequential detection
        sequentialShotDetection.initializeSession(request.sessionId); // Initialize sequential detection
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
    const url = `${baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GMShooter-Client/1.0'
      }
    };

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
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'frame_update') {
          const frameData = this.parseFrameData(data.payload);
          this.emit('frameUpdated', frameData);
        } else if (data.type === 'shot_detected') {
          const shotData = this.parseFrameData(data.payload).shotData;
          if (shotData) {
            this.emit('shotDetected', shotData);
          }
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for device ${deviceId}:`, error);
      this.emit('error', { type: 'websocket_error', deviceId, error });
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected from device ${deviceId}`);
      this.wsConnections.delete(deviceId);
    };

    this.wsConnections.set(deviceId, ws);
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
}

// Export singleton instance
export const hardwareAPI = new HardwareAPI();
export default hardwareAPI;
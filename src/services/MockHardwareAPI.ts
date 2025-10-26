/**
 * Mock Hardware API Service for Testing
 * Cycles through test frames 1-5 to simulate real hardware behavior
 */

// Import types from HardwareAPI to ensure compatibility
import { PiDevice, SessionData, FrameData, ShotData } from './HardwareAPI';

export interface MockHardwareResponse extends FrameData {
  // Additional mock-specific properties can be added here
}

export interface MockHardwareAPI {
  connectViaQRCode(qrData: string): Promise<PiDevice | null>;
  disconnectDevice(deviceId: string): Promise<void>;
  startSession(deviceId: string, sessionRequest: any): Promise<SessionData | null>;
  stopSession(sessionId: string): Promise<void>;
  getLatestFrame(deviceId: string): Promise<FrameData>;
  reset(): void;
}

class MockHardwareAPIImpl implements MockHardwareAPI {
  private currentFrame = 0;
  private readonly totalFrames = 5;
  private deviceId: string | null = null;
  private connected = false;

  async connectViaQRCode(qrData: string): Promise<PiDevice | null> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.connected = true;
    this.deviceId = 'mock-device-001';
    
    console.log('MockHardwareAPI: Connected to device via QR code');
    
    return {
      id: 'mock-device-001',
      name: 'Mock GMShoot Device',
      url: 'http://localhost:8000',
      ngrokUrl: qrData,
      status: 'online' as const,
      lastSeen: new Date(),
      capabilities: {
        hasCamera: true,
        hasZoom: true,
        maxResolution: '1920x1080',
        supportedFormats: ['jpeg', 'png']
      }
    };
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    console.log(`MockHardwareAPI: Disconnecting device ${deviceId}`);
    this.connected = false;
    this.deviceId = null;
  }

  async startSession(deviceId: string, sessionRequest: any): Promise<SessionData | null> {
    if (!this.connected) {
      throw new Error('Device not connected');
    }
    
    console.log(`MockHardwareAPI: Starting session for device ${deviceId}`);
    
    return {
      sessionId: `mock-session-${Date.now()}`,
      deviceId: deviceId,
      startTime: new Date(),
      shotCount: 0,
      status: 'active' as const,
      settings: sessionRequest.settings
    };
  }

  async stopSession(sessionId: string): Promise<void> {
    console.log(`MockHardwareAPI: Stopping session ${sessionId}`);
  }

  async getLatestFrame(deviceId: string): Promise<FrameData> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Increment frame and loop back to 1 after 5
    this.currentFrame = (this.currentFrame % this.totalFrames) + 1;
    const frameNumber = this.currentFrame;
    
    // Test frame coordinates based on analysis from MockAnalysisService
    const coordinates: Record<number, { x: number; y: number; score: number }> = {
      1: { x: 320, y: 240, score: 9.8 },      // Center, high score
      2: { x: 315, y: 245, score: 8.5 },      // Upper-left, good shot
      3: { x: 340, y: 230, score: 7.2 },      // Upper-right, decent shot
      4: { x: 315, y: 255, score: 6.9 },      // Lower-left, fair shot
      5: { x: 335, y: 245, score: 8.1 }       // Bottom-center, good shot
    };
    
    // Determine if this frame has a shot (all frames 1-5 have shots)
    const hasShot = [1, 2, 3, 4, 5].includes(frameNumber);
    
    const response: FrameData = {
      frameNumber,
      imageUrl: `/test_videos_frames/${frameNumber}.svg`,
      timestamp: new Date(),
      hasShot,
      shotData: hasShot ? {
        shotId: `mock-shot-${frameNumber}-${Date.now()}`,
        sessionId: `mock-session-${Date.now()}`,
        timestamp: new Date(),
        frameNumber,
        coordinates: {
          x: coordinates[frameNumber].x,
          y: coordinates[frameNumber].y
        },
        score: coordinates[frameNumber].score,
        scoringZone: this.getScoringZone(coordinates[frameNumber].x, coordinates[frameNumber].y),
        confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
        sequentialShotNumber: frameNumber,
        imageUrl: `/test_videos_frames/${frameNumber}.svg`
      } : undefined,
      metadata: {
        resolution: '1920x1080',
        brightness: 50,
        contrast: 50
      }
    };
    
    console.log(`MockHardwareAPI: Returning frame ${frameNumber} - hasShot: ${hasShot}`);
    
    return response;
  }

  reset(): void {
    this.currentFrame = 0;
    this.deviceId = null;
    this.connected = false;
  }

  private getScoringZone(x: number, y: number): string {
    // Simple scoring zone logic based on target coordinates
    const centerX = 250;
    const centerY = 250;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    if (distance < 50) return 'bullseye';
    if (distance < 100) return 'inner';
    if (distance < 150) return 'middle';
    if (distance < 200) return 'outer';
    return 'miss';
  }
}

// Export singleton instance
export const mockHardwareAPI: MockHardwareAPI = new MockHardwareAPIImpl();
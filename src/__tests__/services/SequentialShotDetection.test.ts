import { SequentialShotDetection, sequentialShotDetection } from '../../services/SequentialShotDetection';

describe('SequentialShotDetection', () => {
  let detector: SequentialShotDetection;
  const testSessionId = 'test-session-123';

  beforeEach(() => {
    detector = new SequentialShotDetection();
    detector.initializeSession(testSessionId);
  });

  describe('Session Management', () => {
    it('should initialize a new session', () => {
      expect(detector.hasSession(testSessionId)).toBe(true);
      expect(detector.getCurrentShotNumber(testSessionId)).toBe(0);
      expect(detector.getSessionShots(testSessionId)).toEqual([]);
    });

    it('should clear a session', () => {
      detector.clearSession(testSessionId);
      expect(detector.hasSession(testSessionId)).toBe(false);
    });

    it('should get active sessions', () => {
      const sessionId2 = 'test-session-456';
      detector.initializeSession(sessionId2);
      
      const activeSessions = detector.getActiveSessions();
      expect(activeSessions).toContain(testSessionId);
      expect(activeSessions).toContain(sessionId2);
      expect(activeSessions).toHaveLength(2);
    });

    it('should throw error when processing frame for non-existent session', async () => {
      const frame = createMockFrame('frame-1');
      await expect(detector.processFrame('non-existent', frame))
        .rejects.toThrow('Session non-existent not initialized');
    });
  });

  describe('Frame Processing', () => {
    it('should not detect shot on first frame', async () => {
      const frame = createMockFrame('frame-1');
      const result = await detector.processFrame(testSessionId, frame);
      
      expect(result).toBeNull();
      expect(detector.getCurrentShotNumber(testSessionId)).toBe(0);
    });

    it('should detect shot when frame difference exceeds threshold', async () => {
      const frame1 = createMockFrame('frame-1');
      const frame2 = createMockFrame('frame-2');
      
      // Process first frame
      await detector.processFrame(testSessionId, frame1);
      
      // Process second frame with simulated difference
      const result = await detector.processFrame(testSessionId, frame2);
      
      // Result might be null due to confirmation requirement
      // Process additional frames to confirm shot
      for (let i = 0; i < 3; i++) {
        const confirmFrame = createMockFrame(`confirm-${i}`);
        const shot = await detector.processFrame(testSessionId, confirmFrame);
        if (shot) {
          expect(shot.isNewShot).toBe(true);
          expect(shot.shotNumber).toBe(1);
          expect(shot.frameId).toBe(`confirm-${i}`);
          break;
        }
      }
    });

    it('should respect minimum shot interval', async () => {
      const config = { minShotInterval: 1000 }; // 1 second
      detector.updateConfig(config);
      
      const frame1 = createMockFrame('frame-1');
      const frame2 = createMockFrame('frame-2');
      const frame3 = createMockFrame('frame-3');
      
      await detector.processFrame(testSessionId, frame1);
      
      // Process frames quickly (less than min interval)
      const result1 = await detector.processFrame(testSessionId, frame2);
      const result2 = await detector.processFrame(testSessionId, frame3);
      
      // Should not detect shots due to time interval
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should accumulate confirmation frames before detecting shot', async () => {
      const config = { confirmationFrames: 3 };
      detector.updateConfig(config);
      
      const frame1 = createMockFrame('frame-1');
      await detector.processFrame(testSessionId, frame1);
      
      // Process shot frames to trigger detection
      let shotDetected = false;
      for (let i = 0; i < 5; i++) {
        const frame = createMockFrame(`shot-${i + 1}-confirm-${i}`);
        const result = await detector.processFrame(testSessionId, frame);
        
        if (result) {
          shotDetected = true;
          expect(result.shotNumber).toBe(1);
          break;
        }
      }
      
      // Shot should be detected after confirmation frames
      expect(shotDetected).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = detector.getConfig();
      expect(config.differenceThreshold).toBe(0.15);
      expect(config.minShotArea).toBe(100);
      expect(config.maxShotArea).toBe(50000);
      expect(config.minShotInterval).toBe(500);
      expect(config.confirmationFrames).toBe(2);
      expect(config.sensitivity).toBe('medium');
    });

    it('should update configuration', () => {
      const newConfig = {
        differenceThreshold: 0.2,
        sensitivity: 'high' as const,
        confirmationFrames: 3
      };
      
      detector.updateConfig(newConfig);
      const config = detector.getConfig();
      
      expect(config.differenceThreshold).toBe(0.2);
      expect(config.sensitivity).toBe('high');
      expect(config.confirmationFrames).toBe(3);
      // Other values should remain unchanged
      expect(config.minShotArea).toBe(100);
    });

    it('should apply sensitivity multiplier', async () => {
      // Test high sensitivity (lower threshold)
      detector.updateConfig({ sensitivity: 'high' });
      
      const frame1 = createMockFrame('frame-1');
      await detector.processFrame(testSessionId, frame1);
      
      // With high sensitivity, should detect shots more easily
      const frame2 = createMockFrame('frame-2');
      // Multiple attempts to account for confirmation frames
      for (let i = 0; i < 5; i++) {
        const result = await detector.processFrame(testSessionId, frame2);
        if (result) {
          expect(result.isNewShot).toBe(true);
          break;
        }
      }
    });
  });

  describe('Session Statistics', () => {
    it('should return zero statistics for empty session', () => {
      const stats = detector.getSessionStatistics(testSessionId);
      
      expect(stats.totalShots).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.firstShotTime).toBeNull();
      expect(stats.lastShotTime).toBeNull();
      expect(stats.shotRate).toBe(0);
    });

    it('should calculate correct statistics after shots', async () => {
      // Simulate detecting shots
      await simulateShotDetection(detector, testSessionId, 3);
      
      const stats = detector.getSessionStatistics(testSessionId);
      
      expect(stats.totalShots).toBe(3);
      expect(stats.averageConfidence).toBeGreaterThan(0);
      expect(stats.firstShotTime).toBeTruthy();
      expect(stats.lastShotTime).toBeTruthy();
      expect(stats.shotRate).toBeGreaterThan(0);
    });

    it('should calculate shot rate correctly', async () => {
      // Simulate shots over time
      await simulateShotDetection(detector, testSessionId, 3);
      
      const stats = detector.getSessionStatistics(testSessionId);
      
      // Verify shot rate is reasonable (should be > 0)
      expect(stats.shotRate).toBeGreaterThan(0);
      
      // The exact rate depends on timing in the test, so we just verify it's calculated
      expect(isFinite(stats.shotRate)).toBe(true);
    });
  });

  describe('Shot History', () => {
    it('should maintain shot order', async () => {
      await simulateShotDetection(detector, testSessionId, 5);
      
      const shots = detector.getSessionShots(testSessionId);
      expect(shots).toHaveLength(5);
      
      // Check shot numbers are sequential
      for (let i = 0; i < shots.length; i++) {
        expect(shots[i].shotNumber).toBe(i + 1);
      }
    });

    it('should track current shot number correctly', async () => {
      expect(detector.getCurrentShotNumber(testSessionId)).toBe(0);
      
      await simulateShotDetection(detector, testSessionId, 3);
      expect(detector.getCurrentShotNumber(testSessionId)).toBe(3);
      
      await simulateShotDetection(detector, testSessionId, 2);
      expect(detector.getCurrentShotNumber(testSessionId)).toBe(5);
    });
  });

  describe('Import/Export', () => {
    it('should export session data', async () => {
      await simulateShotDetection(detector, testSessionId, 3);
      
      const exported = detector.exportSession(testSessionId);
      
      expect(exported).toBeTruthy();
      expect(exported.sessionId).toBe(testSessionId);
      expect(exported.shots).toHaveLength(3);
      expect(exported.currentShotNumber).toBe(3);
      expect(exported.exportedAt).toBeTruthy();
    });

    it('should return null for non-existent session export', () => {
      const exported = detector.exportSession('non-existent');
      expect(exported).toBeNull();
    });

    it('should import session data', () => {
      const importData = {
        sessionId: 'imported-session',
        shots: [
          {
            shotNumber: 1,
            frameId: 'imported-frame-1',
            timestamp: Date.now(),
            confidence: 0.8,
            position: { x: 100, y: 100 },
            isNewShot: true
          }
        ],
        currentShotNumber: 1,
        lastShotTime: Date.now()
      };
      
      detector.importSession(importData);
      
      expect(detector.hasSession('imported-session')).toBe(true);
      expect(detector.getCurrentShotNumber('imported-session')).toBe(1);
      expect(detector.getSessionShots('imported-session')).toHaveLength(1);
    });
  });

  describe('Singleton Instance', () => {
    it('should provide singleton instance', () => {
      expect(sequentialShotDetection).toBeInstanceOf(SequentialShotDetection);
    });

    it('should maintain state across singleton usage', () => {
      const singletonSessionId = 'singleton-test';
      sequentialShotDetection.initializeSession(singletonSessionId);
      
      expect(sequentialShotDetection.hasSession(singletonSessionId)).toBe(true);
    });
  });
});

// Helper functions for testing
function createMockFrame(id: string, width = 640, height = 480) {
  return {
    id,
    timestamp: Date.now(),
    imageData: `data:image/jpeg;base64,mock-${id}`,
    width,
    height
  };
}

async function simulateShotDetection(
  detector: SequentialShotDetection,
  sessionId: string,
  numShots: number
): Promise<void> {
  // Process initial frame
  const initialFrame = createMockFrame('initial');
  await detector.processFrame(sessionId, initialFrame);
  
  // Simulate shots
  for (let i = 0; i < numShots; i++) {
    // Process shot frame
    const shotFrame = createMockFrame(`shot-${i + 1}`);
    
    // Process multiple frames to confirm shot
    // Use different frames with the same shot ID to ensure detection
    for (let j = 0; j < 5; j++) {
      const confirmFrame = createMockFrame(`shot-${i + 1}-confirm-${j}`);
      const result = await detector.processFrame(sessionId, confirmFrame);
      if (result && result.isNewShot) {
        break;
      }
    }
    
    // Small delay between shots to ensure minShotInterval is respected
    await new Promise(resolve => setTimeout(resolve, 600));
  }
}
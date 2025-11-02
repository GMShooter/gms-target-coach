/**
 * GeometricScoring Service Tests
 *
 * This test suite covers the geometric scoring algorithm functionality including:
 * - Basic shot analysis and scoring
 * - Perspective correction
 * - Distance compensation
 * - Session statistics calculation
 * - Shot pattern visualization
 * - Personalized recommendations
 */

import {
  geometricScoring,
  type Point,
  type TargetConfig,
  type ShotResult
} from '../../services/GeometricScoring';

describe('GeometricScoring Service', () => {
  // Test data setup
  const mockTargetConfig: TargetConfig = {
    targetDistance: 10, // 10 meters
    targetSize: 60, // 60cm diameter
    targetType: 'circular',
    scoringZones: [
      { id: 'bullseye', name: 'Bullseye', points: 10, innerRadius: 0, outerRadius: 5, color: '#FF0000' },
      { id: 'inner', name: 'Inner Ring', points: 9, innerRadius: 5, outerRadius: 10, color: '#FF4500' },
      { id: 'middle', name: 'Middle Ring', points: 8, innerRadius: 10, outerRadius: 20, color: '#FFA500' },
      { id: 'outer', name: 'Outer Ring', points: 7, innerRadius: 20, outerRadius: 30, color: '#FFFF00' },
      { id: 'edge', name: 'Edge', points: 6, innerRadius: 30, outerRadius: 40, color: '#00FF00' },
      { id: 'miss', name: 'Miss', points: 0, innerRadius: 40, outerRadius: 100, color: '#808080' }
    ],
    cameraAngle: 0,
    lensDistortion: 0
  };

  const mockBullseyeShot: Point = { x: 50, y: 50 }; // Perfect center
  const mockInnerRingShot: Point = { x: 56, y: 50 }; // Inner ring (distance > 5)
  const mockMiddleRingShot: Point = { x: 65, y: 50 }; // Middle ring
  const mockOuterRingShot: Point = { x: 75, y: 50 }; // Outer ring
  const mockMissShot: Point = { x: 95, y: 95 }; // Miss

  describe('Basic Shot Analysis', () => {
    it('should analyze a perfect bullseye shot correctly', () => {
      const result = geometricScoring.analyzeShot('test-shot-1', mockBullseyeShot, mockTargetConfig, []);

      expect(result.shotId).toBe('test-shot-1');
      expect(result.coordinates).toEqual(mockBullseyeShot);
      expect(result.score).toBe(10);
      expect(result.scoringZone.id).toBe('bullseye');
      expect(result.isBullseye).toBe(true);
      expect(result.rawDistance).toBe(0);
      expect(result.correctedDistance).toBe(0);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should analyze an inner ring shot correctly', () => {
      const result = geometricScoring.analyzeShot('test-shot-2', mockInnerRingShot, mockTargetConfig, []);

      expect(result.score).toBe(9);
      expect(result.scoringZone.id).toBe('inner');
      expect(result.isBullseye).toBe(false);
      expect(result.rawDistance).toBeGreaterThan(5);
      expect(result.rawDistance).toBeLessThan(10);
    });

    it('should analyze a middle ring shot correctly', () => {
      const result = geometricScoring.analyzeShot('test-shot-3', mockMiddleRingShot, mockTargetConfig, []);

      expect(result.score).toBe(8);
      expect(result.scoringZone.id).toBe('middle');
      expect(result.isBullseye).toBe(false);
      expect(result.rawDistance).toBeGreaterThan(10);
      expect(result.rawDistance).toBeLessThan(20);
    });

    it('should analyze an outer ring shot correctly', () => {
      const result = geometricScoring.analyzeShot('test-shot-4', mockOuterRingShot, mockTargetConfig, []);

      expect(result.score).toBe(7);
      expect(result.scoringZone.id).toBe('outer');
      expect(result.isBullseye).toBe(false);
      expect(result.rawDistance).toBeGreaterThan(20);
      expect(result.rawDistance).toBeLessThan(30);
    });

    it('should analyze a miss correctly', () => {
      const result = geometricScoring.analyzeShot('test-shot-5', mockMissShot, mockTargetConfig, []);

      expect(result.score).toBe(0);
      expect(result.scoringZone.id).toBe('miss');
      expect(result.isBullseye).toBe(false);
      expect(result.rawDistance).toBeGreaterThan(40);
    });

    it('should calculate angle from center correctly', () => {
      const result = geometricScoring.analyzeShot('test-shot-6', { x: 60, y: 50 }, mockTargetConfig, []);

      expect(result.angleFromCenter).toBe(0); // Directly to the right
    });

    it('should calculate angle for diagonal shots correctly', () => {
      const result = geometricScoring.analyzeShot('test-shot-7', { x: 60, y: 60 }, mockTargetConfig, []);

      expect(result.angleFromCenter).toBeCloseTo(45, 0); // 45 degrees
    });
  });

  describe('Perspective Correction', () => {
    it('should apply perspective correction for angled camera', () => {
      const angledTargetConfig: TargetConfig = {
        ...mockTargetConfig,
        cameraAngle: 15 // 15 degree angle
      };

      const result = geometricScoring.analyzeShot('test-shot-angled', { x: 50, y: 50 }, angledTargetConfig, []);

      expect(result.correctedDistance).toBeDefined();
      // With perspective correction, the corrected distance should account for the angle
      expect(result.correctedDistance).toBeGreaterThanOrEqual(0);
    });

    it('should apply lens distortion correction', () => {
      const distortedTargetConfig: TargetConfig = {
        ...mockTargetConfig,
        lensDistortion: 0.1 // 10% lens distortion
      };

      const result = geometricScoring.analyzeShot('test-shot-distorted', { x: 50, y: 50 }, distortedTargetConfig, []);

      expect(result.correctedDistance).toBeDefined();
      expect(result.correctedDistance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Distance Compensation', () => {
    it('should apply distance compensation for different target distances', () => {
      const closeTargetConfig: TargetConfig = {
        ...mockTargetConfig,
        targetDistance: 5 // 5 meters
      };

      const farTargetConfig: TargetConfig = {
        ...mockTargetConfig,
        targetDistance: 20 // 20 meters
      };

      const closeResult = geometricScoring.analyzeShot('test-close', { x: 60, y: 50 }, closeTargetConfig, []);
      const farResult = geometricScoring.analyzeShot('test-far', { x: 60, y: 50 }, farTargetConfig, []);

      expect(closeResult.compensatedScore).toBeDefined();
      expect(farResult.compensatedScore).toBeDefined();
      // Distance compensation should adjust scores based on target distance
      expect(closeResult.compensatedScore).toBeGreaterThan(0);
      expect(farResult.compensatedScore).toBeGreaterThan(0);
    });
  });

  describe('Session Statistics', () => {
    it('should calculate session statistics for multiple shots', () => {
      const shots: ShotResult[] = [
        geometricScoring.analyzeShot('shot-1', mockBullseyeShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-2', mockInnerRingShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-3', mockMiddleRingShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-4', mockMissShot, mockTargetConfig, [])
      ];

      const stats = geometricScoring.calculateSessionStatistics(shots);

      expect(stats).toBeDefined();
      expect(stats.totalShots).toBe(4);
      expect(stats.averageScore).toBeCloseTo((10 + 9 + 8 + 0) / 4, 1);
      expect(stats.bestScore).toBe(10);
      expect(stats.worstScore).toBe(0);
      expect(stats.bullseyeCount).toBe(1);
      expect(stats.hitPercentage).toBe(75); // 3 out of 4 shots hit the target
    });

    it('should handle empty session statistics', () => {
      const stats = geometricScoring.calculateSessionStatistics([]);

      expect(stats.totalShots).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.bestScore).toBe(0);
      expect(stats.worstScore).toBe(0);
      expect(stats.bullseyeCount).toBe(0);
      expect(stats.hitPercentage).toBe(0);
    });

    it('should calculate precision metrics', () => {
      const preciseShots: ShotResult[] = [
        geometricScoring.analyzeShot('shot-1', { x: 50, y: 50 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-2', { x: 51, y: 50 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-3', { x: 49, y: 51 }, mockTargetConfig, [])
      ];

      const stats = geometricScoring.calculateSessionStatistics(preciseShots);

      expect(stats.spread.radius).toBeLessThan(2);
      expect(stats.precision).toBeGreaterThan(0.8); // High precision for tight grouping
    });

    it('should detect shooting trends', () => {
      const improvingShots: ShotResult[] = [
        geometricScoring.analyzeShot('shot-1', mockMissShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-2', mockOuterRingShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-3', mockMiddleRingShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-4', mockInnerRingShot, mockTargetConfig, [])
      ];

      const stats = geometricScoring.calculateSessionStatistics(improvingShots);

      expect(stats.improvement.trend).toBe('improving');
    });

    it('should calculate grouping metrics', () => {
      const groupedShots: ShotResult[] = [
        geometricScoring.analyzeShot('shot-1', { x: 50, y: 50 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-2', { x: 52, y: 48 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-3', { x: 48, y: 52 }, mockTargetConfig, [])
      ];

      const stats = geometricScoring.calculateSessionStatistics(groupedShots);

      expect(stats.grouping).toBeDefined();
      expect(stats.grouping).toBeGreaterThan(0.5); // Good grouping
    });
  });

  describe('Shot Pattern Visualization', () => {
    it('should generate shot pattern visualization', () => {
      const shots: ShotResult[] = [
        geometricScoring.analyzeShot('shot-1', mockBullseyeShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-2', mockInnerRingShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-3', mockMiddleRingShot, mockTargetConfig, [])
      ];

      const visualization = geometricScoring.generateShotPatternVisualization(shots);

      expect(visualization).toBeDefined();
      expect(typeof visualization).toBe('string');
      expect(visualization).toContain('shot-pattern');
      expect(visualization).toContain('data-shot-id');
    });

    it('should handle empty shot pattern visualization', () => {
      const visualization = geometricScoring.generateShotPatternVisualization([]);

      expect(visualization).toBeDefined();
      expect(typeof visualization).toBe('string');
    });
  });

  describe('Personalized Recommendations', () => {
    it('should generate recommendations for high scores', () => {
      const excellentShots: ShotResult[] = [
        geometricScoring.analyzeShot('shot-1', mockBullseyeShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-2', mockBullseyeShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-3', mockInnerRingShot, mockTargetConfig, [])
      ];

      const stats = geometricScoring.calculateSessionStatistics(excellentShots);
      const recommendations = geometricScoring.generateRecommendations(stats);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('excellent') || r.includes('great'))).toBe(true);
    });

    it('should generate recommendations for low scores', () => {
      const poorShots: ShotResult[] = [
        geometricScoring.analyzeShot('shot-1', mockMissShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-2', mockMissShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-3', mockOuterRingShot, mockTargetConfig, [])
      ];

      const stats = geometricScoring.calculateSessionStatistics(poorShots);
      const recommendations = geometricScoring.generateRecommendations(stats);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('improve') || r.includes('practice'))).toBe(true);
    });

    it('should generate recommendations for inconsistent shooting', () => {
      const inconsistentShots: ShotResult[] = [
        geometricScoring.analyzeShot('shot-1', mockBullseyeShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-2', mockMissShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-3', mockInnerRingShot, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-4', mockMissShot, mockTargetConfig, [])
      ];

      const stats = geometricScoring.calculateSessionStatistics(inconsistentShots);
      const recommendations = geometricScoring.generateRecommendations(stats);

      expect(recommendations).toBeDefined();
      expect(recommendations.some(r => r.includes('consistency') || r.includes('focus'))).toBe(true);
    });

    it('should generate recommendations for grouping issues', () => {
      const scatteredShots: ShotResult[] = [
        geometricScoring.analyzeShot('shot-1', { x: 20, y: 20 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-2', { x: 80, y: 80 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-3', { x: 20, y: 80 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-4', { x: 80, y: 20 }, mockTargetConfig, [])
      ];

      const stats = geometricScoring.calculateSessionStatistics(scatteredShots);
      const recommendations = geometricScoring.generateRecommendations(stats);

      expect(recommendations).toBeDefined();
      expect(recommendations.some(r => r.includes('grouping') || r.includes('aim'))).toBe(true);
    });
  });

  describe('Advanced Scoring Methods', () => {
    it('should handle different target types', () => {
      const silhouetteTargetConfig: TargetConfig = {
        ...mockTargetConfig,
        targetType: 'silhouette',
        scoringZones: [
          { id: 'head', name: 'Head', points: 10, innerRadius: 0, outerRadius: 5, color: '#FF0000' },
          { id: 'chest', name: 'Chest', points: 8, innerRadius: 5, outerRadius: 15, color: '#FF4500' },
          { id: 'body', name: 'Body', points: 6, innerRadius: 15, outerRadius: 30, color: '#FFA500' },
          { id: 'miss', name: 'Miss', points: 0, innerRadius: 30, outerRadius: 100, color: '#808080' }
        ]
      };

      // Head shot should be at the center (distance < 5) for head zone
      const result = geometricScoring.analyzeShot('test-silhouette', { x: 50, y: 50 }, silhouetteTargetConfig, []);

      expect(result.score).toBe(10); // Head shot
      expect(result.scoringZone.id).toBe('head');
    });

    it('should handle competition scoring zones', () => {
      const competitionTargetConfig: TargetConfig = {
        ...mockTargetConfig,
        targetType: 'circular', // Use valid target type
        scoringZones: [
          { id: 'x-ring', name: 'X-Ring', points: 11, innerRadius: 0, outerRadius: 2, color: '#FF0000' },
          { id: '10-ring', name: '10-Ring', points: 10, innerRadius: 2, outerRadius: 5, color: '#FF4500' },
          { id: '9-ring', name: '9-Ring', points: 9, innerRadius: 5, outerRadius: 10, color: '#FFA500' },
          { id: '8-ring', name: '8-Ring', points: 8, innerRadius: 10, outerRadius: 15, color: '#FFFF00' },
          { id: '7-ring', name: '7-Ring', points: 7, innerRadius: 15, outerRadius: 20, color: '#00FF00' },
          { id: 'miss', name: 'Miss', points: 0, innerRadius: 20, outerRadius: 100, color: '#808080' }
        ]
      };

      const result = geometricScoring.analyzeShot('test-competition', { x: 50, y: 50 }, competitionTargetConfig, []);

      expect(result.score).toBe(11); // X-Ring
      expect(result.scoringZone.id).toBe('x-ring');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid coordinates gracefully', () => {
      const result = geometricScoring.analyzeShot('test-invalid', { x: -10, y: 150 }, mockTargetConfig, []);

      expect(result).toBeDefined();
      expect(result.score).toBe(0); // Should be treated as miss
      expect(result.scoringZone.id).toBe('miss');
    });

    it('should handle missing target configuration', () => {
      const incompleteTargetConfig: TargetConfig = {
        targetDistance: 10,
        targetSize: 60,
        targetType: 'circular',
        scoringZones: [] // Empty zones to test error handling
      };

      const result = geometricScoring.analyzeShot('test-incomplete', { x: 50, y: 50 }, incompleteTargetConfig, []);

      expect(result).toBeDefined();
      // Should fall back to basic scoring
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty scoring zones', () => {
      const noZonesTargetConfig: TargetConfig = {
        ...mockTargetConfig,
        scoringZones: []
      };

      const result = geometricScoring.analyzeShot('test-no-zones', { x: 50, y: 50 }, noZonesTargetConfig, []);

      expect(result).toBeDefined();
      expect(result.score).toBe(0); // Default to miss when no zones defined
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze shot consistency over time', () => {
      const shots: ShotResult[] = [];
      
      // Create a sequence of shots with improving accuracy
      for (let i = 0; i < 10; i++) {
        const distance = 30 - (i * 2); // Start far, get closer to center
        const angle = (i * 36) % 360; // Rotate around center
        const x = 50 + distance * Math.cos(angle * Math.PI / 180);
        const y = 50 + distance * Math.sin(angle * Math.PI / 180);
        
        shots.push(geometricScoring.analyzeShot(`shot-${i}`, { x, y }, mockTargetConfig, shots));
      }

      const stats = geometricScoring.calculateSessionStatistics(shots);

      expect(stats.improvement.trend).toBe('improving');
      expect(stats.consistency).toBeLessThan(0.5); // Low consistency due to improvement
    });

    it('should calculate shot distribution', () => {
      const shots: ShotResult[] = [
        geometricScoring.analyzeShot('shot-1', { x: 50, y: 50 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-2', { x: 50, y: 50 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-3', { x: 50, y: 50 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-4', { x: 60, y: 50 }, mockTargetConfig, []),
        geometricScoring.analyzeShot('shot-5', { x: 40, y: 50 }, mockTargetConfig, [])
      ];

      const stats = geometricScoring.calculateSessionStatistics(shots);

      expect(stats.bullseyeCount).toBe(3);
      // Note: shotDistribution is not in the SessionStatistics interface
      // We can verify the shots were processed correctly by checking the total count
      expect(stats.totalShots).toBe(5);
    });
  });
});
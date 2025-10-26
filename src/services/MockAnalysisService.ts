/**
 * Mock Analysis Service for Testing
 * Provides consistent mock analysis results for test frames
 */

export interface MockAnalysisResult {
  frameId: number;
  score: number;
  location: {
    x: number;
    y: number;
  };
  confidence: number;
}

/**
 * Generate mock analysis results based on frame number
 * Matches the expected data structure from tests and fixtures
 */
export const generateMockAnalysis = (frameNumber: number): MockAnalysisResult => {
  const mockResults: { [key: number]: MockAnalysisResult } = {
    1: {
      frameId: 1,
      score: 9.8,
      location: { x: 320, y: 240 },
      confidence: 0.95
    },
    2: {
      frameId: 2,
      score: 8.5,
      location: { x: 315, y: 245 },
      confidence: 0.87
    },
    3: {
      frameId: 3,
      score: 7.2,
      location: { x: 340, y: 230 },
      confidence: 0.92
    },
    4: {
      frameId: 4,
      score: 6.9,
      location: { x: 315, y: 255 },
      confidence: 0.88
    },
    5: {
      frameId: 5,
      score: 8.1,
      location: { x: 335, y: 245 },
      confidence: 0.91
    }
  };
  
  return mockResults[frameNumber] || {
    frameId: frameNumber,
    score: 0,
    location: { x: 0, y: 0 },
    confidence: 0
  };
};
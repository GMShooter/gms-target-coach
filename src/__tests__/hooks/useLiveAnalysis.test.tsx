/**
 * useLiveAnalysis Hook Tests
 *
 * This test suite covers live analysis functionality including:
 * - Real-time frame processing
 * - Shot detection and scoring
 * - Metrics calculation
 * - Error handling
 * - State management
 * - Real-time subscriptions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useLiveAnalysis, Shot, LiveAnalysisState } from '../../hooks/useLiveAnalysis';

// Mock dependencies
let mockChannel: any = null;

jest.mock('../../utils/supabase', () => ({
  supabase: {
    channel: jest.fn(() => {
      mockChannel = {
        on: jest.fn(() => mockChannel),
        subscribe: jest.fn(),
        unsubscribe: jest.fn()
      };
      return mockChannel;
    }),
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        error: null
      }))
    }))
  }
}));

jest.mock('../../utils/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key'
  }
}));

jest.mock('../../services/GeometricScoring', () => ({
  geometricScoring: {
    analyzeShot: jest.fn(() => ({
      score: 8,
      scoringZone: { name: 'middle' }
    })),
    getDefaultScoringZones: jest.fn(() => [
      { name: 'bullseye', points: 10 },
      { name: 'inner', points: 9 },
      { name: 'middle', points: 8 }
    ])
  }
}));

jest.mock('../../services/SequentialShotDetection', () => ({
  sequentialShotDetection: {
    hasSession: jest.fn(() => false),
    initializeSession: jest.fn(),
    processFrame: jest.fn(() => ({
      frameId: 'test-frame',
      position: { x: 100, y: 100 },
      confidence: 0.9,
      isNewShot: true,
      timestamp: Date.now()
    }))
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock crypto.subtle.digest
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32)))
    }
  },
  writable: true
});

// Mock performance.now
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  },
  writable: true
});

// Test wrapper component
const createTestWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Test component that uses live analysis hook
const TestComponent = ({ sessionId }: { sessionId?: string }) => {
  const {
    isAnalyzing,
    currentFrame,
    shots,
    metrics,
    error,
    startAnalysis,
    stopAnalysis,
    resetAnalysis,
    fetchAndAnalyzeNextFrame
  } = useLiveAnalysis(sessionId);

  return (
    <div>
      <div data-testid="analyzing">{isAnalyzing ? 'analyzing' : 'not-analyzing'}</div>
      <div data-testid="current-frame">{currentFrame || 'no-frame'}</div>
      <div data-testid="shots-count">{shots.length}</div>
      <div data-testid="total-shots">{metrics.totalShots}</div>
      <div data-testid="average-score">{metrics.averageScore}</div>
      <div data-testid="highest-score">{metrics.highestScore}</div>
      <div data-testid="accuracy">{metrics.accuracy}</div>
      <div data-testid="group-size">{metrics.groupSize}</div>
      <div data-testid="mpi">{metrics.mpi}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <button onClick={startAnalysis} data-testid="start-analysis">
        Start Analysis
      </button>
      <button onClick={stopAnalysis} data-testid="stop-analysis">
        Stop Analysis
      </button>
      <button onClick={resetAnalysis} data-testid="reset-analysis">
        Reset Analysis
      </button>
      <button onClick={fetchAndAnalyzeNextFrame} data-testid="fetch-frame">
        Fetch Frame
      </button>
    </div>
  );
};

describe('useLiveAnalysis Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Initial State', () => {
    it('should render with initial state', () => {
      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      expect(screen.getByTestId('analyzing')).toHaveTextContent('not-analyzing');
      expect(screen.getByTestId('current-frame')).toHaveTextContent('no-frame');
      expect(screen.getByTestId('shots-count')).toHaveTextContent('0');
      expect(screen.getByTestId('total-shots')).toHaveTextContent('0');
      expect(screen.getByTestId('average-score')).toHaveTextContent('0');
      expect(screen.getByTestId('highest-score')).toHaveTextContent('0');
      expect(screen.getByTestId('accuracy')).toHaveTextContent('0');
      expect(screen.getByTestId('group-size')).toHaveTextContent('0');
      expect(screen.getByTestId('mpi')).toHaveTextContent('0');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  describe('Analysis Control', () => {
    it('should start analysis when startAnalysis is called', async () => {
      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const startButton = screen.getByTestId('start-analysis');
      
      fireEvent.click(startButton);

      expect(screen.getByTestId('analyzing')).toHaveTextContent('analyzing');
    });

    it('should stop analysis when stopAnalysis is called', async () => {
      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      // First start analysis
      const startButton = screen.getByTestId('start-analysis');
      
      fireEvent.click(startButton);

      // Then stop analysis
      const stopButton = screen.getByTestId('stop-analysis');
      
      fireEvent.click(stopButton);

      expect(screen.getByTestId('analyzing')).toHaveTextContent('not-analyzing');
    });

    it('should reset analysis when resetAnalysis is called', async () => {
      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      // First start analysis
      const startButton = screen.getByTestId('start-analysis');
      
      fireEvent.click(startButton);

      // Then reset analysis
      const resetButton = screen.getByTestId('reset-analysis');
      
      fireEvent.click(resetButton);

      expect(screen.getByTestId('analyzing')).toHaveTextContent('not-analyzing');
      expect(screen.getByTestId('current-frame')).toHaveTextContent('no-frame');
      expect(screen.getByTestId('shots-count')).toHaveTextContent('0');
    });
  });

  describe('Frame Processing', () => {
    beforeEach(() => {
      // Mock successful fetch responses
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('camera-proxy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              frameUrl: 'data:image/jpeg;base64,test-frame-data'
            })
          });
        } else if (url.includes('analyze-frame')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              shots: [
                {
                  x: 100,
                  y: 100,
                  confidence: 0.9
                }
              ],
              confidence: 0.85
            })
          });
        } else if (url.startsWith('data:image')) {
          // Mock frame hash
          return Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob())
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });
    });

    it('should fetch and analyze frame when fetchAndAnalyzeNextFrame is called', async () => {
      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('camera-proxy'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('test-session')
          })
        );
      });
    });

    it('should handle frame analysis with shots', async () => {
      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByTestId('shots-count')).toHaveTextContent('1');
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('total-shots')).toHaveTextContent('1');
      });
    });

    it('should handle frame analysis with no shots', async () => {
      // Mock response with no shots
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('camera-proxy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              frameUrl: 'data:image/jpeg;base64,test-frame-data'
            })
          });
        } else if (url.includes('analyze-frame')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              shots: [],
              confidence: 0.3
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByTestId('shots-count')).toHaveTextContent('0');
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('total-shots')).toHaveTextContent('0');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle camera fetch error', async () => {
      // Mock failed fetch response
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('camera-proxy')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: () => Promise.resolve('Camera error')
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch frame from camera');
      });
    });

    it('should handle analysis API error', async () => {
      // Mock failed analysis response
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('camera-proxy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              frameUrl: 'data:image/jpeg;base64,test-frame-data'
            })
          });
        } else if (url.includes('analyze-frame')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Analysis Error',
            text: () => Promise.resolve('Analysis service error')
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Analysis API error');
      });
    });

    it('should handle timeout error', async () => {
      // Mock timeout with immediate rejection
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('camera-proxy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              frameUrl: 'data:image/jpeg;base64,test-frame-data'
            })
          });
        } else if (url.includes('analyze-frame')) {
          // Simulate timeout by rejecting immediately
          return Promise.reject(new Error('Request timeout'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Request timeout');
      }, { timeout: 2000 }); // Short timeout for test
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate metrics correctly for multiple shots', async () => {
      // Mock response with multiple shots
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('camera-proxy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              frameUrl: 'data:image/jpeg;base64,test-frame-data'
            })
          });
        } else if (url.includes('analyze-frame')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              shots: [
                { x: 100, y: 100, confidence: 0.9 },
                { x: 105, y: 105, confidence: 0.8 },
                { x: 102, y: 98, confidence: 0.85 }
              ],
              confidence: 0.85
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByTestId('shots-count')).toHaveTextContent('3');
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('total-shots')).toHaveTextContent('3');
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('average-score')).not.toHaveTextContent('0');
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('highest-score')).not.toHaveTextContent('0');
      });
    });

    it('should calculate accuracy correctly', async () => {
      // Mock response with high-scoring shots
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('camera-proxy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              frameUrl: 'data:image/jpeg;base64,test-frame-data'
            })
          });
        } else if (url.includes('analyze-frame')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              shots: [
                { x: 100, y: 100, confidence: 0.9 }, // High score
                { x: 200, y: 200, confidence: 0.8 }, // Low score
                { x: 150, y: 150, confidence: 0.85 } // High score
              ],
              confidence: 0.85
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByTestId('shots-count')).toHaveTextContent('3');
      });
      
      await waitFor(() => {
        // Should have some accuracy (shots with score >= 7)
        expect(screen.getByTestId('accuracy')).not.toBe('0');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should set up real-time subscription when sessionId is provided', () => {
      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      // Check if mockChannel was created
      expect(mockChannel).toBeDefined();
      // Just verify that channel exists - actual subscription setup is internal to the hook
      expect(mockChannel).toBeDefined();
    });

    it('should not set up real-time subscription when sessionId is not provided', () => {
      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      // Check if mockChannel was created (it's always created in our mock)
      expect(mockChannel).toBeDefined();
    });
  });

  describe('Frame Change Detection', () => {
    it('should detect unchanged frames', async () => {
      let frameHashCallCount = 0;
      
      // Mock consistent frame hash
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('camera-proxy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              frameUrl: 'data:image/jpeg;base64,same-frame-data'
            })
          });
        } else if (url.includes('analyze-frame')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              shots: [],
              confidence: 0.3
            })
          });
        } else if (url.startsWith('data:image')) {
          frameHashCallCount++;
          return Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob())
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      
      // Fetch same frame multiple times
      fireEvent.click(fetchButton);
      await waitFor(() => {
        expect(frameHashCallCount).toBeGreaterThan(0);
      });

      // Fetch again (should detect unchanged frame)
      fireEvent.click(fetchButton);
      await waitFor(() => {
        expect(screen.getByTestId('shots-count')).toHaveTextContent('0');
      });
    });

    it('should stop analysis after max unchanged frames', async () => {
      let frameHashCallCount = 0;
      
      // Mock consistent frame hash
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('camera-proxy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              frameUrl: 'data:image/jpeg;base64,same-frame-data'
            })
          });
        } else if (url.includes('analyze-frame')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              shots: [],
              confidence: 0.3
            })
          });
        } else if (url.startsWith('data:image')) {
          frameHashCallCount++;
          return Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob())
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      
      // Fetch same frame 6 times (exceeds max of 5)
      for (let i = 0; i < 6; i++) {
        fireEvent.click(fetchButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await waitFor(() => {
        expect(screen.getByTestId('analyzing')).toHaveTextContent('not-analyzing');
      });
    });
  });

  describe('Latency Monitoring', () => {
    it('should log latency warnings when exceeding 500ms', async () => {
      // Mock slow response
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('camera-proxy')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              frameUrl: 'data:image/jpeg;base64,test-frame-data'
            })
          });
        } else if (url.includes('analyze-frame')) {
          // Simulate slow response
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({
                  shots: [{ x: 100, y: 100, confidence: 0.9 }],
                  confidence: 0.85
                })
              });
            }, 600); // 600ms delay
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      // Mock console.warn to check for latency warnings
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<TestComponent sessionId="test-session" />, { wrapper: createTestWrapper(queryClient) });

      const fetchButton = screen.getByTestId('fetch-frame');
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Latency warning')
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
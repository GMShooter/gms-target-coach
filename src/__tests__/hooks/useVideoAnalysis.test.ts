/* eslint-disable import/order */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVideoAnalysis } from '../../hooks/useVideoAnalysis';

// Import mocked modules
import { supabase } from '../../utils/supabase';

// Mock modules
jest.mock('../../utils/supabase', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn()
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'test-url' } }))
      }))
    },
    from: jest.fn(() => ({
      insert: jest.fn(),
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      order: jest.fn()
    })),
    functions: {
      invoke: jest.fn()
    }
  };
  return { supabase: mockSupabase };
});

jest.mock('../../firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user' }
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('useVideoAnalysis Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Ensure functions.invoke is properly mocked
    (supabase as any).functions = { invoke: jest.fn() };
    
    // Set up default successful mocks
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null
    });
    
    // Create a proper mock for analysis_sessions
    const mockAnalysisSessionsInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'session-123' },
          error: null
        })
      })
    });
    
    const mockAnalysisSessionsSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue([
          { progress: 100, status: 'completed' }
        ])
      })
    });
    
    // Create a proper mock for analysis_results
    const mockAnalysisResultsInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [{
              id: 'result-1',
              frame_number: 1,
              frame_url: 'test-url',
              predictions: [{
                x: 100,
                y: 100,
                width: 50,
                height: 50,
                confidence: 0.85,
                class: 'target',
                class_id: 1
              }],
              accuracy_score: 0.85,
              confidence_score: 0.90,
              target_count: 1,
              analysis_metadata: {},
              created_at: new Date().toISOString()
            }],
            error: null
          })
        })
      })
    });
    
    const mockAnalysisResultsSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue([{
          id: 'result-1',
          frame_number: 1,
          timestamp: 0.5,
          accuracy: 85,
          confidence: 90,
          aim_position: { x: 329.44, y: 249.90 },
          target_position: { x: 320, y: 240 },
          image_url: '/test_videos_frames/1.svg'
        }])
      })
    });
    
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'analysis_sessions') {
        return {
          insert: mockAnalysisSessionsInsert,
          select: mockAnalysisSessionsSelect
        };
      }
      if (table === 'analysis_results') {
        return {
          insert: mockAnalysisResultsInsert,
          select: mockAnalysisResultsSelect
        };
      }
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };
    });

    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { sessionId: 'session-123' },
      error: null
    });

    // Mock fetch to return SVG content
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('<svg></svg>')
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      expect(result.current.isUploading).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.videoFile).toBe(null);
      expect(result.current.sessionId).toBe(null);
    });

    it('provides all required functions', () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      expect(typeof result.current.uploadVideo).toBe('function');
      expect(typeof result.current.processVideo).toBe('function');
      expect(typeof result.current.testWithFrames).toBe('function');
      expect(typeof result.current.resetState).toBe('function');
    });
  });

  describe('uploadVideo', () => {
    it('sets uploading state and error on start', async () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        await result.current.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }));
      });
      
      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.sessionId).toBe('session-123');
    });

    it('handles authentication error', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        await result.current.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }));
      });
      
      expect(result.current.error).toBe('You must be authenticated to upload videos');
    });

    it('handles session creation error', async () => {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'analysis_sessions') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' }
                })
              })
            })
          };
        }
        return {};
      });
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        await result.current.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }));
      });
      
      expect(result.current.error).toBe('Database error');
    });

    it('handles file upload error', async () => {
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Upload error' } 
        }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'test-url' } }))
      });
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        await result.current.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }));
      });
      
      expect(result.current.error).toBe('Upload error');
    });
  });

  describe('processVideo', () => {
    it('sets processing state and starts progress tracking', async () => {
      // Mock successful function invoke
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {},
        error: null
      });
      
      // Mock successful session check
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ progress: 0, status: 'processing' }],
            error: null
          })
        })
      });
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        const sessionId = await result.current.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }));
        // sessionId will be null due to mock errors, but we can still test processVideo
      });
      
      await act(async () => {
        result.current.processVideo('session-123');
      });
      
      expect(result.current.isProcessing).toBe(true);
      expect(result.current.progress).toBe(0);
    });

    it('handles processing failure', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Processing error' }
      });
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        const sessionId = await result.current.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }));
        result.current.processVideo(sessionId);
      });
      
      expect(result.current.error).toBe('Processing error');
    });

    it('handles function invoke error', async () => {
      (supabase.functions.invoke as jest.Mock).mockRejectedValue(new Error('Invoke error'));
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        const sessionId = await result.current.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }));
        result.current.processVideo(sessionId);
      });
      
      expect(result.current.error).toBe('Invoke error');
    });
  });

  describe('testWithFrames', () => {
    it('processes test frames successfully', async () => {
      // Mock successful frame analysis
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          detections: {
            predictions: [{
              x: 100,
              y: 100,
              width: 50,
              height: 50,
              confidence: 0.85,
              class: 'target',
              class_id: 1
            }]
          }
        },
        error: null
      });
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        result.current.testWithFrames();
      });
      
      // Wait for all frames to process
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.results).toHaveLength(5);
      expect(result.current.results[0].accuracy).toBeGreaterThan(0);
      expect(result.current.results[0].confidence).toBeGreaterThan(0);
    });

    it('handles frame fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch error'));
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        result.current.testWithFrames();
      });
      
      expect(result.current.error).toBe('Analysis failed');
    });

    it('handles analysis function error', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Analysis error' }
      });
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        result.current.testWithFrames();
      });
      
      expect(result.current.error).toBe('Analysis failed');
    });

    it('calculates accuracy and confidence correctly', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          detections: {
            predictions: [{
              x: 100,
              y: 100,
              width: 50,
              height: 50,
              confidence: 0.85,
              class: 'target',
              class_id: 1
            }]
          }
        },
        error: null
      });
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        result.current.testWithFrames();
      });
      
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(result.current.results).toHaveLength(5);
      expect(result.current.results[0].accuracy).toBeGreaterThan(0);
      expect(result.current.results[0].confidence).toBeGreaterThan(0);
    });
  });

  describe('resetState', () => {
    it('resets all state to initial values', async () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      // Set some state
      await act(async () => {
        result.current.testWithFrames();
      });
      
      // Reset
      act(() => {
        result.current.resetState();
      });
      
      expect(result.current.isUploading).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.videoFile).toBe(null);
      expect(result.current.sessionId).toBe(null);
    });
  });

  describe('Progress Updates', () => {
    it('updates progress during frame processing', async () => {
      const { result } = renderHook(() => useVideoAnalysis());
      
      // Reset state to clean up
      await act(async () => {
        result.current.resetState();
      });
      
      // Check initial progress after reset
      expect(result.current.progress).toBe(0);
      
      await act(async () => {
        result.current.testWithFrames();
      });
      
      // Wait for all frames to process
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(result.current.progress).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      (supabase.functions.invoke as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        const sessionId = await result.current.uploadVideo(new File(['test'], 'test.mp4', { type: 'video/mp4' }));
        result.current.processVideo(sessionId);
      });
      
      expect(result.current.error).toBe('Network error');
    });

    it('handles malformed API responses', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { invalid: 'data' },
        error: null
      });
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        result.current.testWithFrames();
      });
      
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(result.current.results).toHaveLength(5);
      expect(result.current.results[0].accuracy).toBe(0);
      expect(result.current.results[0].confidence).toBe(0);
    });
  });

  describe('Data Structure', () => {
    it('returns results with correct structure', async () => {
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: {
          detections: {
            predictions: [{
              x: 100,
              y: 100,
              width: 50,
              height: 50,
              confidence: 0.85,
              class: 'target',
              class_id: 1
            }]
          }
        },
        error: null
      });
      
      const { result } = renderHook(() => useVideoAnalysis());
      
      await act(async () => {
        result.current.testWithFrames();
      });
      
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(result.current.results).toHaveLength(5);
      const resultItem = result.current.results[0];
      expect(resultItem).toHaveProperty('frameNumber');
      expect(resultItem).toHaveProperty('accuracy');
      expect(resultItem).toHaveProperty('confidence');
      expect(resultItem).toHaveProperty('aimPosition');
      expect(resultItem).toHaveProperty('targetPosition');
    });
  });
});
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVideoAnalysis } from '../../hooks/useVideoAnalysis';
import { supabase } from '../../utils/supabase';

// Mock supabase
jest.mock('../../utils/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock test utilities
const mockCreateMockFile = (name = 'test-video.mp4', type = 'video/mp4') => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: 1024 });
  return file;
};

describe('useVideoAnalysis Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for supabase auth
    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    } as any;

    // Default mock implementation for supabase functions
    (mockSupabase as any).functions = {
      invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };

    // Default mock implementation for supabase storage
    (mockSupabase as any).storage = {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      }),
    };

    // Default mock implementation for supabase database
    mockSupabase.from = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'session-123' },
            error: null,
          }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    }) as any;

    // Mock fetch for test frames
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<svg></svg>'),
    }) as any;
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
      const mockFile = mockCreateMockFile();

      // Mock successful upload
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'session-123' },
              error: null,
            }),
          }),
        }),
      } as any);

      await act(async () => {
        await result.current.uploadVideo(mockFile);
      });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.videoFile).toBe(mockFile);
      expect(result.current.sessionId).toBe('session-123');
      expect(result.current.error).toBe(null);
    });

    it('handles authentication error', async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { result } = renderHook(() => useVideoAnalysis());
      const mockFile = mockCreateMockFile();

      await act(async () => {
        const sessionId = await result.current.uploadVideo(mockFile);
        expect(sessionId).toBeNull();
      });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBe('You must be authenticated to upload videos');
    });

    it('handles session creation error', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Failed to create session' },
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useVideoAnalysis());
      const mockFile = mockCreateMockFile();

      await act(async () => {
        const sessionId = await result.current.uploadVideo(mockFile);
        expect(sessionId).toBeNull();
      });

      expect(result.current.error).toBe('Failed to create session');
    });

    it('handles file upload error', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'session-123' },
              error: null,
            }),
          }),
        }),
      } as any);

      (mockSupabase.storage as any).from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' },
        }),
      });

      const { result } = renderHook(() => useVideoAnalysis());
      const mockFile = mockCreateMockFile();

      await act(async () => {
        const sessionId = await result.current.uploadVideo(mockFile);
        expect(sessionId).toBeNull();
      });

      expect(result.current.error).toBe('Upload failed');
    });
  });

  describe('processVideo', () => {
    it('sets processing state and starts progress tracking', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      (mockSupabase.functions as any).invoke.mockResolvedValue({ data: {}, error: null });

      // Mock session progress polling
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn()
              .mockResolvedValueOnce({
                data: { progress: 25, status: 'processing' },
                error: null,
              })
              .mockResolvedValueOnce({
                data: { progress: 100, status: 'completed' },
                error: null,
              }),
          }),
        }),
      } as any);

      // Mock results fetch
      const mockResults = [
        { id: 'result-1', frame_number: 1, accuracy: 85.5 },
        { id: 'result-2', frame_number: 2, accuracy: 92.3 },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockResults,
              error: null,
            }),
          }),
        }),
      } as any);

      await act(async () => {
        await result.current.processVideo('session-123');
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(result.current.results).toEqual(mockResults);
    });

    it('handles processing failure', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      (mockSupabase.functions as any).invoke.mockResolvedValue({ data: {}, error: null });

      // Mock session progress polling with failure
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { progress: 50, status: 'failed' },
              error: null,
            }),
          }),
        }),
      } as any);

      await act(async () => {
        await result.current.processVideo('session-123');
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe('Video processing failed');
    });

    it('handles function invoke error', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      (mockSupabase.functions as any).invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function failed' },
      });

      await act(async () => {
        await result.current.processVideo('session-123');
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe('Function failed');
    });
  });

  describe('testWithFrames', () => {
    it('processes test frames successfully', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      // Mock successful frame analysis
      (mockSupabase.functions as any).invoke.mockResolvedValue({
        data: {
          detections: {
            predictions: [
              { confidence: 0.95 },
              { confidence: 0.85 },
            ],
          },
        },
        error: null,
      });

      await act(async () => {
        await result.current.testWithFrames();
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(result.current.results).toHaveLength(5);
      expect(result.current.error).toBe(null);
    });

    it('handles frame fetch error', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      global.fetch = jest.fn().mockRejectedValue(new Error('Frame fetch failed')) as any;

      await act(async () => {
        await result.current.testWithFrames();
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.results).toHaveLength(0);
      // Should not error out completely if one frame fails
    });

    it('handles analysis function error', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      (mockSupabase.functions as any).invoke.mockResolvedValue({
        data: null,
        error: { message: 'Analysis failed' },
      });

      await act(async () => {
        await result.current.testWithFrames();
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe('Analysis failed');
    });

    it('calculates accuracy and confidence correctly', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      // Mock frame analysis with specific confidence values
      (mockSupabase.functions as any).invoke.mockResolvedValue({
        data: {
          detections: {
            predictions: [
              { confidence: 0.9 },
              { confidence: 0.8 },
            ],
          },
        },
        error: null,
      });

      await act(async () => {
        await result.current.testWithFrames();
      });

      expect(result.current.results[0].confidence).toBeCloseTo(85, 0); // Average of 90 and 80
      expect(result.current.results[0].accuracy).toBeGreaterThan(0);
      expect(result.current.results[0].accuracy).toBeLessThanOrEqual(95);
    });
  });

  describe('resetState', () => {
    it('resets all state to initial values', () => {
      const { result } = renderHook(() => useVideoAnalysis());

      // Set some state values
      act(() => {
        result.current.testWithFrames();
      });

      // Reset state
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

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { detections: { predictions: [{ confidence: 0.9 }] } },
        error: null,
      });

      await act(async () => {
        await result.current.testWithFrames();
      });

      // Progress should reach 100% after processing all frames
      expect(result.current.progress).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any;

      await act(async () => {
        await result.current.testWithFrames();
      });

      // Should not crash, but might have empty results
      expect(Array.isArray(result.current.results)).toBe(true);
    });

    it('handles malformed API responses', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      (mockSupabase.functions as any).invoke.mockResolvedValue({
        data: null, // No detections data
        error: null,
      });

      await act(async () => {
        await result.current.testWithFrames();
      });

      expect(result.current.results[0].accuracy).toBe(0);
      expect(result.current.results[0].confidence).toBe(0);
    });
  });

  describe('Data Structure', () => {
    it('returns results with correct structure', async () => {
      const { result } = renderHook(() => useVideoAnalysis());

      (mockSupabase.functions as any).invoke.mockResolvedValue({
        data: {
          detections: {
            predictions: [{ confidence: 0.95 }],
          },
        },
        error: null,
      });

      await act(async () => {
        await result.current.testWithFrames();
      });

      const resultItem = result.current.results[0];
      expect(resultItem).toHaveProperty('id');
      expect(resultItem).toHaveProperty('frameNumber');
      expect(resultItem).toHaveProperty('timestamp');
      expect(resultItem).toHaveProperty('accuracy');
      expect(resultItem).toHaveProperty('confidence');
      expect(resultItem).toHaveProperty('aimPosition');
      expect(resultItem).toHaveProperty('targetPosition');
      expect(resultItem).toHaveProperty('imageUrl');
    });
  });
});
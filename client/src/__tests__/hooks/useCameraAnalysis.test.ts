import { renderHook, act, waitFor } from '@testing-library/react';
import { useCameraAnalysis } from '../../hooks/useCameraAnalysis';
import { supabase } from '../../utils/supabase';

// Mock supabase
jest.mock('../../utils/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useCameraAnalysis Hook', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementation for supabase functions
    (mockSupabase as any).functions = {
      invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.latestFrame).toBe(null);
      expect(typeof result.current.startAnalysis).toBe('function');
      expect(typeof result.current.stopAnalysis).toBe('function');
    });

    it('initializes with null userId and returns correct state', () => {
      const { result } = renderHook(() => useCameraAnalysis(null));

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.latestFrame).toBe(null);
    });
  });

  describe('startAnalysis', () => {
    it('starts analysis successfully with authenticated user', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Mock successful session start
      (mockSupabase.functions as any).invoke.mockResolvedValue({ data: {}, error: null });

      await act(async () => {
        await result.current.startAnalysis();
      });

      expect(result.current.isAnalyzing).toBe(true);
      expect(result.current.error).toBe(null);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('camera-proxy', {
        body: { action: 'start_session', payload: { sessionId: expect.stringMatching(/^session-/), fps: 1 } },
      });
    });

    it('fails to start analysis when user is not authenticated', async () => {
      const { result } = renderHook(() => useCameraAnalysis(null));

      await act(async () => {
        await result.current.startAnalysis();
      });

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBe('You must be authenticated to start camera analysis');
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('handles session start error', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Mock session start error
      (mockSupabase.functions as any).invoke.mockResolvedValue({
        data: null,
        error: { message: 'Failed to start session' },
      });

      await act(async () => {
        await result.current.startAnalysis();
      });

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBe('Failed to start session: Failed to start session');
    });

    it('handles network error during session start', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Mock network error
      (mockSupabase.functions as any).invoke.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.startAnalysis();
      });

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBe('Failed to start session: Network error');
    });
  });

  describe('stopAnalysis', () => {
    it('stops analysis successfully', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // First start analysis
      (mockSupabase.functions as any).invoke.mockResolvedValue({ data: {}, error: null });

      await act(async () => {
        await result.current.startAnalysis();
      });

      expect(result.current.isAnalyzing).toBe(true);

      // Then stop analysis
      await act(async () => {
        await result.current.stopAnalysis();
      });

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.latestFrame).toBe(null);
      expect(result.current.error).toBe(null);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('camera-proxy', {
        body: { action: 'stop_session', payload: { sessionId: expect.stringMatching(/^session-/) } },
      });
    });

    it('handles stop analysis error gracefully', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Start analysis first
      (mockSupabase.functions as any).invoke.mockResolvedValue({ data: {}, error: null });

      await act(async () => {
        await result.current.startAnalysis();
      });

      // Mock stop session error
      (mockSupabase.functions as any).invoke.mockRejectedValueOnce(new Error('Stop failed'));

      await act(async () => {
        await result.current.stopAnalysis();
      });

      // Should not throw error, just log it
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('stops analysis when no session is active', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      await act(async () => {
        await result.current.stopAnalysis();
      });

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('Frame Polling', () => {
    it('polls for frames when analysis is active', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Mock successful session start and frame polling
      (mockSupabase.functions as any).invoke
        .mockResolvedValueOnce({ data: {}, error: null }) // Start session
        .mockResolvedValue({ data: { frame: 'data:image/jpeg;base64,test', frameId: 1 }, error: null }); // Frame data

      await act(async () => {
        await result.current.startAnalysis();
      });

      // Fast-forward timers to trigger polling
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.latestFrame).toBe('data:image/jpeg;base64,test');
      });
    });

    it('stops polling on error', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Mock successful session start but frame polling error
      (mockSupabase.functions as any).invoke
        .mockResolvedValueOnce({ data: {}, error: null }) // Start session
        .mockRejectedValueOnce(new Error('Frame fetch failed')); // Frame error

      await act(async () => {
        await result.current.startAnalysis();
      });

      // Fast-forward timers to trigger polling
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch frame: Frame fetch failed');
      });

      // Polling should stop after error
      expect(result.current.isAnalyzing).toBe(false);
    });

    it('handles null frame data gracefully', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Mock successful session start but null frame data
      (mockSupabase.functions as any).invoke
        .mockResolvedValueOnce({ data: {}, error: null }) // Start session
        .mockResolvedValueOnce({ data: null, error: null }); // Null frame data

      await act(async () => {
        await result.current.startAnalysis();
      });

      // Fast-forward timers to trigger polling
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not crash and continue polling
      expect(result.current.isAnalyzing).toBe(true);
    });

    it('updates frame ID correctly', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Mock successful session start and frame polling
      (mockSupabase.functions as any).invoke
        .mockResolvedValueOnce({ data: {}, error: null }) // Start session
        .mockResolvedValue({ data: { frame: 'test-frame', frameId: 1 }, error: null }); // Frame data

      await act(async () => {
        await result.current.startAnalysis();
      });

      // Advance timers to trigger polling
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.latestFrame).toBe('test-frame');
      });
    });
  });

  describe('Cleanup', () => {
    it('cleans up polling on unmount', async () => {
      const { result, unmount } = renderHook(() => useCameraAnalysis(mockUserId));

      // Mock successful session start
      (mockSupabase.functions as any).invoke.mockResolvedValue({ data: {}, error: null });

      await act(async () => {
        await result.current.startAnalysis();
      });

      expect(result.current.isAnalyzing).toBe(true);

      // Unmount component
      unmount();

      // Polling should stop (isAnalyzing would be false if we could check it)
      // Since we can't check the hook state after unmount, we verify that
      // the stop session function was called
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('camera-proxy', {
        body: { action: 'stop_session', payload: { sessionId: expect.any(String) } },
      });
    });

    it('cleans up polling when analysis is stopped', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Mock successful session start
      (mockSupabase.functions as any).invoke.mockResolvedValue({ data: {}, error: null });

      await act(async () => {
        await result.current.startAnalysis();
      });

      expect(result.current.isAnalyzing).toBe(true);

      // Clear any pending timers
      act(() => {
        jest.clearAllTimers();
      });

      // Stop analysis
      await act(async () => {
        await result.current.stopAnalysis();
      });

      // Verify analysis stopped
      expect(result.current.isAnalyzing).toBe(false);
      
      // Fast-forward timers to verify polling has stopped
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // The stop call should be the last one made
      expect(mockSupabase.functions.invoke).toHaveBeenLastCalledWith('camera-proxy', {
        body: { action: 'stop_session', payload: { sessionId: expect.any(String) } },
      });
    });
  });

  describe('Error Handling', () => {
    it('resets error when starting new analysis', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Set an initial error
      await act(async () => {
        await result.current.startAnalysis();
      });

      // Mock error to set error state
      (mockSupabase.functions as any).invoke.mockRejectedValueOnce(new Error('Initial error'));

      await act(async () => {
        await result.current.startAnalysis();
      });

      expect(result.current.error).toBeTruthy();

      // Reset mock for successful start
      (mockSupabase.functions as any).invoke.mockResolvedValue({ data: {}, error: null });

      // Start analysis again
      await act(async () => {
        await result.current.startAnalysis();
      });

      expect(result.current.error).toBe(null);
    });

    it('resets error when stopping analysis', async () => {
      const { result } = renderHook(() => useCameraAnalysis(mockUserId));

      // Start analysis to get into error state
      (mockSupabase.functions as any).invoke.mockRejectedValueOnce(new Error('Start error'));

      await act(async () => {
        await result.current.startAnalysis();
      });

      expect(result.current.error).toBeTruthy();

      // Stop analysis should reset error
      await act(async () => {
        await result.current.stopAnalysis();
      });

      expect(result.current.error).toBe(null);
    });
  });
});
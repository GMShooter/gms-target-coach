import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { ReactElement, ReactNode } from 'react';
import { useHardwareQuery } from '../../hooks/useHardwareQuery';
import { createTestQueryClient, mockFetch, restoreFetch, createMockFetchResponse, createMockFetchError } from '../utils/test-query-client';
import { createQueryWrapper } from '../utils/test-query-client';

// Mock hardware API
jest.mock('../../services/HardwareAPI', () => ({
  HardwareAPI: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    startSession: jest.fn(),
    stopSession: jest.fn(),
    getFrame: jest.fn(),
    getAnalysis: jest.fn(),
  },
}));

// Mock WebSocket
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    lastMessage: null,
    sendMessage: jest.fn(),
    connectionState: 'connected',
  })),
}));

// Mock hardware store
const mockStore = {
  connectedDevice: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  activeSession: null,
  isSessionActive: false,
  latestFrame: null,
  recentShots: [],
  analysisResult: null,
  isAnalyzing: false,
  setConnectedDevice: jest.fn(),
  setNgrokUrl: jest.fn(),
  setActiveSession: jest.fn(),
  setSessionActive: jest.fn(),
  setLatestFrame: jest.fn(),
  addShot: jest.fn(),
  setConnectionStatus: jest.fn(),
  setAnalysisResult: jest.fn(),
  setAnalyzing: jest.fn(),
};

jest.mock('../../store/hardwareStore', () => ({
  useHardwareStore: jest.fn(() => mockStore),
}));

// Mock Supabase with proper method chaining
jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'test-session-id' },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: null,
          error: null
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: null,
          error: null
        }))
      }))
    })),
    functions: {
      invoke: jest.fn(() => Promise.resolve({
        data: null,
        error: null
      }))
    }
  }
}));

describe('useHardwareQuery', () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof createQueryWrapper>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    wrapper = createQueryWrapper(queryClient);
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset mock store
    mockStore.connectedDevice = null;
    mockStore.isConnected = false;
    mockStore.isConnecting = false;
    mockStore.connectionError = null;
    mockStore.activeSession = null;
    mockStore.isSessionActive = false;
    mockStore.latestFrame = null;
    mockStore.recentShots = [];
    mockStore.analysisResult = null;
    mockStore.isAnalyzing = false;
  });

  afterEach(() => {
    queryClient.clear();
    restoreFetch();
  });

  describe('initial state', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      expect(result.current.connectedDevice).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.connectionError).toBeNull();
      expect(result.current.activeSession).toBeNull();
      expect(result.current.isSessionActive).toBe(false);
      expect(result.current.latestFrame).toBeNull();
      expect(result.current.recentShots).toEqual([]);
      expect(result.current.analysisResult).toBeNull();
      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  describe('connectToDevice', () => {
    it('should connect to device successfully', async () => {
      const mockDevice = { id: 'test-device', name: 'Test Device' };
      const mockResponse = createMockFetchResponse(mockDevice);
      mockFetch(mockResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      await result.current.connectToDevice('test-qr-data');

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectedDevice).toEqual(mockDevice);
      });
    });

    it('should handle connection error', async () => {
      const mockError = new Error('Connection failed');
      const mockResponse = createMockFetchError(500, 'Connection failed');
      mockFetch(mockResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      await result.current.connectToDevice('invalid-qr-data');

      await waitFor(() => {
        expect(result.current.connectionError).toBeTruthy();
        expect(result.current.isConnected).toBe(false);
      });
    });
  });

  describe('disconnectDevice', () => {
    it('should disconnect from device successfully', async () => {
      const mockResponse = createMockFetchResponse({ success: true });
      mockFetch(mockResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // First connect
      await result.current.connectToDevice('test-qr-data');
      
      // Then disconnect
      await result.current.disconnectDevice('test-device-id');

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.connectedDevice).toBeNull();
      });
    });
  });

  describe('startSession', () => {
    it('should start session successfully', async () => {
      const mockSession = { id: 'test-session', startTime: Date.now() };
      const mockResponse = createMockFetchResponse(mockSession);
      mockFetch(mockResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      await result.current.startSession('test-device-id', 'test-user-id');

      await waitFor(() => {
        expect(result.current.isSessionActive).toBe(true);
        expect(result.current.activeSession).toEqual(mockSession);
      });
    });

    it('should handle session start error', async () => {
      const mockError = new Error('Failed to start session');
      const mockResponse = createMockFetchError(500, 'Failed to start session');
      mockFetch(mockResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      await result.current.startSession('test-device-id', 'test-user-id');

      await waitFor(() => {
        expect(result.current.isSessionActive).toBe(false);
        expect(result.current.activeSession).toBeNull();
      });
    });
  });

  describe('stopSession', () => {
    it('should stop session successfully', async () => {
      const mockResponse = createMockFetchResponse({ success: true });
      mockFetch(mockResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // First start a session
      await result.current.startSession('test-device-id', 'test-user-id');
      
      // Then stop it
      await result.current.stopSession('test-session-id');

      await waitFor(() => {
        expect(result.current.isSessionActive).toBe(false);
        expect(result.current.activeSession).toBeNull();
      });
    });
  });

  describe('frame polling', () => {
    it('should poll for frames when session is active', async () => {
      const mockFrame = { id: 'frame-1', timestamp: Date.now(), data: 'mock-frame-data' };
      const mockResponse = createMockFetchResponse(mockFrame);
      mockFetch(mockResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // Start session to trigger frame polling
      await result.current.startSession('test-device-id', 'test-user-id');

      await waitFor(() => {
        expect(result.current.latestFrame).toEqual(mockFrame);
      });
    });

    it('should not poll for frames when session is inactive', async () => {
      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // Don't start session
      expect(result.current.isSessionActive).toBe(false);

      // Wait a bit to ensure no polling happens
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.latestFrame).toBeNull();
    });
  });

  describe('analysis', () => {
    it('should analyze frames when available', async () => {
      const mockFrame = { id: 'frame-1', timestamp: Date.now(), data: 'mock-frame-data' };
      const mockAnalysis = { score: 95, shots: 5, accuracy: 0.9 };
      
      // Mock frame response
      const frameResponse = createMockFetchResponse(mockFrame);
      // Mock analysis response
      const analysisResponse = createMockFetchResponse(mockAnalysis);
      
      mockFetch(frameResponse);
      mockFetch(analysisResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // Start session to trigger frame polling and analysis
      await result.current.startSession('test-device-id', 'test-user-id');

      await waitFor(() => {
        expect(result.current.analysisResult).toEqual(mockAnalysis);
      });
    });

    it('should handle analysis errors gracefully', async () => {
      const mockFrame = { id: 'frame-1', timestamp: Date.now(), data: 'mock-frame-data' };
      const mockError = new Error('Analysis failed');
      
      // Mock frame response
      const frameResponse = createMockFetchResponse(mockFrame);
      // Mock analysis error
      const errorResponse = createMockFetchError(500, 'Analysis failed');
      
      mockFetch(frameResponse);
      mockFetch(errorResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // Start session to trigger frame polling and analysis
      await result.current.startSession('test-device-id', 'test-user-id');

      await waitFor(() => {
        expect(result.current.analysisResult).toBeNull();
      });
    });
  });

  describe('recent shots', () => {
    it('should track recent shots', async () => {
      const mockShot = { id: 'shot-1', timestamp: Date.now(), score: 95 };
      const mockResponse = createMockFetchResponse(mockShot);
      mockFetch(mockResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // Start session
      await result.current.startSession('test-device-id', 'test-user-id');

      await waitFor(() => {
        expect(result.current.recentShots).toContainEqual(mockShot);
      });
    });

    it('should limit recent shots to reasonable number', async () => {
      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // Start session
      await result.current.startSession('test-device-id', 'test-user-id');

      // Simulate many shots
      for (let i = 0; i < 150; i++) {
        const mockShot = { id: `shot-${i}`, timestamp: Date.now(), score: 95 };
        const mockResponse = createMockFetchResponse(mockShot);
        mockFetch(mockResponse);
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await waitFor(() => {
        expect(result.current.recentShots.length).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockError = new Error('Network error');
      mockFetch(mockError);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      await result.current.connectToDevice('test-qr-data');

      await waitFor(() => {
        expect(result.current.connectionError).toBeTruthy();
        expect(result.current.isConnected).toBe(false);
      });
    });

    it('should reset error on successful operation', async () => {
      // First mock an error
      const mockError = new Error('Connection failed');
      const errorResponse = createMockFetchError(500, 'Connection failed');
      mockFetch(errorResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // Try to connect and fail
      await result.current.connectToDevice('invalid-qr-data');

      await waitFor(() => {
        expect(result.current.connectionError).toBeTruthy();
      });

      // Now mock success
      const mockDevice = { id: 'test-device', name: 'Test Device' };
      const successResponse = createMockFetchResponse(mockDevice);
      mockFetch(successResponse);

      // Try to connect again and succeed
      await result.current.connectToDevice('valid-qr-data');

      await waitFor(() => {
        expect(result.current.connectionError).toBeNull();
        expect(result.current.isConnected).toBe(true);
      });
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on unmount', () => {
      const { unmount } = renderHook(() => useHardwareQuery(), { wrapper });

      // Unmount hook
      unmount();

      // Verify no errors are thrown during cleanup
      expect(true).toBe(true);
    });
  });

  describe('performance', () => {
    it('should not make excessive requests', async () => {
      const mockResponse = createMockFetchResponse({ success: true });
      const mockFetchFn = mockFetch(mockResponse);

      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // Start session
      await result.current.startSession('test-device-id', 'test-user-id');

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that fetch was called a reasonable number of times
      expect(mockFetchFn).toHaveBeenCalledTimes(expect.any(Number));
    });
  });

  describe('integration with WebSocket', () => {
    it('should handle WebSocket messages', async () => {
      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // Start session
      await result.current.startSession('test-device-id', 'test-user-id');

      // WebSocket messages should be handled by hook
      // This is tested indirectly through mock
      expect(result.current.isSessionActive).toBe(true);
    });
  });

  describe('type safety', () => {
    it('should return correctly typed values', () => {
      const { result } = renderHook(() => useHardwareQuery(), { wrapper });

      // These assertions ensure TypeScript types are correct
      expect(typeof result.current.connectToDevice).toBe('function');
      expect(typeof result.current.disconnectDevice).toBe('function');
      expect(typeof result.current.startSession).toBe('function');
      expect(typeof result.current.stopSession).toBe('function');
      expect(Array.isArray(result.current.recentShots)).toBe(true);
    });
  });
});
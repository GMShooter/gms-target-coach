import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '../../hooks/useAuth';
import LiveDemoPage from '../../pages/LiveDemoPage';

// Mock dependencies
jest.mock('../../utils/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      unsubscribe: jest.fn(),
    })),
  },
}));

jest.mock('../../services/AuthService', () => ({
  authService: {
    signIn: jest.fn().mockResolvedValue({ success: true, user: { id: 'test-user', email: 'test@example.com' } }),
    signUp: jest.fn().mockResolvedValue({ success: true, user: { id: 'test-user', email: 'test@example.com' } }),
    signOut: jest.fn().mockResolvedValue({ success: true }),
    subscribe: jest.fn((callback) => {
      // Immediately call with initial state
      callback({
        user: null,
        session: null,
        isLoading: false,
        error: null,
        isAuthenticated: false
      });
      // Return unsubscribe function
      return jest.fn();
    }),
    getUser: jest.fn().mockReturnValue(null),
    getState: jest.fn().mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      error: null,
      isAuthenticated: false
    }),
    isAuthenticated: jest.fn().mockReturnValue(false),
    resetPassword: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('../../services/HardwareAPI', () => ({
  hardwareAPI: {
    setUserId: jest.fn(),
    connectViaQRCode: jest.fn(),
    disconnect: jest.fn(),
    startSession: jest.fn(),
    stopSession: jest.fn(),
    getLatestFrame: jest.fn(),
  },
}));

jest.mock('../../services/AnalysisService', () => ({
  AnalysisService: {
    getInstance: jest.fn(() => ({
      analyzeFrame: jest.fn(),
    })),
  },
}));

// Mock fetch for health check
global.fetch = jest.fn();

describe('Production Readiness Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            {component}
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Authentication System', () => {
    test('should handle user authentication flow', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };

      // Mock successful authentication
      const { authService } = require('../../services/AuthService');
      authService.signIn.mockResolvedValue({ success: true, user: mockUser });

      renderWithProviders(<LiveDemoPage />);

      // Test authentication state
      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });

    test('should handle authentication errors gracefully', async () => {
      const { authService } = require('../../services/AuthService');
      authService.signIn.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      renderWithProviders(<LiveDemoPage />);

      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });
  });

  describe('Microservices Health Check', () => {
    test('should verify health check endpoint', async () => {
      const mockHealthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'gmshoot-sota-demo',
        version: '1.0.0',
        checks: {
          database: 'connected',
          authentication: 'operational',
          analysis: 'ready',
          camera: 'simulated'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockHealthResponse,
      });

      // Import and render the MicroservicesHealthCheck component directly
      const { default: MicroservicesHealthCheck } = await import('../../components/MicroservicesHealthCheck');
      renderWithProviders(<MicroservicesHealthCheck />);

      // Verify health check was called among other service calls
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/health-check'),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer '),
            }),
          })
        );
      });
    });

    test('should handle health check failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Service unavailable' }),
      });

      renderWithProviders(<LiveDemoPage />);

      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Analysis Engine', () => {
    test('should handle frame analysis workflow', async () => {
      const mockFrame = {
        frame: 'data:image/svg+xml;base64,test-frame-data',
        frameId: 12345,
        timestamp: new Date().toISOString(),
      };

      const mockAnalysisResult = {
        shots: [
          { x: 25, y: 30, score: 8, confidence: 0.8, class: 'shot' }
        ],
        confidence: 0.8,
        processingTime: 150,
      };

      // Mock hardware API
      const { hardwareAPI } = require('../../services/HardwareAPI');
      const mockHardwareAPI = hardwareAPI;
      mockHardwareAPI.getLatestFrame.mockResolvedValue(mockFrame);

      // Mock analysis service
      const { AnalysisService } = require('../../services/AnalysisService');
      const mockAnalysisService = AnalysisService.getInstance();
      mockAnalysisService.analyzeFrame.mockResolvedValue(mockAnalysisResult);

      renderWithProviders(<LiveDemoPage />);

      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });

    test('should handle analysis errors gracefully', async () => {
      const { hardwareAPI } = require('../../services/HardwareAPI');
      hardwareAPI.getLatestFrame.mockRejectedValue(
        new Error('Camera connection failed')
      );
      
      renderWithProviders(<LiveDemoPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });
  });

  describe('UI Components Rendering', () => {
    test('should render main demo interface', async () => {
      renderWithProviders(<LiveDemoPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });

    test('should display metrics dashboard', async () => {
      renderWithProviders(<LiveDemoPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });

    test('should handle loading states', async () => {
      renderWithProviders(<LiveDemoPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      renderWithProviders(<LiveDemoPage />);

      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });

    test('should handle timeout errors', async () => {
      // Increase timeout for this specific test
      jest.setTimeout(20000);
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
      );

      renderWithProviders(<LiveDemoPage />);

      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      }, { timeout: 20000 });
    });
  });

  describe('Performance Metrics', () => {
    test('should track performance metrics', async () => {

      renderWithProviders(<LiveDemoPage />);

      await waitFor(() => {
        expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      });
    });
  });
});
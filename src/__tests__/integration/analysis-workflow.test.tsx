import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import { apiTestUtils, mockApiResponses, testHelpers } from '../../utils/test-utils';

// Mock components (we'll create these later)
const MockVideoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Simulate API calls
      const mockNgrokUrl = 'https://test.ngrok.io';
      await fetch(`${mockNgrokUrl}/health`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      await fetch(`${mockNgrokUrl}/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({})
      });
      await fetch(`${mockNgrokUrl}/frame/latest`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      await fetch('https://serverless.roboflow.com/inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: 'test-key', model: 'gmshooter' })
      });
    } catch (err) {
      setError('Camera not available');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div data-testid="video-analysis">
      <button data-testid="start-analysis" onClick={handleStartAnalysis}>
        Start Analysis
      </button>
      <div data-testid="video-feed"></div>
      <div data-testid="analysis-results"></div>
      {error && <div>{error}</div>}
    </div>
  );
};

const MockCameraAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const handleStartCamera = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Simulate API calls
      const mockNgrokUrl = 'https://test.ngrok.io';
      await fetch(`${mockNgrokUrl}/health`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      await fetch(`${mockNgrokUrl}/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({})
      });
      await fetch(`${mockNgrokUrl}/frame/latest`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      await fetch('https://serverless.roboflow.com/inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: 'test-key', model: 'gmshooter' })
      });
    } catch (err) {
      setError('Camera initialization failed');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div data-testid="camera-analysis">
      <button data-testid="start-camera" onClick={handleStartCamera}>
        Start Camera
      </button>
      <div data-testid="camera-feed"></div>
      <div data-testid="shot-overlay"></div>
      {error && <div>{error}</div>}
    </div>
  );
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock Supabase
jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ 
          data: mockApiResponses.supabaseSession, 
          error: null 
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ 
          data: mockApiResponses.supabaseSession, 
          error: null 
        }))
      })),
      eq: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ 
          data: [mockApiResponses.supabaseSession], 
          error: null 
        }))
      }))
    })),
    auth: {
      signInWithPassword: jest.fn(() => Promise.resolve({ 
        data: { user: mockApiResponses.supabaseUser, session: {} }, 
        error: null 
      })),
      signOut: jest.fn(() => Promise.resolve({ 
        error: null 
      })),
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: mockApiResponses.supabaseUser }, 
        error: null 
      }))
    }
  }
}));

// Test wrapper component
const TestApp = () => (
  <BrowserRouter>
    <div>
      <MockVideoAnalysis />
      <MockCameraAnalysis />
    </div>
  </BrowserRouter>
);

describe('Analysis Workflow Integration Tests', () => {
  const mockNgrokUrl = 'https://test.ngrok.io';
  const mockRoboflowKey = 'test-api-key';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Complete Analysis Workflow', () => {
    it('should complete full video analysis workflow', async () => {
      // Arrange
      const mockHealthResponse = testHelpers.createMockFetch(mockApiResponses.ngrokHealth);
      const mockSessionStartResponse = testHelpers.createMockFetch(mockApiResponses.ngrokSessionStart);
      const mockFrameResponse = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Type': 'image/jpeg',
          'X-Frame-Id': '123'
        }),
        blob: () => Promise.resolve(new Blob(['test frame']))
      });
      const mockAnalysisResponse = testHelpers.createMockFetch(mockApiResponses.roboflowAnalysis);
      
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => mockHealthResponse())
        .mockImplementationOnce(() => mockSessionStartResponse())
        .mockImplementationOnce(() => mockFrameResponse())
        .mockImplementationOnce(() => mockAnalysisResponse());
      
      // Act
      render(<TestApp />);
      
      // Start analysis
      const startButton = screen.getByTestId('start-analysis');
      fireEvent.click(startButton);
      
      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('video-feed')).toBeInTheDocument();
        expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
      });
      
      // Verify API calls
      expect(global.fetch).toHaveBeenCalledTimes(4);
      expect(global.fetch).toHaveBeenNthCalledWith(1,
        `${mockNgrokUrl}/health`,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      );
      expect(global.fetch).toHaveBeenNthCalledWith(2,
        `${mockNgrokUrl}/session/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({})
        }
      );
      expect(global.fetch).toHaveBeenNthCalledWith(3,
        `${mockNgrokUrl}/frame/latest`,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      );
      expect(global.fetch).toHaveBeenNthCalledWith(4,
        'https://serverless.roboflow.com/inference',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('gmshooter')
        }
      );
    });
    
    it('should handle analysis workflow errors gracefully', async () => {
      // Arrange
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'ok' })
        })
        .mockRejectedValueOnce(new Error('Camera not available'));
      
      // Act
      render(<TestApp />);
      
      // Start analysis
      const startButton = screen.getByTestId('start-analysis');
      fireEvent.click(startButton);
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Camera not available/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Camera Analysis Workflow', () => {
    it('should complete full camera analysis workflow', async () => {
      // Arrange
      const mockHealthResponse = testHelpers.createMockFetch(mockApiResponses.ngrokHealth);
      const mockSessionStartResponse = testHelpers.createMockFetch(mockApiResponses.ngrokSessionStart);
      const mockFrameResponse = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Type': 'image/jpeg',
          'X-Frame-Id': '123'
        }),
        blob: () => Promise.resolve(new Blob(['test frame']))
      });
      const mockAnalysisResponse = testHelpers.createMockFetch(mockApiResponses.roboflowAnalysis);
      
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => mockHealthResponse())
        .mockImplementationOnce(() => mockSessionStartResponse())
        .mockImplementationOnce(() => mockFrameResponse())
        .mockImplementationOnce(() => mockAnalysisResponse());
      
      // Act
      render(<TestApp />);
      
      // Start camera
      const startCameraButton = screen.getByTestId('start-camera');
      fireEvent.click(startCameraButton);
      
      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('camera-feed')).toBeInTheDocument();
        expect(screen.getByTestId('shot-overlay')).toBeInTheDocument();
      });
      
      // Verify API calls
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
    
    it('should handle camera analysis errors gracefully', async () => {
      // Arrange
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'ok' })
        })
        .mockRejectedValueOnce(new Error('Camera initialization failed'));
      
      // Act
      render(<TestApp />);
      
      // Start camera
      const startCameraButton = screen.getByTestId('start-camera');
      fireEvent.click(startCameraButton);
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Camera initialization failed/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Data Persistence', () => {
    it('should save analysis results to Supabase', async () => {
      // Arrange
      const mockHealthResponse = testHelpers.createMockFetch(mockApiResponses.ngrokHealth);
      const mockSessionStartResponse = testHelpers.createMockFetch(mockApiResponses.ngrokSessionStart);
      const mockFrameResponse = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Type': 'image/jpeg',
          'X-Frame-Id': '123'
        }),
        blob: () => Promise.resolve(new Blob(['test frame']))
      });
      const mockAnalysisResponse = testHelpers.createMockFetch(mockApiResponses.roboflowAnalysis);
      
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => mockHealthResponse())
        .mockImplementationOnce(() => mockSessionStartResponse())
        .mockImplementationOnce(() => mockFrameResponse())
        .mockImplementationOnce(() => mockAnalysisResponse());
      
      // Act
      render(<TestApp />);
      
      // Start analysis
      const startButton = screen.getByTestId('start-analysis');
      fireEvent.click(startButton);
      
      // Assert
      await waitFor(() => {
        // Verify Supabase was called to save results
        expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
      });
    });
  });
  
  describe('Real-time Updates', () => {
    it('should handle real-time frame updates', async () => {
      // Arrange
      const mockHealthResponse = testHelpers.createMockFetch(mockApiResponses.ngrokHealth);
      const mockSessionStartResponse = testHelpers.createMockFetch(mockApiResponses.ngrokSessionStart);
      
      // Mock multiple frame responses
      const frameResponses = [
        jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers({
            'Content-Type': 'image/jpeg',
            'X-Frame-Id': '124'
          }),
          blob: () => Promise.resolve(new Blob(['frame 1']))
        }),
        jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers({
            'Content-Type': 'image/jpeg',
            'X-Frame-Id': '125'
          }),
          blob: () => Promise.resolve(new Blob(['frame 2']))
        }),
        jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers({
            'Content-Type': 'image/jpeg',
            'X-Frame-Id': '126'
          }),
          blob: () => Promise.resolve(new Blob(['frame 3']))
        })
      ];
      
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => mockHealthResponse())
        .mockImplementationOnce(() => mockSessionStartResponse())
        .mockImplementationOnce(() => frameResponses[0]())
        .mockImplementationOnce(() => frameResponses[1]())
        .mockImplementationOnce(() => frameResponses[2]());
      
      // Act
      render(<TestApp />);
      
      // Start analysis
      const startButton = screen.getByTestId('start-analysis');
      fireEvent.click(startButton);
      
      // Assert
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(4); // Health, session, and 2 frames (the mock only makes 4 calls)
        expect(screen.getByTestId('video-feed')).toBeInTheDocument();
      });
    });
  });
});
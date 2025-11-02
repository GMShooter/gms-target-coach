import { supabase } from './supabase';

// Ensure this file is treated as a module
export {};

// Mock API responses for testing
export const mockApiResponses = {
  // Ngrok server responses
  ngrokHealth: {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  },
  ngrokSessionStart: {
    session_id: 'test-session-123',
    status: 'active',
    fps: 1,
    preset: 1,
    distance: '10m'
  },
  ngrokSessionStop: {
    session_id: 'test-session-123',
    status: 'stopped',
    frames_captured: 10
  },
  ngrokFrameLatest: {
    frame_id: 123,
    timestamp: new Date().toISOString(),
    size: 1024
  },
  
  // Roboflow API responses
  roboflowAnalysis: {
    predictions: [
      {
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        confidence: 0.95,
        class: 'bullseye',
        class_id: 0
      }
    ],
    image: {
      width: 640,
      height: 480
    }
  },
  
  // Supabase responses
  supabaseUser: {
    id: 'test-user-123',
    email: 'test@example.com',
    created_at: new Date().toISOString()
  },
  supabaseSession: {
    id: 'test-session-123',
    user_id: 'test-user-123',
    created_at: new Date().toISOString(),
    status: 'completed',
    frames_count: 10,
    shots_detected: 5
  },
  supabaseShot: {
    id: 'test-shot-123',
    session_id: 'test-session-123',
    frame_id: 123,
    x: 100,
    y: 100,
    confidence: 0.95,
    created_at: new Date().toISOString()
  }
};

// Test helper functions
export const testHelpers = {
  // Create a mock fetch response
  createMockFetch: (response: any, ok = true, status = 200) => {
    return jest.fn().mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(response),
      blob: () => Promise.resolve(new Blob()),
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Frame-Id': response.frame_id?.toString() || '123'
      })
    });
  },
  
  // Create a mock Supabase response
  createMockSupabaseResponse: (data: any, error = null) => {
    return {
      data,
      error,
      count: Array.isArray(data) ? data.length : 1
    };
  },
  
  // Wait for a specified time (for async testing)
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create a test file from base64
  createTestFile: (base64: string, filename = 'test.jpg', type = 'image/jpeg') => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type });
  },
  
  // Generate test shot data
  generateTestShotData: (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-shot-${i}`,
      x: Math.floor(Math.random() * 640),
      y: Math.floor(Math.random() * 480),
      confidence: 0.8 + Math.random() * 0.2,
      class: 'bullseye',
      frame_id: 100 + i
    }));
  }
};

// API testing utilities
export const apiTestUtils = {
  // Test Ngrok API endpoints
  testNgrokHealth: async (baseUrl: string) => {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      return {
        success: response.ok,
        status: response.status,
        data: await response.json()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  testNgrokSessionStart: async (baseUrl: string, options: { fps?: number; preset?: number; distance?: string } = {}) => {
    try {
      const response = await fetch(`${baseUrl}/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(options)
      });
      return {
        success: response.ok,
        status: response.status,
        data: await response.json()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  testNgrokFrameLatest: async (baseUrl: string) => {
    try {
      const response = await fetch(`${baseUrl}/frame/latest`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      return {
        success: response.ok,
        status: response.status,
        frameId: response.headers.get('X-Frame-Id'),
        data: response.ok ? await response.blob() : null
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  // Test Roboflow API
  testRoboflowAnalysis: async (imageUrl: string, apiKey: string) => {
    try {
      const response = await fetch('https://serverless.roboflow.com/inference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: apiKey,
          workspace_name: 'gmshooter',
          workflow_id: 'production-inference-sahi-detr-2-2',
          images: { image: imageUrl },
          use_cache: true
        })
      });
      return {
        success: response.ok,
        status: response.status,
        data: await response.json()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  // Test Supabase connection
  testSupabaseConnection: async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, error } = await supabase.from('sessions').select('count').limit(1);
      return {
        success: !error,
        error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};
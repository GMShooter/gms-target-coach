import { apiTestUtils, mockApiResponses, testHelpers } from '../../utils/test-utils';

// Mock fetch globally
global.fetch = jest.fn();

describe('Ngrok API Tests', () => {
  const mockBaseUrl = 'https://test.ngrok.io';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Health Check', () => {
    it('should return health status successfully', async () => {
      // Arrange
      const mockFetch = testHelpers.createMockFetch(mockApiResponses.ngrokHealth);
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testNgrokHealth(mockBaseUrl);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockApiResponses.ngrokHealth);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/health`,
        {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        }
      );
    });
    
    it('should handle health check failure', async () => {
      // Arrange
      const mockFetch = testHelpers.createMockFetch(
        { error: 'Service unavailable' },
        false,
        503
      );
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testNgrokHealth(mockBaseUrl);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(503);
    });
    
    it('should handle network errors', async () => {
      // Arrange
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testNgrokHealth(mockBaseUrl);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
  
  describe('Session Management', () => {
    it('should start a session successfully', async () => {
      // Arrange
      const sessionOptions = { fps: 1, preset: 1, distance: '10m' };
      const mockFetch = testHelpers.createMockFetch(mockApiResponses.ngrokSessionStart);
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testNgrokSessionStart(mockBaseUrl, sessionOptions);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockApiResponses.ngrokSessionStart);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/session/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify(sessionOptions)
        }
      );
    });
    
    it('should handle session start with default options', async () => {
      // Arrange
      const mockFetch = testHelpers.createMockFetch(mockApiResponses.ngrokSessionStart);
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testNgrokSessionStart(mockBaseUrl);
      
      // Assert
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/session/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({})
        }
      );
    });
    
    it('should handle session start failure', async () => {
      // Arrange
      const mockFetch = testHelpers.createMockFetch(
        { error: 'Camera not available' },
        false,
        400
      );
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testNgrokSessionStart(mockBaseUrl);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
    });
  });
  
  describe('Frame Retrieval', () => {
    it('should retrieve the latest frame successfully', async () => {
      // Arrange
      const mockImageData = new Blob(['test image data'], { type: 'image/jpeg' });
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Type': 'image/jpeg',
          'X-Frame-Id': '123'
        }),
        blob: () => Promise.resolve(mockImageData)
      });
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testNgrokFrameLatest(mockBaseUrl);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.frameId).toBe('123');
      expect(result.data).toBe(mockImageData);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/frame/latest`,
        {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        }
      );
    });
    
    it('should handle no frame available', async () => {
      // Arrange
      const mockFetch = testHelpers.createMockFetch(
        { error: 'No frame available' },
        false,
        503
      );
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testNgrokFrameLatest(mockBaseUrl);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(503);
      expect(result.data).toBeNull();
    });
    
    it('should handle frame retrieval errors', async () => {
      // Arrange
      const mockFetch = jest.fn().mockRejectedValue(new Error('Frame retrieval failed'));
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testNgrokFrameLatest(mockBaseUrl);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Frame retrieval failed');
    });
  });
});
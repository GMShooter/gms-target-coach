import { apiTestUtils, mockApiResponses, testHelpers } from '../../utils/test-utils';

// Mock fetch globally
global.fetch = jest.fn();

describe('Roboflow API Tests', () => {
  const mockApiKey = 'E2X6kPlh0hSSidTZ23ak';
  const mockImageUrl = 'https://example.com/test-image.jpg';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Shot Analysis', () => {
    it('should analyze an image successfully', async () => {
      // Arrange
      const mockFetch = testHelpers.createMockFetch(mockApiResponses.roboflowAnalysis);
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testRoboflowAnalysis(mockImageUrl, mockApiKey);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockApiResponses.roboflowAnalysis);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://serverless.roboflow.com/inference',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            api_key: mockApiKey,
            workspace_name: 'gmshooter',
            workflow_id: 'production-inference-sahi-detr-2-2',
            images: { image: mockImageUrl },
            use_cache: true
          })
        }
      );
    });
    
    it('should handle analysis with no shots detected', async () => {
      // Arrange
      const noShotsResponse = {
        predictions: [],
        image: {
          width: 640,
          height: 480
        }
      };
      const mockFetch = testHelpers.createMockFetch(noShotsResponse);
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testRoboflowAnalysis(mockImageUrl, mockApiKey);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data.predictions).toEqual([]);
    });
    
    it('should handle multiple shots detected', async () => {
      // Arrange
      const multipleShotsResponse = {
        predictions: [
          {
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            confidence: 0.95,
            class: 'bullseye',
            class_id: 0
          },
          {
            x: 300,
            y: 200,
            width: 45,
            height: 45,
            confidence: 0.87,
            class: 'bullseye',
            class_id: 0
          }
        ],
        image: {
          width: 640,
          height: 480
        }
      };
      const mockFetch = testHelpers.createMockFetch(multipleShotsResponse);
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testRoboflowAnalysis(mockImageUrl, mockApiKey);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data.predictions).toHaveLength(2);
    });
    
    it('should handle API error response', async () => {
      // Arrange
      const errorResponse = {
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      };
      const mockFetch = testHelpers.createMockFetch(errorResponse, false, 401);
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testRoboflowAnalysis(mockImageUrl, mockApiKey);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
    });
    
    it('should handle network errors', async () => {
      // Arrange
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testRoboflowAnalysis(mockImageUrl, mockApiKey);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
    
    it('should handle invalid image URL', async () => {
      // Arrange
      const invalidUrlResponse = {
        error: 'Invalid image URL',
        message: 'The provided image URL could not be accessed'
      };
      const mockFetch = testHelpers.createMockFetch(invalidUrlResponse, false, 400);
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testRoboflowAnalysis('invalid-url', mockApiKey);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
    });
  });
  
  describe('Confidence Threshold', () => {
    it('should filter predictions below confidence threshold', async () => {
      // Arrange
      const lowConfidenceResponse = {
        predictions: [
          {
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            confidence: 0.95,
            class: 'bullseye',
            class_id: 0
          },
          {
            x: 300,
            y: 200,
            width: 45,
            height: 45,
            confidence: 0.45, // Below typical threshold
            class: 'bullseye',
            class_id: 0
          }
        ],
        image: {
          width: 640,
          height: 480
        }
      };
      const mockFetch = testHelpers.createMockFetch(lowConfidenceResponse);
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testRoboflowAnalysis(mockImageUrl, mockApiKey);
      
      // Assert
      expect(result.success).toBe(true);
      // The API returns all predictions, filtering should be done client-side
      expect(result.data.predictions).toHaveLength(2);
      
      // Test client-side filtering
      const highConfidencePredictions = result.data.predictions.filter(
        (p: any) => p.confidence > 0.5
      );
      expect(highConfidencePredictions).toHaveLength(1);
    });
  });
  
  describe('Response Validation', () => {
    it('should validate response structure', async () => {
      // Arrange
      const invalidResponse = {
        invalid: 'structure'
      };
      const mockFetch = testHelpers.createMockFetch(invalidResponse);
      (global.fetch as jest.Mock) = mockFetch;
      
      // Act
      const result = await apiTestUtils.testRoboflowAnalysis(mockImageUrl, mockApiKey);
      
      // Assert
      expect(result.success).toBe(true);
      // Additional validation would be done in the consuming component
      expect(result.data).toEqual(invalidResponse);
    });
  });
});
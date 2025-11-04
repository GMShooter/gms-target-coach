describe('Camera Analysis Workflow', () => {
  beforeEach(() => {
    // Clear localStorage and cookies before each test
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'test-auth-token');
      win.localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg'
      }));
    });
    
    // Mock camera permissions
    cy.checkCameraAccess();
    
    // Visit the camera analysis page
    cy.visit('/camera-analysis');
  });

  it('should display camera analysis page correctly', () => {
    // Check if camera analysis page elements are visible
    cy.get('[data-testid="camera-analysis-page"]').should('be.visible');
    cy.get('[data-testid="page-title"]').should('contain.text', 'Camera Analysis');
    cy.get('[data-testid="start-camera-button"]').should('be.visible');
    cy.get('[data-testid="camera-feed"]').should('not.be.visible');
    cy.get('[data-testid="analysis-overlay"]').should('not.be.visible');
    cy.get('[data-testid="camera-controls"]').should('not.be.visible');
  });

  it('should start camera analysis successfully', () => {
    // Mock session creation response
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { success: true, sessionId: 'session-123' }
    });
    
    // Mock frame data response
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { 
        frame: 'data:image/jpeg;base64,test-frame-data',
        frameId: 1
      }
    });
    
    // Start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Check if camera feed appears
    cy.get('[data-testid="camera-feed"]').should('be.visible');
    cy.get('[data-testid="analysis-overlay"]').should('be.visible');
    cy.get('[data-testid="camera-controls"]').should('be.visible');
    cy.get('[data-testid="stop-camera-button"]').should('be.visible');
    cy.get('[data-testid="camera-status"]').should('contain.text', 'Analyzing');
  });

  it('should handle camera permission denied', () => {
    // Mock camera permission denied
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia')
        .rejects(new Error('Permission denied'));
    });
    
    // Try to start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Check error message
    cy.get('[data-testid="camera-error"]').should('be.visible');
    cy.get('[data-testid="camera-error"]').should('contain.text', 'Camera permission denied');
  });

  it('should handle camera not available', () => {
    // Mock camera not available
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia')
        .rejects(new Error('No camera found'));
    });
    
    // Try to start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Check error message
    cy.get('[data-testid="camera-error"]').should('be.visible');
    cy.get('[data-testid="camera-error"]').should('contain.text', 'No camera found');
  });

  it('should stop camera analysis successfully', () => {
    // Mock session creation and frame data
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { success: true, sessionId: 'session-123' }
    });
    
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { 
        frame: 'data:image/jpeg;base64,test-frame-data',
        frameId: 1
      }
    });
    
    // Start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Wait for camera to start
    cy.get('[data-testid="camera-feed"]').should('be.visible');
    
    // Mock session stop response
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { success: true }
    });
    
    // Stop camera
    cy.get('[data-testid="stop-camera-button"]').click();
    
    // Check if camera is stopped
    cy.get('[data-testid="camera-feed"]').should('not.be.visible');
    cy.get('[data-testid="analysis-overlay"]').should('not.be.visible');
    cy.get('[data-testid="start-camera-button"]').should('be.visible');
    cy.get('[data-testid="camera-status"]').should('contain.text', 'Camera stopped');
  });

  it('should display real-time analysis results', () => {
    // Mock session creation
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { success: true, sessionId: 'session-123' }
    });
    
    // Mock frame with analysis results
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { 
        frame: 'data:image/jpeg;base64,test-frame-data',
        frameId: 1,
        analysis: {
          detections: [
            {
              confidence: 0.9,
              x: 100,
              y: 100,
              width: 50,
              height: 50,
              label: 'target'
            }
          ],
          accuracy: 85.5
        }
      }
    });
    
    // Start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Check if analysis results are displayed
    cy.get('[data-testid="analysis-results"]').should('be.visible');
    cy.get('[data-testid="accuracy-display"]').should('contain.text', '85.5%');
    cy.get('[data-testid="detection-overlay"]').should('be.visible');
  });

  it('should handle session creation errors', () => {
    // Mock session creation error
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      error: { message: 'Failed to create session' }
    });
    
    // Try to start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Check error message
    cy.get('[data-testid="camera-error"]').should('be.visible');
    cy.get('[data-testid="camera-error"]').should('contain.text', 'Failed to create session');
  });

  it('should handle frame polling errors', () => {
    // Mock successful session creation
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { success: true, sessionId: 'session-123' }
    });
    
    // Mock frame polling error
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      error: { message: 'Failed to fetch frame' }
    });
    
    // Start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Check error message
    cy.get('[data-testid="camera-error"]').should('be.visible');
    cy.get('[data-testid="camera-error"]').should('contain.text', 'Failed to fetch frame');
  });

  it('should capture and save snapshots', () => {
    // Mock session creation and frame data
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { success: true, sessionId: 'session-123' }
    });
    
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { 
        frame: 'data:image/jpeg;base64,test-frame-data',
        frameId: 1
      }
    });
    
    // Mock snapshot save
    cy.mockApiResponse('POST', '**/rest/v1/snapshots', {
      data: { id: 'snapshot-123' }
    });
    
    // Start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Wait for camera to start
    cy.get('[data-testid="camera-feed"]').should('be.visible');
    
    // Take snapshot
    cy.get('[data-testid="snapshot-button"]').click();
    
    // Check if snapshot is saved
    cy.get('[data-testid="snapshot-success"]').should('be.visible');
    cy.get('[data-testid="snapshots-list"]').should('be.visible');
  });

  it('should toggle analysis overlay', () => {
    // Mock session creation
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { success: true, sessionId: 'session-123' }
    });
    
    // Start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Wait for camera to start
    cy.get('[data-testid="camera-feed"]').should('be.visible');
    
    // Toggle overlay off
    cy.get('[data-testid="toggle-overlay-button"]').click();
    cy.get('[data-testid="analysis-overlay"]').should('not.be.visible');
    
    // Toggle overlay on
    cy.get('[data-testid="toggle-overlay-button"]').click();
    cy.get('[data-testid="analysis-overlay"]').should('be.visible');
  });

  it('should display session statistics', () => {
    // Mock session creation
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { success: true, sessionId: 'session-123' }
    });
    
    // Mock multiple frames with statistics
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { 
        frame: 'data:image/jpeg;base64,test-frame-data',
        frameId: 1,
        statistics: {
          totalFrames: 10,
          successfulDetections: 8,
          averageAccuracy: 87.5,
          sessionDuration: 30
        }
      }
    });
    
    // Start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Check statistics display
    cy.get('[data-testid="session-stats"]').should('be.visible');
    cy.get('[data-testid="total-frames"]').should('contain.text', '10');
    cy.get('[data-testid="detection-rate"]').should('contain.text', '80%');
    cy.get('[data-testid="average-accuracy"]').should('contain.text', '87.5%');
  });

  it('should handle network disconnection gracefully', () => {
    // Mock session creation
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      data: { success: true, sessionId: 'session-123' }
    });
    
    // Start camera
    cy.get('[data-testid="start-camera-button"]').click();
    
    // Wait for camera to start
    cy.get('[data-testid="camera-feed"]').should('be.visible');
    
    // Mock network error
    cy.mockApiResponse('POST', '**/functions/v1/camera-proxy', {
      forceNetworkError: true
    });
    
    // Check if error is handled gracefully
    cy.get('[data-testid="connection-error"]').should('be.visible');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });
});
describe('Video Analysis Workflow', () => {
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
    
    // Visit the video analysis page
    cy.visit('/video-analysis');
  });

  it('should display video analysis page correctly', () => {
    // Check if video analysis page elements are visible
    cy.get('[data-testid="video-analysis-page"]').should('be.visible');
    cy.get('[data-testid="page-title"]').should('contain.text', 'Video Analysis');
    cy.get('[data-testid="upload-area"]').should('be.visible');
    cy.get('[data-testid="test-frames-button"]').should('be.visible');
    cy.get('[data-testid="video-preview"]').should('not.be.visible');
    cy.get('[data-testid="analysis-results"]').should('not.be.visible');
  });

  it('should handle video file upload', () => {
    // Mock file upload response
    cy.mockApiResponse('POST', '**/storage/v1/object/**', {
      data: { path: 'test-video.mp4' }
    });
    
    // Mock session creation response
    cy.mockApiResponse('POST', '**/rest/v1/sessions', {
      data: { id: 'session-123' }
    });
    
    // Upload video file
    cy.uploadTestVideo('test-video.mp4');
    
    // Check if video preview appears
    cy.get('[data-testid="video-preview"]').should('be.visible');
    cy.get('[data-testid="video-file-name"]').should('contain.text', 'test-video.mp4');
    cy.get('[data-testid="process-video-button"]').should('be.visible');
  });

  it('should handle invalid file types', () => {
    // Try to upload invalid file
    cy.get('[data-testid="video-upload-input"]').selectFile({
      contents: 'cypress/fixtures/test-image.jpg',
      fileName: 'test-image.jpg',
      mimeType: 'image/jpeg'
    });
    
    // Check for error message
    cy.get('[data-testid="upload-error"]').should('be.visible');
    cy.get('[data-testid="upload-error"]').should('contain.text', 'Invalid file type');
  });

  it('should process uploaded video successfully', () => {
    // Mock file upload response
    cy.mockApiResponse('POST', '**/storage/v1/object/**', {
      data: { path: 'test-video.mp4' }
    });
    
    // Mock session creation response
    cy.mockApiResponse('POST', '**/rest/v1/sessions', {
      data: { id: 'session-123' }
    });
    
    // Mock video processing responses
    cy.mockApiResponse('POST', '**/functions/v1/process-video', {
      data: { success: true }
    });
    
    // Mock session progress updates
    cy.mockApiResponse('GET', '**/rest/v1/sessions?id=eq.session-123', {
      data: [
        { progress: 25, status: 'processing' },
        { progress: 50, status: 'processing' },
        { progress: 75, status: 'processing' },
        { progress: 100, status: 'completed' }
      ]
    });
    
    // Mock analysis results
    cy.mockApiResponse('GET', '**/rest/v1/analysis_results?session_id=eq.session-123', {
      data: [
        {
          id: 'result-1',
          frame_number: 1,
          accuracy: 85.5,
          confidence: 0.9,
          timestamp: '00:00:01'
        },
        {
          id: 'result-2',
          frame_number: 2,
          accuracy: 92.3,
          confidence: 0.95,
          timestamp: '00:00:02'
        }
      ]
    });
    
    // Upload video
    cy.uploadTestVideo('test-video.mp4');
    
    // Process video
    cy.get('[data-testid="process-video-button"]').click();
    
    // Check processing state
    cy.get('[data-testid="processing-indicator"]').should('be.visible');
    cy.get('[data-testid="progress-bar"]').should('be.visible');
    
    // Wait for processing to complete
    cy.waitForAnalysis(30000);
    
    // Check results
    cy.get('[data-testid="analysis-results"]').should('be.visible');
    cy.get('[data-testid="results-summary"]').should('be.visible');
    cy.get('[data-testid="accuracy-chart"]').should('be.visible');
  });

  it('should handle processing errors gracefully', () => {
    // Mock file upload response
    cy.mockApiResponse('POST', '**/storage/v1/object/**', {
      data: { path: 'test-video.mp4' }
    });
    
    // Mock session creation response
    cy.mockApiResponse('POST', '**/rest/v1/sessions', {
      data: { id: 'session-123' }
    });
    
    // Mock processing error
    cy.mockApiResponse('POST', '**/functions/v1/process-video', {
      error: { message: 'Processing failed' }
    });
    
    // Upload video
    cy.uploadTestVideo('test-video.mp4');
    
    // Process video
    cy.get('[data-testid="process-video-button"]').click();
    
    // Check error message
    cy.get('[data-testid="processing-error"]').should('be.visible');
    cy.get('[data-testid="processing-error"]').should('contain.text', 'Processing failed');
  });

  it('should analyze test frames successfully', () => {
    // Mock test frames analysis responses
    cy.mockApiResponse('GET', 'public/test_videos_frames/*.svg', {
      body: '<svg></svg>'
    });
    
    // Mock frame analysis
    cy.mockApiResponse('POST', '**/functions/v1/analyze-frame', {
      data: {
        detections: {
          predictions: [
            { confidence: 0.9, x: 100, y: 100, width: 50, height: 50 },
            { confidence: 0.8, x: 200, y: 150, width: 60, height: 40 }
          ]
        }
      }
    });
    
    // Click test frames button
    cy.get('[data-testid="test-frames-button"]').click();
    
    // Check processing state
    cy.get('[data-testid="processing-indicator"]').should('be.visible');
    
    // Wait for processing to complete
    cy.waitForAnalysis(30000);
    
    // Check results
    cy.get('[data-testid="analysis-results"]').should('be.visible');
    cy.get('[data-testid="test-frames-results"]').should('be.visible');
  });

  it('should reset analysis state', () => {
    // Upload and process video first
    cy.mockApiResponse('POST', '**/storage/v1/object/**', {
      data: { path: 'test-video.mp4' }
    });
    
    cy.mockApiResponse('POST', '**/rest/v1/sessions', {
      data: { id: 'session-123' }
    });
    
    cy.uploadTestVideo('test-video.mp4');
    cy.get('[data-testid="process-video-button"]').click();
    
    // Reset analysis
    cy.get('[data-testid="reset-button"]').click();
    
    // Check if state is reset
    cy.get('[data-testid="video-preview"]').should('not.be.visible');
    cy.get('[data-testid="analysis-results"]').should('not.be.visible');
    cy.get('[data-testid="upload-area"]').should('be.visible');
  });

  it('should save analysis results to reports', () => {
    // Mock file upload and processing
    cy.mockApiResponse('POST', '**/storage/v1/object/**', {
      data: { path: 'test-video.mp4' }
    });
    
    cy.mockApiResponse('POST', '**/rest/v1/sessions', {
      data: { id: 'session-123' }
    });
    
    cy.mockApiResponse('POST', '**/functions/v1/process-video', {
      data: { success: true }
    });
    
    cy.mockApiResponse('GET', '**/rest/v1/analysis_results?session_id=eq.session-123', {
      data: [
        {
          id: 'result-1',
          frame_number: 1,
          accuracy: 85.5,
          confidence: 0.9
        }
      ]
    });
    
    // Mock report creation
    cy.mockApiResponse('POST', '**/rest/v1/reports', {
      data: { id: 'report-123' }
    });
    
    // Upload and process video
    cy.uploadTestVideo('test-video.mp4');
    cy.get('[data-testid="process-video-button"]').click();
    cy.waitForAnalysis(30000);
    
    // Save report
    cy.get('[data-testid="save-report-button"]').click();
    
    // Check if report is saved
    cy.get('[data-testid="save-success-message"]').should('be.visible');
    cy.get('[data-testid="view-report-button"]').should('be.visible');
  });

  it('should handle large file uploads', () => {
    // Mock file size limit error
    cy.mockApiResponse('POST', '**/storage/v1/object/**', {
      error: { message: 'File size exceeds limit' }
    });
    
    // Upload large file
    cy.uploadTestVideo('large-video.mp4');
    
    // Check error message
    cy.get('[data-testid="upload-error"]').should('be.visible');
    cy.get('[data-testid="upload-error"]').should('contain.text', 'File size exceeds limit');
  });

  it('should display processing progress correctly', () => {
    // Mock processing with progress updates
    cy.mockApiResponse('POST', '**/rest/v1/sessions', {
      data: { id: 'session-123' }
    });
    
    cy.uploadTestVideo('test-video.mp4');
    cy.get('[data-testid="process-video-button"]').click();
    
    // Check progress updates
    cy.get('[data-testid="progress-text"]').should('contain.text', '0%');
    
    // Mock progress updates
    cy.mockApiResponse('GET', '**/rest/v1/sessions?id=eq.session-123', {
      data: [{ progress: 25, status: 'processing' }]
    });
    
    cy.get('[data-testid="progress-text"]').should('contain.text', '25%');
    cy.get('[data-testid="progress-bar"]').should('have.attr', 'aria-valuenow', '25');
  });
});
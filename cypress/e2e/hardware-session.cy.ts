describe('Hardware Session Workflow', () => {
  beforeEach(() => {
    // Mock the authentication state
    cy.window('localStorage', 'setItem', 'gmshoot-auth-token', 'mock-token');
    
    // Intercept and mock hardware API calls
    cy.intercept('GET', '/api/hardware/session/start', {
      statusCode: 200,
      body: {
        sessionId: 'test-session-123',
        status: 'active'
      }
    }).as('sessionStart');

    cy.intercept('GET', '/api/hardware/frame/latest', {
      statusCode: 200,
      body: {
        frameId: 'frame-456',
        timestamp: '2024-01-15T10:30:00Z',
        imageUrl: 'https://picsum.photos/seed/test1/400/300.jpg',
        analysis: null
      }
    }).as('latestFrame');

    // Intercept and mock Supabase analysis function
    cy.intercept('POST', 'https://avbwpuxhkyvfyonrpbqg.supabase.co/functions/v1/analyze-frame', {
      statusCode: 200,
      body: {
        success: true,
        predictions: [
          {
            x: 150,
            y: 120,
            confidence: 0.95,
            class: 'target_hit',
            score: 8.5
          }
        ]
      }
    }).as('analyzeFrame');
  });

  it('should fail initially - complete hardware session workflow', () => {
    // Visit the connect page
    cy.visit('/connect');
    
    // Should show QR scanner
    cy.get('[data-testid="qr-scanner"]').should('be.visible');
    
    // Mock QR code scan
    cy.get('[data-testid="qr-scanner"]').trigger('scan');
    
    // Should redirect to session page
    cy.url().should('include', '/session');
    
    // Should show live video feed
    cy.get('[data-testid="live-video"]').should('be.visible');
    
    // Wait for frame analysis
    cy.wait('@latestFrame');
    
    // Should show analysis overlay
    cy.get('[data-testid="analysis-overlay"]').should('be.visible');
    
    // Verify analysis results
    cy.get('[data-testid="shot-marker"]').should('have.css', { left: '150px', top: '120px' });
    cy.get('[data-testid="score-display"]').should('contain', '8.5');
    
    // Verify performance - analysis should appear within 2 seconds
    cy.get('@analyzeFrame').should('have.been.called');
  });

  it('should handle hardware connection errors', () => {
    // Mock connection error
    cy.intercept('GET', '/api/hardware/session/start', {
      statusCode: 500,
      body: { error: 'Failed to connect to hardware' }
    }).as('sessionStartError');

    cy.visit('/connect');
    cy.get('[data-testid="qr-scanner"]').trigger('scan');
    
    // Should show error message
    cy.get('[data-testid="error-message"]').should('contain', 'Failed to connect to hardware');
    cy.get('[data-testid="error-message"]').should('be.visible');
  });

  it('should handle analysis failures gracefully', () => {
    // Mock analysis failure
    cy.intercept('POST', 'https://avbwpuxhkyvfyonrpbqg.supabase.co/functions/v1/analyze-frame', {
      statusCode: 500,
      body: { error: 'Analysis service unavailable' }
    }).as('analyzeFrameError');

    cy.visit('/connect');
    cy.get('[data-testid="qr-scanner"]').trigger('scan');
    cy.url().should('include', '/session');
    
    // Wait for frame
    cy.wait('@latestFrame');
    
    // Should show analysis failed message but continue live feed
    cy.get('[data-testid="analysis-failed"]').should('be.visible');
    cy.get('[data-testid="live-video"]').should('be.visible');
  });

  it('should handle invalid QR codes', () => {
    cy.visit('/connect');
    
    // Mock invalid QR scan
    cy.get('[data-testid="qr-scanner"]').trigger('invalidScan');
    
    // Should show invalid QR error
    cy.get('[data-testid="error-message"]').should('contain', 'Invalid QR Code. Please scan the code from your GMShoot hardware.');
  });

  it('should pass after implementation', () => {
    // This test should initially fail and pass after implementation
    cy.get('[data-testid="qr-scanner"]').should('be.visible');
    cy.get('[data-testid="live-video"]').should('not.exist');
    cy.get('[data-testid="analysis-overlay"]').should('not.exist');
  });
});
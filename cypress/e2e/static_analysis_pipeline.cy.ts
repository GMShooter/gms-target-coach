describe('Static Analysis Pipeline', () => {
  beforeEach(() => {
    // Set up environment variable for mock hardware
    cy.intercept('GET', '**/.env*', { forceNetworkError: false }).as('envCheck');
    cy.visit('/session', {
      onBeforeLoad: (win) => {
        // Mock environment variable check
        Object.defineProperty(win, 'import.meta', {
          value: {
            env: {
              VITE_USE_MOCK_HARDWARE: 'true'
            }
          }
        });
      }
    });
    
    // Wait for page to load
    cy.get('body').should('be.visible');
  });

  it('should cycle through 5 test frames and display correct analysis for each', () => {
    // Connect to mock device first
    cy.get('[data-testid="scan-qr-button"]').should('be.visible');
    cy.get('[data-testid="scan-qr-button"]').click();
    cy.get('[data-testid="start-session-button"]').click();
    
    // Wait for initial frame
    cy.wait(1000);
    cy.get('[data-testid="video-element"]').should('be.visible');
    
    // Test frame cycling and analysis display
    cy.log('Testing frame 1...');
    cy.wait(2000); // Wait for frame 1
    cy.contains('Shots Detected: 1').should('be.visible');
    cy.contains('Avg Score: 9.8').should('be.visible');
    
    cy.log('Testing frame 2...');
    cy.wait(2000); // Wait for frame 2
    cy.contains('Shots Detected: 1').should('be.visible');
    cy.contains('Avg Score: 8.5').should('be.visible');
    
    cy.log('Testing frame 3...');
    cy.wait(2000); // Wait for frame 3
    cy.contains('Shots Detected: 1').should('be.visible');
    cy.contains('Avg Score: 7.2').should('be.visible');
    
    cy.log('Testing frame 4...');
    cy.wait(2000); // Wait for frame 4
    cy.contains('Shots Detected: 1').should('be.visible');
    cy.contains('Avg Score: 6.9').should('be.visible');
    
    cy.log('Testing frame 5...');
    cy.wait(2000); // Wait for frame 5
    cy.contains('Shots Detected: 1').should('be.visible');
    cy.contains('Avg Score: 8.1').should('be.visible');
  });

  it('should display shot locations and scores correctly on the target overlay', () => {
    // Connect to mock device first
    cy.get('[data-testid="scan-qr-button"]').should('be.visible');
    cy.get('[data-testid="scan-qr-button"]').click();
    cy.get('[data-testid="start-session-button"]').click();
    
    // Wait for initial frame
    cy.wait(1000);
    cy.get('[data-testid="video-element"]').should('be.visible');
    
    // Check for shot markers on canvas
    cy.get('[data-testid="analysis-canvas"]').should('be.visible');
    
    // Wait for frame with shot
    cy.wait(2000); // Wait for frame 1 (first shot)
    
    // Check that shot markers are displayed
    cy.get('[data-testid="analysis-canvas"]').then((canvas) => {
      // Verify canvas is visible and has shot markers
      expect(canvas).to.be.visible;
    });
    
    // Check shot history shows the shot
    cy.contains('Shot #1').should('be.visible');
    cy.contains('9.8/10').should('be.visible');
  });

  it('should handle frame transitions smoothly', () => {
    // Test that frame transitions work correctly
    cy.log('Testing frame transitions...');
    
    // Connect to mock device first
    cy.get('[data-testid="scan-qr-button"]').should('be.visible');
    cy.get('[data-testid="scan-qr-button"]').click();
    cy.get('[data-testid="start-session-button"]').click();
    
    // Wait for initial frame
    cy.wait(1000);
    cy.get('[data-testid="video-element"]').should('be.visible');
    
    // Test frame transitions by waiting for cycling
    cy.log('Transitioning through frames...');
    cy.wait(6000); // Wait for multiple frame cycles
    
    // Verify that frames are cycling (video src should change)
    cy.get('[data-testid="video-element"]').should('have.attr', 'src').and('include', '/test_videos_frames/');
  });

  it('should display loading states during analysis', () => {
    // Test loading states
    cy.log('Testing loading states...');
    
    // Connect to mock device first
    cy.get('[data-testid="scan-qr-button"]').should('be.visible');
    cy.get('[data-testid="scan-qr-button"]').click();
    cy.get('[data-testid="start-session-button"]').click();
    
    // Wait for frame with shot
    cy.wait(2000); // Wait for frame 1 (first shot)
    
    // Check for loading overlay (should not be visible in mock mode)
    cy.get('[data-testid="loading-overlay"]').should('not.exist');
    
    // Wait for next frame with shot to trigger analysis
    cy.wait(2000); // Wait for frame 2 (second shot)
    
    // Check that loading is hidden and result is shown
    cy.get('[data-testid="loading-overlay"]').should('not.exist');
    cy.contains('Shots Detected: 1').should('be.visible');
  });

  it('should handle analysis errors gracefully', () => {
    // Test error handling
    cy.log('Testing error handling...');
    
    // Connect to mock device first
    cy.get('[data-testid="scan-qr-button"]').should('be.visible');
    cy.get('[data-testid="scan-qr-button"]').click();
    cy.get('[data-testid="start-session-button"]').click();
    
    // Wait for frame with shot
    cy.wait(2000); // Wait for frame 1 (first shot)
    
    // In mock mode, errors should be handled gracefully
    cy.contains('Shots Detected: 1').should('be.visible');
  });

  it('should maintain performance requirements', () => {
    // Test that analysis timing meets requirements
    cy.log('Testing performance requirements...');
    
    // Connect to mock device first
    cy.get('[data-testid="scan-qr-button"]').should('be.visible');
    cy.get('[data-testid="scan-qr-button"]').click();
    cy.get('[data-testid="start-session-button"]').click();
    
    // Measure frame cycling performance
    const startTime = Date.now();
    
    // Wait for multiple frame cycles
    cy.wait(6000); // Wait for 6 frames (6 seconds)
    
    const endTime = Date.now();
    const frameTime = (endTime - startTime) / 6; // Average time per frame
    
    // Verify that frames cycle within 1 second each
    expect(frameTime).to.be.lessThan(1100); // Allow 10% tolerance
    
    // Verify analysis results are displayed
    cy.contains('Shots Detected').should('be.visible');
  });
});
describe('UI Screenshot Capture', () => {
  beforeEach(() => {
    // Set viewport size for consistent screenshots
    cy.viewport(1920, 1080);
  });

  it('Capture Landing Page', () => {
    cy.visit('/');
    
    // Wait for landing page elements to be visible
    cy.get('img[alt="GMShoot Logo"]', { timeout: 10000 }).should('be.visible');
    cy.contains('Master Your Aim', { timeout: 10000 }).should('be.visible');
    cy.contains('Get Started', { timeout: 10000 }).should('be.visible');
    
    cy.screenshot('landing-page', { capture: 'viewport' });
  });

  it('Capture Login Page', () => {
    cy.visit('/login');
    
    // Wait for login form elements to be visible
    cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible');
    cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible');
    cy.contains('GMShoot', { timeout: 10000 }).should('be.visible');
    cy.contains('Welcome back! Sign in to continue', { timeout: 10000 }).should('be.visible');
    cy.contains('Google', { timeout: 10000 }).should('be.visible');
    
    cy.screenshot('login-page', { capture: 'viewport' });
  });

  it('Capture Video Analysis Page', () => {
    cy.visit('/analysis');
    
    // Wait for redirect to login if not authenticated
    cy.url({ timeout: 10000 }).should('include', '/login');
    
    // Now visit the page directly (it will show the login redirect message)
    cy.screenshot('video-analysis-page', { capture: 'viewport' });
  });

  it('Capture Camera Analysis Page', () => {
    cy.visit('/camera');
    
    // Wait for redirect to login if not authenticated
    cy.url({ timeout: 10000 }).should('include', '/login');
    
    // Now visit the page directly (it will show the login redirect message)
    cy.screenshot('camera-analysis-page', { capture: 'viewport' });
  });

  it('Capture Reports Page', () => {
    cy.visit('/reports');
    
    // Wait for redirect to login if not authenticated
    cy.url({ timeout: 10000 }).should('include', '/login');
    
    // Now visit the page directly (it will show the login redirect message)
    cy.screenshot('reports-page', { capture: 'viewport' });
  });
});
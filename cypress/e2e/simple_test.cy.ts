describe('Simple Test', () => {
  it('should load the session page', () => {
    cy.visit('/session');
    cy.get('body').should('be.visible');
    cy.log('Page loaded successfully');
  });

  it('should find scan QR button', () => {
    cy.visit('/session');
    cy.get('[data-testid="scan-qr-button"]').should('be.visible');
    cy.log('Scan QR button found');
  });

  it('should click demo connect button', () => {
    cy.visit('/session');
    cy.get('[data-testid="scan-qr-button"]').should('be.visible');
    cy.get('[data-testid="scan-qr-button"]').click();
    cy.wait(2000);
    cy.log('Demo connect button clicked');
  });

  it('should start session', () => {
    cy.visit('/session');
    cy.get('[data-testid="scan-qr-button"]').should('be.visible');
    cy.get('[data-testid="scan-qr-button"]').click();
    cy.wait(2000);
    cy.get('[data-testid="start-session-button"]').should('be.visible');
    cy.get('[data-testid="start-session-button"]').click();
    cy.wait(2000);
    cy.log('Session started');
  });
});
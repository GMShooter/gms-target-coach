// Custom commands for GMShoot E2E testing

// Login with Google
Cypress.Commands.add('loginWithGoogle', () => {
  cy.visit('/login');
  cy.get('[data-testid="google-sign-in-button"]').click();
  
  // Handle Google OAuth popup (in test environment, we'll mock this)
  cy.window().then((win) => {
    // Mock successful Google authentication
    win.localStorage.setItem('authToken', 'test-auth-token');
    win.localStorage.setItem('user', JSON.stringify({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg'
    }));
  });
  
  // Wait for redirect to dashboard
  cy.url().should('not.include', '/login');
});

// Login with email and password
Cypress.Commands.add('loginWithEmail', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  
  // Wait for successful login
  cy.url().should('not.include', '/login');
});

// Logout
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

// Upload test video
Cypress.Commands.add('uploadTestVideo', (fileName: string) => {
  cy.get('[data-testid="video-upload-input"]').selectFile({
    contents: `cypress/fixtures/${fileName}`,
    fileName: fileName,
    mimeType: 'video/mp4'
  });
});

// Wait for analysis to complete
Cypress.Commands.add('waitForAnalysis', (timeout = 30000) => {
  cy.get('[data-testid="analysis-progress"]', { timeout }).should('not.exist');
  cy.get('[data-testid="analysis-results"]').should('be.visible');
});

// Check camera access
Cypress.Commands.add('checkCameraAccess', () => {
  cy.window().then((win) => {
    // Mock camera permissions
    cy.stub(win.navigator.mediaDevices, 'getUserMedia')
      .resolves({
        getTracks: () => [{
          stop: cy.stub().as('trackStop')
        }]
      } as unknown as MediaStream);
  });
});

// Helper command to create test user
Cypress.Commands.add('createTestUser', () => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('NEXT_PUBLIC_SUPABASE_URL')}/auth/v1/signup`,
    body: {
      email: 'test@example.com',
      password: 'testpassword123',
      data: {
        display_name: 'Test User'
      }
    },
    headers: {
      apikey: Cypress.env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      'Content-Type': 'application/json'
    }
  });
});

// Helper command to delete test user
Cypress.Commands.add('deleteTestUser', () => {
  cy.request({
    method: 'DELETE',
    url: `${Cypress.env('NEXT_PUBLIC_SUPABASE_URL')}/rest/v1/users`,
    qs: {
      email: 'eq.test@example.com'
    },
    headers: {
      apikey: Cypress.env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      'Content-Type': 'application/json'
    }
  });
});

// Helper command to create test session
Cypress.Commands.add('createTestSession', (sessionData: any) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('NEXT_PUBLIC_SUPABASE_URL')}/rest/v1/sessions`,
    body: {
      user_id: 'test-user-123',
      status: 'completed',
      analysis_type: 'video',
      created_at: new Date().toISOString(),
      ...sessionData
    },
    headers: {
      apikey: Cypress.env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }
  });
});

// Helper command to create test report
Cypress.Commands.add('createTestReport', (reportData: any) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('NEXT_PUBLIC_SUPABASE_URL')}/rest/v1/reports`,
    body: {
      user_id: 'test-user-123',
      title: 'Test Report',
      overall_accuracy: 0.85,
      total_frames: 100,
      successful_detections: 85,
      created_at: new Date().toISOString(),
      ...reportData
    },
    headers: {
      apikey: Cypress.env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }
  });
});

// Helper command to wait for element to be visible and clickable
Cypress.Commands.add('waitForElementAndClick', (selector: string, timeout = 10000) => {
  cy.get(selector, { timeout }).should('be.visible').and('not.be.disabled').click();
});

// Helper command to take screenshot with custom name
Cypress.Commands.add('customScreenshot', (name: string) => {
  cy.screenshot(`${name}-${new Date().toISOString()}`);
});

// Helper command to mock API responses
Cypress.Commands.add('mockApiResponse', (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, response: any) => {
  cy.intercept(method as any, url, response).as('mockedResponse');
});

// Helper command to wait for API call
Cypress.Commands.add('waitForApiCall', (alias: string) => {
  cy.wait(`@${alias}`);
});

// Helper command to check if element exists without failing
Cypress.Commands.add('checkIfExists', (selector: string) => {
  cy.get('body').then($body => {
    if ($body.find(selector).length > 0) {
      cy.get(selector);
    } else {
      cy.log(`Element ${selector} not found`);
    }
  });
});
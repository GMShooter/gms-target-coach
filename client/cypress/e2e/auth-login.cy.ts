describe('Authentication Login Flow', () => {
  beforeEach(() => {
    // Clear localStorage and cookies before each test
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Visit the login page
    cy.visit('/login');
  });

  it('should display login page correctly', () => {
    // Check if login page elements are visible
    cy.get('[data-testid="login-page"]').should('be.visible');
    cy.get('[data-testid="login-title"]').should('contain.text', 'Sign In');
    cy.get('[data-testid="email-input"]').should('be.visible');
    cy.get('[data-testid="password-input"]').should('be.visible');
    cy.get('[data-testid="login-button"]').should('be.visible');
    cy.get('[data-testid="google-sign-in-button"]').should('be.visible');
    cy.get('[data-testid="signup-link"]').should('be.visible');
  });

  it('should show validation errors for empty fields', () => {
    // Try to login without entering credentials
    cy.get('[data-testid="login-button"]').click();
    
    // Check for validation errors
    cy.get('[data-testid="email-error"]').should('be.visible');
    cy.get('[data-testid="password-error"]').should('be.visible');
  });

  it('should show error for invalid email format', () => {
    // Enter invalid email
    cy.get('[data-testid="email-input"]').type('invalid-email');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    // Check for email validation error
    cy.get('[data-testid="email-error"]').should('contain.text', 'Invalid email');
  });

  it('should show error for incorrect credentials', () => {
    // Enter incorrect credentials
    cy.get('[data-testid="email-input"]').type('wrong@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();
    
    // Check for error message
    cy.get('[data-testid="login-error"]').should('be.visible');
    cy.get('[data-testid="login-error"]').should('contain.text', 'Invalid credentials');
  });

  it('should successfully login with valid credentials', () => {
    // Mock successful login response
    cy.mockApiResponse('POST', '**/auth/v1/token', {
      data: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          user_metadata: {
            display_name: 'Test User'
          }
        }
      }
    });

    // Mock user data response
    cy.mockApiResponse('GET', '**/auth/v1/user', {
      data: {
        id: 'test-user-123',
        email: 'test@example.com',
        user_metadata: {
          display_name: 'Test User'
        }
      }
    });

    // Enter valid credentials
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('testpassword123');
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for API calls
    cy.waitForApiCall('mockedResponse');
    cy.waitForApiCall('mockedResponse');
    
    // Check if redirected to dashboard
    cy.url().should('not.include', '/login');
    cy.url().should('include', '/dashboard');
    
    // Check if user is logged in
    cy.get('[data-testid="user-menu"]').should('be.visible');
    cy.get('[data-testid="user-display-name"]').should('contain.text', 'Test User');
  });

  it('should handle network errors gracefully', () => {
    // Mock network error
    cy.mockApiResponse('POST', '**/auth/v1/token', { forceNetworkError: true });
    
    // Enter credentials
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('testpassword123');
    cy.get('[data-testid="login-button"]').click();
    
    // Check for network error message
    cy.get('[data-testid="login-error"]').should('be.visible');
    cy.get('[data-testid="login-error"]').should('contain.text', 'Network error');
  });

  it('should navigate to signup page', () => {
    // Click signup link
    cy.get('[data-testid="signup-link"]').click();
    
    // Check if redirected to signup page
    cy.url().should('include', '/signup');
  });

  it('should toggle password visibility', () => {
    // Enter password
    cy.get('[data-testid="password-input"]').type('password123');
    
    // Check if password is hidden
    cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    
    // Click show password button
    cy.get('[data-testid="toggle-password-visibility"]').click();
    
    // Check if password is visible
    cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'text');
    
    // Click hide password button
    cy.get('[data-testid="toggle-password-visibility"]').click();
    
    // Check if password is hidden again
    cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
  });

  it('should remember login state after page refresh', () => {
    // Mock successful login response
    cy.mockApiResponse('POST', '**/auth/v1/token', {
      data: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          user_metadata: {
            display_name: 'Test User'
          }
        }
      }
    });

    // Mock user data response
    cy.mockApiResponse('GET', '**/auth/v1/user', {
      data: {
        id: 'test-user-123',
        email: 'test@example.com',
        user_metadata: {
          display_name: 'Test User'
        }
      }
    });

    // Login
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('testpassword123');
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for API calls
    cy.waitForApiCall('mockedResponse');
    cy.waitForApiCall('mockedResponse');
    
    // Refresh page
    cy.reload();
    
    // Check if user is still logged in
    cy.get('[data-testid="user-menu"]').should('be.visible');
    cy.url().should('not.include', '/login');
  });

  it('should handle loading state correctly', () => {
    // Mock delayed response
    cy.mockApiResponse('POST', '**/auth/v1/token', {
      data: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        user: {
          id: 'test-user-123',
          email: 'test@example.com'
        }
      },
      delay: 1000
    });

    // Enter credentials and login
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('testpassword123');
    cy.get('[data-testid="login-button"]').click();
    
    // Check loading state
    cy.get('[data-testid="login-button"]').should('be.disabled');
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    
    // Wait for completion
    cy.waitForApiCall('mockedResponse');
    
    // Check button is enabled again
    cy.get('[data-testid="login-button"]').should('not.be.disabled');
  });
});
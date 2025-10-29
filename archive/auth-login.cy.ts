describe('Authentication Flow', () => {
  beforeEach(() => {
    // Mock Firebase auth module
    cy.window().then((win: any) => {
      // Create a mock for Firebase auth functions
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null
      };

      // Mock Firebase auth
      win.firebase = {
        auth: () => ({
          signInWithEmailAndPassword: (cy as any).stub().resolves({ user: mockUser }),
          createUserWithEmailAndPassword: (cy as any).stub().resolves({ user: mockUser }),
          signInWithPopup: (cy as any).stub().resolves({ user: mockUser }),
          onAuthStateChanged: (cy as any).stub().callsFake((callback: any) => {
            // Initially not authenticated
            setTimeout(() => callback(null), 0);
            return () => {}; // Unsubscribe function
          }),
          currentUser: null,
          signOut: (cy as any).stub().resolves()
        }),
        initializeApp: (cy as any).stub().returns({})
      };

      // Mock Firebase auth module import
      win.import = win.import || {};
      win.import['firebase/auth'] = {
        getAuth: () => win.firebase.auth(),
        GoogleAuthProvider: (cy as any).stub().returns({}),
        signInWithPopup: win.firebase.auth().signInWithPopup,
        signInWithEmailAndPassword: win.firebase.auth().signInWithEmailAndPassword,
        createUserWithEmailAndPassword: win.firebase.auth().createUserWithEmailAndPassword,
        signOut: win.firebase.auth().signOut,
        User: {},
        updateProfile: (cy as any).stub().resolves()
      };

      win.import['firebase/app'] = {
        initializeApp: win.firebase.initializeApp
      };
    });

    // Mock Supabase user creation
    cy.intercept('POST', '**/rest/v1/users', {
      statusCode: 201,
      body: {
        id: 'test-user-123',
        email: 'test@example.com',
        firebase_uid: 'test-user-123',
        display_name: 'Test User',
        created_at: new Date().toISOString()
      }
    }).as('createUser');

    cy.visit('/login');
  });

  it('should display login page correctly', () => {
    cy.get('[data-testid="login-page"]').should('be.visible');
    cy.get('[data-testid="login-title"]').should('contain.text', 'Sign In');
    cy.get('[data-testid="email-input"]').should('be.visible');
    cy.get('[data-testid="password-input"]').should('be.visible');
    cy.get('[data-testid="login-button"]').should('be.visible');
    cy.get('[data-testid="google-sign-in-button"]').should('be.visible');
    cy.get('[data-testid="signup-link"]').should('be.visible');
  });

  it('should show validation errors for empty fields', () => {
    cy.get('[data-testid="login-button"]').click();
    
    // Check for validation errors
    cy.get('[data-testid="email-error"]').should('be.visible').and('contain.text', 'Invalid email');
    cy.get('[data-testid="password-error"]').should('be.visible').and('contain.text', 'Invalid credentials');
  });

  it('should show validation error for invalid email format', () => {
    cy.get('[data-testid="email-input"]').type('invalid-email');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.get('[data-testid="email-error"]').should('be.visible').and('contain.text', 'Invalid email');
  });

  it('should show password error when password is too short', () => {
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.get('[data-testid="password-error"]').should('be.visible').and('contain.text', 'Invalid credentials');
  });

  it('should toggle between login and signup modes', () => {
    cy.get('[data-testid="signup-link"]').click();
    cy.get('[data-testid="login-title"]').should('contain.text', 'Sign Up');
    cy.get('[data-testid="name-input"]').should('be.visible');
    cy.get('[data-testid="login-button"]').should('contain.text', 'Sign Up');
    
    // Toggle back to login
    cy.get('[data-testid="signup-link"]').click();
    cy.get('[data-testid="login-title"]').should('contain.text', 'Sign In');
    cy.get('[data-testid="name-input"]').should('not.exist');
    cy.get('[data-testid="login-button"]').should('contain.text', 'Sign In');
  });

  it('should show name field in signup mode', () => {
    cy.get('[data-testid="signup-link"]').click();
    cy.get('[data-testid="name-input"]').should('be.visible');
    cy.get('[data-testid="name-input"]')
      .should('have.attr', 'placeholder', 'Enter your name');
  });

  it('should show validation error for empty name in signup mode', () => {
    cy.get('[data-testid="signup-link"]').click();
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.get('[data-testid="name-error"]').should('be.visible').and('contain.text', 'Name is required');
  });

  it('should handle successful login', () => {
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for loading to complete
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
    
    // Mock successful authentication
    cy.window().then((win: any) => {
      const auth = win.firebase.auth();
      const callbacks = auth.onAuthStateChanged.getCalls();
      if (callbacks.length > 0) {
        const callback = callbacks[0].args[0];
        callback({
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User'
        });
      }
    });
    
    // Wait for user creation
    cy.wait('@createUser');
    
    // Should be redirected to dashboard
    cy.url().should('not.include', '/login');
  });

  it('should handle successful signup', () => {
    cy.get('[data-testid="signup-link"]').click();
    cy.get('[data-testid="name-input"]').type('Test User');
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for loading to complete
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
    
    // Mock successful authentication
    cy.window().then((win: any) => {
      const auth = win.firebase.auth();
      const callbacks = auth.onAuthStateChanged.getCalls();
      if (callbacks.length > 0) {
        const callback = callbacks[0].args[0];
        callback({
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User'
        });
      }
    });
    
    // Wait for user creation
    cy.wait('@createUser');
    
    // Should be redirected to dashboard
    cy.url().should('not.include', '/login');
  });

  it('should handle network error', () => {
    // Mock network error
    cy.window().then((win: any) => {
      const auth = win.firebase.auth();
      auth.signInWithEmailAndPassword.rejects(new Error('Network error'));
    });

    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    // Should show error message
    cy.get('[data-testid="login-error"]').should('be.visible').and('contain.text', 'Network error');
  });

  it('should toggle password visibility', () => {
    cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    cy.get('[data-testid="toggle-password-visibility"]').click();
    cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'text');
    cy.get('[data-testid="toggle-password-visibility"]').click();
    cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
  });

  it('should handle Google sign in', () => {
    cy.get('[data-testid="google-sign-in-button"]').click();
    
    // Mock successful Google authentication
    cy.window().then((win: any) => {
      const auth = win.firebase.auth();
      const callbacks = auth.onAuthStateChanged.getCalls();
      if (callbacks.length > 0) {
        const callback = callbacks[0].args[0];
        callback({
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User'
        });
      }
    });
    
    // Wait for user creation
    cy.wait('@createUser');
    
    // Should be redirected to dashboard
    cy.url().should('not.include', '/login');
  });
});
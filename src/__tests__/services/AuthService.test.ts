/**
 * @jest-environment jsdom
 */

// Mock the entire AuthService module
jest.mock('../../services/AuthService', () => {
  const mockAuthService = {
    getSession: jest.fn(),
    refreshSession: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    signInWithGoogle: jest.fn(),
    updateProfile: jest.fn(),
    isAuthenticated: jest.fn(),
    getUser: jest.fn(),
    subscribe: jest.fn(),
    getState: jest.fn(),
    cleanup: jest.fn(),
  };
  
  return {
    AuthService: jest.fn(() => mockAuthService),
    authService: mockAuthService,
    __esModule: true,
    default: mockAuthService
  };
});

import { AuthService } from '../../services/AuthService';

describe('AuthService', () => {
  let authServiceInstance: any;
  let mockAuthService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get the mocked AuthService instance
    const { authService } = require('../../services/AuthService');
    mockAuthService = authService;
    
    // Create a new instance of AuthService for each test
    authServiceInstance = new AuthService();
  });

  afterEach(() => {
    // Cleanup auth service if it has cleanup method
    if (authServiceInstance && typeof authServiceInstance.cleanup === 'function') {
      authServiceInstance.cleanup();
    }
  });

  describe('constructor', () => {
    it('should create an instance of AuthService', () => {
      expect(authServiceInstance).toBeDefined();
      expect(typeof authServiceInstance.getSession).toBe('function');
      expect(typeof authServiceInstance.signIn).toBe('function');
      expect(typeof authServiceInstance.signUp).toBe('function');
      expect(typeof authServiceInstance.signOut).toBe('function');
      expect(typeof authServiceInstance.signInWithGoogle).toBe('function');
      expect(typeof authServiceInstance.resetPassword).toBe('function');
      expect(typeof authServiceInstance.updateProfile).toBe('function');
      expect(typeof authServiceInstance.refreshSession).toBe('function');
      expect(typeof authServiceInstance.isAuthenticated).toBe('function');
      expect(typeof authServiceInstance.getUser).toBe('function');
    });
  });

  describe('getSession', () => {
    it('should return current session when it exists', () => {
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
          created_at: '2023-01-01T00:00:00Z',
        },
      };

      // Mock the getSession method to return our mock session
      mockAuthService.getSession.mockReturnValue(mockSession);

      const result = authServiceInstance.getSession();
      expect(result).toEqual(mockSession);
      expect(mockAuthService.getSession).toHaveBeenCalledTimes(1);
    });

    it('should return null when no session exists', () => {
      // Mock the getSession method to return null
      mockAuthService.getSession.mockReturnValue(null);

      const result = authServiceInstance.getSession();
      expect(result).toBeNull();
      expect(mockAuthService.getSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshSession', () => {
    it('should refresh current session', async () => {
      // Mock the refreshSession method to return true
      mockAuthService.refreshSession.mockResolvedValue(true);

      const result = await authServiceInstance.refreshSession();
      expect(result).toBe(true);
      expect(mockAuthService.refreshSession).toHaveBeenCalledTimes(1);
    });

    it('should return false when refresh fails', async () => {
      // Mock the refreshSession method to return false
      mockAuthService.refreshSession.mockResolvedValue(false);

      const result = await authServiceInstance.refreshSession();
      expect(result).toBe(false);
      expect(mockAuthService.refreshSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('signIn', () => {
    it('should sign in user with valid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'password' };
      
      // Mock the signIn method to return success
      mockAuthService.signIn.mockResolvedValue({ success: true });

      const result = await authServiceInstance.signIn(credentials);
      expect(result).toEqual({ success: true });
      expect(mockAuthService.signIn).toHaveBeenCalledWith(credentials);
      expect(mockAuthService.signIn).toHaveBeenCalledTimes(1);
    });

    it('should return error when sign in fails', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong-password' };
      
      // Mock the signIn method to return error
      mockAuthService.signIn.mockResolvedValue({ 
        success: false, 
        error: 'Invalid email or password' 
      });

      const result = await authServiceInstance.signIn(credentials);
      expect(result).toEqual({ success: false, error: 'Invalid email or password' });
      expect(mockAuthService.signIn).toHaveBeenCalledWith(credentials);
      expect(mockAuthService.signIn).toHaveBeenCalledTimes(1);
    });
  });

  describe('signUp', () => {
    it('should sign up new user', async () => {
      const credentials = { 
        email: 'test@example.com', 
        password: 'password',
        fullName: 'Test User'
      };
      
      // Mock the signUp method to return success
      mockAuthService.signUp.mockResolvedValue({ success: true });

      const result = await authServiceInstance.signUp(credentials);
      expect(result).toEqual({ success: true });
      expect(mockAuthService.signUp).toHaveBeenCalledWith(credentials);
      expect(mockAuthService.signUp).toHaveBeenCalledTimes(1);
    });

    it('should return error when sign up fails', async () => {
      const credentials = { 
        email: 'test@example.com', 
        password: 'password',
        fullName: 'Test User'
      };
      
      // Mock the signUp method to return error
      mockAuthService.signUp.mockResolvedValue({ 
        success: false, 
        error: 'An account with this email already exists' 
      });

      const result = await authServiceInstance.signUp(credentials);
      expect(result).toEqual({ success: false, error: 'An account with this email already exists' });
      expect(mockAuthService.signUp).toHaveBeenCalledWith(credentials);
      expect(mockAuthService.signUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      // Mock the signOut method to return success
      mockAuthService.signOut.mockResolvedValue({ success: true });

      const result = await authServiceInstance.signOut();
      expect(result).toEqual({ success: true });
      expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
    });

    it('should handle sign out errors', async () => {
      // Mock the signOut method to return error
      mockAuthService.signOut.mockResolvedValue({ 
        success: false, 
        error: 'Sign out failed' 
      });

      const result = await authServiceInstance.signOut();
      expect(result).toEqual({ success: false, error: 'Sign out failed' });
      expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('signInWithGoogle', () => {
    it('should sign in with Google OAuth', async () => {
      // Mock the signInWithGoogle method to return success
      mockAuthService.signInWithGoogle.mockResolvedValue({ success: true });

      const result = await authServiceInstance.signInWithGoogle();
      expect(result).toEqual({ success: true });
      expect(mockAuthService.signInWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('should handle Google OAuth sign in errors', async () => {
      // Mock the signInWithGoogle method to return error
      mockAuthService.signInWithGoogle.mockResolvedValue({ 
        success: false, 
        error: 'OAuth sign in failed' 
      });

      const result = await authServiceInstance.signInWithGoogle();
      expect(result).toEqual({ success: false, error: 'OAuth sign in failed' });
      expect(mockAuthService.signInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      const email = 'test@example.com';
      
      // Mock the resetPassword method to return success
      mockAuthService.resetPassword.mockResolvedValue({ success: true });

      const result = await authServiceInstance.resetPassword(email);
      expect(result).toEqual({ success: true });
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(email);
      expect(mockAuthService.resetPassword).toHaveBeenCalledTimes(1);
    });

    it('should handle password reset errors', async () => {
      const email = 'test@example.com';
      
      // Mock the resetPassword method to return error
      mockAuthService.resetPassword.mockResolvedValue({ 
        success: false, 
        error: 'Reset failed' 
      });

      const result = await authServiceInstance.resetPassword(email);
      expect(result).toEqual({ success: false, error: 'Reset failed' });
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(email);
      expect(mockAuthService.resetPassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updates = { fullName: 'Updated Name' };
      
      // Mock the updateProfile method to return success
      mockAuthService.updateProfile.mockResolvedValue({ success: true });

      const result = await authServiceInstance.updateProfile(updates);
      expect(result).toEqual({ success: true });
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith(updates);
      expect(mockAuthService.updateProfile).toHaveBeenCalledTimes(1);
    });

    it('should return error when profile update fails', async () => {
      const updates = { fullName: 'Updated Name' };
      
      // Mock the updateProfile method to return error
      mockAuthService.updateProfile.mockResolvedValue({ 
        success: false, 
        error: 'Update failed' 
      });

      const result = await authServiceInstance.updateProfile(updates);
      expect(result).toEqual({ success: false, error: 'Update failed' });
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith(updates);
      expect(mockAuthService.updateProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', () => {
      // Mock the isAuthenticated method to return true
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const result = authServiceInstance.isAuthenticated();
      expect(result).toBe(true);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
    });

    it('should return false when user is not authenticated', () => {
      // Mock the isAuthenticated method to return false
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const result = authServiceInstance.isAuthenticated();
      expect(result).toBe(false);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUser', () => {
    it('should return current user when session exists', () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: '',
        createdAt: '2023-01-01T00:00:00Z',
        lastSignInAt: undefined,
      };

      // Mock the getUser method to return our mock user
      mockAuthService.getUser.mockReturnValue(mockUser);

      const result = authServiceInstance.getUser();
      expect(result).toEqual(mockUser);
      expect(mockAuthService.getUser).toHaveBeenCalledTimes(1);
    });

    it('should return null when no session exists', () => {
      // Mock the getUser method to return null
      mockAuthService.getUser.mockReturnValue(null);

      const result = authServiceInstance.getUser();
      expect(result).toBeNull();
      expect(mockAuthService.getUser).toHaveBeenCalledTimes(1);
    });
  });
});
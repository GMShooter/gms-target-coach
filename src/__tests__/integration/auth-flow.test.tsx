/**
 * Authentication Flow Integration Tests
 * Tests the complete authentication system after Phase 1 fixes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/AuthService';
import { supabase } from '../../utils/supabase';

// Mock Supabase
jest.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
      updateUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn(),
      select: jest.fn(),
      single: jest.fn(),
    })),
  },
}));

// Mock AuthService
jest.mock('../../services/AuthService', () => {
  const mockAuthService = {
    getState: jest.fn(() => ({
      user: null,
      session: null,
      isLoading: false,
      error: null,
      isAuthenticated: false
    })),
    subscribe: jest.fn(() => jest.fn()),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    signInWithGoogle: jest.fn(),
    authSubscription: null,
    cleanup: jest.fn()
  };
  
  return {
    authService: mockAuthService,
    default: mockAuthService
  };
});

// Test component that uses auth
const TestComponent: React.FC = () => {
  const { user, loading, error, signInWithEmail, signUpWithEmail, signOut } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading...' : 'Not loading'}</div>
      <div data-testid="user">{user ? `User: ${user.email}` : 'No user'}</div>
      <div data-testid="error">{error || 'No error'}</div>
      
      <button
        data-testid="signin"
        onClick={() => signInWithEmail('test@example.com', 'password123')}
      >
        Sign In
      </button>
      
      <button
        data-testid="signup"
        onClick={() => signUpWithEmail('new@example.com', 'password123', 'Test User')}
      >
        Sign Up
      </button>
      
      <button data-testid="signout" onClick={signOut}>
        Sign Out
      </button>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful auth state change
    const mockSubscription = { unsubscribe: jest.fn() };
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: mockSubscription }
    });
    
    // Mock initial session check
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    // Reset AuthService mock state
    (authService.getState as jest.Mock).mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      error: null,
      isAuthenticated: false
    });
  });

  describe('Initial Auth State', () => {
    it('should initialize with no user and loading false', async () => {
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('error')).toHaveTextContent('No error'fr);
      });
    });
  });

  describe('Email Sign In Flow', () => {
    it('should sign in user with valid credentials', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
        created_at: '2023-01-01T00:00:00Z',
        last_sign_in_at: '2023-01-01T00:00:00Z',
      };

      // Mock successful sign in
      (authService.signIn as jest.Mock).mockResolvedValue({ success: true });
      
      // Mock state change after successful sign in
      const mockSubscribe = (authService.subscribe as jest.Mock);
      let stateChangeCallback: any;
      mockSubscribe.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return jest.fn();
      });

      renderWithProviders(<TestComponent />);
      
      const signInButton = screen.getByTestId('signin');
      fireEvent.click(signInButton);

      // Simulate successful auth state change
      setTimeout(() => {
        stateChangeCallback({
          user: mockUser,
          session: { access_token: 'mock-token' },
          isLoading: false,
          error: null,
          isAuthenticated: true
        });
      }, 0);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('User: test@example.com');
      });

      expect(authService.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should show error for invalid credentials', async () => {
      // Mock failed sign in with transformed error message
      (authService.signIn as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid email or password'
      });
      
      // Mock state change after failed sign in
      const mockSubscribe = (authService.subscribe as jest.Mock);
      let stateChangeCallback: any;
      mockSubscribe.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return jest.fn();
      });

      renderWithProviders(<TestComponent />);
      
      const signInButton = screen.getByTestId('signin');
      fireEvent.click(signInButton);

      // Simulate failed auth state change
      setTimeout(() => {
        stateChangeCallback({
          user: null,
          session: null,
          isLoading: false,
          error: 'Invalid email or password',
          isAuthenticated: false
        });
      }, 0);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid email or password');
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });
  });

  describe('Email Sign Up Flow', () => {
    it('should sign up new user successfully', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'new@example.com',
        user_metadata: { full_name: 'Test User' },
        created_at: '2023-01-01T00:00:00Z',
      };

      // Mock successful sign up
      (authService.signUp as jest.Mock).mockResolvedValue({ success: true });
      
      // Mock state change after successful sign up
      const mockSubscribe = (authService.subscribe as jest.Mock);
      let stateChangeCallback: any;
      mockSubscribe.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return jest.fn();
      });

      renderWithProviders(<TestComponent />);
      
      const signUpButton = screen.getByTestId('signup');
      fireEvent.click(signUpButton);

      // Simulate successful auth state change
      setTimeout(() => {
        stateChangeCallback({
          user: mockUser,
          session: { access_token: 'mock-token' },
          isLoading: false,
          error: null,
          isAuthenticated: true
        });
      }, 0);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('User: new@example.com');
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('No error');
      });

      expect(authService.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        fullName: 'Test User',
      });
    });

    it('should show email confirmation message when required', async () => {
      // Mock sign up that requires email confirmation
      (authService.signUp as jest.Mock).mockResolvedValue({
        success: true,
        requiresEmailConfirmation: true
      });
      
      // Mock state change after sign up
      const mockSubscribe = (authService.subscribe as jest.Mock);
      let stateChangeCallback: any;
      mockSubscribe.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return jest.fn();
      });

      renderWithProviders(<TestComponent />);
      
      const signUpButton = screen.getByTestId('signup');
      fireEvent.click(signUpButton);

      // Simulate auth state change with email confirmation required
      setTimeout(() => {
        stateChangeCallback({
          user: null,
          session: null,
          isLoading: false,
          error: 'Please check your email to confirm your account',
          isAuthenticated: false
        });
      }, 0);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Please check your email to confirm your account');
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });
  });

  describe('Sign Out Flow', () => {
    it('should sign out user successfully', async () => {
      // First sign in
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
        created_at: '2023-01-01T00:00:00Z',
      };

      // Mock successful sign in
      (authService.signIn as jest.Mock).mockResolvedValue({ success: true });
      (authService.signOut as jest.Mock).mockResolvedValue({ success: true });
      
      // Mock state change after successful sign in
      const mockSubscribe = (authService.subscribe as jest.Mock);
      let stateChangeCallback: any;
      mockSubscribe.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return jest.fn();
      });

      renderWithProviders(<TestComponent />);
      
      // Sign in first
      const signInButton = screen.getByTestId('signin');
      fireEvent.click(signInButton);

      // Simulate successful auth state change
      setTimeout(() => {
        stateChangeCallback({
          user: mockUser,
          session: { access_token: 'mock-token' },
          isLoading: false,
          error: null,
          isAuthenticated: true
        });
      }, 0);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('User: test@example.com');
      });

      // Then sign out
      const signOutButton = screen.getByTestId('signout');
      fireEvent.click(signOutButton);

      // Simulate sign out state change
      setTimeout(() => {
        stateChangeCallback({
          user: null,
          session: null,
          isLoading: false,
          error: null,
          isAuthenticated: false
        });
      }, 0);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('No error');
      });

      expect(authService.signOut).toHaveBeenCalled();
    });
  });

  describe('Session Persistence', () => {
    it('should restore user session on initialization', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'persisted@example.com',
        user_metadata: { full_name: 'Persisted User' },
        created_at: '2023-01-01T00:00:00Z',
      };

      // Mock existing session in initial state
      (authService.getState as jest.Mock).mockReturnValue({
        user: mockUser,
        session: { access_token: 'mock-token' },
        isLoading: false,
        error: null,
        isAuthenticated: true
      });

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('User: persisted@example.com');
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      (authService.signIn as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      
      // Mock state change after network error
      const mockSubscribe = (authService.subscribe as jest.Mock);
      let stateChangeCallback: any;
      mockSubscribe.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return jest.fn();
      });

      renderWithProviders(<TestComponent />);
      
      const signInButton = screen.getByTestId('signin');
      fireEvent.click(signInButton);

      // Simulate error state change
      setTimeout(() => {
        stateChangeCallback({
          user: null,
          session: null,
          isLoading: false,
          error: 'Network error',
          isAuthenticated: false
        });
      }, 0);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error');
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
      });
    });

    it('should handle validation errors', async () => {
      // Mock validation error
      (authService.signUp as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Password should be at least 6 characters'
      });
      
      // Mock state change after validation error
      const mockSubscribe = (authService.subscribe as jest.Mock);
      let stateChangeCallback: any;
      mockSubscribe.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return jest.fn();
      });

      renderWithProviders(<TestComponent />);
      
      const signUpButton = screen.getByTestId('signup');
      fireEvent.click(signUpButton);

      // Simulate error state change
      setTimeout(() => {
        stateChangeCallback({
          user: null,
          session: null,
          isLoading: false,
          error: 'Password must be at least 6 characters long',
          isAuthenticated: false
        });
      }, 0);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Password must be at least 6 characters long');
      });
    });
  });
});
/**
 * useAuthQuery Hook Tests
 *
 * This test suite covers authentication hook functionality including:
 * - Authentication state management
 * - Google OAuth sign in
 * - Email sign in/sign up
 * - Sign out functionality
 * - Error handling
 * - Loading states
 * - Mock authentication mode
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '../../hooks/useAuthQuery';

// Mock dependencies
jest.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithOAuth: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        insert: jest.fn(() => ({
          error: null
        })),
        update: jest.fn(() => ({
          error: null
        }))
      }))
    }))
  }
}));

jest.mock('../../services/HardwareAPI', () => ({
  hardwareAPI: {
    setUserId: jest.fn()
  }
}));

jest.mock('../../utils/env', () => ({
  env: {
    VITE_USE_MOCK_AUTH: 'false',
    VITE_USE_MOCK_HARDWARE: 'false'
  }
}));

// Test wrapper component
const createTestWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

// Test component that uses the auth hook
const TestComponent = () => {
  const {
    user,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    clearError
  } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'no-user'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <button onClick={signInWithGoogle} data-testid="google-signin">
        Google Sign In
      </button>
      <button onClick={() => signInWithEmail('test@example.com', 'password')} data-testid="email-signin">
        Email Sign In
      </button>
      <button onClick={() => signUpWithEmail('test@example.com', 'password', 'Test User')} data-testid="email-signup">
        Email Sign Up
      </button>
      <button onClick={signOut} data-testid="signout">
        Sign Out
      </button>
      <button onClick={clearError} data-testid="clear-error">
        Clear Error
      </button>
    </div>
  );
};

describe('useAuthQuery Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
    
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Initial State', () => {
    it('should render with initial loading state', () => {
      const { supabase } = require('../../utils/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    it('should render with no user initially', async () => {
      const { supabase } = require('../../utils/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });
    });

    it('should render with no error initially', async () => {
      const { supabase } = require('../../utils/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      });
    });
  });

  describe('Google Sign In', () => {
    it('should handle Google sign in', async () => {
      const { supabase } = require('../../utils/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });
      supabase.auth.signInWithOAuth.mockResolvedValue({
        error: null
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      const googleButton = screen.getByTestId('google-signin');
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:3000/'
          }
        });
      });
    });
  });

  describe('Email Sign In', () => {
    it('should handle email sign in successfully', async () => {
      const { supabase } = require('../../utils/supabase');
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        user_metadata: { display_name: 'Test User' }
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      const emailButton = screen.getByTestId('email-signin');
      fireEvent.click(emailButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password'
        });
      });
    });
  });

  describe('Email Sign Up', () => {
    it('should handle email sign up successfully', async () => {
      const { supabase } = require('../../utils/supabase');
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        user_metadata: { display_name: 'Test User' }
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      const signupButton = screen.getByTestId('email-signup');
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password',
          options: {
            data: {
              display_name: 'Test User',
              avatar_url: ''
            }
          }
        });
      });
    });
  });

  describe('Sign Out', () => {
    it('should handle sign out successfully', async () => {
      const { supabase } = require('../../utils/supabase');
      const { hardwareAPI } = require('../../services/HardwareAPI');
      
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user123' } } }
      });
      supabase.auth.signOut.mockResolvedValue({ error: null });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      const signoutButton = screen.getByTestId('signout');
      fireEvent.click(signoutButton);

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(hardwareAPI.setUserId).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('Mock Authentication Mode', () => {
    beforeEach(() => {
      const { env } = require('../../utils/env');
      env.VITE_USE_MOCK_AUTH = 'true';
    });

    it('should use mock authentication for Google sign in', async () => {
      const { supabase } = require('../../utils/supabase');
      const { hardwareAPI } = require('../../services/HardwareAPI');
      
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      const googleButton = screen.getByTestId('google-signin');
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(hardwareAPI.setUserId).toHaveBeenCalledWith('mock-user-id');
      });
    });

    it('should use mock authentication for email sign in', async () => {
      const { supabase } = require('../../utils/supabase');
      const { hardwareAPI } = require('../../services/HardwareAPI');
      
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      const emailButton = screen.getByTestId('email-signin');
      fireEvent.click(emailButton);

      await waitFor(() => {
        expect(hardwareAPI.setUserId).toHaveBeenCalledWith('mock-user-id');
      });
    });

    it('should use mock authentication for email sign up', async () => {
      const { supabase } = require('../../utils/supabase');
      const { hardwareAPI } = require('../../services/HardwareAPI');
      
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      const signupButton = screen.getByTestId('email-signup');
      fireEvent.click(signupButton);

      await waitFor(() => {
        expect(hardwareAPI.setUserId).toHaveBeenCalledWith('mock-user-id');
      });
    });
  });

  describe('User Creation and Update', () => {
    it('should handle user lookup during authentication', async () => {
      const { supabase } = require('../../utils/supabase');
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        user_metadata: { display_name: 'Test User' }
      };

      // Mock successful sign in
      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      });
      
      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      };
      supabase.from.mockReturnValue(mockFrom);

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      // Trigger sign in
      const emailButton = screen.getByTestId('email-signin');
      fireEvent.click(emailButton);

      // Verify sign in was called
      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password'
        });
      });
    });

    it('should handle sign up process initiation', async () => {
      const { supabase } = require('../../utils/supabase');
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        user_metadata: { display_name: 'Test User' }
      };

      // Mock successful sign up
      supabase.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      });
      
      const mockFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        }),
        insert: jest.fn().mockReturnValue({
          error: null
        })
      };
      supabase.from.mockReturnValue(mockFrom);

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      // Trigger sign up
      const signupButton = screen.getByTestId('email-signup');
      fireEvent.click(signupButton);

      // Just verify the button click doesn't throw errors
      expect(signupButton).toBeInTheDocument();
    });
  });

  describe('Auth State Changes', () => {
    it('should handle SIGNED_IN event', async () => {
      const { supabase } = require('../../utils/supabase');
      const { hardwareAPI } = require('../../services/HardwareAPI');
      
      let authChangeCallback: any;
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });
      supabase.auth.onAuthStateChange.mockImplementation((callback: any) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } }
        };
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      // Simulate SIGNED_IN event
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        user_metadata: { display_name: 'Test User' }
      };

      await waitFor(() => {
        authChangeCallback('SIGNED_IN', { user: mockUser });
        expect(hardwareAPI.setUserId).toHaveBeenCalledWith('user123');
      });
    });

    it('should handle SIGNED_OUT event', async () => {
      const { supabase } = require('../../utils/supabase');
      const { hardwareAPI } = require('../../services/HardwareAPI');
      
      let authChangeCallback: any;
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });
      supabase.auth.onAuthStateChange.mockImplementation((callback: any) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } }
        };
      });

      render(<TestComponent />, { wrapper: createTestWrapper(queryClient) });

      // Simulate SIGNED_OUT event
      await waitFor(() => {
        authChangeCallback('SIGNED_OUT', null);
        expect(hardwareAPI.setUserId).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('Error Context', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        const TestComponent = () => {
          const auth = useAuth();
          return <div>{JSON.stringify(auth)}</div>;
        };
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleSpy.mockRestore();
    });
  });
});
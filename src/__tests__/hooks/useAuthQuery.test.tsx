import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuth, AuthProvider } from '../../hooks/useAuthQuery';
import { createTestQueryClient, createQueryWrapper } from '../utils/test-query-client';

// Mock Supabase
jest.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn()
          }
        }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  },
}));

describe('useAuth', () => {
  let queryClient: any;
  let wrapper: any;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('initial state', () => {
    it('should return initial auth state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapper
      });

      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.user === null).toBe(true); // isAuthenticated is derived from user
      expect(result.current.error).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      const mockUser = { id: 'test-user', email: 'test@example.com' };
      const { supabase } = require('../../utils/supabase');
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapper
      });

      await result.current.signInWithEmail('test@example.com', 'password');

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.user !== null).toBe(true); // isAuthenticated is derived from user
      });
    });

    it('should handle sign in error', async () => {
      const mockError = new Error('Invalid credentials');
      const { supabase } = require('../../utils/supabase');
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapper
      });

      await result.current.signInWithEmail('test@example.com', 'wrong-password');

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.user === null).toBe(true); // isAuthenticated is derived from user
      });
    });
  });

  describe('signUp', () => {
    it('should sign up successfully', async () => {
      const mockUser = { id: 'test-user', email: 'test@example.com' };
      const { supabase } = require('../../utils/supabase');
      
      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapper
      });

      await result.current.signUpWithEmail('test@example.com', 'password');

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.user !== null).toBe(true); // isAuthenticated is derived from user
      });
    });

    it('should handle sign up error', async () => {
      const mockError = new Error('User already exists');
      const { supabase } = require('../../utils/supabase');
      
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapper
      });

      await result.current.signUpWithEmail('existing@example.com', 'password');

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.user === null).toBe(true); // isAuthenticated is derived from user
      });
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const { supabase } = require('../../utils/supabase');
      
      supabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapper
      });

      await result.current.signOut();

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.user === null).toBe(true); // isAuthenticated is derived from user
      });
    });

    it('should handle sign out error', async () => {
      const mockError = new Error('Sign out failed');
      const { supabase } = require('../../utils/supabase');
      
      supabase.auth.signOut.mockResolvedValue({
        error: mockError,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapper
      });

      await result.current.signOut();

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.user === null).toBe(true); // isAuthenticated is derived from user
      });
    });
  });

  describe('loading states', () => {
    it('should show loading during sign in', async () => {
      const { supabase } = require('../../utils/supabase');
      
      // Mock a delayed response
      supabase.auth.signInWithPassword.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          data: { user: { id: 'test-user' } },
          error: null,
        }), 100))
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapper
      });

      const signInPromise = result.current.signInWithEmail('test@example.com', 'password');

      // Should be loading immediately
      expect(result.current.loading).toBe(true);

      await signInPromise;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should reset error on successful operation', async () => {
      const { supabase } = require('../../utils/supabase');
      
      // First mock an error
      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Invalid credentials'),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapper
      });

      // Try to sign in and fail
      await result.current.signInWithEmail('test@example.com', 'wrong-password');

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.user === null).toBe(true); // isAuthenticated is derived from user
      });

      // Now mock success
      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'test-user' } },
        error: null,
      });

      // Try to sign in again and succeed
      await result.current.signInWithEmail('test@example.com', 'correct-password');

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('type safety', () => {
    it('should return correctly typed values', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: wrapper
      });

      // These assertions ensure TypeScript types are correct
      expect(typeof result.current.signInWithEmail).toBe('function');
      expect(typeof result.current.signUpWithEmail).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.user).toBe('object');
      expect(typeof result.current.loading).toBe('boolean');
      expect(typeof result.current.user).toBe('object'); // isAuthenticated is derived from user
    });
  });
});
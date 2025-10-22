import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth, AuthProvider } from '../../hooks/useAuth';
import { 
  signInWithGoogle, 
  signInWithEmail, 
  signOut, 
  getCurrentUser,
  onAuthStateChanged 
} from '../../firebase';
import { supabase } from '../../utils/supabase';

// Mock Firebase
jest.mock('../../firebase');
const mockSignInWithGoogle = signInWithGoogle as jest.MockedFunction<typeof signInWithGoogle>;
const mockSignInWithEmail = signInWithEmail as jest.MockedFunction<typeof signInWithEmail>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>;

// Mock supabase
jest.mock('../../utils/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('useAuth Hook', () => {
  const mockFirebaseUser = {
    uid: 'firebase-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
  };

  const mockSupabaseUser = {
    id: 'firebase-123',
    email: 'test@example.com',
    firebase_uid: 'firebase-123',
    display_name: 'Test User',
    avatar_url: 'https://example.com/photo.jpg',
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations for Firebase
    mockSignInWithGoogle.mockResolvedValue(mockFirebaseUser as any);
    mockSignInWithEmail.mockResolvedValue(mockFirebaseUser as any);
    mockSignOut.mockResolvedValue(undefined);
    mockGetCurrentUser.mockReturnValue(null);
    mockOnAuthStateChanged.mockReturnValue(() => () => {}); // Return unsubscribe function

    // Default mock implementations for Supabase
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSupabaseUser,
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockSupabaseUser,
          error: null,
        }),
      }),
    }) as any;
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBe(null);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('provides all required functions', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(typeof result.current.signInWithGoogle).toBe('function');
      expect(typeof result.current.signInWithEmail).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });

    it('throws error when used without AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });

  describe('Google Sign In', () => {
    it('signs in with Google successfully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockSignInWithGoogle).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(result.current.user).toEqual({
        id: 'firebase-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        firebaseUid: 'firebase-123',
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('handles popup closed by user error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      mockSignInWithGoogle.mockRejectedValue({
        code: 'auth/popup-closed-by-user',
        message: 'Popup closed',
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Sign-in popup was closed before completion');
    });

    it('handles popup blocked error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      mockSignInWithGoogle.mockRejectedValue({
        code: 'auth/popup-blocked',
        message: 'Popup blocked',
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.error).toBe('Sign-in popup was blocked by the browser');
    });

    it('handles generic sign in error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      mockSignInWithGoogle.mockRejectedValue({
        code: 'auth/unknown-error',
        message: 'Unknown error',
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.error).toBe('Unknown error');
    });
  });

  describe('Email Sign In', () => {
    it('signs in with email successfully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithEmail('test@example.com', 'password123');
      });

      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('handles user not found error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      mockSignInWithEmail.mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found',
      });

      await act(async () => {
        await result.current.signInWithEmail('nonexistent@example.com', 'password123');
      });

      expect(result.current.error).toBe('No account found with this email address');
    });

    it('handles wrong password error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      mockSignInWithEmail.mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Wrong password',
      });

      await act(async () => {
        await result.current.signInWithEmail('test@example.com', 'wrongpassword');
      });

      expect(result.current.error).toBe('Incorrect password');
    });

    it('handles invalid email error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      mockSignInWithEmail.mockRejectedValue({
        code: 'auth/invalid-email',
        message: 'Invalid email',
      });

      await act(async () => {
        await result.current.signInWithEmail('invalid-email', 'password123');
      });

      expect(result.current.error).toBe('Invalid email address');
    });

    it('handles too many requests error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      mockSignInWithEmail.mockRejectedValue({
        code: 'auth/too-many-requests',
        message: 'Too many requests',
      });

      await act(async () => {
        await result.current.signInWithEmail('test@example.com', 'password123');
      });

      expect(result.current.error).toBe('Too many failed login attempts. Please try again later');
    });
  });

  describe('Sign Out', () => {
    it('signs out successfully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // First sign in
      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.user).toBeTruthy();

      // Then sign out
      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.current.user).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('handles sign out error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      mockSignOut.mockRejectedValue({
        message: 'Sign out failed',
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.error).toBe('Sign out failed');
    });
  });

  describe('Clear Error', () => {
    it('clears error state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Set an error
      mockSignInWithGoogle.mockRejectedValueOnce({
        code: 'auth/unknown-error',
        message: 'Some error',
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.error).toBeTruthy();

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('User Sync with Supabase', () => {
    it('creates new user in Supabase when not exists', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from('users').select).toHaveBeenCalled();
      expect(mockSupabase.from('users').insert).toHaveBeenCalledWith({
        id: 'firebase-123',
        email: 'test@example.com',
        firebase_uid: 'firebase-123',
        display_name: 'Test User',
        avatar_url: 'https://example.com/photo.jpg',
        created_at: expect.any(String),
        updated_at: expect.any(String),
        last_login: expect.any(String),
      });
    });

    it('updates existing user in Supabase', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Mock existing user
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSupabaseUser,
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockSupabaseUser,
            error: null,
          }),
        }),
      }) as any;

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockSupabase.from('users').update).toHaveBeenCalledWith({
        last_login: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('handles Supabase sync error gracefully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Mock Supabase error
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      }) as any;

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Should still set user despite Supabase error
      expect(result.current.user).toBeTruthy();
      expect(console.error).toHaveBeenCalledWith(
        'Error creating user in Supabase:',
        expect.any(Object)
      );
    });
  });

  describe('Auth State Changes', () => {
    it('handles auth state change on mount', async () => {
      let authStateChangeCallback: ((user: any) => void) | null = null;

      mockOnAuthStateChanged.mockImplementation((callback) => {
        authStateChangeCallback = callback;
        return () => {}; // Return unsubscribe function
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate auth state change
      await act(async () => {
        if (authStateChangeCallback) {
          authStateChangeCallback(mockFirebaseUser);
        }
      });

      expect(result.current.user).toBeTruthy();
      expect(result.current.loading).toBe(false);
    });

    it('handles current user on mount', async () => {
      mockGetCurrentUser.mockReturnValue(mockFirebaseUser as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      expect(mockGetCurrentUser).toHaveBeenCalled();
    });

    it('handles sign out through auth state change', async () => {
      let authStateChangeCallback: ((user: any) => void) | null = null;

      mockOnAuthStateChanged.mockImplementation((callback) => {
        authStateChangeCallback = callback;
        return () => {}; // Return unsubscribe function
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // First sign in
      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.user).toBeTruthy();

      // Then simulate sign out through auth state change
      await act(async () => {
        if (authStateChangeCallback) {
          authStateChangeCallback(null);
        }
      });

      expect(result.current.user).toBe(null);
    });
  });
});
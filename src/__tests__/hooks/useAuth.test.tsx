import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth, AuthProvider } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabase';

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
  const mockSupabaseUser = {
    id: 'supabase-123',
    email: 'test@example.com',
    user_metadata: {
      display_name: 'Test User',
      avatar_url: 'https://example.com/photo.jpg'
    }
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations for Supabase
    (mockSupabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null
    });

    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null
    });

    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: mockSupabaseUser },
      error: null
    });

    (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null
    });

    (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn()
        }
      }
    });

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
            data: {
              id: 'supabase-123',
              email: 'test@example.com',
              display_name: 'Test User',
              avatar_url: 'https://example.com/photo.jpg',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: {
            id: 'supabase-123',
            email: 'test@example.com',
            display_name: 'Test User',
            avatar_url: 'https://example.com/photo.jpg',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    }) as any;
  });

  describe('Initial State', () => {
    it('initializes with correct default state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBe(null);
      expect(result.current.error).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });
    });

    it('provides all required functions', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(typeof result.current.signInWithGoogle).toBe('function');
      expect(typeof result.current.signInWithEmail).toBe('function');
      expect(typeof result.current.signUpWithEmail).toBe('function');
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

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      // OAuth sign in doesn't set user directly in test environment
      // It redirects and handles auth state change
      expect(result.current.user).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('handles popup closed by user error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signInWithOAuth as jest.Mock).mockRejectedValue({
        message: 'Popup closed'
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Popup closed');
    });

    it('handles popup blocked error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signInWithOAuth as jest.Mock).mockRejectedValue({
        message: 'Popup blocked'
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.error).toBe('Popup blocked');
    });

    it('handles generic sign in error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signInWithOAuth as jest.Mock).mockRejectedValue({
        message: 'Unknown error'
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

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('handles user not found error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signInWithPassword as jest.Mock).mockRejectedValue({
        message: 'Invalid login credentials'
      });

      await act(async () => {
        await result.current.signInWithEmail('nonexistent@example.com', 'password123');
      });

      expect(result.current.error).toBe('No account found with this email address');
    });

    it('handles wrong password error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signInWithPassword as jest.Mock).mockRejectedValue({
        message: 'Invalid password'
      });

      await act(async () => {
        await result.current.signInWithEmail('test@example.com', 'wrongpassword');
      });

      expect(result.current.error).toBe('Incorrect password');
    });

    it('handles invalid email error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signInWithPassword as jest.Mock).mockRejectedValue({
        message: 'Invalid email'
      });

      await act(async () => {
        await result.current.signInWithEmail('invalid-email', 'password123');
      });

      expect(result.current.error).toBe('Invalid email');
    });

    it('handles too many requests error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signInWithPassword as jest.Mock).mockRejectedValue({
        message: 'Too many requests'
      });

      await act(async () => {
        await result.current.signInWithEmail('test@example.com', 'password123');
      });

      expect(result.current.error).toBe('Too many requests');
    });
  });

  describe('Email Sign Up', () => {
    it('signs up with email successfully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signUpWithEmail('test@example.com', 'password123', 'Test User');
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            display_name: 'Test User',
            avatar_url: ''
          }
        }
      });
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('signs up without name successfully', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signUpWithEmail('test@example.com', 'password123');
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            display_name: '',
            avatar_url: ''
          }
        }
      });
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('handles email already in use error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signUp as jest.Mock).mockRejectedValue({
        message: 'User already registered'
      });

      await act(async () => {
        await result.current.signUpWithEmail('existing@example.com', 'password123');
      });

      expect(result.current.error).toBe('An account with this email already exists');
    });

    it('handles weak password error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signUp as jest.Mock).mockRejectedValue({
        message: 'Password should be at least'
      });

      await act(async () => {
        await result.current.signUpWithEmail('test@example.com', '123');
      });

      expect(result.current.error).toBe('Password is too weak. Please choose a stronger password');
    });

    it('handles operation not allowed error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signUp as jest.Mock).mockRejectedValue({
        message: 'weak_password'
      });

      await act(async () => {
        await result.current.signUpWithEmail('test@example.com', 'password123');
      });

      expect(result.current.error).toBe('Password is too weak. Please choose a stronger password');
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

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.current.user).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('handles sign out error', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      (mockSupabase.auth.signOut as jest.Mock).mockRejectedValue({
        message: 'Sign out failed'
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
      (mockSupabase.auth.signInWithOAuth as jest.Mock).mockRejectedValueOnce({
        message: 'Some error'
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

      // Mock the auth state change to trigger user sync
      let authStateChangeCallback: ((event: string, session: any) => void) | null = null;
      
      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        };
      });

      await act(async () => {
        // Simulate successful OAuth sign in followed by auth state change
        await result.current.signInWithGoogle();
        
        // Then simulate the auth state change that would trigger user sync
        if (authStateChangeCallback) {
          await authStateChangeCallback('SIGNED_IN', { user: mockSupabaseUser });
        }
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from('users').select).toHaveBeenCalled();
      expect(mockSupabase.from('users').insert).toHaveBeenCalledWith({
        id: 'supabase-123',
        email: 'test@example.com',
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
              data: {
                id: 'supabase-123',
                email: 'test@example.com',
                display_name: 'Test User',
                avatar_url: 'https://example.com/photo.jpg',
              },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: {
              id: 'supabase-123',
              email: 'test@example.com',
              display_name: 'Test User',
              avatar_url: 'https://example.com/photo.jpg',
            },
            error: null,
          }),
        }),
      }) as any;

      // Mock the auth state change to trigger user sync
      let authStateChangeCallback: ((event: string, session: any) => void) | null = null;
      
      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        };
      });

      await act(async () => {
        // Simulate successful OAuth sign in followed by auth state change
        await result.current.signInWithGoogle();
        
        // Then simulate the auth state change that would trigger user sync
        if (authStateChangeCallback) {
          await authStateChangeCallback('SIGNED_IN', { user: mockSupabaseUser });
        }
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

      // Mock the auth state change to trigger user sync
      let authStateChangeCallback: ((event: string, session: any) => void) | null = null;
      
      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        };
      });

      await act(async () => {
        // Simulate successful OAuth sign in followed by auth state change
        await result.current.signInWithGoogle();
        
        // Then simulate the auth state change that would trigger user sync
        if (authStateChangeCallback) {
          await authStateChangeCallback('SIGNED_IN', { user: mockSupabaseUser });
        }
      });

      // Should still set user despite Supabase error
      expect(result.current.user).toBeTruthy();
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  describe('Auth State Changes', () => {
    it('handles auth state change on mount', async () => {
      let authStateChangeCallback: ((event: string, session: any) => void) | null = null;

      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate auth state change
      await act(async () => {
        if (authStateChangeCallback) {
          authStateChangeCallback('SIGNED_IN', { user: mockSupabaseUser });
        }
      });

      expect(result.current.user).toBeTruthy();
      expect(result.current.loading).toBe(false);
    });

    it('handles current user on mount', async () => {
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: mockSupabaseUser } },
        error: null
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    });

    it('handles sign out through auth state change', async () => {
      let authStateChangeCallback: ((event: string, session: any) => void) | null = null;

      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate sign in first
      await act(async () => {
        if (authStateChangeCallback) {
          await authStateChangeCallback('SIGNED_IN', { user: mockSupabaseUser });
        }
      });

      expect(result.current.user).toBeTruthy();

      // Then simulate sign out through auth state change
      await act(async () => {
        if (authStateChangeCallback) {
          authStateChangeCallback('SIGNED_OUT', null);
        }
      });

      expect(result.current.user).toBe(null);
    });
  });
});
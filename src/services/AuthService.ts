/**
 * AuthService
 *
 * Production-ready authentication service
 * Integrates with Supabase Auth and provides additional security features
 */

import {
  AuthError
} from '@supabase/supabase-js';

import { supabase } from '../utils/supabase';

// Define types locally since they're not exported properly in v2
interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
  };
  created_at?: string;
  last_sign_in_at?: string;
}

interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: SupabaseUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
  lastSignInAt?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: SupabaseSession | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

class AuthService {
  private authState: AuthState = {
    user: null,
    session: null,
    isLoading: false,
    error: null,
    isAuthenticated: false
  };

  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    // Initialize auth state from current session
    this.initializeAuth();
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthStateChange(event, session);
    });
  }

  /**
   * Initialize authentication state from current session
   * @private
   */
  private async initializeAuth(): Promise<void> {
    try {
      this.setLoading(true);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting initial session:', error);
        this.setError(error.message);
      } else if (session) {
        await this.setSession(session);
      } else {
        this.clearAuth();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.setError('Failed to initialize authentication');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle authentication state changes
   * @private
   */
  private async handleAuthStateChange(event: string, session: SupabaseSession | null): Promise<void> {
    console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
    
    switch (event) {
      case 'SIGNED_IN':
        if (session) {
          await this.setSession(session);
        }
        break;
        
      case 'SIGNED_OUT':
        this.clearAuth();
        break;
        
      case 'TOKEN_REFRESHED':
        if (session) {
          await this.setSession(session);
        }
        break;
        
      case 'USER_UPDATED':
        if (session?.user) {
          this.updateUser(session.user);
        }
        break;
        
      default:
        console.log('Unhandled auth event:', event);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
        options: {
          // Set session to persist across browser restarts
        }
      });

      if (error) {
        this.setError(this.getAuthErrorMessage(error));
        return { success: false, error: this.getAuthErrorMessage(error) };
      }

      if (data.session) {
        await this.setSession(data.session);
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(credentials: SignupCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName || '',
          }
        }
      });

      if (error) {
        this.setError(this.getAuthErrorMessage(error));
        return { success: false, error: this.getAuthErrorMessage(error) };
      }

      if (data.user && !data.session) {
        // Email confirmation required
        return { 
          success: false, 
          error: 'Please check your email to confirm your account' 
        };
      }

      if (data.session) {
        await this.setSession(data.session);
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        this.setError(error.message);
        return { success: false, error: error.message };
      }

      this.clearAuth();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Redirect to app after password reset
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: {
    fullName?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.authState.user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.fullName,
        },
        ...(updates.avatarUrl && { avatar_url: updates.avatarUrl })
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local user data
      if (this.authState.user) {
        this.authState.user = {
          ...this.authState.user,
          ...(updates.fullName && { fullName: updates.fullName }),
          ...(updates.avatarUrl && { avatarUrl: updates.avatarUrl })
        };
        this.notifyListeners();
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Set session and update auth state
   * @private
   */
  private async setSession(session: SupabaseSession): Promise<void> {
    const authUser: AuthUser = {
      id: session.user.id,
      email: session.user.email || '',
      fullName: session.user.user_metadata?.full_name || '',
      avatarUrl: session.user.user_metadata?.avatar_url || '',
      createdAt: session.user.created_at || new Date().toISOString(),
      lastSignInAt: session.user.last_sign_in_at
    };

    this.authState = {
      user: authUser,
      session,
      isLoading: false,
      error: null,
      isAuthenticated: true
    };

    this.notifyListeners();
  }

  /**
   * Clear authentication state
   * @private
   */
  private clearAuth(): void {
    this.authState = {
      user: null,
      session: null,
      isLoading: false,
      error: null,
      isAuthenticated: false
    };

    this.notifyListeners();
  }

  /**
   * Update user data in auth state
   * @private
   */
  private updateUser(user: SupabaseUser): void {
    if (this.authState.user) {
      this.authState.user = {
        ...this.authState.user,
        fullName: user.user_metadata?.full_name || this.authState.user.fullName,
        avatarUrl: user.user_metadata?.avatar_url || this.authState.user.avatarUrl,
        lastSignInAt: user.last_sign_in_at || this.authState.user.lastSignInAt
      };
      this.notifyListeners();
    }
  }

  /**
   * Set loading state
   * @private
   */
  private setLoading(loading: boolean): void {
    this.authState.isLoading = loading;
    this.notifyListeners();
  }

  /**
   * Set error state
   * @private
   */
  private setError(error: string | null): void {
    this.authState.error = error;
    this.notifyListeners();
  }

  /**
   * Get user-friendly error message from auth error
   * @private
   */
  private getAuthErrorMessage(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password';
      case 'Email not confirmed':
        return 'Please check your email to confirm your account';
      case 'User already registered':
        return 'An account with this email already exists';
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long';
      case 'Unable to validate email address: invalid format':
        return 'Please enter a valid email address';
      default:
        return error.message || 'An authentication error occurred';
    }
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call listener with current state
    listener(this.authState);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state change
   * @private
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.authState }));
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Get current user
   */
  getUser(): AuthUser | null {
    return this.authState.user;
  }

  /**
   * Get current session
   */
  getSession(): SupabaseSession | null {
    return this.authState.session;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Get current session token for API requests
   */
  async getSessionToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Failed to get session token:', error);
      return null;
    }
  }

  /**
   * Refresh session token
   */
  async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Failed to refresh session:', error);
        return false;
      }

      if (data.session) {
        await this.setSession(data.session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return false;
    }
  }
}

// Export singleton instance and class
export const authService = new AuthService();
export default authService;
export { AuthService };
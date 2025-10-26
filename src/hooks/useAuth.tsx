import React, { useState, useEffect, useContext, createContext, ReactNode, useCallback } from 'react';

import { supabase } from '../utils/supabase';
import { hardwareAPI } from '../services/HardwareAPI';
import { env } from '../utils/env';

interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert Supabase user to AuthUser format
  const formatUser = useCallback((supabaseUser: any): AuthUser | null => {
    if (!supabaseUser) return null;
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.full_name,
      photoURL: supabaseUser.user_metadata?.avatar_url
    };
  }, []);

  // Sync user with Supabase database
  const syncUserWithSupabase = useCallback(async (supabaseUser: any) => {
    if (!supabaseUser) return null;
    
    try {
      const authUser = formatUser(supabaseUser);
      if (!authUser) return null;
      
      // Check if user exists in Supabase
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (!existingUser) {
        // Create new user in Supabase
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            display_name: authUser.displayName,
            avatar_url: authUser.photoURL,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating user in Supabase:', insertError);
        }
      } else {
        // Update last login
        const { error: updateError } = await supabase
          .from('users')
          .update({
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', supabaseUser.id);

        if (updateError) {
          console.error('Error updating user in Supabase:', updateError);
        }
      }

      return authUser;
    } catch (error) {
      console.error('Error syncing user with Supabase:', error);
      setError('Failed to sync user data');
      return null;
    }
  }, [formatUser]);

  // Handle Google sign in (uses Supabase OAuth)
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if we're using mock authentication
      if (env.VITE_USE_MOCK_AUTH === 'true' || env.VITE_USE_MOCK_HARDWARE === 'true') {
        // Mock Google sign-in for testing
        const mockUser: AuthUser = {
          id: 'mock-user-id',
          email: 'mockuser@example.com',
          displayName: 'Mock User',
          photoURL: undefined
        };
        setUser(mockUser);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        throw error;
      }

      // OAuth redirect will handle the rest
      // Set loading to false after initiating OAuth flow
      setLoading(false);
    } catch (error: any) {
      console.error('Google sign in error:', error);
      let errorMessage = 'Failed to sign in with Google';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Handle email sign in (uses Supabase)
  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if we're using mock hardware
      if (env.VITE_USE_MOCK_HARDWARE === 'true') {
        // Mock authentication for testing
        const mockUser: AuthUser = {
          id: 'mock-user-id',
          email: email,
          displayName: email.split('@')[0],
          photoURL: undefined
        };
        setUser(mockUser);
        setLoading(false);
        return;
      }
      
      // Use Supabase for email authentication
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw signInError;
      }

      if (authData.user) {
        const authUser = await syncUserWithSupabase(authData.user);
        if (authUser) {
          setUser(authUser);
        }
      }
    } catch (error: any) {
      console.error('Email sign in error:', error);
      let errorMessage = 'Failed to sign in with email';
      
      // Provide more specific error messages
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'No account found with this email address';
      } else if (error.message?.includes('Invalid password')) {
        errorMessage = 'Incorrect password';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle email sign up (uses Supabase)
  const handleEmailSignUp = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if we're using mock authentication
      if (env.VITE_USE_MOCK_AUTH === 'true' || env.VITE_USE_MOCK_HARDWARE === 'true') {
        // Mock email sign-up for testing
        const mockUser: AuthUser = {
          id: 'mock-user-id',
          email: email,
          displayName: name || 'Mock User',
          photoURL: undefined
        };
        setUser(mockUser);
        setLoading(false);
        return;
      }
      
      // Use Supabase for email signup
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name || '',
            avatar_url: ''
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (authData.user) {
        const authUser = await syncUserWithSupabase(authData.user);
        if (authUser) {
          setUser(authUser);
        }
      }
    } catch (error: any) {
      console.error('Email sign up error:', error);
      let errorMessage = 'Failed to create account';
      
      // Provide more specific error messages
      if (error.message?.includes('User already registered')) {
        errorMessage = 'An account with this email already exists';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Password is too weak. Please choose a stronger password';
      } else if (error.message?.includes('weak_password')) {
        errorMessage = 'Password is too weak. Please choose a stronger password';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      setUser(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Listen for auth state changes
  useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        // Check if we're using mock authentication
        if (env.VITE_USE_MOCK_AUTH === 'true' || env.VITE_USE_MOCK_HARDWARE === 'true') {
          // In mock mode, set a mock user immediately
          const mockUser: AuthUser = {
            id: 'mock-user-id',
            email: 'mockuser@example.com',
            displayName: 'Mock User',
            photoURL: undefined
          };
          setUser(mockUser);
          hardwareAPI.setUserId(mockUser.id);
          setLoading(false);
          return;
        }

        // Check Supabase auth state
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const authUser = await syncUserWithSupabase(session.user);
          if (authUser) {
            setUser(authUser);
            // Set user ID for hardware authentication
            hardwareAPI.setUserId(authUser.id);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking initial auth state:', error);
        setLoading(false);
      }
    };

    checkInitialAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const authUser = await syncUserWithSupabase(session.user);
        if (authUser) {
          setUser(authUser);
          // Set user ID for hardware authentication
          hardwareAPI.setUserId(authUser.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        // Clear hardware authentication on sign out
        hardwareAPI.setUserId(null as any);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [syncUserWithSupabase]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    signInWithGoogle: handleGoogleSignIn,
    signInWithEmail: handleEmailSignIn,
    signUpWithEmail: handleEmailSignUp,
    signOut: handleSignOut,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Higher-order component for protecting routes
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
            <p className="text-gray-600">Please sign in to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};
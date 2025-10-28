import React, { useState, useEffect, useContext, createContext, ReactNode, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '../lib/query-client';
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
  const queryClient = useQueryClient();
  
  // Query for current user session
  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 0,
    refetchOnMount: false,
  });

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

  // Query for user data
  const { data: userData } = useQuery({
    queryKey: ['auth-user', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return null;
      
      // Check if user exists in Supabase
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!existingUser) {
        // Create new user in Supabase
        const authUser = formatUser(session.user);
        if (!authUser) return null;
        
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

        return authUser;
      } else {
        // Update last login
        const { error: updateError } = await supabase
          .from('users')
          .update({
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id);

        if (updateError) {
          console.error('Error updating user in Supabase:', updateError);
        }

        return formatUser(existingUser);
      }
    },
    staleTime: 0,
    refetchOnMount: false,
  });

  // Mutation for Google sign in
  const googleSignInMutation = useMutation({
    mutationFn: async () => {
      // Check if we're using mock authentication
      if (env.VITE_USE_MOCK_AUTH === 'true' || env.VITE_USE_MOCK_HARDWARE === 'true') {
        // Mock Google sign-in for testing
        const mockUser: AuthUser = {
          id: 'mock-user-id',
          email: 'mockuser@example.com',
          displayName: 'Mock User',
          photoURL: undefined
        };
        return mockUser;
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
      return formatUser(data.user);
    },
    onSuccess: (user: any) => {
      queryClient.invalidateQueries({ queryKey: ['auth-session', 'auth-user'] });
      if (user) {
        hardwareAPI.setUserId(user.id);
      }
    },
  });

  // Mutation for email sign in
  const emailSignInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // Check if we're using mock hardware
      if (env.VITE_USE_MOCK_HARDWARE === 'true') {
        // Mock authentication for testing
        const mockUser: AuthUser = {
          id: 'mock-user-id',
          email: email,
          displayName: email.split('@')[0],
          photoURL: undefined
        };
        return mockUser;
      }
      
      // Use Supabase for email authentication
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw signInError;
      }

      return formatUser(authData.user);
    },
    onSuccess: (user: any) => {
      queryClient.invalidateQueries({ queryKey: ['auth-session', 'auth-user'] });
      if (user) {
        hardwareAPI.setUserId(user.id);
      }
    },
  });

  // Mutation for email sign up
  const emailSignUpMutation = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name?: string }) => {
      // Check if we're using mock authentication
      if (env.VITE_USE_MOCK_AUTH === 'true' || env.VITE_USE_MOCK_HARDWARE === 'true') {
        // Mock email sign-up for testing
        const mockUser: AuthUser = {
          id: 'mock-user-id',
          email: email,
          displayName: name || 'Mock User',
          photoURL: undefined
        };
        return mockUser;
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

      return formatUser(authData.user);
    },
    onSuccess: (user: any) => {
      queryClient.invalidateQueries({ queryKey: ['auth-session', 'auth-user'] });
      if (user) {
        hardwareAPI.setUserId(user.id);
      }
    },
  });

  // Mutation for sign out
  const signOutMutation = useMutation({
    mutationFn: async () => {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear hardware authentication on sign out
      hardwareAPI.setUserId(null as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-session', 'auth-user'] });
    },
  });

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    try {
      return await googleSignInMutation.mutateAsync();
    } catch (error: any) {
      console.error('Google sign in error:', error);
      let errorMessage = 'Failed to sign in with Google';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  // Handle email sign in
  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      return await emailSignInMutation.mutateAsync({ email, password });
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
      
      throw new Error(errorMessage);
    }
  };

  // Handle email sign up
  const handleEmailSignUp = async (email: string, password: string, name?: string) => {
    try {
      return await emailSignUpMutation.mutateAsync({ email, password, name });
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
      
      throw new Error(errorMessage);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync();
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  // Clear error
  const clearError = () => {
    // In TanStack Query, errors are handled by mutations
    // This is a placeholder for compatibility
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
          hardwareAPI.setUserId(mockUser.id);
          return;
        }

        // Check Supabase auth state
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const authUser = formatUser(session.user);
          if (authUser) {
            hardwareAPI.setUserId(authUser.id);
          }
        }
      } catch (error) {
        console.error('Error checking initial auth state:', error);
      }
    };

    checkInitialAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const authUser = formatUser(session.user);
        if (authUser) {
          hardwareAPI.setUserId(authUser.id);
        }
      } else if (event === 'SIGNED_OUT') {
        // Clear hardware authentication on sign out
        hardwareAPI.setUserId(null as any);
      }
    });

    return () => subscription.unsubscribe();
  }, [formatUser]);

  const value: AuthContextType = {
    user: userData || null,
    loading: sessionLoading || sessionLoading,
    error: sessionError?.message || null,
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
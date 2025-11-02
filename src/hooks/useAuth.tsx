import React, { useState, useEffect, useContext, createContext, ReactNode, useCallback } from 'react';

import { authService, AuthUser } from '../services/AuthService';
import { hardwareAPI } from '../services/HardwareAPI';

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

  // Sync auth state with AuthService
  const syncAuthState = useCallback(() => {
    const authState = authService.getState();
    setUser(authState.user);
    setLoading(authState.isLoading);
    setError(authState.error);
  }, []);

  // Handle Google sign in (uses Supabase OAuth)
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use AuthService for Google OAuth
      const result = await authService.signInWithGoogle();
      
      if (result.success) {
        syncAuthState();
      } else {
        setError(result.error || 'Failed to sign in with Google');
      }
    } catch (error: any) {
      // console.error('Google sign in error:', error);
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // Handle email sign in (uses AuthService)
  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use AuthService for email authentication
      const result = await authService.signIn({ email, password });
      
      if (result.success) {
        syncAuthState();
      } else {
        setError(result.error || 'Failed to sign in with email');
      }
    } catch (error: any) {
      // console.error('Email sign in error:', error);
      setError(error.message || 'Failed to sign in with email');
    } finally {
      setLoading(false);
    }
  };

  // Handle email sign up (uses AuthService)
  const handleEmailSignUp = async (email: string, password: string, name?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use AuthService for email signup
      const result = await authService.signUp({ email, password, fullName: name });
      
      if (result.success) {
        syncAuthState();
      } else {
        setError(result.error || 'Failed to create account');
      }
    } catch (error: any) {
      // console.error('Email sign up error:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use AuthService for sign out
      const result = await authService.signOut();
      
      if (result.success) {
        syncAuthState();
      } else {
        setError(result.error || 'Failed to sign out');
      }
    } catch (error: any) {
      // console.error('Sign out error:', error);
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
        // Sync initial auth state from AuthService
        syncAuthState();
        
        // Set user ID for hardware authentication if user exists
        const authState = authService.getState();
        if (authState.user) {
          hardwareAPI.setUserId(authState.user.id);
        }
        
        setLoading(false);
      } catch (error) {
        // console.error('Error checking initial auth state:', error);
        setLoading(false);
      }
    };

    checkInitialAuth();

    // Subscribe to auth state changes from AuthService
    const unsubscribe = authService.subscribe((authState) => {
      setUser(authState.user);
      setLoading(authState.isLoading);
      setError(authState.error);
      
      // Set user ID for hardware authentication
      if (authState.user) {
        hardwareAPI.setUserId(authState.user.id);
      } else {
        hardwareAPI.setUserId(null as any);
      }
    });

    return () => unsubscribe();
  }, [syncAuthState]);

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
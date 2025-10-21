import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signInWithEmail,
  signOut,
  getCurrentUser,
  onAuthStateChanged
} from '../firebase';
import { supabase } from '../utils/supabase';

interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  firebaseUid: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
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

  // Convert Firebase user to AuthUser format
  const formatUser = (firebaseUser: User): AuthUser => ({
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || undefined,
    photoURL: firebaseUser.photoURL || undefined,
    firebaseUid: firebaseUser.uid
  });

  // Sync user with Supabase
  const syncUserWithSupabase = async (firebaseUser: User) => {
    try {
      const authUser = formatUser(firebaseUser);
      
      // Check if user exists in Supabase
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('firebase_uid', firebaseUser.uid)
        .single();

      if (!existingUser) {
        // Create new user in Supabase
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: firebaseUser.uid,
            email: authUser.email,
            firebase_uid: authUser.firebaseUid,
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
          .eq('firebase_uid', firebaseUser.uid);

        if (updateError) {
          console.error('Error updating user in Supabase:', updateError);
        }
      }

      setUser(authUser);
    } catch (error) {
      console.error('Error syncing user with Supabase:', error);
      setError('Failed to sync user data');
    }
  };

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const firebaseUser = await signInWithGoogle();
      await syncUserWithSupabase(firebaseUser);
    } catch (error: any) {
      console.error('Google sign in error:', error);
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // Handle email sign in
  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const firebaseUser = await signInWithEmail(email, password);
      await syncUserWithSupabase(firebaseUser);
    } catch (error: any) {
      console.error('Email sign in error:', error);
      setError(error.message || 'Failed to sign in with email');
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await signOut();
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
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        await syncUserWithSupabase(firebaseUser);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    // Check current user on mount
    const currentUser = getCurrentUser();
    if (currentUser) {
      syncUserWithSupabase(currentUser);
    } else {
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    signInWithGoogle: handleGoogleSignIn,
    signInWithEmail: handleEmailSignIn,
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
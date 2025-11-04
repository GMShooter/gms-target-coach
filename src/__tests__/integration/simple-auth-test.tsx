/**
 * Simple Authentication Test
 * Tests basic authentication functionality after Phase 1 fixes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/AuthService';

// Simple test component
const TestComponent: React.FC = () => {
  const { user, loading, error, signInWithEmail, signOut } = useAuth();

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
      
      <button data-testid="signout" onClick={signOut}>
        Sign Out
      </button>
    </div>
  );
};

const renderWithAuthProvider = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('Simple Authentication Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with no user', () => {
    renderWithAuthProvider(<TestComponent />);
    
    expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    expect(screen.getByTestId('user')).toHaveTextContent('No user');
    expect(screen.getByTestId('error')).toHaveTextContent('No error');
  });

  it('should handle sign in', async () => {
    // Mock successful sign in
    const mockSignIn = jest.spyOn(authService, 'signIn').mockResolvedValue({
      success: true
    });

    renderWithAuthProvider(<TestComponent />);
    
    const signInButton = screen.getByTestId('signin');
    fireEvent.click(signInButton);

    // Wait for the sign in to be called
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('should handle sign out', async () => {
    // Mock successful sign out
    const mockSignOut = jest.spyOn(authService, 'signOut').mockResolvedValue({
      success: true
    });

    renderWithAuthProvider(<TestComponent />);
    
    const signOutButton = screen.getByTestId('signout');
    fireEvent.click(signOutButton);

    // Wait for the sign out to be called
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('should get auth state', () => {
    const mockGetState = jest.spyOn(authService, 'getState').mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      error: null,
      isAuthenticated: false
    });

    renderWithAuthProvider(<TestComponent />);
    
    expect(mockGetState).toHaveBeenCalled();
  });
});
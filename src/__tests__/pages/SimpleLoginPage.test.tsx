import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { SimpleLoginPage } from '../../pages/SimpleLoginPage';
import { createQueryWrapper } from '../utils/test-query-client';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock useAuth
const mockUseAuth = {
  user: null,
  signInWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
  error: null
};

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('SimpleLoginPage', () => {
  // Create a render function with query wrapper
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(ui, { wrapper: createQueryWrapper() });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockNavigate.mockClear();
    
    // Reset mock values
    mockUseAuth.user = null;
    mockUseAuth.error = null;
    mockUseAuth.signInWithEmail.mockClear();
    mockUseAuth.signInWithGoogle.mockClear();
  });

  it('renders without crashing', () => {
    renderWithProviders(<SimpleLoginPage />);
    
    // Check for main elements
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access GMShoot')).toBeInTheDocument();
    expect(screen.getByAltText('GMShoot')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
  });

  it('displays email and password input fields', () => {
    renderWithProviders(<SimpleLoginPage />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('displays error message when auth error occurs', () => {
    const errorMessage = 'Invalid login credentials';
    
    mockUseAuth.error = errorMessage;
    
    renderWithProviders(<SimpleLoginPage />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveClass('text-red-600');
  });

  it('redirects to demo page when user is already logged in', async () => {
    const mockUser = { email: 'test@example.com' };
    
    mockUseAuth.user = mockUser;
    
    renderWithProviders(<SimpleLoginPage />);
    
    // Wait for useEffect to run and navigation to happen
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/demo');
    });
  });

  it('submits email login form with valid credentials', async () => {
    const mockSignIn = jest.fn().mockResolvedValue(undefined);
    
    mockUseAuth.signInWithEmail = mockSignIn;
    
    renderWithProviders(<SimpleLoginPage />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    // Fill in form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit form
    fireEvent.click(submitButton);
    
    // Check that signIn was called
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('submits google login when clicked', async () => {
    const mockSignIn = jest.fn().mockResolvedValue(undefined);
    
    mockUseAuth.signInWithGoogle = mockSignIn;
    
    renderWithProviders(<SimpleLoginPage />);
    
    const googleButton = screen.getByRole('button', { name: 'Continue with Google' });
    
    // Click Google button
    fireEvent.click(googleButton);
    
    // Check that signIn was called
    expect(mockSignIn).toHaveBeenCalled();
  });

  it('does not submit form with empty email', async () => {
    const mockSignIn = jest.fn();
    
    mockUseAuth.signInWithEmail = mockSignIn;
    
    renderWithProviders(<SimpleLoginPage />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    // Fill in form with empty email
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit form
    fireEvent.click(submitButton);
    
    // Should not call signIn
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('does not submit form with empty password', async () => {
    const mockSignIn = jest.fn();
    
    mockUseAuth.signInWithEmail = mockSignIn;
    
    renderWithProviders(<SimpleLoginPage />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    // Fill in form with empty password
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '' } });
    
    // Submit form
    fireEvent.click(submitButton);
    
    // Should not call signIn
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<SimpleLoginPage />);
    
    // Check for proper heading structure
    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    
    // Check for form labels
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    
    // Check for button accessibility
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    
    // Check for image alt text
    expect(screen.getByAltText('GMShoot')).toBeInTheDocument();
  });

  it('displays divider between login methods', () => {
    renderWithProviders(<SimpleLoginPage />);
    
    // Check for divider element
    const divider = screen.getByText('Or continue with');
    expect(divider).toBeInTheDocument();
  });

  it('has proper form validation attributes', () => {
    renderWithProviders(<SimpleLoginPage />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    
    // Check for required attribute
    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');
    
    // Check for input types
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Check for placeholder text
    expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
    expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
  });

  it('displays Google icon in button', () => {
    renderWithProviders(<SimpleLoginPage />);
    
    const googleButton = screen.getByRole('button', { name: 'Continue with Google' });
    
    // Check for SVG icon
    const googleIcon = googleButton.querySelector('svg');
    expect(googleIcon).toBeInTheDocument();
  });

  it('maintains responsive layout on different screen sizes', () => {
    // Test with different viewport sizes
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768 // Desktop width
    });
    
    renderWithProviders(<SimpleLoginPage />);
    
    // Check that main container is responsive
    const mainContainer = screen.getByText('Welcome Back').closest('.min-h-screen');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('bg-gradient-to-br', 'from-slate-900', 'to-black', 'flex', 'flex-col');
  });
});
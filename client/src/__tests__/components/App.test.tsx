import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';

// Mock the useAuth hook
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signOut: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('App Component', () => {
  it('renders landing page by default', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    
    // Check if landing page elements are present
    expect(screen.getByText('Precision')).toBeInTheDocument();
    expect(screen.getByText('matters.')).toBeInTheDocument();
  });

  it('shows loading screen when auth is loading', () => {
    // Mock loading state
    jest.doMock('../hooks/useAuth', () => ({
      useAuth: () => ({
        user: null,
        loading: true,
        signOut: jest.fn(),
      }),
      AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }));

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies dark mode classes on mount', () => {
    const mockAdd = jest.fn();
    Object.defineProperty(document.documentElement, 'classList', {
      value: { add: mockAdd },
      writable: true,
    });
    Object.defineProperty(document.body, 'classList', {
      value: { add: jest.fn() },
      writable: true,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    
    expect(mockAdd).toHaveBeenCalledWith('dark');
  });

  it('handles get started button click', () => {
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    
    const getStartedButton = screen.getByText('Get Started');
    fireEvent.click(getStartedButton);
    
    expect(mockLocation.href).toBe('/login');
  });

  it('shows navigation when user is logged in', () => {
    // Mock authenticated user
    jest.doMock('../hooks/useAuth', () => ({
      useAuth: () => ({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signOut: jest.fn(),
      }),
      AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }));

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    
    expect(screen.getByText('GMShoot')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Video Analysis')).toBeInTheDocument();
    expect(screen.getByText('Camera Analysis')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('handles sign out correctly', () => {
    const mockSignOut = jest.fn().mockResolvedValue(undefined);
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    // Mock authenticated user
    jest.doMock('../hooks/useAuth', () => ({
      useAuth: () => ({
        user: { id: 'test-user', email: 'test@example.com' },
        loading: false,
        signOut: mockSignOut,
      }),
      AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }));

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    
    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);
    
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('redirects to login for protected routes when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/analysis']}>
        <App />
      </MemoryRouter>
    );
    
    // Should redirect to login
    expect(screen.getByText('Redirecting to login...')).toBeInTheDocument();
  });
});
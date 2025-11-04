import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from '../../../components/layout/AppLayout';
import { useAuth } from '../../../hooks/useAuth';

// Mock useAuth hook
jest.mock('../../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '/dashboard',
  assign: jest.fn(),
  replace: jest.fn(),
  origin: 'http://localhost:3000',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  protocol: 'http:',
  search: '',
  hash: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  value: true,
  writable: true,
});

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AppLayout', () => {
  beforeEach(() => {
    // Reset mocks
    mockUseAuth.mockReturnValue({
      user: { email: 'test@example.com' },
      signOut: jest.fn().mockResolvedValue(undefined),
    });
    
    // Reset window.location
    mockLocation.pathname = '/dashboard';
    mockLocation.href = 'http://localhost:3000/dashboard';
    
    // Mock window.innerWidth for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });
  });

  it('renders without crashing', () => {
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // Check for main elements
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('GMShoot')).toBeInTheDocument();
  });

  it('displays sidebar on desktop', () => {
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // On desktop, sidebar should be visible
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Live Demo')).toBeInTheDocument();
    expect(screen.getByText('Analysis')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('hides sidebar on mobile', () => {
    // Mock mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });
    
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // On mobile, sidebar should be hidden by default
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('toggles sidebar when menu button is clicked', async () => {
    // Mock mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });
    
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // Find menu button (it's the first button in the header)
    const menuButton = screen.getAllByRole('button')[0];
    fireEvent.click(menuButton);
    
    // Sidebar should now be visible
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('navigates to correct path when navigation item is clicked', () => {
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // Click on Dashboard
    const dashboardButton = screen.getByText('Dashboard');
    fireEvent.click(dashboardButton);
    
    // Should navigate to dashboard
    expect(mockLocation.href).toBe('/dashboard');
  });

  it('displays online status when connected', () => {
    // Mock online status
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
    });
    
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // Check for online status
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('displays offline status when disconnected', () => {
    // Mock offline status
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
    });
    
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // Check for offline status - use getAllByText to avoid ambiguity
    const offlineElements = screen.getAllByText('Offline');
    expect(offlineElements.length).toBeGreaterThan(0);
  });

  it('displays search input on desktop', () => {
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // Search input should be visible on desktop
    const searchInputs = screen.getAllByPlaceholderText('Search...');
    expect(searchInputs.length).toBeGreaterThan(0);
  });

  it('displays device type indicator', () => {
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // Check for device type indicator
    expect(screen.getByText('desktop')).toBeInTheDocument();
  });

  it('displays LIVE badge on demo navigation item', () => {
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // Check for LIVE badge on demo item
    const liveBadge = screen.getByText('LIVE');
    expect(liveBadge).toBeInTheDocument();
  });

  it('expands navigation sub-items when clicked', () => {
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    // Click on Analysis to expand sub-items
    const analysisButton = screen.getByText('Analysis');
    fireEvent.click(analysisButton);
    
    // Should show sub-items
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('handles search input changes', () => {
    renderWithQueryClient(<AppLayout>Test Content</AppLayout>);
    
    const searchInputs = screen.getAllByPlaceholderText('Search...');
    fireEvent.change(searchInputs[0], { target: { value: 'test query' } });
    
    expect(searchInputs[0]).toHaveValue('test query');
  });
});
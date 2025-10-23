import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../hooks/useAuth';
import VideoAnalysis from '../../components/VideoAnalysis';
import CameraAnalysis from '../../components/CameraAnalysis';
import ReportList from '../../components/ReportList';
import Report from '../../components/Report';

// Mock Firebase
jest.mock('../../firebase', () => ({
  signInWithGoogle: jest.fn().mockResolvedValue({
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
  }),
  signInWithEmail: jest.fn().mockResolvedValue({
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
  }),
  signOut: jest.fn().mockResolvedValue(undefined),
  getCurrentUser: jest.fn().mockReturnValue(null),
  onAuthStateChanged: jest.fn().mockReturnValue(() => () => {}),
}));

// Mock Supabase - more comprehensive mock
jest.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
        error: null,
      }),
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      }),
    },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'session-123' },
            error: null,
          }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    }),
  },
}));

// Mock fetch for test frames
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  text: () => Promise.resolve('<svg></svg>'),
}) as any;

// Test wrapper with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Component-Hook Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('VideoAnalysis Component Integration', () => {
    it('renders without crashing', () => {
      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      // Check initial state
      expect(screen.getByRole('heading', { name: /Video Analysis/i })).toBeInTheDocument();
      expect(screen.getByText(/Test with Sample Frames/i)).toBeInTheDocument();
    });

    it('has proper file upload input', () => {
      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      // Look for file upload input
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('displays test frames button', () => {
      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      // Look for test frames button
      const testFramesButton = screen.getByText(/Test with Sample Frames/i);
      expect(testFramesButton).toBeInTheDocument();
    });
  });

  describe('CameraAnalysis Component Integration', () => {
    it('renders without crashing', () => {
      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      // Check initial state - use getAllByRole since there are multiple headings
      expect(screen.getAllByRole('heading', { name: /Camera Analysis/i })).toHaveLength(2);
      expect(screen.getByText(/You need to be authenticated to start camera analysis/i)).toBeInTheDocument();
    });

    it('shows authentication message when not logged in', () => {
      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      // Should show authentication message
      expect(screen.getByText(/Authentication required/i)).toBeInTheDocument();
      expect(screen.getByText(/You need to be authenticated to start camera analysis/i)).toBeInTheDocument();
    });
  });

  describe('ReportList Component Integration', () => {
    it('renders without crashing', () => {
      render(
        <TestWrapper>
          <ReportList />
        </TestWrapper>
      );

      // Should show authentication message when not logged in
      expect(screen.getByText(/You need to be authenticated to view your reports/i)).toBeInTheDocument();
    });

    it('shows authentication message when not logged in', () => {
      render(
        <TestWrapper>
          <ReportList />
        </TestWrapper>
      );

      // Should show authentication message
      expect(screen.getByText(/You need to be authenticated to view your reports/i)).toBeInTheDocument();
    });
  });

  describe('Report Component Integration', () => {
    it('renders without crashing', () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      // Should show not found state initially (since we're not passing a valid reportId)
      expect(screen.getByText(/Not Found/i)).toBeInTheDocument();
    });
  });

  describe('Cross-Component Integration', () => {
    it('renders all components together without errors', () => {
      render(
        <TestWrapper>
          <div>
            <VideoAnalysis />
            <CameraAnalysis />
            <ReportList />
          </div>
        </TestWrapper>
      );

      // All components should render
      expect(screen.getByRole('heading', { name: /Video Analysis/i })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { name: /Camera Analysis/i })).toHaveLength(2);
      
      // All should show authentication required
      expect(screen.getAllByText(/You need to be authenticated/i)).toHaveLength(2);
    });

    it('components have proper initial states', () => {
      render(
        <TestWrapper>
          <div>
            <VideoAnalysis />
            <CameraAnalysis />
          </div>
        </TestWrapper>
      );

      // Both components should be in initial state
      expect(screen.getByRole('heading', { name: /Video Analysis/i })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { name: /Camera Analysis/i })).toHaveLength(2);
      
      // Components should not be in loading state initially
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
  });
});
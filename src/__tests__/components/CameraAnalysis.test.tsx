import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CameraAnalysis from '../../components/CameraAnalysis';
import { useCameraAnalysis } from '../../hooks/useCameraAnalysis';
import { useAuth } from '../../hooks/useAuth';

// Mock the hooks
jest.mock('../../hooks/useCameraAnalysis');
jest.mock('../../hooks/useAuth');

const mockUseCameraAnalysis = useCameraAnalysis as jest.MockedFunction<typeof useCameraAnalysis>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('CameraAnalysis Component', () => {
  const mockStartAnalysis = jest.fn();
  const mockStopAnalysis = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for useCameraAnalysis
    mockUseCameraAnalysis.mockReturnValue({
      isAnalyzing: false,
      error: null,
      startAnalysis: mockStartAnalysis,
      stopAnalysis: mockStopAnalysis,
      latestFrame: null,
    });

    // Default mock implementation for useAuth
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com', firebaseUid: 'user-123' },
      loading: false,
      error: null,
      signInWithGoogle: jest.fn(),
      signInWithEmail: jest.fn(),
      signUpWithEmail: jest.fn(),
      signOut: jest.fn(),
      clearError: jest.fn(),
    });
  });

  describe('Initial State', () => {
    it('renders camera analysis interface', () => {
      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Camera Analysis')).toBeInTheDocument();
      expect(screen.getByText('Live Camera Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Use your camera to analyze/)).toBeInTheDocument();
      expect(screen.getByText('Start Live Analysis')).toBeInTheDocument();
    });

    it('displays camera feed placeholder when not analyzing', () => {
      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Camera feed will appear here')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Live camera feed' })).toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    it('shows loading state while checking authentication', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        error: null,
        signInWithGoogle: jest.fn(),
        signInWithEmail: jest.fn(),
        signUpWithEmail: jest.fn(),
        signOut: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    });

    it('shows authentication required message when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: jest.fn(),
        signInWithEmail: jest.fn(),
        signUpWithEmail: jest.fn(),
        signOut: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText(/You need to be authenticated/)).toBeInTheDocument();
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });

    it('disables start button when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: jest.fn(),
        signInWithEmail: jest.fn(),
        signUpWithEmail: jest.fn(),
        signOut: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      const startButton = screen.getByText('Authentication Required');
      expect(startButton).toBeDisabled();
    });
  });

  describe('Analysis Controls', () => {
    it('starts analysis when start button is clicked', async () => {
      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      const startButton = screen.getByText('Start Live Analysis');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockStartAnalysis).toHaveBeenCalled();
      });
    });

    it('stops analysis when stop button is clicked', async () => {
      mockUseCameraAnalysis.mockReturnValue({
        isAnalyzing: true,
        error: null,
        startAnalysis: mockStartAnalysis,
        stopAnalysis: mockStopAnalysis,
        latestFrame: null,
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      const stopButton = screen.getByText('Stop Analysis');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockStopAnalysis).toHaveBeenCalled();
      });
    });
  });

  describe('Analysis States', () => {
    it('shows recording indicator when analyzing', () => {
      mockUseCameraAnalysis.mockReturnValue({
        isAnalyzing: true,
        error: null,
        startAnalysis: mockStartAnalysis,
        stopAnalysis: mockStopAnalysis,
        latestFrame: null,
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('REC')).toBeInTheDocument();
      expect(screen.getByText('Stop Analysis')).toBeInTheDocument();
    });

    it('displays latest frame when available', () => {
      const mockFrame = 'PHN2Zz48L3N2Zz4='; // Base64 encoded SVG

      mockUseCameraAnalysis.mockReturnValue({
        isAnalyzing: true,
        error: null,
        startAnalysis: mockStartAnalysis,
        stopAnalysis: mockStopAnalysis,
        latestFrame: mockFrame,
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      const imageElement = screen.getByRole('img', { name: 'Live camera feed' });
      expect(imageElement).toHaveAttribute('src', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=');
    });

    it('updates frame when latestFrame changes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      const imageElement = screen.getByRole('img', { name: 'Live camera feed' });
      expect(imageElement).toHaveAttribute('src', '');

      // Update with new frame
      const mockFrame = 'PHN2Zz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0icmVkIiAvPjwvc3ZnPg==';
      
      mockUseCameraAnalysis.mockReturnValue({
        isAnalyzing: true,
        error: null,
        startAnalysis: mockStartAnalysis,
        stopAnalysis: mockStopAnalysis,
        latestFrame: mockFrame,
      });

      rerender(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(imageElement).toHaveAttribute('src', `data:image/svg+xml;base64,${mockFrame}`);
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error occurs', () => {
      mockUseCameraAnalysis.mockReturnValue({
        isAnalyzing: false,
        error: 'Camera initialization failed',
        startAnalysis: mockStartAnalysis,
        stopAnalysis: mockStopAnalysis,
        latestFrame: null,
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Camera initialization failed')).toBeInTheDocument();
    });

    it('clears error when analysis starts', async () => {
      mockUseCameraAnalysis.mockReturnValue({
        isAnalyzing: false,
        error: 'Previous error',
        startAnalysis: mockStartAnalysis,
        stopAnalysis: mockStopAnalysis,
        latestFrame: null,
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Previous error')).toBeInTheDocument();

      // Start analysis to clear error
      const startButton = screen.getByText('Start Live Analysis');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockStartAnalysis).toHaveBeenCalled();
      });
    });
  });

  describe('Button States', () => {
    it('shows start button when not analyzing', () => {
      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      const startButton = screen.getByText('Start Live Analysis');
      expect(startButton).not.toBeDisabled();
      expect(startButton).toHaveClass('bg-blue-600');
    });

    it('shows stop button when analyzing', () => {
      mockUseCameraAnalysis.mockReturnValue({
        isAnalyzing: true,
        error: null,
        startAnalysis: mockStartAnalysis,
        stopAnalysis: mockStopAnalysis,
        latestFrame: null,
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      const stopButton = screen.getByText('Stop Analysis');
      expect(stopButton).not.toBeDisabled();
      expect(stopButton).toHaveClass('bg-red-600');
    });

    it('shows loading state when user is null but not loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: jest.fn(),
        signInWithEmail: jest.fn(),
        signUpWithEmail: jest.fn(),
        signOut: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      const button = screen.getByText('Authentication Required');
      expect(button).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: 'Camera Analysis' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Live Camera Analysis' })).toBeInTheDocument();

      // Check for button roles
      expect(screen.getByRole('button', { name: 'Start Live Analysis' })).toBeInTheDocument();
    });

    it('provides meaningful descriptions', () => {
      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText(/Use your camera to analyze your shooting technique in real-time/)).toBeInTheDocument();
      expect(screen.getByText(/Connect to your camera to analyze the video stream in real-time/)).toBeInTheDocument();
    });

    it('has proper image alt text', () => {
      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(screen.getByRole('img', { name: 'Live camera feed' })).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('passes userId to useCameraAnalysis hook', () => {
      const mockUser = { id: 'user-456', email: 'test@example.com', firebaseUid: 'user-456' };
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        error: null,
        signInWithGoogle: jest.fn(),
        signInWithEmail: jest.fn(),
        signUpWithEmail: jest.fn(),
        signOut: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(mockUseCameraAnalysis).toHaveBeenCalledWith('user-456');
    });

    it('passes null to useCameraAnalysis when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: jest.fn(),
        signInWithEmail: jest.fn(),
        signUpWithEmail: jest.fn(),
        signOut: jest.fn(),
        clearError: jest.fn(),
      });

      render(
        <TestWrapper>
          <CameraAnalysis />
        </TestWrapper>
      );

      expect(mockUseCameraAnalysis).toHaveBeenCalledWith(null);
    });
  });
});
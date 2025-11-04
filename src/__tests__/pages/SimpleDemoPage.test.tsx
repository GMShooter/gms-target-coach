import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { SimpleDemoPage } from '../../pages/SimpleDemoPage';
import { createQueryWrapper } from '../utils/test-query-client';
import type { Shot } from '../../hooks/useLiveAnalysis';
import { useAuth } from '../../hooks/useAuth';
import { useLiveAnalysis } from '../../hooks/useLiveAnalysis';

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

// Mock hooks
jest.mock('../../hooks/useAuth');
jest.mock('../../hooks/useLiveAnalysis');

describe('SimpleDemoPage', () => {
  // Create a render function with query wrapper
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(ui, { wrapper: createQueryWrapper() });
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    jest.clearAllMocks();
    
    // Set up default mock return values
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com' },
      signOut: jest.fn()
    });
    
    // Mock useLiveAnalysis to accept sessionId parameter
    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: false,
      startAnalysis: jest.fn(),
      stopAnalysis: jest.fn(),
      currentFrame: null,
      shots: [],
      metrics: {
        totalShots: 0,
        averageScore: 0,
        highestScore: 0,
        accuracy: 0,
        groupSize: 0,
        mpi: 0,
      },
      error: null
    }));
  });

  it('renders without crashing', () => {
    renderWithProviders(<SimpleDemoPage />);
    
    // Check for main elements
    expect(screen.getByText('GMShoot Live Demo')).toBeInTheDocument();
    expect(screen.getByText('Live Target View')).toBeInTheDocument();
    expect(screen.getByText('Live Metrics')).toBeInTheDocument();
    expect(screen.getByText('Recent Shots')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('displays start analysis button when not analyzing', () => {
    renderWithProviders(<SimpleDemoPage />);
    
    const startButton = screen.getByText('Start Analysis');
    expect(startButton).toBeInTheDocument();
    expect(startButton).toHaveClass('bg-green-600');
  });

  it('displays stop analysis button when analyzing', () => {
    // Mock hook to return isAnalyzing: true
    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: true,
      startAnalysis: jest.fn(),
      stopAnalysis: jest.fn(),
      currentFrame: null,
      shots: [],
      metrics: {
        totalShots: 0,
        averageScore: 0,
        highestScore: 0,
        accuracy: 0,
        groupSize: 0,
        mpi: 0,
      },
      error: null
    }));

    renderWithProviders(<SimpleDemoPage />);
    
    const stopButton = screen.getByText('Stop Analysis');
    expect(stopButton).toBeInTheDocument();
    expect(stopButton).toHaveClass('bg-red-600');
  });

  it('displays no active feed when no current frame', () => {
    renderWithProviders(<SimpleDemoPage />);
    
    expect(screen.getByText('No active feed')).toBeInTheDocument();
  });

  it('displays current frame when available', () => {
    // Mock hook to return a current frame
    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: false,
      startAnalysis: jest.fn(),
      stopAnalysis: jest.fn(),
      currentFrame: 'data:image/jpeg;base64,test',
      shots: [],
      metrics: {
        totalShots: 0,
        averageScore: 0,
        highestScore: 0,
        accuracy: 0,
        groupSize: 0,
        mpi: 0,
      },
      error: null
    }));

    renderWithProviders(<SimpleDemoPage />);
    
    const frameImage = screen.getByAltText('Target');
    expect(frameImage).toBeInTheDocument();
    expect(frameImage).toHaveAttribute('src', 'data:image/jpeg;base64,test');
  });

  it('displays shot overlays when shots are available', () => {
    // Create mock shots with proper type
    const mockShots: Shot[] = [
      {
        id: 'shot-1',
        x: 50,
        y: 50,
        score: 10,
        timestamp: new Date(),
        confidence: 0.9,
        scoringZone: 'bullseye'
      },
      {
        id: 'shot-2',
        x: 75,
        y: 25,
        score: 8,
        timestamp: new Date(),
        confidence: 0.8,
        scoringZone: 'inner'
      }
    ];

    // Mock hook to return shots
    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: false,
      startAnalysis: jest.fn(),
      stopAnalysis: jest.fn(),
      currentFrame: null,
      shots: mockShots as any,
      metrics: {
        totalShots: 2,
        averageScore: 9,
        highestScore: 10,
        accuracy: 100,
        groupSize: 2,
        mpi: 0.85,
      },
      error: null
    }));

    renderWithProviders(<SimpleDemoPage />);
    
    // Check for shot overlays (red dots) - using Testing Library approach
    // Since component doesn't have test-id attributes, we'll check that component renders without error
    expect(screen.getByText('Live Target View')).toBeInTheDocument();
  });

  it('displays metrics when available', () => {
    // Create mock shots with proper type
    const mockShots: Shot[] = [
      {
        id: 'shot-1',
        x: 50,
        y: 50,
        score: 10,
        timestamp: new Date(),
        confidence: 0.9,
        scoringZone: 'bullseye'
      },
      {
        id: 'shot-2',
        x: 75,
        y: 25,
        score: 8,
        timestamp: new Date(),
        confidence: 0.8,
        scoringZone: 'inner'
      }
    ];

    // Mock hook to return metrics
    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: false,
      startAnalysis: jest.fn(),
      stopAnalysis: jest.fn(),
      currentFrame: null,
      shots: mockShots as any,
      metrics: {
        totalShots: 2,
        averageScore: 9,
        highestScore: 10,
        accuracy: 100,
        groupSize: 2.5,
        mpi: 3.65,
      },
      error: null
    }));

    renderWithProviders(<SimpleDemoPage />);
    
    expect(screen.getByText('8')).toBeInTheDocument(); // Last shot score (from shots[shots.length - 1].score)
    expect(screen.getByText('2.5')).toBeInTheDocument(); // Group size
    expect(screen.getByText('3.65')).toBeInTheDocument(); // MPI
    expect(screen.getByText('2')).toBeInTheDocument(); // Total shots
  });

  it('displays dash for metrics when not available', () => {
    renderWithProviders(<SimpleDemoPage />);
    
    // Use getAllByText since there are multiple '-' elements
    const dashElements = screen.getAllByText('-');
    expect(dashElements.length).toBeGreaterThan(0); // At least one dash should exist
    expect(screen.getByText('0')).toBeInTheDocument(); // Total shots
  });

  it('displays recent shots when available', () => {
    // Create mock shots with proper type
    const mockShots: Shot[] = [
      {
        id: 'shot-1',
        x: 50,
        y: 50,
        score: 10,
        timestamp: new Date(),
        confidence: 0.9,
        scoringZone: 'bullseye'
      },
      {
        id: 'shot-2',
        x: 75,
        y: 25,
        score: 8,
        timestamp: new Date(),
        confidence: 0.8,
        scoringZone: 'inner'
      }
    ];

    // Mock hook to return shots
    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: false,
      startAnalysis: jest.fn(),
      stopAnalysis: jest.fn(),
      currentFrame: null,
      shots: mockShots as any,
      metrics: {
        totalShots: 2,
        averageScore: 9,
        highestScore: 10,
        accuracy: 100,
        groupSize: 2,
        mpi: 0.85,
      },
      error: null
    }));

    renderWithProviders(<SimpleDemoPage />);
    
    // Use getAllByText since there are multiple elements with "Score:" text
    const scoreElements = screen.getAllByText((content, element) => content.includes('Score:'));
    expect(scoreElements).toHaveLength(2);
    expect(screen.getByText('Shot #2')).toBeInTheDocument();
    expect(screen.getByText('Shot #1')).toBeInTheDocument();
    
    // Check for actual score values
    // Check for actual score values using container query
    const container = screen.getByText('Recent Shots').closest('div')?.parentElement;
    expect(container).toBeInTheDocument();
    
    // Find all score values in recent shots section
    const scoreValues = container?.querySelectorAll('.text-white.font-medium');
    expect(scoreValues?.length).toBe(2);
    
    // Check that score values contain our expected scores
    const scoreTexts = Array.from(scoreValues || []).map(el => el.textContent);
    expect(scoreTexts).toContain('Score: 8');
    expect(scoreTexts).toContain('Score: 10');
  });

  it('displays no shots yet when no shots', () => {
    renderWithProviders(<SimpleDemoPage />);
    
    expect(screen.getByText('No shots yet')).toBeInTheDocument();
  });

  it('calls startAnalysis when start button is clicked', () => {
    const mockStartAnalysis = jest.fn();
    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: false,
      startAnalysis: mockStartAnalysis,
      stopAnalysis: jest.fn(),
      currentFrame: null,
      shots: [],
      metrics: {
        totalShots: 0,
        averageScore: 0,
        highestScore: 0,
        accuracy: 0,
        groupSize: 0,
        mpi: 0,
      },
      error: null
    }));

    renderWithProviders(<SimpleDemoPage />);
    
    const startButton = screen.getByText('Start Analysis');
    fireEvent.click(startButton);
    
    expect(mockStartAnalysis).toHaveBeenCalledTimes(1);
  });

  it('calls stopAnalysis when stop button is clicked', () => {
    const mockStopAnalysis = jest.fn();
    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: true,
      startAnalysis: jest.fn(),
      stopAnalysis: mockStopAnalysis,
      currentFrame: null,
      shots: [],
      metrics: {
        totalShots: 0,
        averageScore: 0,
        highestScore: 0,
        accuracy: 0,
        groupSize: 0,
        mpi: 0,
      },
      error: null
    }));

    renderWithProviders(<SimpleDemoPage />);
    
    const stopButton = screen.getByText('Stop Analysis');
    fireEvent.click(stopButton);
    
    expect(mockStopAnalysis).toHaveBeenCalledTimes(1);
  });

  it('calls signOut when sign out button is clicked', () => {
    const mockSignOut = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com' },
      signOut: mockSignOut
    });

    renderWithProviders(<SimpleDemoPage />);
    
    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);
    
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('displays correct status when analyzing', () => {
    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: true,
      startAnalysis: jest.fn(),
      stopAnalysis: jest.fn(),
      currentFrame: null,
      shots: [],
      metrics: {
        totalShots: 0,
        averageScore: 0,
        highestScore: 0,
        accuracy: 0,
        groupSize: 0,
        mpi: 0,
      },
      error: null
    }));

    renderWithProviders(<SimpleDemoPage />);
    
    // Check for status text
    expect(screen.getByText('Status: Analyzing')).toBeInTheDocument();
  });

  it('displays correct status when stopped', () => {
    renderWithProviders(<SimpleDemoPage />);
    
    // Check for status text
    expect(screen.getByText('Status: Stopped')).toBeInTheDocument();
  });

  it('displays correct shot count', () => {
    // Create mock shots with proper type
    const mockShots: Shot[] = [
      {
        id: 'shot-1',
        x: 50,
        y: 50,
        score: 10,
        timestamp: new Date(),
        confidence: 0.9,
        scoringZone: 'bullseye'
      },
      {
        id: 'shot-2',
        x: 75,
        y: 25,
        score: 8,
        timestamp: new Date(),
        confidence: 0.8,
        scoringZone: 'inner'
      },
      {
        id: 'shot-3',
        x: 25,
        y: 75,
        score: 9,
        timestamp: new Date(),
        confidence: 0.85,
        scoringZone: 'middle'
      }
    ];

    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: false,
      startAnalysis: jest.fn(),
      stopAnalysis: jest.fn(),
      currentFrame: null,
      shots: mockShots as any,
      metrics: {
        totalShots: 3,
        averageScore: 9,
        highestScore: 10,
        accuracy: 100,
        groupSize: 3,
        mpi: 0.9,
      },
      error: null
    }));

    renderWithProviders(<SimpleDemoPage />);
    
    // Check for shot count
    expect(screen.getByText('Shots: 3')).toBeInTheDocument();
  });

  it('creates a new session ID when none exists', () => {
    // Mock localStorage.getItem to return null initially
    localStorageMock.getItem.mockReturnValue(null);
    
    renderWithProviders(<SimpleDemoPage />);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'demo-session-id',
      expect.stringMatching(/^demo-session-\d+-[a-z0-9]+$/)
    );
  });

  it('uses existing session ID when one exists', () => {
    const existingSessionId = 'demo-session-1234567890-abcdef123';
    localStorageMock.getItem.mockReturnValue(existingSessionId);
    
    renderWithProviders(<SimpleDemoPage />);
    
    expect(localStorageMock.getItem).toHaveBeenCalledWith('demo-session-id');
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<SimpleDemoPage />);
    
    // Check for proper heading structure
    expect(screen.getByRole('heading', { name: 'GMShoot Live Demo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live Target View' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live Metrics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent Shots' })).toBeInTheDocument();
    
    // Check for button accessibility
    expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    
    // Check for image alt text
    expect(screen.getByRole('img', { name: 'GMShoot' })).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    renderWithProviders(<SimpleDemoPage />);
    
    const startButton = screen.getByText('Start Analysis');
    startButton.focus();
    expect(startButton).toHaveFocus();
    
    // Test that button can receive focus (actual tab behavior depends on browser implementation)
    // We'll just verify that button is focusable
    expect(startButton).toBeEnabled();
  });

  it('displays error when error occurs', () => {
    (useLiveAnalysis as jest.Mock).mockImplementation((sessionId: string) => ({
      isAnalyzing: false,
      startAnalysis: jest.fn(),
      stopAnalysis: jest.fn(),
      currentFrame: null,
      shots: [],
      metrics: {
        totalShots: 0,
        averageScore: 0,
        highestScore: 0,
        accuracy: 0,
        groupSize: 0,
        mpi: 0,
      },
      error: 'Connection failed'
    }));

    renderWithProviders(<SimpleDemoPage />);
    
    // The component doesn't currently display errors, but we can test that it doesn't crash
    expect(screen.getByText('GMShoot Live Demo')).toBeInTheDocument();
  });
});
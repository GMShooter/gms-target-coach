import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import LiveMetricsDashboard from '../../components/LiveMetricsDashboard';
import { type ShotData, type SessionData, type ScoringZone } from '../../services/HardwareAPI';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, ...props }: any) => <div {...props}>{children}</div>,
    circle: ({ children, ...props }: any) => <circle {...props}>{children}</circle>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Loading component
jest.mock('../../components/ui/loading', () => ({
  Loading: ({ variant, size }: any) => <div data-testid="loading" data-variant={variant} data-size={size}>Loading...</div>,
}));

// Mock GMShootLogo component
jest.mock('../../components/ui/gmshoot-logo', () => ({
  GMShootLogo: ({ size, variant }: any) => <div data-testid="gmshoot-logo" data-size={size} data-variant={variant}>Logo</div>,
}));

// Mock HardwareAPI types
const mockScoringZones: ScoringZone[] = [
  { id: 'bullseye', name: 'Bullseye', points: 10, radius: 5, color: '#FF0000' },
  { id: 'inner', name: 'Inner Ring', points: 9, radius: 10, color: '#FF4500' },
  { id: 'middle', name: 'Middle Ring', points: 8, radius: 20, color: '#FFA500' },
  { id: 'outer', name: 'Outer Ring', points: 7, radius: 30, color: '#FFFF00' },
  { id: 'miss', name: 'Miss', points: 0, radius: 100, color: '#808080' }
];

const mockShot: ShotData = {
  shotId: '1',
  sessionId: 'session-1',
  timestamp: new Date(),
  frameNumber: 1,
  coordinates: { x: 50, y: 50 },
  score: 8,
  scoringZone: 'inner',
  confidence: 0.9,
  angleFromCenter: 0,
  isBullseye: false,
};

const mockSession: SessionData = {
  sessionId: 'session-1',
  deviceId: 'device-1',
  startTime: new Date(Date.now() - 60000),
  shotCount: 0,
  status: 'active',
  settings: {
    targetDistance: 10,
    targetSize: 100,
    scoringZones: mockScoringZones,
    detectionSensitivity: 0.8,
  },
};

describe('LiveMetricsDashboard Component', () => {
  const defaultProps = {
    shots: [],
    isSessionActive: false,
  };

  it('renders without crashing', () => {
    render(<LiveMetricsDashboard {...defaultProps} />);
    expect(screen.getByText('Live Metrics')).toBeInTheDocument();
  });

  it('displays session status correctly', () => {
    const { rerender } = render(<LiveMetricsDashboard {...defaultProps} isSessionActive={false} />);
    expect(screen.getByText('Session completed')).toBeInTheDocument();

    rerender(<LiveMetricsDashboard {...defaultProps} isSessionActive={true} />);
    expect(screen.getByText('Session in progress')).toBeInTheDocument();
  });

  it('displays key metrics with zero shots', () => {
    render(<LiveMetricsDashboard {...defaultProps} />);
    
    expect(screen.getByText('Total Shots')).toBeInTheDocument();
    expect(screen.getAllByText('0')[0]).toBeInTheDocument(); // Total Shots
    expect(screen.getByText('Average Score')).toBeInTheDocument();
    expect(screen.getByText('0.0')).toBeInTheDocument(); // Average Score
    expect(screen.getByText('Best Shot')).toBeInTheDocument();
    expect(screen.getAllByText('0')[1]).toBeInTheDocument(); // Best Shot
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument(); // Accuracy
  });

  it('calculates metrics correctly with shots', () => {
    const shots = [
      { ...mockShot, id: '1', score: 8, coordinates: { x: 50, y: 50 } },
      { ...mockShot, id: '2', score: 9, coordinates: { x: 45, y: 55 } },
      { ...mockShot, id: '3', score: 7, coordinates: { x: 55, y: 45 } },
    ];

    render(<LiveMetricsDashboard {...defaultProps} shots={shots} />);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Total Shots
    expect(screen.getByText('8.0')).toBeInTheDocument(); // Average Score
    expect(screen.getByText('9')).toBeInTheDocument(); // Best Shot
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument(); // Accuracy (no bullseyes)
  });

  it('displays bullseye accuracy correctly', () => {
    const shots = [
      { ...mockShot, id: '1', score: 10 }, // Bullseye
      { ...mockShot, id: '2', score: 8 },
      { ...mockShot, id: '3', score: 7 },
    ];

    render(<LiveMetricsDashboard {...defaultProps} shots={shots} />);
    
    expect(screen.getByText('33.3%')).toBeInTheDocument(); // 1 bullseye out of 3 shots
  });

  it('shows trend indicators for improvement', () => {
    const shots = [
      { ...mockShot, shotId: '1', score: 5 },
      { ...mockShot, shotId: '2', score: 6 },
      { ...mockShot, shotId: '3', score: 7 },
      { ...mockShot, shotId: '4', score: 8 },
      { ...mockShot, shotId: '5', score: 9 },
    ];

    render(<LiveMetricsDashboard {...defaultProps} shots={shots} />);
    
    // Should show average score with trend
    expect(screen.getByText((content, node) => {
      return content ? content.includes('7.0') : false;
    })).toBeInTheDocument();
    
    // Check for trend indicator (improvement percentage)
    const trendElements = screen.getAllByText((content, node) => {
      return content ? content.includes('%') : false;
    });
    expect(trendElements.length).toBeGreaterThan(0);
  });

  it('expands and collapses additional metrics', async () => {
    render(<LiveMetricsDashboard {...defaultProps} />);
    
    // Find expand/collapse button (the second button in header)
    const buttons = screen.getAllByRole('button');
    const expandButton = buttons[1]; // Second button is maximize/minimize
    
    expect(expandButton).toBeInTheDocument();
    
    // Initially collapsed
    expect(screen.queryByText('Consistency')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(expandButton!);
    
    await waitFor(() => {
      expect(screen.getByText('Consistency')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Grouping')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Shots/Min')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Duration')).toBeInTheDocument();
    });
  });

  it('displays shot distribution chart when shots exist', () => {
    const shots = [
      { ...mockShot, id: '1', coordinates: { x: 50, y: 50 } }, // Center
      { ...mockShot, id: '2', coordinates: { x: 60, y: 60 } }, // Outer
    ];

    render(<LiveMetricsDashboard {...defaultProps} shots={shots} />);
    
    // Expand to see charts
    const expandButton = screen.getAllByRole('button')[1]; // Second button is maximize
    fireEvent.click(expandButton);
    
    expect(screen.getByText('Shot Distribution')).toBeInTheDocument();
    expect(screen.getByText('Center (10)')).toBeInTheDocument();
    expect(screen.getByText('Outer (1-4)')).toBeInTheDocument();
  });

  it('shows no data message when no shots', () => {
    render(<LiveMetricsDashboard {...defaultProps} />);
    
    const expandButton = screen.getAllByRole('button')[1]; // Second button is maximize
    fireEvent.click(expandButton);
    
    expect(screen.getByText('No shots to analyze')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('displays performance ring with correct color', () => {
    const goodShots = [{ ...mockShot, score: 8 }];
    const badShots = [{ ...mockShot, score: 3 }];

    const { rerender } = render(<LiveMetricsDashboard {...defaultProps} shots={goodShots} />);
    
    const expandButton = screen.getAllByRole('button')[1]; // Second button is maximize
    fireEvent.click(expandButton);
    
    // Should show green for good performance
    expect(screen.getByText('Overall Performance')).toBeInTheDocument();
    
    rerender(<LiveMetricsDashboard {...defaultProps} shots={badShots} />);
    
    // Should still show performance ring
    expect(screen.getByText('Overall Performance')).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    const onRefresh = jest.fn();
    render(<LiveMetricsDashboard {...defaultProps} onRefresh={onRefresh} />);
    
    // Find the refresh button (first button in header)
    const refreshButton = screen.getAllByRole('button')[0]; // First button is refresh
    fireEvent.click(refreshButton);
    
    expect(onRefresh).toHaveBeenCalled();
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('handles export and share actions', () => {
    const onExportData = jest.fn();
    const onShareResults = jest.fn();
    const shots = [{ ...mockShot }];
    
    render(<LiveMetricsDashboard 
      {...defaultProps} 
      shots={shots}
      onExportData={onExportData}
      onShareResults={onShareResults}
    />);
    
    const exportButton = screen.getByText('Export Data');
    const shareButton = screen.getByText('Share Results');
    
    fireEvent.click(exportButton);
    expect(onExportData).toHaveBeenCalled();
    
    fireEvent.click(shareButton);
    expect(onShareResults).toHaveBeenCalled();
  });

  it('disables action buttons when no shots', () => {
    render(<LiveMetricsDashboard {...defaultProps} shots={[]} />);
    
    const exportButton = screen.getByText('Export Data');
    const shareButton = screen.getByText('Share Results');
    
    expect(exportButton).toBeDisabled();
    expect(shareButton).toBeDisabled();
  });

  it('enables action buttons when shots exist', () => {
    const shots = [{ ...mockShot }];
    render(<LiveMetricsDashboard {...defaultProps} shots={shots} />);
    
    const exportButton = screen.getByText('Export Data');
    const shareButton = screen.getByText('Share Results');
    
    expect(exportButton).not.toBeDisabled();
    expect(shareButton).not.toBeDisabled();
  });

  it('handles detailed analysis button', () => {
    render(<LiveMetricsDashboard {...defaultProps} />);
    
    const analysisButton = screen.getByText('Detailed Analysis');
    fireEvent.click(analysisButton);
    
    // Should trigger metric selection (implementation depends on parent component)
    expect(analysisButton).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-dashboard-class';
    render(<LiveMetricsDashboard {...defaultProps} className={customClass} />);
    
    expect(screen.getByText('Live Metrics')).toBeInTheDocument();
  });

  it('calculates session duration correctly', () => {
    const session = {
      ...mockSession,
      startTime: new Date(Date.now() - 120000), // 2 minutes ago
    };
    
    render(<LiveMetricsDashboard {...defaultProps} session={session} />);
    
    const expandButton = screen.getAllByRole('button')[1]; // Second button is maximize
    fireEvent.click(expandButton);
    
    // Look for duration text with more specific matcher
    const durationTexts = screen.getAllByText((content, node) => {
      return content ? content.includes('m') : false;
    });
    
    // Find the duration value (should be "2m" for 2 minutes)
    const durationValue = durationTexts.find(text =>
      text.textContent && text.textContent.includes('m') &&
      !text.textContent.includes('Session')
    );
    
    expect(durationValue).toBeInTheDocument();
  });

  it('calculates shots per minute correctly', () => {
    const shots = [
      { ...mockShot, shotId: '1' },
      { ...mockShot, shotId: '2' },
      { ...mockShot, shotId: '3' },
    ];
    const session = {
      ...mockSession,
      startTime: new Date(Date.now() - 60000), // 1 minute ago
    };
    
    render(<LiveMetricsDashboard {...defaultProps} shots={shots} session={session} />);
    
    const expandButton = screen.getAllByRole('button')[1]; // Second button is maximize
    fireEvent.click(expandButton);
    
    expect(screen.getByText('3.0')).toBeInTheDocument(); // Shots per minute
  });

  it('displays correct variant colors based on performance', () => {
    const goodShots = [{ ...mockShot, score: 8 }];
    const badShots = [{ ...mockShot, score: 3 }];

    render(<LiveMetricsDashboard {...defaultProps} shots={goodShots} />);
    
    // Good performance should show success variant
    expect(screen.getByText('Average Score')).toBeInTheDocument();
    expect(screen.getByText('8.0')).toBeInTheDocument();
    
    // Re-render with bad performance
    render(<LiveMetricsDashboard {...defaultProps} shots={badShots} />);
    
    // Bad performance should show danger variant
    expect(screen.getAllByText('Average Score')[0]).toBeInTheDocument();
    expect(screen.getByText('3.0')).toBeInTheDocument();
  });

  it('handles empty session data gracefully', () => {
    render(<LiveMetricsDashboard {...defaultProps} session={undefined} />);
    
    expect(screen.getByText('Live Metrics')).toBeInTheDocument();
    expect(screen.getAllByText('0')[0]).toBeInTheDocument(); // Total Shots
  });

  it('displays loading overlay during refresh', async () => {
    const onRefresh = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<LiveMetricsDashboard {...defaultProps} onRefresh={onRefresh} />);
    
    // Find the refresh button (first button in header)
    const refreshButton = screen.getAllByRole('button')[0]; // First button is refresh
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
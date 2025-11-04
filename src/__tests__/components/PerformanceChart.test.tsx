import React from 'react';
import { render, screen } from '@testing-library/react';

import { PerformanceChart } from '../../components/PerformanceChart';

// Mock HTMLCanvasElement and its context
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    scale: jest.fn(),
    measureText: jest.fn(() => ({ width: 50 })),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  })),
});
HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 200,
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  toJSON: jest.fn(),
}));

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 1,
});

describe('PerformanceChart', () => {
  const mockData = [
    {
      timestamp: Date.now() - 5000,
      score: 8.5,
      accuracy: 85,
      grouping: 15.2,
    },
    {
      timestamp: Date.now() - 4000,
      score: 9.0,
      accuracy: 90,
      grouping: 12.8,
    },
    {
      timestamp: Date.now() - 3000,
      score: 8.8,
      accuracy: 88,
      grouping: 14.5,
    },
    {
      timestamp: Date.now() - 2000,
      score: 9.2,
      accuracy: 92,
      grouping: 11.3,
    },
    {
      timestamp: Date.now() - 1000,
      score: 9.5,
      accuracy: 95,
      grouping: 10.1,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PerformanceChart data={mockData} />);
    expect(screen.getByText('Performance Trends')).toBeInTheDocument();
  });

  it('displays custom title when provided', () => {
    render(<PerformanceChart data={mockData} title="Performance Analysis" />);
    expect(screen.getByText('Performance Analysis')).toBeInTheDocument();
  });

  it('displays performance metrics when data is provided', () => {
    render(<PerformanceChart data={mockData} />);
    
    expect(screen.getByText('9.5')).toBeInTheDocument(); // Latest score
    expect(screen.getByText('95.0%')).toBeInTheDocument(); // Latest accuracy
    expect(screen.getByText('10.1mm')).toBeInTheDocument(); // Latest grouping
  });

  it('displays zero values when no data is provided', () => {
    render(<PerformanceChart data={[]} />);
    
    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByText('0.0mm')).toBeInTheDocument();
  });

  it('displays metric labels', () => {
    render(<PerformanceChart data={mockData} />);
    
    expect(screen.getByText('Latest Score')).toBeInTheDocument();
    expect(screen.getByText('Latest Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Latest Grouping')).toBeInTheDocument();
  });

  it('displays card description', () => {
    render(<PerformanceChart data={mockData} />);
    
    expect(screen.getByText('Performance trends over time with score, accuracy, and grouping metrics')).toBeInTheDocument();
  });

  it('renders canvas element', () => {
    render(<PerformanceChart data={mockData} />);
    
    // Check if canvas exists by looking for the element with canvas tag
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('applies custom height when provided', () => {
    render(<PerformanceChart data={mockData} height={300} />);
    
    // eslint-disable-next-line testing-library/no-node-access
    const canvas = document.querySelector('canvas');
    expect(canvas).toHaveStyle('height: 300px');
  });

  it('uses default height when not provided', () => {
    render(<PerformanceChart data={mockData} />);
    
    // eslint-disable-next-line testing-library/no-node-access
    const canvas = document.querySelector('canvas');
    expect(canvas).toHaveStyle('height: 200px');
  });

  it('displays trend indicators when data shows improvement', () => {
    const improvingData = [
      {
        timestamp: Date.now() - 5000,
        score: 7.0,
        accuracy: 70,
        grouping: 20.0,
      },
      {
        timestamp: Date.now() - 4000,
        score: 7.5,
        accuracy: 75,
        grouping: 18.0,
      },
      {
        timestamp: Date.now() - 3000,
        score: 8.0,
        accuracy: 80,
        grouping: 16.0,
      },
      {
        timestamp: Date.now() - 2000,
        score: 8.5,
        accuracy: 85,
        grouping: 14.0,
      },
      {
        timestamp: Date.now() - 1000,
        score: 9.0,
        accuracy: 90,
        grouping: 12.0,
      },
    ];

    render(<PerformanceChart data={improvingData} />);
    
    expect(screen.getByText('Improving')).toBeInTheDocument();
  });

  it('displays trend indicators when data shows decline', () => {
    const decliningData = [
      {
        timestamp: Date.now() - 5000,
        score: 9.0,
        accuracy: 90,
        grouping: 12.0,
      },
      {
        timestamp: Date.now() - 4000,
        score: 8.5,
        accuracy: 85,
        grouping: 14.0,
      },
      {
        timestamp: Date.now() - 3000,
        score: 8.0,
        accuracy: 80,
        grouping: 16.0,
      },
      {
        timestamp: Date.now() - 2000,
        score: 7.5,
        accuracy: 75,
        grouping: 18.0,
      },
      {
        timestamp: Date.now() - 1000,
        score: 7.0,
        accuracy: 70,
        grouping: 20.0,
      },
    ];

    render(<PerformanceChart data={decliningData} />);
    
    expect(screen.getByText('Declining')).toBeInTheDocument();
  });

  it('displays stable trend when data is stable', () => {
    const stableData = [
      {
        timestamp: Date.now() - 5000,
        score: 8.0,
        accuracy: 80,
        grouping: 15.0,
      },
      {
        timestamp: Date.now() - 4000,
        score: 8.1,
        accuracy: 81,
        grouping: 14.9,
      },
      {
        timestamp: Date.now() - 3000,
        score: 7.9,
        accuracy: 79,
        grouping: 15.1,
      },
      {
        timestamp: Date.now() - 2000,
        score: 8.2,
        accuracy: 82,
        grouping: 14.8,
      },
      {
        timestamp: Date.now() - 1000,
        score: 8.0,
        accuracy: 80,
        grouping: 15.0,
      },
    ];

    render(<PerformanceChart data={stableData} />);
    
    expect(screen.getByText('Stable')).toBeInTheDocument();
  });

  it('handles single data point', () => {
    const singleDataPoint = [
      {
        timestamp: Date.now(),
        score: 8.5,
        accuracy: 85,
        grouping: 15.2,
      },
    ];

    render(<PerformanceChart data={singleDataPoint} />);
    
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('85.0%')).toBeInTheDocument();
    expect(screen.getByText('15.2mm')).toBeInTheDocument();
    expect(screen.getByText('Stable')).toBeInTheDocument(); // Single point should show stable
  });

  it('handles empty data array', () => {
    render(<PerformanceChart data={[]} />);
    
    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByText('0.0mm')).toBeInTheDocument();
  });

  it('formats numbers correctly', () => {
    const preciseData = [
      {
        timestamp: Date.now(),
        score: 8.56789,
        accuracy: 85.12345,
        grouping: 15.98765,
      },
    ];

    render(<PerformanceChart data={preciseData} />);
    
    expect(screen.getByText('8.6')).toBeInTheDocument(); // Rounded to 1 decimal
    expect(screen.getByText('85.1%')).toBeInTheDocument(); // Rounded to 1 decimal
    expect(screen.getByText('16.0mm')).toBeInTheDocument(); // Rounded to 1 decimal
  });
});
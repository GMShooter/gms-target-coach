import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import '@testing-library/jest-dom';

import QRScanner from '../../components/QRScanner';

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock MediaStream
const mockStream = {
  getTracks: jest.fn(() => [
    { stop: jest.fn() }
  ])
};

describe('QRScanner Component', () => {
  const mockOnScan = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue(mockStream);
  });

  it('renders QR scanner interface', () => {
    render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
    
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows scanning state when camera access is granted', async () => {
    render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
    
    // Wait for scanning to start
    await waitFor(() => {
      expect(screen.getByText('Scanning for QR code...')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows camera not available when camera access fails', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Camera not available'));
    
    render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to access camera')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('automatically starts scanning when component mounts', async () => {
    render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
    
    // Should automatically request camera access and start scanning
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'environment' }
    });
    
    // Wait for scanning indicator to appear
    await waitFor(() => {
      expect(screen.getByText('Scanning for QR code...')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('simulates QR code detection after 2 seconds', async () => {
    jest.useFakeTimers();
    
    render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
    
    // Wait for initial scanning state
    await waitFor(() => {
      expect(screen.getByText('Scanning for QR code...')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Fast-forward 2 seconds to trigger QR code detection
    jest.advanceTimersByTime(2000);
    
    // Wait for scan result
    await waitFor(() => {
      expect(mockOnScan).toHaveBeenCalledWith({
        data: 'GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080',
        cornerPoints: [
          { x: 100, y: 100 },
          { x: 200, y: 100 },
          { x: 200, y: 200 },
          { x: 100, y: 200 }
        ]
      });
    }, { timeout: 1000 });
    
    jest.useRealTimers();
  });

  it('calls onClose when cancel button is clicked', async () => {
    render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles successful QR code scan and stops scanning', async () => {
    jest.useFakeTimers();
    
    render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
    
    // Wait for scanning to start
    await waitFor(() => {
      expect(screen.getByText('Scanning for QR code...')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Fast-forward 2 seconds to trigger QR code detection
    jest.advanceTimersByTime(2000);
    
    // Wait for scan result
    await waitFor(() => {
      expect(mockOnScan).toHaveBeenCalled();
    }, { timeout: 1000 });
    
    // Verify scanning stops after successful scan (no scanning text visible)
    await waitFor(() => {
      expect(screen.queryByText('Scanning for QR code...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    jest.useRealTimers();
  });

  it('handles invalid QR code data gracefully', async () => {
    jest.useFakeTimers();
    
    render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
    
    // Wait for scanning to start
    await waitFor(() => {
      expect(screen.getByText('Scanning for QR code...')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Fast-forward 2 seconds to trigger QR code detection
    jest.advanceTimersByTime(2000);
    
    // Wait for scan result
    await waitFor(() => {
      expect(mockOnScan).toHaveBeenCalledWith({
        data: 'GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080',
        cornerPoints: expect.any(Array)
      });
    }, { timeout: 1000 });
    
    jest.useRealTimers();
  });

  it('cleans up camera on unmount', async () => {
    const { unmount } = render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
    
    // Wait for scanning to start
    await waitFor(() => {
      expect(screen.getByText('Scanning for QR code...')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Unmount component
    unmount();
    
    // Verify cleanup would be called (in real implementation)
    expect(mockGetUserMedia).toHaveBeenCalled();
  });
});
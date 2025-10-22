import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import Report from '../../components/Report';
import { supabase } from '../../utils/supabase';

// Mock the hooks and supabase
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Report Component', () => {
  const mockReportData = {
    id: 'report-123',
    title: 'Morning Practice Session',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-01-15T10:30:00Z',
    summary: 'Excellent shooting performance with high accuracy and consistency.',
    overall_accuracy: 0.85,
    total_frames: 100,
    successful_detections: 85,
    report_data: {
      strengths: ['Consistent aim', 'Good follow-through', 'Stable stance'],
      areas_for_improvement: ['Slight trigger jerk', 'Breathing control'],
      coaching_advice: 'Focus on smooth trigger pull and maintain steady breathing. Your consistency is excellent.',
      sample_frames: [
        { url: '/frame1.jpg' },
        { url: '/frame2.jpg' },
        { url: '/frame3.jpg' },
        { url: '/frame4.jpg' },
      ]
    },
    share_token: 'token-123',
    is_public: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for useParams
    mockUseParams.mockReturnValue({ id: 'report-123' });

    // Default mock implementation for supabase
    mockSupabase.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: mockReportData,
            error: null,
          })),
        })),
      })),
    })) as any;
  });

  describe('Initial State', () => {
    it('renders loading state initially', () => {
      // Mock a delayed response
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => new Promise(() => {})), // Never resolves
          })),
        })),
      })) as any;

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument(); // Loading spinner
    });
  });

  describe('Report Display', () => {
    it('displays report data when loaded', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Morning Practice Session')).toBeInTheDocument();
        // Use flexible text matcher for broken text elements
        expect(screen.getByText((content, element) => {
          return content.includes('Report ID:') && content.includes('report-123');
        })).toBeInTheDocument();
        // Check for date text that contains the expected date parts (match actual format)
        // Use getAllByText since there are multiple date elements
        const dateElements = screen.getAllByText(/15\.1\.2023/);
        expect(dateElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays performance summary', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Performance Summary')).toBeInTheDocument();
        expect(screen.getByText('Excellent shooting performance with high accuracy and consistency.')).toBeInTheDocument();
        // Use getAllByText for multiple elements with the same text
        const accuracyElements = screen.getAllByText('85.0%');
        expect(accuracyElements.length).toBeGreaterThanOrEqual(2); // At least overall accuracy and detection rate
      });
    });

    it('displays coaching advice', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Coaching Advice')).toBeInTheDocument();
        expect(screen.getByText(/Focus on smooth trigger pull and maintain steady breathing/)).toBeInTheDocument();
      });
    });

    it('displays strengths and areas for improvement', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Strengths')).toBeInTheDocument();
        expect(screen.getByText('Consistent aim')).toBeInTheDocument();
        expect(screen.getByText('Good follow-through')).toBeInTheDocument();
        expect(screen.getByText('Stable stance')).toBeInTheDocument();

        expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
        expect(screen.getByText('Slight trigger jerk')).toBeInTheDocument();
        expect(screen.getByText('Breathing control')).toBeInTheDocument();
      });
    });

    it('displays session statistics', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Session Statistics')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument(); // Total frames
        expect(screen.getByText('85')).toBeInTheDocument(); // Successful detections
        // Use getAllByText for detection rate since there are multiple elements with this text
        const detectionRateElements = screen.getAllByText('85.0%');
        expect(detectionRateElements.length).toBeGreaterThanOrEqual(1); // At least one detection rate element
        expect(screen.getByText('15.1.2023')).toBeInTheDocument(); // Last updated - match actual format
      });
    });

    it('displays sample frames when available', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sample Frames')).toBeInTheDocument();
        const images = screen.getAllByAltText(/Sample frame/);
        expect(images).toHaveLength(4);
      });
    });

    it('displays back button with correct link', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        const backButton = screen.getByText('Back to Reports');
        expect(backButton.closest('a')).toHaveAttribute('href', '/reports');
      });
    });
  });

  describe('Accuracy Color Coding', () => {
    it('displays high accuracy in green', async () => {
      const highAccuracyReport = {
        ...mockReportData,
        overall_accuracy: 0.9,
      };

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: highAccuracyReport,
              error: null,
            })),
          })),
        })),
      })) as any;

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        const accuracyElement = screen.getByText('90.0%');
        expect(accuracyElement).toHaveClass('text-green-400');
      });
    });

    it('displays medium accuracy in yellow', async () => {
      const mediumAccuracyReport = {
        ...mockReportData,
        overall_accuracy: 0.7,
      };

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: mediumAccuracyReport,
              error: null,
            })),
          })),
        })),
      })) as any;

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        const accuracyElement = screen.getByText('70.0%');
        expect(accuracyElement).toHaveClass('text-yellow-400');
      });
    });

    it('displays low accuracy in red', async () => {
      const lowAccuracyReport = {
        ...mockReportData,
        overall_accuracy: 0.5,
      };

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: lowAccuracyReport,
              error: null,
            })),
          })),
        })),
      })) as any;

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        const accuracyElement = screen.getByText('50.0%');
        expect(accuracyElement).toHaveClass('text-red-400');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when report fetch fails', async () => {
      const errorMessage = 'Report not found';
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { message: errorMessage },
            })),
          })),
        })),
      })) as any;

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('displays not found message when report is null', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: null,
            })),
          })),
        })),
      })) as any;

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Not Found')).toBeInTheDocument();
        expect(screen.getByText('The requested report could not be found.')).toBeInTheDocument();
      });
    });

    it('displays not found message when no report ID is provided', async () => {
      mockUseParams.mockReturnValue({ id: undefined });

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Not Found')).toBeInTheDocument();
      });
    });
  });

  describe('Data Processing', () => {
    it('handles missing report_data gracefully', async () => {
      const reportWithoutData = {
        ...mockReportData,
        report_data: null,
      };

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: reportWithoutData,
              error: null,
            })),
          })),
        })),
      })) as any;

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('No advice available.')[0]).toBeInTheDocument();
        expect(screen.getAllByText('None identified.')[0]).toBeInTheDocument();
      });
    });

    it('handles empty arrays in report_data', async () => {
      const reportWithEmptyArrays = {
        ...mockReportData,
        report_data: {
          strengths: [],
          areas_for_improvement: [],
          coaching_advice: '',
        },
      };

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: reportWithEmptyArrays,
              error: null,
            })),
          })),
        })),
      })) as any;

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('None identified.')[0]).toBeInTheDocument();
        expect(screen.getAllByText('No advice available.')[0]).toBeInTheDocument();
      });
    });

    it('calculates detection rate correctly', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        // 85 successful detections out of 100 total frames = 85%
        expect(screen.getAllByText('85.0%')[0]).toBeInTheDocument();
      });
    });

    it('handles zero total frames gracefully', async () => {
      const reportWithZeroFrames = {
        ...mockReportData,
        total_frames: 0,
        successful_detections: 0,
      };

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: reportWithZeroFrames,
              error: null,
            })),
          })),
        })),
      })) as any;

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('0%')[0]).toBeInTheDocument(); // Detection rate
      });
    });
  });

  describe('Data Fetching', () => {
    it('fetches report with correct ID', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('reports');
      });

      const mockSelect = (mockSupabase.from as jest.Mock).mock.results[0].value.select;
      expect(mockSelect).toHaveBeenCalledWith('*');

      await waitFor(() => {
        const mockEq = mockSelect.mock.results[0].value.eq;
        expect(mockEq).toHaveBeenCalledWith('id', 'report-123');
      });
    });

    it('does not fetch when ID is undefined', () => {
      mockUseParams.mockReturnValue({ id: undefined });

      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check for proper heading structure - use more specific queries
        expect(screen.getByRole('heading', { name: 'Morning Practice Session' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Performance Summary' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Coaching Advice' })).toBeInTheDocument();
      });
    });

    it('provides meaningful descriptions', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        // Use a more flexible text matcher for broken text
        expect(screen.getByText((content, element) => {
          return content.includes('Report ID:') && content.includes('report-123');
        })).toBeInTheDocument();
        expect(screen.getByText('Generated by GMShoot AI Analysis')).toBeInTheDocument();
      });
    });

    it('has proper link semantics', async () => {
      render(
        <TestWrapper>
          <Report />
        </TestWrapper>
      );

      await waitFor(() => {
        const backButton = screen.getByText('Back to Reports');
        const link = backButton.closest('a');
        expect(link).toHaveAttribute('href', '/reports');
        // Check that it's a proper link element (anchor tag)
        expect(link?.tagName).toBe('A');
      });
    });
  });
});
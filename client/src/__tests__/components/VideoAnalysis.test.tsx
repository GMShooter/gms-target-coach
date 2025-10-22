import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VideoAnalysis from '../../components/VideoAnalysis';
import { useVideoAnalysis } from '../../hooks/useVideoAnalysis';

// Mock the hook
jest.mock('../../hooks/useVideoAnalysis');
const mockUseVideoAnalysis = useVideoAnalysis as jest.MockedFunction<typeof useVideoAnalysis>;

// Mock file utility
const createMockFile = (name = 'test-video.mp4', type = 'video/mp4') => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: 1024 });
  return file;
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('VideoAnalysis Component', () => {
  const mockUploadVideo = jest.fn();
  const mockProcessVideo = jest.fn();
  const mockTestWithFrames = jest.fn();
  const mockResetState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseVideoAnalysis.mockReturnValue({
      isUploading: false,
      isProcessing: false,
      progress: 0,
      results: [],
      error: null,
      videoFile: null,
      sessionId: null,
      uploadVideo: mockUploadVideo,
      processVideo: mockProcessVideo,
      testWithFrames: mockTestWithFrames,
      resetState: mockResetState,
    });
  });

  describe('Initial State', () => {
    it('renders upload area when no video is loaded', () => {
      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Video Analysis')).toBeInTheDocument();
      expect(screen.getByText('Upload Video')).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop your video file here/)).toBeInTheDocument();
      expect(screen.getByText('Test with Sample Frames')).toBeInTheDocument();
    });

    it('displays supported formats information', () => {
      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Supported formats: MP4, MOV, AVI (Max 100MB)')).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('handles file selection via input', async () => {
      const mockFile = createMockFile();
      mockUploadVideo.mockResolvedValue('session-123');
      mockProcessVideo.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      const fileInput = screen.getByRole('button', { name: /browse/i }).closest('input');
      if (fileInput) {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      }

      await waitFor(() => {
        expect(mockUploadVideo).toHaveBeenCalledWith(mockFile);
      });

      await waitFor(() => {
        expect(mockProcessVideo).toHaveBeenCalledWith('session-123');
      });
    });

    it('handles drag and drop file upload', async () => {
      const mockFile = createMockFile();
      mockUploadVideo.mockResolvedValue('session-123');
      mockProcessVideo.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      const dropArea = screen.getByText(/Drag and drop your video file here/).closest('div');
      
      if (dropArea) {
        fireEvent.dragEnter(dropArea);
        fireEvent.dragOver(dropArea);
        fireEvent.drop(dropArea, {
          dataTransfer: { files: [mockFile] }
        });
      }

      await waitFor(() => {
        expect(mockUploadVideo).toHaveBeenCalledWith(mockFile);
      });
    });

    it('handles upload error gracefully', async () => {
      const mockFile = createMockFile();
      mockUploadVideo.mockResolvedValue(null);

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      const fileInput = screen.getByRole('button', { name: /browse/i }).closest('input');
      if (fileInput) {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      }

      await waitFor(() => {
        expect(mockUploadVideo).toHaveBeenCalledWith(mockFile);
      });

      // Should not call processVideo if upload failed
      expect(mockProcessVideo).not.toHaveBeenCalled();
    });

    it('rejects non-video files', () => {
      const mockFile = createMockFile('test.txt', 'text/plain');

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      const fileInput = screen.getByRole('button', { name: /browse/i }).closest('input');
      if (fileInput) {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      }

      expect(mockUploadVideo).not.toHaveBeenCalled();
    });
  });

  describe('Test with Frames', () => {
    it('handles test with frames button click', async () => {
      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      const testButton = screen.getByText('Test with Sample Frames');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockTestWithFrames).toHaveBeenCalled();
      });
    });
  });

  describe('Upload State', () => {
    it('displays upload progress when uploading', () => {
      mockUseVideoAnalysis.mockReturnValue({
        isUploading: true,
        isProcessing: false,
        progress: 0,
        results: [],
        error: null,
        videoFile: createMockFile(),
        sessionId: null,
        uploadVideo: mockUploadVideo,
        processVideo: mockProcessVideo,
        testWithFrames: mockTestWithFrames,
        resetState: mockResetState,
      });

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Uploading Video')).toBeInTheDocument();
      expect(screen.getByText(/Uploading test-video.mp4\.\.\./)).toBeInTheDocument();
    });
  });

  describe('Processing State', () => {
    it('displays processing progress when processing', () => {
      mockUseVideoAnalysis.mockReturnValue({
        isUploading: false,
        isProcessing: true,
        progress: 45,
        results: [],
        error: null,
        videoFile: createMockFile(),
        sessionId: 'session-123',
        uploadVideo: mockUploadVideo,
        processVideo: mockProcessVideo,
        testWithFrames: mockTestWithFrames,
        resetState: mockResetState,
      });

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Processing Video')).toBeInTheDocument();
      expect(screen.getByText('Analyzing video... 45%')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when error occurs', () => {
      mockUseVideoAnalysis.mockReturnValue({
        isUploading: false,
        isProcessing: false,
        progress: 0,
        results: [],
        error: 'Upload failed',
        videoFile: null,
        sessionId: null,
        uploadVideo: mockUploadVideo,
        processVideo: mockProcessVideo,
        testWithFrames: mockTestWithFrames,
        resetState: mockResetState,
      });

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    const mockResults = [
      {
        id: 'result-1',
        frameNumber: 1,
        timestamp: 0.5,
        accuracy: 85.5,
        confidence: 92.3,
        aimPosition: { x: 100, y: 100 },
        targetPosition: { x: 105, y: 105 },
        imageUrl: '/test-frame-1.png'
      },
      {
        id: 'result-2',
        frameNumber: 2,
        timestamp: 1.0,
        accuracy: 78.2,
        confidence: 88.7,
        aimPosition: { x: 102, y: 98 },
        targetPosition: { x: 105, y: 105 },
        imageUrl: '/test-frame-2.png'
      }
    ];

    it('displays analysis results when available', () => {
      mockUseVideoAnalysis.mockReturnValue({
        isUploading: false,
        isProcessing: false,
        progress: 100,
        results: mockResults,
        error: null,
        videoFile: createMockFile(),
        sessionId: 'session-123',
        uploadVideo: mockUploadVideo,
        processVideo: mockProcessVideo,
        testWithFrames: mockTestWithFrames,
        resetState: mockResetState,
      });

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Analysis Complete')).toBeInTheDocument();
      expect(screen.getByText('Performance Overview')).toBeInTheDocument();
      expect(screen.getByText('81.9%')).toBeInTheDocument(); // Average accuracy
      expect(screen.getByText('90.5%')).toBeInTheDocument(); // Average confidence
      expect(screen.getByText('85.5%')).toBeInTheDocument(); // Best shot
    });

    it('displays frame-by-frame breakdown', () => {
      mockUseVideoAnalysis.mockReturnValue({
        isUploading: false,
        isProcessing: false,
        progress: 100,
        results: mockResults,
        error: null,
        videoFile: createMockFile(),
        sessionId: 'session-123',
        uploadVideo: mockUploadVideo,
        processVideo: mockProcessVideo,
        testWithFrames: mockTestWithFrames,
        resetState: mockResetState,
      });

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      expect(screen.getByText('Frame-by-Frame Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Frame 1')).toBeInTheDocument();
      expect(screen.getByText('Frame 2')).toBeInTheDocument();
      expect(screen.getByAltText('Frame 1')).toBeInTheDocument();
      expect(screen.getByAltText('Frame 2')).toBeInTheDocument();
    });

    it('handles reset button click', () => {
      mockUseVideoAnalysis.mockReturnValue({
        isUploading: false,
        isProcessing: false,
        progress: 100,
        results: mockResults,
        error: null,
        videoFile: createMockFile(),
        sessionId: 'session-123',
        uploadVideo: mockUploadVideo,
        processVideo: mockProcessVideo,
        testWithFrames: mockTestWithFrames,
        resetState: mockResetState,
      });

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      const resetButton = screen.getByText('Analyze Another Video');
      fireEvent.click(resetButton);

      expect(mockResetState).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: 'Video Analysis' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Upload Video' })).toBeInTheDocument();

      // Check for button roles
      expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Test with Sample Frames' })).toBeInTheDocument();
    });

    it('provides meaningful text for screen readers', () => {
      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      // Check for descriptive text
      expect(screen.getByText(/Upload a video of your shooting technique/)).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop your video file here/)).toBeInTheDocument();
      expect(screen.getByText(/Test the analysis pipeline with 5 sample frames/)).toBeInTheDocument();
    });
  });
});
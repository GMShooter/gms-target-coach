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
  // Create a complete mock file object with all required properties
  const file = {
    name,
    type,
    size: 1024,
    lastModified: Date.now(),
    webkitRelativePath: '',
    arrayBuffer: jest.fn(),
    slice: jest.fn(),
    stream: jest.fn(),
    text: jest.fn()
  } as any;
  
  // Make it behave like a File object
  Object.defineProperty(file, 'type', { value: type, writable: false });
  Object.defineProperty(file, 'name', { value: name, writable: false });
  Object.defineProperty(file, 'size', { value: 1024, writable: false });
  
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
      expect(screen.getByText(/Click to browse or drag and drop your video file/)).toBeInTheDocument();
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

      // Find the hidden file input directly
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      
      // Create a proper FileList object
      const fileList = {
        0: mockFile,
        1: null,
        length: 1,
        item: (index: number) => index === 0 ? mockFile : null,
        [Symbol.iterator]: function*() {
          yield mockFile;
        }
      } as any;
      
      // Mock the file input directly since DataTransfer is not available in JSDOM
      Object.defineProperty(fileInput!, 'files', {
        value: fileList,
        writable: false,
        configurable: true,
      });
      
      // Trigger the change event
      fireEvent.change(fileInput!, { target: { files: fileList } });

      await waitFor(() => {
        expect(mockUploadVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'test-video.mp4',
            type: 'video/mp4'
          })
        );
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

      const dropArea = screen.getByText(/Drag and drop your video file here, or/).parentElement;
      
      if (dropArea) {
        // Create a proper FileList object
        const fileList = {
          0: mockFile,
          1: null,
          length: 1,
          item: (index: number) => index === 0 ? mockFile : null,
          [Symbol.iterator]: function*() {
            yield mockFile;
          }
        } as any;
        
        // Create a proper drag event with dataTransfer
        const dataTransfer = {
          files: fileList,
          items: [{
            kind: 'file',
            type: mockFile.type,
            getAsFile: () => mockFile
          }]
        };
        
        fireEvent.dragEnter(dropArea, { dataTransfer });
        fireEvent.dragOver(dropArea, { dataTransfer });
        fireEvent.drop(dropArea, { dataTransfer });
      }

      await waitFor(() => {
        expect(mockUploadVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'test-video.mp4',
            type: 'video/mp4'
          })
        );
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

      // Find the browse button instead
      const browseButton = screen.getByRole('button', { name: /browse/i });
      
      // Create a proper FileList object
      const fileList = {
        0: mockFile,
        1: null,
        length: 1,
        item: (index: number) => index === 0 ? mockFile : null,
        [Symbol.iterator]: function*() {
          yield mockFile;
        }
      } as any;
      
      // Mock the file input directly since DataTransfer is not available in JSDOM
      Object.defineProperty(fileInput!, 'files', {
        value: fileList,
        writable: false,
        configurable: true,
      });
      
      // Trigger the change event
      fireEvent.change(fileInput!, { target: { files: fileList } });

      await waitFor(() => {
        expect(mockUploadVideo).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'test-video.mp4',
            type: 'video/mp4'
          })
        );
      });

      // Should not call processVideo if upload failed
      await waitFor(() => {
        expect(mockProcessVideo).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('rejects non-video files', () => {
      const mockFile = createMockFile('test.txt', 'text/plain');

      render(
        <TestWrapper>
          <VideoAnalysis />
        </TestWrapper>
      );

      // Find the browse button instead
      const browseButton = screen.getByRole('button', { name: /browse/i });
      
      // Create a proper FileList object
      const fileList = {
        0: mockFile,
        1: null,
        length: 1,
        item: (index: number) => index === 0 ? mockFile : null,
        [Symbol.iterator]: function*() {
          yield mockFile;
        }
      } as any;
      
      // Mock the file input directly since DataTransfer is not available in JSDOM
      Object.defineProperty(fileInput!, 'files', {
        value: fileList,
        writable: false,
        configurable: true,
      });
      
      // Trigger the change event
      fireEvent.change(fileInput!, { target: { files: fileList } });

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
      expect(screen.getByText('81.8%')).toBeInTheDocument(); // Average accuracy
      expect(screen.getByText('90.5%')).toBeInTheDocument(); // Average confidence
      // Use getAllByText for 85.5% since it appears twice
      expect(screen.getAllByText('85.5%')).toHaveLength(2); // Best shot (appears in overview and frame details)
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
      expect(screen.getByText(/Click to browse or drag and drop your video file/)).toBeInTheDocument();
      expect(screen.getByText(/Test the analysis pipeline with 5 sample frames/)).toBeInTheDocument();
    });
  });
});
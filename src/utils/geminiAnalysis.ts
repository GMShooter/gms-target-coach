
// Gemini 2.5 Flash integration utilities for shot analysis
// This would be used in production to connect to the actual Gemini API

export interface ShotAnalysisRequest {
  imageData: string; // Base64 encoded image
  frameType: 'single' | 'sequence';
  previousShots?: Shot[];
}

export interface Shot {
  id: number;
  x: number;
  y: number;
  score: number;
  ring: string;
  direction: string;
  comment: string;
  timestamp: number;
}

export interface GeminiAnalysisResponse {
  shots: Shot[];
  confidence: number;
  processingTime: number;
}

/**
 * Optimized frame sampling for real-time analysis
 * Reduces API calls by only sending frames when motion is detected
 */
export const shouldSampleFrame = (
  currentFrame: ImageData,
  previousFrame: ImageData | null,
  motionThreshold = 0.1
): boolean => {
  if (!previousFrame) return true;
  
  // Simple motion detection algorithm
  const pixelDiff = calculatePixelDifference(currentFrame, previousFrame);
  return pixelDiff > motionThreshold;
};

/**
 * Calculate pixel difference between two frames
 */
const calculatePixelDifference = (frame1: ImageData, frame2: ImageData): number => {
  if (frame1.data.length !== frame2.data.length) return 1;
  
  let totalDiff = 0;
  const pixelCount = frame1.data.length / 4;
  
  for (let i = 0; i < frame1.data.length; i += 4) {
    const r1 = frame1.data[i], g1 = frame1.data[i + 1], b1 = frame1.data[i + 2];
    const r2 = frame2.data[i], g2 = frame2.data[i + 1], b2 = frame2.data[i + 2];
    
    const diff = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
    totalDiff += diff / (255 * Math.sqrt(3)); // Normalize to 0-1
  }
  
  return totalDiff / pixelCount;
};

/**
 * Prepare image data for Gemini API
 * Optimizes image size and quality for API efficiency
 */
export const prepareImageForAPI = (canvas: HTMLCanvasElement): string => {
  // Resize if needed to optimize for API
  const maxWidth = 1024;
  const maxHeight = 768;
  
  if (canvas.width > maxWidth || canvas.height > maxHeight) {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/jpeg', 0.7);
    
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    tempCanvas.width = canvas.width * ratio;
    tempCanvas.height = canvas.height * ratio;
    
    ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    return tempCanvas.toDataURL('image/jpeg', 0.7);
  }
  
  return canvas.toDataURL('image/jpeg', 0.7);
};

/**
 * Batch multiple shots for efficient API usage
 */
export const batchShotsForAnalysis = (
  frames: string[],
  maxBatchSize = 10
): string[][] => {
  const batches: string[][] = [];
  for (let i = 0; i < frames.length; i += maxBatchSize) {
    batches.push(frames.slice(i, i + maxBatchSize));
  }
  return batches;
};

/**
 * Mock Gemini API call for development
 * In production, this would call the actual Gemini 2.5 Flash API
 */
export const analyzeShots = async (
  request: ShotAnalysisRequest
): Promise<GeminiAnalysisResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Mock response - in production this would parse actual Gemini response
  const mockShot: Shot = {
    id: Date.now(),
    x: (Math.random() - 0.5) * 60,
    y: (Math.random() - 0.5) * 60,
    score: Math.floor(Math.random() * 4) + 7,
    ring: String(Math.floor(Math.random() * 4) + 7),
    direction: ['Centered', 'Too left', 'Too right', 'Too high', 'Too low'][
      Math.floor(Math.random() * 5)
    ],
    comment: 'AI-detected shot',
    timestamp: Date.now()
  };
  
  return {
    shots: [mockShot],
    confidence: 0.85 + Math.random() * 0.15,
    processingTime: 200 + Math.random() * 300
  };
};

/**
 * Video processing for uploaded .mp4 files
 * Extracts frames around shot events for analysis
 */
export const processUploadedVideo = async (
  videoFile: File
): Promise<string[]> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Extract frames at intervals (would be more sophisticated in production)
      const frames: string[] = [];
      const frameInterval = video.duration / 10; // Extract 10 frames
      
      let currentTime = 0;
      const extractFrame = () => {
        if (currentTime >= video.duration || !ctx) {
          resolve(frames);
          return;
        }
        
        video.currentTime = currentTime;
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0);
          frames.push(canvas.toDataURL('image/jpeg', 0.8));
          currentTime += frameInterval;
          setTimeout(extractFrame, 100);
        };
      };
      
      extractFrame();
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
};

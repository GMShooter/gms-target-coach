
export interface DetectedShot {
  frameNumber: number;
  timestamp: number;
  keyFrame: string; // base64 image data
  confidenceScore: number;
}

export interface FrameDifferenceConfig {
  motionThreshold: number;
  minTimeBetweenShots: number; // seconds
  maxShots: number;
}

/**
 * Performs visual shot detection using frame differencing
 * Only extracts key frames where new shots appear
 */
export const detectShotsVisually = async (
  videoFile: File,
  config: FrameDifferenceConfig = {
    motionThreshold: 0.15, // 15% pixel change threshold
    minTimeBetweenShots: 0.5, // minimum 0.5s between shots
    maxShots: 50
  }
): Promise<DetectedShot[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const detectedShots: DetectedShot[] = [];
    let previousFrameData: ImageData | null = null;
    let frameNumber = 0;
    let lastShotTimestamp = -999;

    video.onloadedmetadata = () => {
      // Optimize canvas size for detection
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.min(video.videoHeight, 480);
      
      const duration = video.duration;
      const frameRate = 10; // Sample at 10 FPS for detection
      const frameInterval = 1 / frameRate;
      const totalFrames = Math.floor(duration * frameRate);
      
      console.log(`Visual shot detection: analyzing ${totalFrames} frames at ${frameRate} FPS`);
      
      let currentTime = 0;
      
      const processNextFrame = () => {
        if (currentTime >= duration || detectedShots.length >= config.maxShots) {
          console.log(`Shot detection complete: ${detectedShots.length} shots detected`);
          resolve(detectedShots);
          return;
        }
        
        video.currentTime = currentTime;
        
        video.onseeked = () => {
          // Draw current frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const currentFrameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          if (previousFrameData) {
            // Calculate pixel difference
            const pixelDifference = calculatePixelDifference(currentFrameData, previousFrameData);
            const confidenceScore = Math.min(pixelDifference / config.motionThreshold, 1.0);
            
            // Check if this represents a new shot
            const timeSinceLastShot = currentTime - lastShotTimestamp;
            const isSignificantChange = pixelDifference > config.motionThreshold;
            const isMinTimeElapsed = timeSinceLastShot > config.minTimeBetweenShots;
            
            if (isSignificantChange && isMinTimeElapsed) {
              // Capture the key frame with higher quality
              const keyFrameCanvas = document.createElement('canvas');
              const keyFrameCtx = keyFrameCanvas.getContext('2d');
              
              if (keyFrameCtx) {
                keyFrameCanvas.width = Math.min(video.videoWidth, 800);
                keyFrameCanvas.height = Math.min(video.videoHeight, 600);
                keyFrameCtx.drawImage(video, 0, 0, keyFrameCanvas.width, keyFrameCanvas.height);
                
                const keyFrame = keyFrameCanvas.toDataURL('image/jpeg', 0.8);
                
                detectedShots.push({
                  frameNumber,
                  timestamp: parseFloat(currentTime.toFixed(3)),
                  keyFrame,
                  confidenceScore
                });
                
                lastShotTimestamp = currentTime;
                console.log(`Shot detected at ${currentTime.toFixed(2)}s (confidence: ${(confidenceScore * 100).toFixed(1)}%)`);
              }
            }
          }
          
          previousFrameData = currentFrameData;
          frameNumber++;
          currentTime += frameInterval;
          
          setTimeout(processNextFrame, 50); // Small delay for processing
        };
      };
      
      processNextFrame();
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for shot detection'));
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
};

/**
 * Calculate pixel difference between two frames
 */
const calculatePixelDifference = (frame1: ImageData, frame2: ImageData): number => {
  if (frame1.data.length !== frame2.data.length) return 1;
  
  let totalDiff = 0;
  const pixelCount = frame1.data.length / 4;
  
  // Focus on target area (center region where shots typically appear)
  const width = Math.sqrt(frame1.data.length / 4);
  const height = width;
  const centerX = width / 2;
  const centerY = height / 2;
  const targetRadius = Math.min(width, height) * 0.3; // Focus on center 30%
  
  for (let i = 0; i < frame1.data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    
    // Calculate distance from center
    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    
    // Weight pixels closer to center more heavily
    const weight = distanceFromCenter <= targetRadius ? 2.0 : 0.5;
    
    const r1 = frame1.data[i], g1 = frame1.data[i + 1], b1 = frame1.data[i + 2];
    const r2 = frame2.data[i], g2 = frame2.data[i + 1], b2 = frame2.data[i + 2];
    
    const diff = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
    totalDiff += (diff / (255 * Math.sqrt(3))) * weight;
  }
  
  return totalDiff / pixelCount;
};


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
  roiCenterX?: number; // ROI center as percentage of frame width
  roiCenterY?: number; // ROI center as percentage of frame height
  roiWidth?: number; // ROI width as percentage of frame width
  roiHeight?: number; // ROI height as percentage of frame height
}

/**
 * ViBe-inspired visual shot detection with ROI focus
 * Detects new bullet holes appearing on white paper targets
 */
export const detectShotsVisually = async (
  videoFile: File,
  config: FrameDifferenceConfig = {
    motionThreshold: 0.08, // 8% pixel change threshold
    minTimeBetweenShots: 0.3, // minimum 300ms between shots
    maxShots: 30,
    roiCenterX: 0.5, // Center of frame
    roiCenterY: 0.5, // Center of frame
    roiWidth: 0.6, // 60% of frame width
    roiHeight: 0.6 // 60% of frame height
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

    console.log('🎯 Initializing robust ViBe-inspired shot detection...');
    
    const detectedShots: DetectedShot[] = [];
    let backgroundModel: ImageData | null = null;
    let frameNumber = 0;
    let lastShotTimestamp = -999;
    let backgroundInitialized = false;

    video.onloadedmetadata = () => {
      // Optimize canvas size for detection
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.min(video.videoHeight, 480);
      
      const duration = video.duration;
      const frameRate = 8; // 8 FPS for better detection
      const frameInterval = 1 / frameRate;
      const totalFrames = Math.floor(duration * frameRate);
      
      console.log(`📊 ViBe Detection Setup: ${totalFrames} frames at ${frameRate} FPS from ${duration}s video`);
      console.log(`🎯 ROI Configuration: center(${config.roiCenterX! * 100}%, ${config.roiCenterY! * 100}%), size(${config.roiWidth! * 100}% x ${config.roiHeight! * 100}%)`);
      
      // Calculate ROI boundaries
      const roiLeft = Math.floor((config.roiCenterX! - config.roiWidth! / 2) * canvas.width);
      const roiTop = Math.floor((config.roiCenterY! - config.roiHeight! / 2) * canvas.height);
      const roiWidth = Math.floor(config.roiWidth! * canvas.width);
      const roiHeight = Math.floor(config.roiHeight! * canvas.height);
      
      console.log(`🔍 ROI Bounds: x=${roiLeft}, y=${roiTop}, w=${roiWidth}, h=${roiHeight}`);
      
      let currentTime = 0;
      let backgroundFramesCount = 0;
      const backgroundFramesNeeded = 3; // Initialize background over first 3 frames
      
      const processNextFrame = () => {
        if (currentTime >= duration || detectedShots.length >= config.maxShots) {
          console.log(`✅ ViBe detection complete: ${detectedShots.length} shots detected from ${frameNumber} frames`);
          resolve(detectedShots);
          return;
        }
        
        video.currentTime = currentTime;
        
        video.onseeked = () => {
          // Draw current frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const currentFrameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Initialize background model with first few frames
          if (!backgroundInitialized) {
            if (backgroundFramesCount < backgroundFramesNeeded) {
              if (backgroundModel === null) {
                backgroundModel = ctx.createImageData(canvas.width, canvas.height);
                // Copy current frame as initial background
                for (let i = 0; i < currentFrameData.data.length; i++) {
                  backgroundModel.data[i] = currentFrameData.data[i];
                }
                console.log(`🏗️ Initializing background model with frame ${frameNumber}`);
              } else {
                // Update background model (simple averaging)
                updateBackgroundModel(backgroundModel, currentFrameData, 0.1);
                console.log(`🔄 Updating background model with frame ${frameNumber}`);
              }
              backgroundFramesCount++;
            } else {
              backgroundInitialized = true;
              console.log(`✅ Background model initialized over ${backgroundFramesNeeded} frames`);
            }
          } else {
            // Perform ROI-based shot detection
            const roiChangeScore = calculateROIChange(
              currentFrameData, backgroundModel!, 
              roiLeft, roiTop, roiWidth, roiHeight
            );
            
            const timeSinceLastShot = currentTime - lastShotTimestamp;
            const isSignificantChange = roiChangeScore > config.motionThreshold;
            const isMinTimeElapsed = timeSinceLastShot > config.minTimeBetweenShots;
            
            console.log(`🔍 Frame ${frameNumber} (t=${currentTime.toFixed(2)}s): ROI change=${(roiChangeScore * 100).toFixed(1)}%, threshold=${(config.motionThreshold * 100).toFixed(1)}%`);
            
            if (isSignificantChange && isMinTimeElapsed) {
              // Apply morphological noise reduction
              const cleanedChange = applyMorphologicalFiltering(
                currentFrameData, backgroundModel!, 
                roiLeft, roiTop, roiWidth, roiHeight, config.motionThreshold
              );
              
              if (cleanedChange.significantBlobDetected) {
                // Capture high-quality key frame
                const keyFrameCanvas = document.createElement('canvas');
                const keyFrameCtx = keyFrameCanvas.getContext('2d');
                
                if (keyFrameCtx) {
                  keyFrameCanvas.width = Math.min(video.videoWidth, 800);
                  keyFrameCanvas.height = Math.min(video.videoHeight, 600);
                  keyFrameCtx.drawImage(video, 0, 0, keyFrameCanvas.width, keyFrameCanvas.height);
                  
                  const keyFrame = keyFrameCanvas.toDataURL('image/jpeg', 0.85);
                  
                  detectedShots.push({
                    frameNumber,
                    timestamp: parseFloat(currentTime.toFixed(3)),
                    keyFrame,
                    confidenceScore: Math.min(roiChangeScore / config.motionThreshold, 1.0)
                  });
                  
                  lastShotTimestamp = currentTime;
                  console.log(`🎯 Shot #${detectedShots.length} detected at ${currentTime.toFixed(2)}s (confidence: ${(cleanedChange.confidenceScore * 100).toFixed(1)}%)`);
                  
                  // Update background model slightly after shot detection
                  updateBackgroundModel(backgroundModel!, currentFrameData, 0.05);
                }
              } else {
                console.log(`📏 Frame ${frameNumber}: Change detected but filtered out as noise`);
              }
            } else if (isSignificantChange) {
              console.log(`⏱️ Frame ${frameNumber}: Change detected but too soon after last shot (${timeSinceLastShot.toFixed(2)}s < ${config.minTimeBetweenShots}s)`);
            }
            
            // Gradually update background for static elements
            if (!isSignificantChange) {
              updateBackgroundModel(backgroundModel!, currentFrameData, 0.02);
            }
          }
          
          frameNumber++;
          currentTime += frameInterval;
          
          setTimeout(processNextFrame, 50); // Process next frame
        };
      };
      
      processNextFrame();
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for ViBe shot detection'));
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
};

/**
 * Calculate pixel change within Region of Interest (ROI)
 */
const calculateROIChange = (
  currentFrame: ImageData, 
  backgroundModel: ImageData, 
  roiX: number, 
  roiY: number, 
  roiWidth: number, 
  roiHeight: number
): number => {
  let totalDiff = 0;
  let pixelCount = 0;
  
  const frameWidth = currentFrame.width;
  
  for (let y = roiY; y < roiY + roiHeight; y++) {
    for (let x = roiX; x < roiX + roiWidth; x++) {
      if (x >= 0 && x < frameWidth && y >= 0 && y < currentFrame.height) {
        const pixelIndex = (y * frameWidth + x) * 4;
        
        const r1 = currentFrame.data[pixelIndex];
        const g1 = currentFrame.data[pixelIndex + 1];
        const b1 = currentFrame.data[pixelIndex + 2];
        
        const r2 = backgroundModel.data[pixelIndex];
        const g2 = backgroundModel.data[pixelIndex + 1];
        const b2 = backgroundModel.data[pixelIndex + 2];
        
        // Focus on detecting dark holes on light background
        const currentBrightness = (r1 + g1 + b1) / 3;
        const backgroundBrightness = (r2 + g2 + b2) / 3;
        const brightnessDiff = Math.abs(currentBrightness - backgroundBrightness);
        
        // Weight darker changes more heavily (bullet holes)
        const weight = currentBrightness < backgroundBrightness ? 2.0 : 1.0;
        
        totalDiff += (brightnessDiff / 255) * weight;
        pixelCount++;
      }
    }
  }
  
  return pixelCount > 0 ? totalDiff / pixelCount : 0;
};

/**
 * Apply morphological filtering to reduce noise and detect coherent blobs
 */
const applyMorphologicalFiltering = (
  currentFrame: ImageData,
  backgroundModel: ImageData,
  roiX: number,
  roiY: number,
  roiWidth: number,
  roiHeight: number,
  threshold: number
): { significantBlobDetected: boolean; confidenceScore: number } => {
  const frameWidth = currentFrame.width;
  const changedPixels: boolean[] = [];
  let totalChangedPixels = 0;
  
  // Create binary mask of changed pixels
  for (let y = roiY; y < roiY + roiHeight; y++) {
    for (let x = roiX; x < roiX + roiWidth; x++) {
      const localIndex = (y - roiY) * roiWidth + (x - roiX);
      
      if (x >= 0 && x < frameWidth && y >= 0 && y < currentFrame.height) {
        const pixelIndex = (y * frameWidth + x) * 4;
        
        const currentBrightness = (currentFrame.data[pixelIndex] + currentFrame.data[pixelIndex + 1] + currentFrame.data[pixelIndex + 2]) / 3;
        const backgroundBrightness = (backgroundModel.data[pixelIndex] + backgroundModel.data[pixelIndex + 1] + backgroundModel.data[pixelIndex + 2]) / 3;
        
        const change = Math.abs(currentBrightness - backgroundBrightness) / 255;
        const isChanged = change > threshold && currentBrightness < backgroundBrightness - 20; // Dark hole detection
        
        changedPixels[localIndex] = isChanged;
        if (isChanged) totalChangedPixels++;
      } else {
        changedPixels[localIndex] = false;
      }
    }
  }
  
  // Simple blob size filtering
  const minBlobSize = 8; // Minimum 8 pixels for a bullet hole
  const maxBlobSize = roiWidth * roiHeight * 0.1; // Maximum 10% of ROI
  
  const significantBlobDetected = totalChangedPixels >= minBlobSize && totalChangedPixels <= maxBlobSize;
  const confidenceScore = Math.min(totalChangedPixels / (minBlobSize * 2), 1.0);
  
  return { significantBlobDetected, confidenceScore };
};

/**
 * Update background model using exponential moving average
 */
const updateBackgroundModel = (
  backgroundModel: ImageData,
  currentFrame: ImageData,
  learningRate: number
): void => {
  for (let i = 0; i < backgroundModel.data.length; i += 4) {
    // Update RGB channels (skip alpha)
    for (let c = 0; c < 3; c++) {
      backgroundModel.data[i + c] = backgroundModel.data[i + c] * (1 - learningRate) + 
                                   currentFrame.data[i + c] * learningRate;
    }
  }
};

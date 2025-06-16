
interface FramePair {
  image1Data: string;
  image2Data: string;
  timestamp: number;
  frameNumber: number;
}

export const detectShotKeyframes = async (videoFile: File): Promise<FramePair[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    
    const framePairs: FramePair[] = [];
    let previousImageData: ImageData | null = null;
    let frameNumber = 0;
    const SAMPLE_RATE = 3; // Sample every 3rd frame for better detection
    const CHANGE_THRESHOLD = 0.008; // Lower threshold for more sensitive detection
    const MIN_CHANGE_INTERVAL = 0.5; // Minimum seconds between detected changes
    let lastChangeTime = 0;
    
    video.onloadedmetadata = () => {
      canvas.width = 320; // Smaller resolution for faster processing
      canvas.height = (video.videoHeight / video.videoWidth) * 320;
      
      const processFrame = () => {
        if (video.currentTime >= video.duration) {
          console.log(`Shot detection complete: ${framePairs.length} key moments identified`);
          URL.revokeObjectURL(video.src);
          resolve(framePairs);
          return;
        }

        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (previousImageData && frameNumber % SAMPLE_RATE === 0) {
          // Calculate difference between frames with improved algorithm
          const pixelDifference = calculateEnhancedPixelDifference(previousImageData, currentImageData);
          
          // Check if enough time has passed since last change and if change is significant
          if (pixelDifference > CHANGE_THRESHOLD && 
              (video.currentTime - lastChangeTime) > MIN_CHANGE_INTERVAL) {
            
            // Significant change detected - capture before/after pair
            const beforeCanvas = document.createElement('canvas');
            const afterCanvas = document.createElement('canvas');
            beforeCanvas.width = afterCanvas.width = canvas.width;
            beforeCanvas.height = afterCanvas.height = canvas.height;
            
            const beforeCtx = beforeCanvas.getContext('2d');
            const afterCtx = afterCanvas.getContext('2d');
            
            if (beforeCtx && afterCtx) {
              // Reconstruct the previous frame
              beforeCtx.putImageData(previousImageData, 0, 0);
              // Current frame is already on main canvas
              afterCtx.putImageData(currentImageData, 0, 0);
              
              framePairs.push({
                image1Data: beforeCanvas.toDataURL('image/jpeg', 0.7),
                image2Data: afterCanvas.toDataURL('image/jpeg', 0.7),
                timestamp: video.currentTime,
                frameNumber: frameNumber
              });
              
              lastChangeTime = video.currentTime;
              console.log(`Change detected at ${video.currentTime.toFixed(2)}s (frame ${frameNumber}) - diff: ${(pixelDifference * 100).toFixed(2)}%`);
            }
          }
        }
        
        previousImageData = currentImageData;
        frameNumber++;
        
        // Advance to next frame (faster sampling rate)
        video.currentTime += 1/15; // 15 FPS sampling for better coverage
        setTimeout(processFrame, 5);
      };
      
      processFrame();
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for shot detection'));
    };
  });
};

const calculateEnhancedPixelDifference = (imageData1: ImageData, imageData2: ImageData): number => {
  const data1 = imageData1.data;
  const data2 = imageData2.data;
  let totalDifference = 0;
  let significantChanges = 0;
  
  // Sample every 8th pixel for performance, but with smarter difference calculation
  for (let i = 0; i < data1.length; i += 32) {
    const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
    const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
    
    // Calculate luminance difference (more sensitive to meaningful changes)
    const lum1 = 0.299 * r1 + 0.587 * g1 + 0.114 * b1;
    const lum2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
    const lumDiff = Math.abs(lum1 - lum2);
    
    totalDifference += lumDiff;
    
    // Count significant pixel changes (helps detect new holes)
    if (lumDiff > 30) {
      significantChanges++;
    }
  }
  
  const avgDifference = totalDifference / (data1.length * 255 * 0.25);
  const significantRatio = significantChanges / (data1.length * 0.25);
  
  // Combine average difference with significant change ratio for better detection
  return avgDifference * 0.7 + significantRatio * 0.3;
};

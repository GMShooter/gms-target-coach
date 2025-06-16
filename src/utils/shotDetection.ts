
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
    const SAMPLE_RATE = 2; // More frequent sampling for better detection
    const CHANGE_THRESHOLD = 0.005; // More sensitive threshold
    const MIN_CHANGE_INTERVAL = 0.3; // Shorter minimum interval
    const MAX_PAIRS = 20; // Limit number of pairs to avoid overwhelming AI
    let lastChangeTime = 0;
    
    // Smoothing buffer for noise reduction
    const historyBuffer: number[] = [];
    const HISTORY_SIZE = 3;
    
    video.onloadedmetadata = () => {
      canvas.width = 480; // Higher resolution for better detection
      canvas.height = (video.videoHeight / video.videoWidth) * 480;
      
      const processFrame = () => {
        if (video.currentTime >= video.duration || framePairs.length >= MAX_PAIRS) {
          console.log(`Shot detection complete: ${framePairs.length} key moments identified`);
          URL.revokeObjectURL(video.src);
          resolve(framePairs);
          return;
        }

        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (previousImageData && frameNumber % SAMPLE_RATE === 0) {
          // Calculate difference with improved algorithm
          const pixelDifference = calculateAdvancedPixelDifference(previousImageData, currentImageData);
          
          // Add to smoothing buffer
          historyBuffer.push(pixelDifference);
          if (historyBuffer.length > HISTORY_SIZE) {
            historyBuffer.shift();
          }
          
          // Calculate smoothed difference
          const smoothedDifference = historyBuffer.reduce((sum, val) => sum + val, 0) / historyBuffer.length;
          
          // Detect significant changes with temporal consistency
          const isSignificantChange = smoothedDifference > CHANGE_THRESHOLD;
          const hasTimeGap = (video.currentTime - lastChangeTime) > MIN_CHANGE_INTERVAL;
          const isIncreasingChange = historyBuffer.length >= 2 && 
            historyBuffer[historyBuffer.length - 1] > historyBuffer[historyBuffer.length - 2];
          
          if (isSignificantChange && hasTimeGap && (isIncreasingChange || historyBuffer.length < 2)) {
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
                image1Data: beforeCanvas.toDataURL('image/jpeg', 0.8),
                image2Data: afterCanvas.toDataURL('image/jpeg', 0.8),
                timestamp: video.currentTime,
                frameNumber: frameNumber
              });
              
              lastChangeTime = video.currentTime;
              console.log(`Change detected at ${video.currentTime.toFixed(2)}s (frame ${frameNumber}) - smoothed diff: ${(smoothedDifference * 100).toFixed(3)}%`);
            }
          }
        }
        
        previousImageData = currentImageData;
        frameNumber++;
        
        // Dynamic frame advance based on video duration
        const videoDuration = video.duration;
        const targetFrameRate = videoDuration > 30 ? 8 : videoDuration > 10 ? 12 : 15;
        video.currentTime += 1 / targetFrameRate;
        
        setTimeout(processFrame, 3); // Slightly faster processing
      };
      
      processFrame();
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for shot detection'));
    };
  });
};

const calculateAdvancedPixelDifference = (imageData1: ImageData, imageData2: ImageData): number => {
  const data1 = imageData1.data;
  const data2 = imageData2.data;
  let totalDifference = 0;
  let significantChanges = 0;
  let edgeChanges = 0;
  const pixelCount = data1.length / 4;
  
  const width = imageData1.width;
  const height = imageData1.height;
  
  // Multi-scale analysis with edge detection
  for (let i = 0; i < data1.length; i += 16) { // Sample every 4th pixel for performance
    const pixelIndex = Math.floor(i / 4);
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    
    const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
    const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
    
    // Calculate luminance difference (more sensitive to meaningful changes)
    const lum1 = 0.299 * r1 + 0.587 * g1 + 0.114 * b1;
    const lum2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
    const lumDiff = Math.abs(lum1 - lum2);
    
    // Calculate color difference for better bullet hole detection
    const colorDiff = Math.sqrt(
      Math.pow(r1 - r2, 2) + 
      Math.pow(g1 - g2, 2) + 
      Math.pow(b1 - b2, 2)
    ) / Math.sqrt(3 * 255 * 255);
    
    totalDifference += lumDiff + (colorDiff * 100);
    
    // Detect significant pixel changes (helps detect new holes)
    if (lumDiff > 25 || colorDiff > 0.15) {
      significantChanges++;
      
      // Check if change is near edges (more likely to be bullet impacts)
      const isNearCenter = Math.abs(x - width/2) < width/4 && Math.abs(y - height/2) < height/4;
      if (isNearCenter) {
        edgeChanges++;
      }
    }
  }
  
  const sampledPixels = data1.length / 16;
  const avgDifference = totalDifference / (sampledPixels * 255);
  const significantRatio = significantChanges / sampledPixels;
  const edgeRatio = edgeChanges / sampledPixels;
  
  // Weighted combination focusing on center area changes
  return avgDifference * 0.4 + significantRatio * 0.4 + edgeRatio * 0.2;
};

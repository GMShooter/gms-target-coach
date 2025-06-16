
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
    const SAMPLE_RATE = 5; // Sample every 5th frame for change detection
    const CHANGE_THRESHOLD = 0.02; // 2% difference threshold
    
    video.onloadedmetadata = () => {
      canvas.width = 640; // Standardized width for analysis
      canvas.height = (video.videoHeight / video.videoWidth) * 640;
      
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
          // Calculate difference between frames
          const pixelDifference = calculatePixelDifference(previousImageData, currentImageData);
          
          if (pixelDifference > CHANGE_THRESHOLD) {
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
              
              console.log(`Change detected at ${video.currentTime.toFixed(2)}s (frame ${frameNumber})`);
            }
          }
        }
        
        previousImageData = currentImageData;
        frameNumber++;
        
        // Advance to next frame
        video.currentTime += 1/30; // 30 FPS sampling
        setTimeout(processFrame, 10);
      };
      
      processFrame();
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for shot detection'));
    };
  });
};

const calculatePixelDifference = (imageData1: ImageData, imageData2: ImageData): number => {
  const data1 = imageData1.data;
  const data2 = imageData2.data;
  let totalDifference = 0;
  
  // Sample every 4th pixel for performance (skip alpha channel)
  for (let i = 0; i < data1.length; i += 16) {
    const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
    const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
    
    totalDifference += Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
  }
  
  return totalDifference / (data1.length * 255 * 0.75); // Normalize to 0-1 range
};

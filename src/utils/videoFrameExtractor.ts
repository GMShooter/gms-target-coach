
export interface ExtractedFrame {
  imageData: string; // base64 encoded
  timestamp: number; // in seconds
  frameNumber: number;
}

export const extractFramesAtFPS = async (
  videoFile: File, 
  targetFPS: number = 8 // Reduced to 8 FPS for better performance
): Promise<ExtractedFrame[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const frames: ExtractedFrame[] = [];
    let frameNumber = 0;

    video.onloadedmetadata = () => {
      // Optimized canvas size for faster processing
      canvas.width = Math.min(video.videoWidth, 960);
      canvas.height = Math.min(video.videoHeight, 720);
      
      const duration = video.duration;
      const frameInterval = 1 / targetFPS;
      const totalFrames = Math.floor(duration * targetFPS);
      
      console.log(`Expert analysis: Extracting ${totalFrames} frames at ${targetFPS} FPS from ${duration}s video`);
      console.log(`Frame interval: ${frameInterval}s for comprehensive impact detection`);
      
      let currentTime = 0;
      
      const extractNextFrame = () => {
        if (currentTime >= duration) {
          console.log(`Frame extraction complete: ${frames.length} frames ready for expert analysis`);
          resolve(frames);
          return;
        }
        
        video.currentTime = currentTime;
        
        video.onseeked = () => {
          // Draw the current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64 with optimized quality for faster processing
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          frames.push({
            imageData,
            timestamp: parseFloat(currentTime.toFixed(3)),
            frameNumber: frameNumber++
          });
          
          // Move to next frame
          currentTime += frameInterval;
          setTimeout(extractNextFrame, 25); // Faster frame extraction
        };
      };
      
      extractNextFrame();
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for expert analysis'));
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
};

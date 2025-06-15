
export interface ExtractedFrame {
  imageData: string; // base64 encoded
  timestamp: number; // in seconds
  frameNumber: number;
}

export const extractFramesAtFPS = async (
  videoFile: File, 
  targetFPS: number = 10 // Increased to 8-12 FPS range for better detection
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
      // Optimize canvas size for API efficiency while maintaining detail
      canvas.width = Math.min(video.videoWidth, 1280);
      canvas.height = Math.min(video.videoHeight, 960);
      
      const duration = video.duration;
      const frameInterval = 1 / targetFPS; // seconds between frames
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
          // Draw the current frame to canvas with high quality
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64 with high quality for expert analysis
          const imageData = canvas.toDataURL('image/jpeg', 0.9);
          
          frames.push({
            imageData,
            timestamp: parseFloat(currentTime.toFixed(3)), // Precise timestamp
            frameNumber: frameNumber++
          });
          
          // Move to next frame
          currentTime += frameInterval;
          setTimeout(extractNextFrame, 50); // Faster processing for higher FPS
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

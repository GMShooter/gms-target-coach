
export interface ExtractedFrame {
  imageData: string; // base64 encoded
  timestamp: number; // in seconds
  frameNumber: number;
}

export const extractFramesAtFPS = async (
  videoFile: File, 
  targetFPS: number = 2
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
      canvas.width = Math.min(video.videoWidth, 1024); // Limit size for API efficiency
      canvas.height = Math.min(video.videoHeight, 768);
      
      const duration = video.duration;
      const frameInterval = 1 / targetFPS; // seconds between frames
      const totalFrames = Math.floor(duration * targetFPS);
      
      console.log(`Extracting ${totalFrames} frames at ${targetFPS} FPS from ${duration}s video`);
      
      let currentTime = 0;
      
      const extractNextFrame = () => {
        if (currentTime >= duration) {
          console.log(`Extracted ${frames.length} frames total`);
          resolve(frames);
          return;
        }
        
        video.currentTime = currentTime;
        
        video.onseeked = () => {
          // Draw the current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          frames.push({
            imageData,
            timestamp: currentTime,
            frameNumber: frameNumber++
          });
          
          // Move to next frame
          currentTime += frameInterval;
          setTimeout(extractNextFrame, 100); // Small delay to ensure seeking completes
        };
      };
      
      extractNextFrame();
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
};

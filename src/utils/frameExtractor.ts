
export interface ExtractedFrame {
  imageData: string; // base64 encoded
  timestamp: number; // in seconds
  frameNumber: number;
}

export const extractFramesAt10FPS = async (
  videoFile: File
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
      // Set reasonable canvas size for smaller payloads
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.min(video.videoHeight, 480);
      
      const duration = video.duration;
      const frameInterval = 0.1; // 10 FPS
      const totalFrames = Math.floor(duration * 10);
      
      console.log(`Extracting ${totalFrames} frames at 10 FPS from ${duration}s video`);
      
      let currentTime = 0;
      
      const extractNextFrame = () => {
        if (currentTime >= duration) {
          console.log(`Frame extraction complete: ${frames.length} frames ready`);
          resolve(frames);
          return;
        }
        
        video.currentTime = currentTime;
        
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // Use lower quality for smaller payloads
          const imageData = canvas.toDataURL('image/jpeg', 0.6);
          
          frames.push({
            imageData,
            timestamp: parseFloat(currentTime.toFixed(3)),
            frameNumber: frameNumber++
          });
          
          currentTime += frameInterval;
          setTimeout(extractNextFrame, 50);
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

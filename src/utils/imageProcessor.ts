interface ProcessedImage {
  imageData: string;
  timestamp: number;
  frameNumber: number;
}

export const createDifferenceImage = async (
  imageA_base64: string, 
  imageB_base64: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvasA = document.createElement('canvas');
    const canvasB = document.createElement('canvas');
    const canvasDiff = document.createElement('canvas');
    
    const ctxA = canvasA.getContext('2d');
    const ctxB = canvasB.getContext('2d');
    const ctxDiff = canvasDiff.getContext('2d');
    
    if (!ctxA || !ctxB || !ctxDiff) {
      reject(new Error('Could not get canvas contexts for image processing'));
      return;
    }

    const imgA = new Image();
    const imgB = new Image();
    let loadedCount = 0;

    const processImages = () => {
      loadedCount++;
      if (loadedCount !== 2) return;

      // Set canvas dimensions to match images
      const width = imgA.width;
      const height = imgA.height;
      
      canvasA.width = canvasB.width = canvasDiff.width = width;
      canvasA.height = canvasB.height = canvasDiff.height = height;

      // Draw images onto canvases
      ctxA.drawImage(imgA, 0, 0);
      ctxB.drawImage(imgB, 0, 0);

      // Get pixel data
      const dataA = ctxA.getImageData(0, 0, width, height);
      const dataB = ctxB.getImageData(0, 0, width, height);
      const dataDiff = ctxDiff.createImageData(width, height);

      // Perform pixel-by-pixel subtraction with enhanced detection
      for (let i = 0; i < dataA.data.length; i += 4) {
        const rA = dataA.data[i];
        const gA = dataA.data[i + 1];
        const bA = dataA.data[i + 2];
        
        const rB = dataB.data[i];
        const gB = dataB.data[i + 1];
        const bB = dataB.data[i + 2];

        // Calculate luminance difference for better hole detection
        const lumA = 0.299 * rA + 0.587 * gA + 0.114 * bA;
        const lumB = 0.299 * rB + 0.587 * gB + 0.114 * bB;
        const lumDiff = Math.abs(lumB - lumA);

        // Calculate color difference
        const colorDiff = Math.sqrt(
          Math.pow(rB - rA, 2) + 
          Math.pow(gB - gA, 2) + 
          Math.pow(bB - bA, 2)
        );

        // Apply threshold - new holes typically create significant dark changes
        const threshold = 25; // Adjustable threshold for hole detection
        const isSignificantChange = lumDiff > threshold || colorDiff > 40;

        if (isSignificantChange) {
          // Make the difference visible as white on black background
          dataDiff.data[i] = 255;     // R
          dataDiff.data[i + 1] = 255; // G
          dataDiff.data[i + 2] = 255; // B
          dataDiff.data[i + 3] = 255; // A
        } else {
          // Background stays black
          dataDiff.data[i] = 0;       // R
          dataDiff.data[i + 1] = 0;   // G
          dataDiff.data[i + 2] = 0;   // B
          dataDiff.data[i + 3] = 255; // A
        }
      }

      // Apply morphological operations to clean up noise
      const cleanedData = applyMorphologicalCleaning(dataDiff, width, height);
      
      // Put the cleaned difference image on canvas
      ctxDiff.putImageData(cleanedData, 0, 0);
      
      // Convert to base64 and return
      const differenceImage = canvasDiff.toDataURL('image/jpeg', 0.9);
      console.log('🔍 Difference image created successfully');
      resolve(differenceImage);
    };

    imgA.onload = processImages;
    imgB.onload = processImages;
    imgA.onerror = () => reject(new Error('Failed to load image A'));
    imgB.onerror = () => reject(new Error('Failed to load image B'));

    imgA.src = imageA_base64;
    imgB.src = imageB_base64;
  });
};

// Apply morphological cleaning to remove noise and enhance bullet holes
const applyMorphologicalCleaning = (
  imageData: ImageData, 
  width: number, 
  height: number
): ImageData => {
  const data = new Uint8ClampedArray(imageData.data);
  const result = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
  
  // Simple erosion to remove small noise
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Check if this pixel and its neighbors are white (part of a difference)
      const neighbors = [
        data[idx], // current
        data[((y-1) * width + x) * 4], // top
        data[((y+1) * width + x) * 4], // bottom
        data[(y * width + (x-1)) * 4], // left
        data[(y * width + (x+1)) * 4], // right
      ];
      
      const whiteNeighbors = neighbors.filter(val => val > 200).length;
      
      // Keep white pixels only if they have enough white neighbors (hole continuity)
      if (whiteNeighbors < 3) {
        result.data[idx] = 0;     // R
        result.data[idx + 1] = 0; // G
        result.data[idx + 2] = 0; // B
      }
    }
  }
  
  return result;
};

export const processFramePairToDifference = async (framePair: {
  image1Data: string;
  image2Data: string;
  timestamp: number;
  frameNumber: number;
}): Promise<ProcessedImage> => {
  const differenceImage = await createDifferenceImage(
    framePair.image1Data, 
    framePair.image2Data
  );
  
  return {
    imageData: differenceImage,
    timestamp: framePair.timestamp,
    frameNumber: framePair.frameNumber
  };
};

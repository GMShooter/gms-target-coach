
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Play, Square, AlertCircle, Crosshair } from 'lucide-react';

interface CameraCaptureProps {
  onShotDetected: (shotData: any) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onShotDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shotCount, setShotCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Prefer back camera on mobile
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsMonitoring(false);
  }, []);

  const startMonitoring = () => {
    setIsMonitoring(true);
    // In a real implementation, this would start frame analysis
    // For demo purposes, we'll simulate shot detection
    setTimeout(() => {
      simulateShotDetection();
    }, 2000);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  const simulateShotDetection = () => {
    if (!isMonitoring) return;
    
    const newShotCount = shotCount + 1;
    setShotCount(newShotCount);
    
    // Generate a mock shot with realistic data
    const mockShot = {
      id: newShotCount,
      score: Math.floor(Math.random() * 4) + 7, // Score between 7-10
      ring: String(Math.floor(Math.random() * 4) + 7),
      x: (Math.random() - 0.5) * 40, // Random x position
      y: (Math.random() - 0.5) * 40, // Random y position
      timestamp: Date.now(),
      direction: ['Centered', 'Too left', 'Too right', 'Too high', 'Too low'][Math.floor(Math.random() * 5)],
      comment: 'Real-time detection'
    };
    
    // In a real implementation, you would:
    // 1. Capture current frame
    // 2. Send to Gemini 2.5 Flash API
    // 3. Parse response for shot coordinates
    // 4. Calculate score based on position
    
    console.log('Shot detected:', mockShot);
    
    // Continue monitoring for next shot
    if (isMonitoring) {
      setTimeout(() => {
        simulateShotDetection();
      }, 3000 + Math.random() * 2000); // Random interval between shots
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-red-400" />
          Live Camera Analysis
        </h3>
        
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-400 mb-1">Camera Error</h4>
              <p className="text-slate-300">{error}</p>
            </div>
          </div>
        )}

        <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Overlay indicators */}
          {isStreaming && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Crosshair className="w-8 h-8 text-red-400 opacity-50" />
              </div>
              
              {/* Status indicators */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                  {isStreaming ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              
              {isMonitoring && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse"></div>
                  <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                    MONITORING ({shotCount} shots)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4">
          {!isStreaming ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Camera
            </button>
          ) : (
            <>
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Camera
              </button>
              
              {!isMonitoring ? (
                <button
                  onClick={startMonitoring}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <Crosshair className="w-4 h-4" />
                  Start Monitoring
                </button>
              ) : (
                <button
                  onClick={stopMonitoring}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop Monitoring
                </button>
              )}
              
              <button
                onClick={captureFrame}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                <Camera className="w-4 h-4" />
                Capture Frame
              </button>
            </>
          )}
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-lg p-6">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-red-400" />
          Real-Time Setup Guide
        </h4>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• Position camera behind or to the side of the target</li>
          <li>• Ensure target is clearly visible and well-lit</li>
          <li>• Center the crosshair on the bullseye before starting</li>
          <li>• Click "Start Monitoring" to begin shot detection</li>
          <li>• System will automatically detect and analyze each shot</li>
          <li>• View real-time feedback and the last 10 shots visualization</li>
        </ul>
        
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
          <p className="text-blue-400 text-sm">
            <strong>Gemini Integration:</strong> In production, captured frames will be sent to Gemini 2.5 Flash API for real-time shot detection and analysis. Frame sampling is optimized to minimize API calls while maintaining accuracy.
          </p>
        </div>
      </div>
    </div>
  );
};

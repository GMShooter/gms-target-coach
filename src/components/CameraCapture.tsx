
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Play, Square, AlertCircle, Crosshair, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onShotDetected: (shotData: any) => void;
}

interface FrameDetection {
  timestamp: number;
  detections: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
  }>;
  frameNumber: number;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onShotDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shotCount, setShotCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [allDetectedFrames, setAllDetectedFrames] = useState<FrameDetection[]>([]);
  const [previousHoles, setPreviousHoles] = useState<Set<string>>(new Set());
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [currentDetections, setCurrentDetections] = useState<any[]>([]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
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
    stopMonitoring();
  }, []);

  const captureAndAnalyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isMonitoring) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to 640x640 as specified
    canvas.width = 640;
    canvas.height = 640;
    
    // Capture frame from video
    ctx.drawImage(videoRef.current, 0, 0, 640, 640);
    const frameBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    const timestamp = (Date.now() - sessionStartTime) / 1000;
    const frameNumber = allDetectedFrames.length;

    console.log(`📸 Capturing frame ${frameNumber + 1} at ${timestamp.toFixed(2)}s`);

    try {
      // Call Roboflow detection
      const { data: detectionResult, error: detectionError } = await supabase.functions.invoke('analyze-frame', {
        body: {
          frameBase64,
          timestamp,
          frameNumber
        }
      });

      if (detectionError) {
        console.error('Live detection error:', detectionError);
        return;
      }

      const detections = detectionResult?.detections || [];
      setCurrentDetections(detections);

      // Store frame data
      const frameData: FrameDetection = {
        timestamp,
        detections,
        frameNumber
      };

      setAllDetectedFrames(prev => [...prev, frameData]);

      // REAL-TIME SHOT DETECTION LOGIC
      const currentHoles = new Set<string>();
      
      detections.forEach((detection: any) => {
        const x = Math.round(detection.x);
        const y = Math.round(detection.y);
        const key = `${x}_${y}`;
        currentHoles.add(key);
      });

      // Find new shots
      const newShots = [];
      for (const holeKey of currentHoles) {
        if (!previousHoles.has(holeKey)) {
          const [x, y] = holeKey.split('_').map(Number);
          newShots.push({ timestamp, coordinates: { x, y } });
          
          console.log(`🎯 LIVE SHOT DETECTED: (${x}, ${y}) at ${timestamp.toFixed(2)}s`);
          
          setShotCount(prev => prev + 1);
          
          toast({
            title: "Shot Detected!",
            description: `New shot at ${timestamp.toFixed(1)}s - Position: (${x}, ${y})`,
          });
        }
      }

      setPreviousHoles(new Set(currentHoles));
      
      // Draw bounding boxes on overlay
      drawDetectionOverlay(detections);

    } catch (error) {
      console.error('Frame analysis error:', error);
    }
  }, [isMonitoring, allDetectedFrames.length, sessionStartTime, previousHoles]);

  const drawDetectionOverlay = (detections: any[]) => {
    if (!overlayCanvasRef.current || !videoRef.current) return;

    const overlay = overlayCanvasRef.current;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw bounding boxes
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ff0000';

    detections.forEach((detection, index) => {
      const x = detection.x - detection.width / 2;
      const y = detection.y - detection.height / 2;
      
      // Draw bounding box
      ctx.strokeRect(x, y, detection.width, detection.height);
      
      // Draw confidence score
      ctx.fillText(
        `${detection.class}: ${(detection.confidence * 100).toFixed(1)}%`,
        x,
        y - 5
      );
    });
  };

  const startMonitoring = () => {
    console.log('🎯 Starting live monitoring session...');
    setIsMonitoring(true);
    setSessionStartTime(Date.now());
    setShotCount(0);
    setAllDetectedFrames([]);
    setPreviousHoles(new Set());
    setCurrentDetections([]);

    // Start 1 FPS analysis loop
    intervalRef.current = setInterval(captureAndAnalyzeFrame, 1000);
  };

  const stopMonitoring = async () => {
    console.log('🛑 Stopping live monitoring session...');
    setIsMonitoring(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (allDetectedFrames.length > 0) {
      console.log(`📊 Session complete: ${allDetectedFrames.length} frames analyzed, ${shotCount} shots detected`);
      
      // Generate final report
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: result, error } = await supabase.functions.invoke('generate-report', {
          body: {
            allDetectedFrames,
            newShotsData: [], // We don't track individual shots in live mode for now
            userId: user?.id || null,
            drillMode: true,
            videoDuration: allDetectedFrames.length // Duration in seconds
          }
        });

        if (result?.sessionId) {
          toast({
            title: "Live Session Complete!",
            description: `Analysis saved with ${shotCount} shots detected.`,
          });
          
          onShotDetected({ sessionId: result.sessionId, shotCount });
        }
      } catch (error) {
        console.error('Error generating live session report:', error);
      }
    }
  };

  useEffect(() => {
    // Set overlay canvas size to match video
    if (overlayCanvasRef.current && videoRef.current) {
      const video = videoRef.current;
      const overlay = overlayCanvasRef.current;
      overlay.width = video.videoWidth || 640;
      overlay.height = video.videoHeight || 480;
    }
  }, [isStreaming]);

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
          <canvas
            ref={overlayCanvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ mixBlendMode: 'screen' }}
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
                  LIVE
                </span>
              </div>
              
              {isMonitoring && (
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse"></div>
                    <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                      ANALYZING ({shotCount} shots)
                    </span>
                  </div>
                  <div className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                    Detections: {currentDetections.length}
                  </div>
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
                  <Target className="w-4 h-4" />
                  Start Analysis
                </button>
              ) : (
                <button
                  onClick={stopMonitoring}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <Square className="w-4 h-4" />
                  End Session
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Real-time Stats */}
      {isMonitoring && (
        <div className="mt-4 bg-slate-800/30 border border-slate-700 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Real-Time Session Stats</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Frames Analyzed:</span>
              <div className="font-semibold">{allDetectedFrames.length}</div>
            </div>
            <div>
              <span className="text-slate-400">Shots Detected:</span>
              <div className="font-semibold text-red-400">{shotCount}</div>
            </div>
            <div>
              <span className="text-slate-400">Current Detections:</span>
              <div className="font-semibold">{currentDetections.length}</div>
            </div>
            <div>
              <span className="text-slate-400">Session Time:</span>
              <div className="font-semibold">{Math.floor((Date.now() - sessionStartTime) / 1000)}s</div>
            </div>
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-lg p-6">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-red-400" />
          SOTA Real-Time Setup Guide
        </h4>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• Position camera to clearly see the target at 640x640 resolution</li>
          <li>• Ensure target is well-lit and bullet holes create clear contrast</li>
          <li>• Click "Start Analysis" to begin 1 FPS Roboflow detection</li>
          <li>• Red bounding boxes show real-time detections with confidence scores</li>
          <li>• New shots are automatically detected and logged with timestamps</li>
          <li>• Click "End Session" to generate comprehensive Gemini analysis report</li>
        </ul>
        
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
          <p className="text-blue-400 text-sm">
            <strong>Real SOTA Pipeline:</strong> This system uses actual Roboflow detection at 1 FPS with frame-by-frame comparison to identify new shots. All detections are sent to Gemini for final expert analysis with no hardcoded assumptions about shot count.
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge-2';
import { QRScanner } from '@/components/QRScanner';
import { HardwareAPI, type PiDevice, type SessionData, type ShotData, type FrameData } from '@/services/HardwareAPI';
import { Play, Pause, Square, Settings, Camera, Target, Wifi, WifiOff, QrCode, Maximize2, Minimize2, RotateCw } from 'lucide-react';

// Define ScanResult type to avoid importing qr-scanner in the component
interface ScanResult {
  data: string;
  cornerPoints?: Array<{ x: number; y: number }>;
}

interface LiveTargetViewProps {
  deviceId?: string;
  sessionId?: string;
  onShotDetected?: (shot: ShotData) => void;
  onSessionComplete?: (results: ShotData[]) => void;
}

export const LiveTargetView: React.FC<LiveTargetViewProps> = ({
  deviceId,
  sessionId,
  onShotDetected,
  onSessionComplete
}) => {
  const [device, setDevice] = useState<PiDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [shots, setShots] = useState<ShotData[]>([]);
  const [currentFrame, setCurrentFrame] = useState<FrameData | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isMobile, setIsMobile] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hardwareAPIRef = useRef<HardwareAPI | null>(null);

  // Detect mobile device and orientation
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                            window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };

    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkMobile();
    checkOrientation();

    window.addEventListener('resize', checkMobile);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Initialize hardware API
  useEffect(() => {
    hardwareAPIRef.current = new HardwareAPI();
    
    // Cleanup on unmount
    return () => {
      if (hardwareAPIRef.current) {
        hardwareAPIRef.current.cleanup();
      }
    };
  }, []);

  // Handle shot detection with useCallback at component level
  const handleShotDetected = useCallback(async (shot: ShotData) => {
    console.log('Shot detected:', shot);
    
    // Add shot to local state
    setShots(prev => [...prev, shot]);
    
    // Ingest shot data to Supabase via HardwareAPI
    if (session && hardwareAPIRef.current) {
      try {
        await hardwareAPIRef.current.ingestShotData(session.sessionId, {
          shotId: shot.shotId,
          sessionId: session.sessionId,
          timestamp: shot.timestamp,
          frameNumber: shot.frameNumber,
          coordinates: shot.coordinates,
          score: shot.score,
          confidence: shot.confidence,
          imageUrl: shot.imageUrl,
          sequentialData: shot.sequentialShotNumber ? {
            shotNumber: shot.sequentialShotNumber,
            confidence: shot.confidence
          } : undefined,
          geometricData: shot.compensatedScore ? {
            rawDistance: shot.rawDistance,
            correctedDistance: shot.correctedDistance,
            isBullseye: shot.isBullseye,
            angleFromCenter: shot.angleFromCenter,
            compensatedScore: shot.compensatedScore
          } : undefined
        });
      } catch (error) {
        console.error('Failed to ingest shot data:', error);
      }
    }
    
    onShotDetected?.(shot);
  }, [session, onShotDetected]);

  // Handle frame updates with useCallback at component level
  const handleFrameUpdated = useCallback(async (frameData: FrameData) => {
    console.log('Frame updated:', frameData);
    
    // Update video source if frame URL is provided
    if (frameData.imageUrl && videoRef.current) {
      videoRef.current.src = frameData.imageUrl;
    }
    
    // Ingest frame data to Supabase via HardwareAPI
    if (session && hardwareAPIRef.current) {
      try {
        await hardwareAPIRef.current.ingestFrameData(session.sessionId, {
          frameNumber: frameData.frameNumber,
          frameId: frameData.frameNumber,
          frameData: frameData.imageUrl || '', // Convert to base64 in production
          timestamp: frameData.timestamp,
          predictions: frameData.metadata?.predictions || []
        });
      } catch (error) {
        console.error('Failed to ingest frame data:', error);
      }
    }
    
    setCurrentFrame(frameData);
  }, [session]);

  // Handle device connection
  useEffect(() => {
    if (!hardwareAPIRef.current) return;

    const handleDeviceConnected = (connectedDevice: PiDevice) => {
      setDevice(connectedDevice);
      setIsConnected(connectedDevice.status === 'online');
      setError('');
    };

    const handleDeviceDisconnected = () => {
      setDevice(null);
      setIsConnected(false);
      setStreamUrl('');
      setSession(null);
    };

    const handleSessionStarted = (sessionData: SessionData) => {
      setSession(sessionData);
      setShots([]);
    };

    const handleSessionEnded = () => {
      setSession(null);
      onSessionComplete?.(shots);
    };

    const handleError = (errorData: any) => {
      setError(errorData.message || 'An error occurred');
    };

    // Register event listeners
    hardwareAPIRef.current.addEventListener('deviceConnected', handleDeviceConnected);
    hardwareAPIRef.current.addEventListener('deviceDisconnected', handleDeviceDisconnected);
    hardwareAPIRef.current.addEventListener('sessionStarted', handleSessionStarted);
    hardwareAPIRef.current.addEventListener('sessionEnded', handleSessionEnded);
    hardwareAPIRef.current.addEventListener('shotDetected', handleShotDetected);
    hardwareAPIRef.current.addEventListener('frameUpdated', handleFrameUpdated);
    hardwareAPIRef.current.addEventListener('error', handleError);
    
    return () => {
      // Remove event listeners
      if (hardwareAPIRef.current) {
        hardwareAPIRef.current.removeEventListener('deviceConnected', handleDeviceConnected);
        hardwareAPIRef.current.removeEventListener('deviceDisconnected', handleDeviceDisconnected);
        hardwareAPIRef.current.removeEventListener('sessionStarted', handleSessionStarted);
        hardwareAPIRef.current.removeEventListener('sessionEnded', handleSessionEnded);
        hardwareAPIRef.current.removeEventListener('shotDetected', handleShotDetected);
        hardwareAPIRef.current.removeEventListener('frameUpdated', handleFrameUpdated);
        hardwareAPIRef.current.removeEventListener('error', handleError);
      }
    };
  }, [handleShotDetected, handleFrameUpdated, onSessionComplete, shots]);

  // Initialize video stream
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    video.src = streamUrl;
    
    video.onloadstart = () => {
      console.log('Loading video stream...');
    };
    
    video.onloadeddata = () => {
      console.log('Video stream loaded');
      // Set canvas dimensions to match video
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
      }
    };
    
    video.onerror = (e) => {
      console.error('Video stream error:', e);
      setError('Failed to load video stream');
    };
    
    return () => {
      video.src = '';
    };
  }, [streamUrl]);

  // Connect to hardware via QR code
  const connectToHardware = async (qrData: string) => {
    if (!hardwareAPIRef.current) return;
    
    try {
      setError('');
      const connectedDevice = await hardwareAPIRef.current.connectViaQRCode(qrData);
      setDevice(connectedDevice);
      setIsConnected(true);
      setShowQRScanner(false); // Close QR scanner after successful connection
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to hardware');
    }
  };

  // Handle QR code scan result
  const handleQRCodeScanned = (result: ScanResult) => {
    connectToHardware(result.data);
  };

  // Handle QR scanner close
  const handleQRScannerClose = () => {
    setShowQRScanner(false);
  };

  // Disconnect from hardware
  const disconnectFromHardware = async () => {
    if (!hardwareAPIRef.current || !device) return;
    
    try {
      await hardwareAPIRef.current.disconnectDevice(device.id);
      setStreamUrl('');
      setSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect from hardware');
    }
  };

  // Start shooting session
  const startSession = async () => {
    if (!hardwareAPIRef.current || !device || !sessionId) return;
    
    try {
      setError('');
      const sessionRequest = {
        sessionId,
        userId: 'current-user', // This should come from auth context
        settings: {
          targetDistance: 10,
          targetSize: 1,
          detectionSensitivity: 0.8
        }
      };
      
      const sessionData = await hardwareAPIRef.current.startSession(device.id, sessionRequest);
      setSession(sessionData);
      setShots([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  };

  // Stop shooting session
  const stopSession = async () => {
    if (!hardwareAPIRef.current || !session) return;
    
    try {
      setError('');
      await hardwareAPIRef.current.stopSession(session.sessionId);
      setSession(null);
      onSessionComplete?.(shots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop session');
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Draw shot overlay on canvas
  const drawShotOverlay = useCallback((shot: ShotData) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;
    const rect = video.getBoundingClientRect();
    
    // Set canvas size to match video
    canvas.width = video.videoWidth || rect.width;
    canvas.height = video.videoHeight || rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all shots in session
    const sessionShots = Array.from(shots);
    sessionShots.forEach((sessionShot, index) => {
      const x = (sessionShot.coordinates.x / 100) * canvas.width;
      const y = (sessionShot.coordinates.y / 100) * canvas.height;
      
      // Draw shot trail for older shots (fading effect)
      if (index < sessionShots.length - 1) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
      
      // Draw current shot with enhanced visualization
      if (sessionShot.shotId === shot.shotId) {
        // Draw enhanced shot marker with geometric scoring data
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        
        // Color based on geometric scoring if available
        let color = '#FF0000'; // Default red
        if (sessionShot.compensatedScore !== undefined) {
          if (sessionShot.compensatedScore >= 9) color = '#00FF00'; // Green
          else if (sessionShot.compensatedScore >= 7) color = '#FFFF00'; // Yellow
          else if (sessionShot.compensatedScore >= 5) color = '#FFA500'; // Orange
        } else if (sessionShot.score >= 9) color = '#00FF00';
        else if (sessionShot.score >= 7) color = '#FFFF00';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw bullseye indicator
        if (sessionShot.isBullseye) {
          ctx.beginPath();
          ctx.arc(x, y, 15, 0, 2 * Math.PI);
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        
        // Draw shot number with sequential detection
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const shotNumber = sessionShot.sequentialShotNumber || sessionShot.shotId?.toString() || '1';
        ctx.fillText(`#${shotNumber}`, x, y);
        
        // Draw enhanced score information
        ctx.fillStyle = color;
        ctx.font = 'bold 12px Arial';
        const displayScore = sessionShot.compensatedScore || sessionShot.score;
        ctx.fillText(`Score: ${displayScore}`, x, y - 25);
        
        // Draw confidence indicator
        if (sessionShot.confidence) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '10px Arial';
          ctx.fillText(`${Math.round(sessionShot.confidence * 100)}%`, x + 20, y);
        }
        
        // Draw angle from center if available
        if (sessionShot.angleFromCenter !== undefined) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((sessionShot.angleFromCenter * Math.PI) / 180);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(20, 0);
          ctx.strokeStyle = '#00FFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    // Draw shot grouping visualization if multiple shots
    if (sessionShots.length > 1) {
      drawShotGrouping(ctx, canvas, sessionShots);
    }
  }, [shots]);

  const drawShotGrouping = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, sessionShots: ShotData[]) => {
    if (sessionShots.length < 2) return;

    // Calculate center of shot group
    const centerX = sessionShots.reduce((sum, shot) => sum + shot.coordinates.x, 0) / sessionShots.length;
    const centerY = sessionShots.reduce((sum, shot) => sum + shot.coordinates.y, 0) / sessionShots.length;
    
    const centerCanvasX = (centerX / 100) * canvas.width;
    const centerCanvasY = (centerY / 100) * canvas.height;
    
    // Draw grouping circle
    ctx.beginPath();
    ctx.arc(centerCanvasX, centerCanvasY, 30, 0, 2 * Math.PI);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw center point
    ctx.beginPath();
    ctx.arc(centerCanvasX, centerCanvasY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
  };

  return (
    <div className={`grid ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-3'} gap-4 ${isMobile ? 'p-2' : 'gap-6'}`}>
      {/* Main video feed */}
      <div className={`${isMobile ? 'col-span-1' : 'lg:col-span-2'} ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
        <Card className={`${isFullscreen ? 'h-full border-0 rounded-none' : ''} ${isMobile ? 'shadow-sm' : ''}`}>
          <CardHeader className={`${isMobile ? 'pb-2' : ''} ${isFullscreen ? 'border-b border-gray-700' : ''}`}>
            <div className={`flex items-center ${isMobile ? 'justify-between' : 'justify-between'}`}>
              <div className={`${isMobile ? 'flex-1' : ''}`}>
                <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
                  <Camera className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  <span className={`${isMobile ? 'hidden sm:inline' : ''}`}>Live Target View</span>
                  <span className={`${isMobile ? 'sm:hidden' : ''}`}>Target</span>
                </CardTitle>
                <CardDescription className={`${isMobile ? 'text-xs' : ''}`}>
                  {isMobile ? 'Raspberry Pi feed' : 'Real-time target feed from Raspberry Pi'}
                </CardDescription>
              </div>
              <div className={`flex items-center gap-2 ${isMobile ? 'flex-shrink-0' : ''}`}>
                <Badge variant={isConnected ? "success" : "destructive"} className={`${isMobile ? 'text-xs px-2 py-1' : ''}`}>
                  {isConnected ? (
                    <>
                      <Wifi className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'} mr-1`} />
                      <span className={`${isMobile ? 'hidden' : ''}`}>Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'} mr-1`} />
                      <span className={`${isMobile ? 'hidden' : ''}`}>Disconnected</span>
                    </>
                  )}
                </Badge>
                {session && session.status === 'active' && (
                  <Badge variant="warning" className={`animate-pulse ${isMobile ? 'text-xs px-2 py-1' : ''}`}>
                    <Target className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'} mr-1`} />
                    <span className={`${isMobile ? 'hidden' : ''}`}>Session Active</span>
                  </Badge>
                )}
                {!isMobile && (
                  <Button
                    onClick={toggleFullscreen}
                    variant="outline"
                    size="sm"
                    className="ml-2"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-2' : ''} ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
            {error && (
              <div className={`mb-4 p-3 bg-red-50 border border-red-200 rounded-md ${isMobile ? 'text-xs' : ''}`}>
                <p className="text-red-600">{error}</p>
              </div>
            )}
            
            <div className={`relative bg-black rounded-lg overflow-hidden ${isMobile ? 'aspect-video' : ''} ${isFullscreen ? 'flex-1' : ''} ${!isMobile ? 'aspect-video' : ''}`}>
              {/* Video stream */}
              <video
                ref={videoRef}
                data-testid="video-element"
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isMobile ? 'rounded' : ''}`}
                style={{ display: streamUrl ? 'block' : 'none' }}
              />
              
              {/* Canvas for shot overlays */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ display: streamUrl ? 'block' : 'none' }}
              />
              
              {/* Placeholder when no stream */}
              {!streamUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Camera className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-4 opacity-50`} />
                    <p className={`${isMobile ? 'text-sm' : 'text-lg'} font-medium`}>No video feed</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} opacity-75`}>
                      {isConnected ? 'Waiting for stream...' : 'Connect to hardware to begin'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Mobile fullscreen toggle */}
              {isMobile && !isFullscreen && (
                <Button
                  onClick={toggleFullscreen}
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 bg-black/50 text-white border-white/20"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              
              {/* Mobile orientation indicator */}
              {isMobile && isFullscreen && (
                <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                  {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                </div>
              )}
            </div>
            
            {/* Control buttons */}
            <div className={`flex items-center justify-between mt-4 ${isMobile ? 'flex-wrap gap-2' : ''}`}>
              <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2 flex-1' : 'gap-2'}`}>
                {!isConnected ? (
                  <>
                    <Button
                      onClick={() => setShowQRScanner(true)}
                      disabled={false}
                      size={isMobile ? "sm" : "default"}
                      className={isMobile ? 'flex-1 min-w-[100px]' : ''}
                    >
                      <QrCode className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                      <span className={isMobile ? 'hidden sm:inline' : ''}>Scan QR Code</span>
                      <span className={isMobile ? 'sm:hidden' : ''}>Scan</span>
                    </Button>
                    <Button
                      onClick={() => {
                        // For demo purposes, use a mock QR code
                        const mockQRCode = 'GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080';
                        connectToHardware(mockQRCode);
                      }}
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      className={isMobile ? 'flex-1 min-w-[100px]' : ''}
                    >
                      <Play className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                      <span className={isMobile ? 'hidden sm:inline' : ''}>Demo Connect</span>
                      <span className={isMobile ? 'sm:hidden' : ''}>Demo</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={session ? stopSession : startSession}
                      disabled={!sessionId}
                      variant={session ? "destructive" : "default"}
                      size={isMobile ? "sm" : "default"}
                      className={isMobile ? 'flex-1 min-w-[100px]' : ''}
                    >
                      {session ? (
                        <>
                          <Square className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                          <span className={isMobile ? 'hidden sm:inline' : ''}>Stop Session</span>
                          <span className={isMobile ? 'sm:hidden' : ''}>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                          <span className={isMobile ? 'hidden sm:inline' : ''}>Start Session</span>
                          <span className={isMobile ? 'sm:hidden' : ''}>Start</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={disconnectFromHardware}
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      className={isMobile ? 'flex-1 min-w-[100px]' : ''}
                    >
                      <WifiOff className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                      <span className={isMobile ? 'hidden sm:inline' : ''}>Disconnect</span>
                      <span className={isMobile ? 'sm:hidden' : ''}>Disc</span>
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="outline"
                disabled={!isConnected}
                size={isMobile ? "sm" : "default"}
                className={isMobile ? 'flex-1 min-w-[80px]' : ''}
              >
                <Settings className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                <span className={isMobile ? 'hidden sm:inline' : ''}>Settings</span>
                <span className={isMobile ? 'sm:hidden' : ''}>Set</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Side panel */}
      <div className={`${isMobile ? 'space-y-3' : 'space-y-6'} ${isMobile ? 'col-span-1' : ''}`}>
        {/* Shot history */}
        <Card className={isMobile ? 'shadow-sm' : ''}>
          <CardHeader className={isMobile ? 'pb-2' : ''}>
            <CardTitle className={isMobile ? 'text-sm' : ''}>Shot History</CardTitle>
            <CardDescription className={isMobile ? 'text-xs' : ''}>
              {isMobile ? 'Recent shots' : 'Recent shots in this session'}
            </CardDescription>
          </CardHeader>
          <CardContent className={isMobile ? 'p-2' : ''}>
            {shots.length === 0 ? (
              <p className={`text-muted-foreground text-center py-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                No shots recorded yet
              </p>
            ) : (
              <div className={`space-y-2 ${isMobile ? 'max-h-40' : 'max-h-64'} overflow-y-auto`}>
                {shots.slice(-10).reverse().map((shot, index) => (
                  <div key={shot.shotId || index} className={`flex items-center justify-between p-2 bg-muted rounded ${isMobile ? 'p-1' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Target className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                      <span className={isMobile ? 'text-xs' : 'text-sm'}>Shot #{shots.length - index}</span>
                    </div>
                    <Badge variant={shot.score >= 8 ? "success" : shot.score >= 5 ? "warning" : "destructive"} className={isMobile ? 'text-xs px-1 py-0' : ''}>
                      {shot.score}/10
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Target configuration */}
        {session && (
          <Card className={isMobile ? 'shadow-sm' : ''}>
            <CardHeader className={isMobile ? 'pb-2' : ''}>
              <CardTitle className={isMobile ? 'text-sm' : ''}>Session Configuration</CardTitle>
              <CardDescription className={isMobile ? 'text-xs' : ''}>
                {isMobile ? 'Current settings' : 'Current session settings'}
              </CardDescription>
            </CardHeader>
            <CardContent className={isMobile ? 'p-2' : ''}>
              <div className={`space-y-${isMobile ? '2' : '3'}`}>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Session ID:</span>
                  <span className={`${isMobile ? 'text-xs truncate max-w-[100px]' : 'text-sm'}`}>{session.sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Device:</span>
                  <span className={`${isMobile ? 'text-xs truncate max-w-[100px]' : 'text-sm'}`}>{device?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Target Distance:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{session.settings.targetDistance}m</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Target Size:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{session.settings.targetSize}m</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Shot Count:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{session.shotCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Session stats */}
        {shots.length > 0 && (
          <Card className={isMobile ? 'shadow-sm' : ''}>
            <CardHeader className={isMobile ? 'pb-2' : ''}>
              <CardTitle className={isMobile ? 'text-sm' : ''}>Session Stats</CardTitle>
              <CardDescription className={isMobile ? 'text-xs' : ''}>
                {isMobile ? 'Performance' : 'Performance metrics'}
              </CardDescription>
            </CardHeader>
            <CardContent className={isMobile ? 'p-2' : ''}>
              <div className={`space-y-${isMobile ? '2' : '3'}`}>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Total Shots:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{shots.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Average Score:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>
                    {(shots.reduce((sum, shot) => sum + shot.score, 0) / shots.length).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Best Shot:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{Math.max(...shots.map(s => s.score))}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Bullseyes:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{shots.filter(s => s.score >= 10).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg ${isMobile ? 'p-4 w-full mx-2 max-w-sm' : 'p-6 w-full max-w-md mx-4'}`}>
            <QRScanner
              onScan={handleQRCodeScanned}
              onClose={handleQRScannerClose}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTargetView;
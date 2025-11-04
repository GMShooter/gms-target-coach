import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  Settings, 
  Camera, 
  Target, 
  Wifi, 
  WifiOff, 
  QrCode, 
  Maximize2, 
  Minimize2,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  Crosshair
} from 'lucide-react';

import { type ShotData } from '../services/HardwareAPI';
import { useHardware } from '../hooks/useHardware';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Loading } from './ui/loading';
import { GMShootLogo } from './ui/gmshoot-logo';

// Define ScanResult type to avoid importing qr-scanner in component
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
  // Use our new hardware hook
  const {
    connectedDevice: device,
    isConnected,
    isConnecting,
    connectionError: error,
    activeSession: session,
    isSessionActive,
    latestFrame: currentFrame,
    recentShots: shots,
    analysisResult,
    connectToDevice,
    disconnectDevice,
    startSession,
    stopSession
  } = useHardware();

  // Local UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isMobile, setIsMobile] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Handle shot detection callback
  useEffect(() => {
    if (shots && shots.length > 0) {
      const latestShot = shots[shots.length - 1];
      onShotDetected?.(latestShot);
    }
  }, [shots, onShotDetected]);

  // Handle session completion
  useEffect(() => {
    if (session && session.status === 'completed') {
      onSessionComplete?.(shots || []);
    }
  }, [session, shots, onSessionComplete]);

  // Initialize video stream
  useEffect(() => {
    if (!currentFrame?.imageUrl || !videoRef.current) return;

    const video = videoRef.current;
    video.src = currentFrame.imageUrl;
    
    video.onloadstart = () => {
      // Loading video stream...
    };
    
    video.onloadeddata = () => {
      // Video stream loaded
      // Set canvas dimensions to match video
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
      }
    };
    
    video.onerror = (e) => {
      // Video stream error occurred
    };
    
    return () => {
      video.src = '';
    };
  }, [currentFrame?.imageUrl]);

  // Handle QR code scan result
  const handleQRCodeScanned = (result: ScanResult) => {
    connectToDevice(result.data);
    setShowQRScanner(false); // Close QR scanner after successful connection
  };

  // Handle QR scanner close
  const handleQRScannerClose = () => {
    setShowQRScanner(false);
  };

  // Disconnect from hardware
  const handleDisconnectFromHardware = async () => {
    if (device) {
      await disconnectDevice(device.id);
    }
  };

  // Handle start session
  const handleStartSession = async () => {
    if (!sessionId || !device) return;
    
    await startSession(device.id, 'current-user'); // This should come from auth context
  };

  // Handle stop session
  const handleStopSession = async () => {
    if (session) {
      await stopSession(session.sessionId);
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        // Error attempting to enable fullscreen
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        // Error attempting to exit fullscreen
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
    const sessionShots = Array.from(shots || []) as ShotData[];
    sessionShots.forEach((sessionShot: ShotData, index: number) => {
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

  // Update canvas when shots change
  useEffect(() => {
    if (shots && shots.length > 0) {
      const latestShot = shots[shots.length - 1];
      drawShotOverlay(latestShot);
    }
  }, [shots, drawShotOverlay]);

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
                {session && isSessionActive && (
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
              <motion.div 
                className={`mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg ${isMobile ? 'text-xs' : ''}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-red-400">{error}</p>
              </motion.div>
            )}
             
            <div className={`relative bg-black rounded-lg overflow-hidden ${isMobile ? 'aspect-video' : ''} ${isFullscreen ? 'flex-1' : ''} ${!isMobile ? 'aspect-video' : ''}`}>
              {/* Video stream */}
              <motion.video
                ref={videoRef}
                data-testid="video-element"
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${isMobile ? 'rounded' : ''}`}
                style={{ display: currentFrame?.imageUrl ? 'block' : 'none' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: currentFrame?.imageUrl ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
               
              {/* Canvas for shot overlays */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ display: currentFrame?.imageUrl ? 'block' : 'none' }}
              />
               
              {/* Analysis Overlay Toggle */}
              <Button
                onClick={() => setShowAnalysis(!showAnalysis)}
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 bg-black/50 text-white border-white/20"
              >
                <Eye className="h-4 w-4" />
              </Button>
               
              {/* Placeholder when no stream */}
              {!currentFrame?.imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
                  <div className="text-center text-white">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Camera className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} mx-auto mb-6 opacity-50`} />
                    </motion.div>
                    <p className={`${isMobile ? 'text-base' : 'text-xl'} font-medium mb-2`}>No video feed</p>
                    <p className={`${isMobile ? 'text-sm' : 'text-base'} opacity-75`}>
                      {isConnected ? 'Waiting for stream...' : 'Connect to hardware to begin'}
                    </p>
                    {!isConnected && (
                      <div className="mt-4">
                        <p className="text-sm opacity-60 mb-2">Try scanning a QR code or use Demo Connect</p>
                      </div>
                    )}
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
                      disabled={isConnecting}
                      size={isMobile ? "sm" : "default"}
                      className={isMobile ? 'flex-1 min-w-[100px]' : ''}
                      variant="default"
                    >
                      <QrCode className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                      <span className={isMobile ? 'hidden sm:inline' : ''}>Scan QR Code</span>
                      <span className={isMobile ? 'sm:hidden' : ''}>Scan</span>
                    </Button>
                    <Button
                      onClick={() => {
                        // For demo purposes, use a mock QR code
                        const mockQRCode = 'GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080';
                        connectToDevice(mockQRCode);
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
                      onClick={isSessionActive ? handleStopSession : handleStartSession}
                      disabled={!sessionId}
                      variant={isSessionActive ? "destructive" : "default"}
                      size={isMobile ? "sm" : "default"}
                      className={isMobile ? 'flex-1 min-w-[100px]' : ''}
                    >
                      {isSessionActive ? (
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
                      onClick={handleDisconnectFromHardware}
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
        {/* Analysis Results */}
        {analysisResult && showAnalysis && (
          <Card className={isMobile ? 'shadow-sm' : ''}>
            <CardHeader className={isMobile ? 'pb-2' : ''}>
              <CardTitle className={isMobile ? 'text-sm' : ''}>Analysis Results</CardTitle>
              <CardDescription className={isMobile ? 'text-xs' : ''}>
                {isMobile ? 'Frame analysis' : 'Current frame analysis results'}
              </CardDescription>
            </CardHeader>
            <CardContent className={isMobile ? 'p-2' : ''}>
              <div className={`space-y-${isMobile ? '2' : '3'}`}>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Shots Detected:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{analysisResult.shots.length}</span>
                </div>
                {analysisResult.shots.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Avg Score:</span>
                      <span className={isMobile ? 'text-xs' : 'text-sm'}>
                        {(analysisResult.shots.reduce((sum: number, shot: any) => sum + shot.score, 0) / analysisResult.shots.length).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Best Shot:</span>
                      <span className={isMobile ? 'text-xs' : 'text-sm'}>
                        {Math.max(...analysisResult.shots.map((s: any) => s.score))}/10
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Confidence:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>
                    {Math.round((analysisResult.confidence || 0) * 100)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
         
        {/* Shot history */}
        <Card className={isMobile ? 'shadow-sm' : ''}>
          <CardHeader className={isMobile ? 'pb-2' : ''}>
            <CardTitle className={isMobile ? 'text-sm' : ''}>Shot History</CardTitle>
            <CardDescription className={isMobile ? 'text-xs' : ''}>
              {isMobile ? 'Recent shots' : 'Recent shots in this session'}
            </CardDescription>
          </CardHeader>
          <CardContent className={isMobile ? 'p-2' : ''}>
            {(!shots || shots.length === 0) ? (
              <p className={`text-slate-400 text-center py-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                No shots recorded yet
              </p>
            ) : (
              <div className={`space-y-2 ${isMobile ? 'max-h-40' : 'max-h-64'} overflow-y-auto`}>
                {(shots || []).slice(-10).reverse().map((shot: ShotData, index: number) => (
                  <motion.div
                    key={shot.shotId || index}
                    className={`flex items-center justify-between p-2 bg-slate-700/50 rounded ${isMobile ? 'p-1' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="flex items-center gap-2">
                      <Target className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                      <span className={isMobile ? 'text-xs' : 'text-sm'}>Shot #{(shots || []).length - index}</span>
                    </div>
                    <Badge variant={shot.score >= 8 ? "success" : shot.score >= 5 ? "warning" : "destructive"} className={isMobile ? 'text-xs px-1 py-0' : ''}>
                      {shot.score}/10
                    </Badge>
                  </motion.div>
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
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{session.shotCount || shots.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
         
        {/* Session stats */}
        {shots && shots.length > 0 && (
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
                    {(shots.reduce((sum: number, shot: ShotData) => sum + shot.score, 0) / shots.length).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Best Shot:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{Math.max(...shots.map((s: ShotData) => s.score))}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Bullseyes:</span>
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>{shots.filter((s: ShotData) => s.score >= 10).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showQRScanner && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className={`bg-slate-800 rounded-lg ${isMobile ? 'p-4 w-full mx-2 max-w-sm' : 'p-6 w-full max-w-md mx-4'}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-4">
                <GMShootLogo size="lg" variant="gradient" />
              </div>
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-white mb-2">Scan QR Code</h3>
                <p className="text-slate-400">Position your camera over the QR code to connect to your GMShoot device</p>
              </div>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={handleQRScannerClose}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveTargetView;
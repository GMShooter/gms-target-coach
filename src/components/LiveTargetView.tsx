import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge-2';
import { HardwareAPI, type PiDevice, type SessionData, type ShotData, type FrameData } from '@/services/HardwareAPI';
import { Play, Pause, Square, Settings, Camera, Target, Wifi, WifiOff } from 'lucide-react';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hardwareAPIRef = useRef<HardwareAPI | null>(null);

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

    const handleShotDetected = (shot: ShotData) => {
      setShots(prev => [...prev, shot]);
      onShotDetected?.(shot);
      
      // Draw shot overlay on canvas
      drawShotOverlay(shot);
    };

    const handleFrameUpdated = (frameData: FrameData) => {
      setCurrentFrame(frameData);
      if (frameData.imageUrl) {
        setStreamUrl(frameData.imageUrl);
      }
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
  }, [onShotDetected, onSessionComplete, shots]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to hardware');
    }
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

  // Draw shot overlay on canvas
  const drawShotOverlay = useCallback((shot: ShotData) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Convert percentage coordinates to canvas coordinates
    const x = (shot.coordinates.x / 100) * canvas.width;
    const y = (shot.coordinates.y / 100) * canvas.height;
    
    // Clear previous overlay after a delay
    setTimeout(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 2000);
    
    // Draw shot marker
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw crosshair
    ctx.beginPath();
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x + 15, y);
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y + 15);
    ctx.stroke();
    
    // Draw score
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${shot.score}`, x, y - 20);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main video feed */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Live Target View
                </CardTitle>
                <CardDescription>
                  Real-time target feed from Raspberry Pi
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isConnected ? "success" : "destructive"}>
                  {isConnected ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      Connected
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      Disconnected
                    </>
                  )}
                </Badge>
                {session && session.status === 'active' && (
                  <Badge variant="warning" className="animate-pulse">
                    <Target className="h-3 w-3 mr-1" />
                    Session Active
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {/* Video stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
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
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No video feed</p>
                    <p className="text-sm opacity-75">
                      {isConnected ? 'Waiting for stream...' : 'Connect to hardware to begin'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Control buttons */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                {!isConnected ? (
                  <Button onClick={() => {
                    // For demo purposes, use a mock QR code
                    const mockQRCode = 'GMShoot://pi-device-001|Raspberry Pi|192.168.1.100|8080';
                    connectToHardware(mockQRCode);
                  }} disabled={false}>
                    <Play className="h-4 w-4 mr-2" />
                    Connect Hardware
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={session ? stopSession : startSession}
                      disabled={!sessionId}
                      variant={session ? "destructive" : "default"}
                    >
                      {session ? (
                        <>
                          <Square className="h-4 w-4 mr-2" />
                          Stop Session
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Start Session
                        </>
                      )}
                    </Button>
                    <Button onClick={disconnectFromHardware} variant="outline">
                      <WifiOff className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="outline"
                disabled={!isConnected}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Side panel */}
      <div className="space-y-6">
        {/* Shot history */}
        <Card>
          <CardHeader>
            <CardTitle>Shot History</CardTitle>
            <CardDescription>
              Recent shots in this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {shots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No shots recorded yet
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {shots.slice(-10).reverse().map((shot, index) => (
                  <div key={shot.shotId || index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span className="text-sm">Shot #{shots.length - index}</span>
                    </div>
                    <Badge variant={shot.score >= 8 ? "success" : shot.score >= 5 ? "warning" : "destructive"}>
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
          <Card>
            <CardHeader>
              <CardTitle>Session Configuration</CardTitle>
              <CardDescription>
                Current session settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Session ID:</span>
                  <span className="text-sm">{session.sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Device:</span>
                  <span className="text-sm">{device?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Target Distance:</span>
                  <span className="text-sm">{session.settings.targetDistance}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Target Size:</span>
                  <span className="text-sm">{session.settings.targetSize}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Shot Count:</span>
                  <span className="text-sm">{session.shotCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Session stats */}
        {shots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Session Stats</CardTitle>
              <CardDescription>
                Performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Shots:</span>
                  <span className="text-sm">{shots.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Average Score:</span>
                  <span className="text-sm">
                    {(shots.reduce((sum, shot) => sum + shot.score, 0) / shots.length).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Best Shot:</span>
                  <span className="text-sm">{Math.max(...shots.map(s => s.score))}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Bullseyes:</span>
                  <span className="text-sm">{shots.filter(s => s.score >= 10).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LiveTargetView;
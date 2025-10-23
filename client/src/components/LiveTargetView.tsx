
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge-2';
import { HardwareAPI, type HardwareConnection, type ShotDetection, type TargetConfiguration } from '@/services/HardwareAPI';
import { Play, Pause, Square, Settings, Camera, Target, Wifi, WifiOff } from 'lucide-react';

interface LiveTargetViewProps {
  sessionId?: string;
  onShotDetected?: (shot: ShotDetection) => void;
  onSessionComplete?: (results: ShotDetection[]) => void;
}

export const LiveTargetView: React.FC<LiveTargetViewProps> = ({
  sessionId,
  onShotDetected,
  onSessionComplete
}) => {
  const [connection, setConnection] = useState<HardwareConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [shots, setShots] = useState<ShotDetection[]>([]);
  const [currentConfig, setCurrentConfig] = useState<TargetConfiguration | null>(null);
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
        hardwareAPIRef.current.disconnect();
      }
    };
  }, []);

  // Handle connection status changes
  useEffect(() => {
    if (!hardwareAPIRef.current) return;

    const handleConnectionChange = (conn: HardwareConnection) => {
      setConnection(conn);
      setIsConnected(conn.status === 'connected');
      
      if (conn.status === 'connected' && conn.streamUrl) {
        setStreamUrl(conn.streamUrl);
        setError('');
      } else if (conn.status === 'error') {
        setError(conn.error || 'Connection error');
      }
    };

    hardwareAPIRef.current.on('connectionChange', handleConnectionChange);
    
    return () => {
      hardwareAPIRef.current?.off('connectionChange', handleConnectionChange);
    };
  }, []);

  // Handle shot detection
  useEffect(() => {
    if (!hardwareAPIRef.current) return;

    const handleShotDetected = (shot: ShotDetection) => {
      setShots(prev => [...prev, shot]);
      onShotDetected?.(shot);
      
      // Draw shot overlay on canvas
      drawShotOverlay(shot);
    };

    hardwareAPIRef.current.on('shotDetected', handleShotDetected);
    
    return () => {
      hardwareAPIRef.current?.off('shotDetected', handleShotDetected);
    };
  }, [onShotDetected]);

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

  // Connect to hardware
  const connectToHardware = async () => {
    if (!hardwareAPIRef.current) return;
    
    try {
      setError('');
      await hardwareAPIRef.current.connect();
      
      // Get current configuration
      const config = await hardwareAPIRef.current.getTargetConfiguration();
      setCurrentConfig(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to hardware');
    }
  };

  // Disconnect from hardware
  const disconnectFromHardware = async () => {
    if (!hardwareAPIRef.current) return;
    
    try {
      await hardwareAPIRef.current.disconnect();
      setStreamUrl('');
      setIsSessionActive(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect from hardware');
    }
  };

  // Start shooting session
  const startSession = async () => {
    if (!hardwareAPIRef.current || !sessionId) return;
    
    try {
      setError('');
      await hardwareAPIRef.current.startSession(sessionId);
      setIsSessionActive(true);
      setShots([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  };

  // Stop shooting session
  const stopSession = async () => {
    if (!hardwareAPIRef.current) return;
    
    try {
      setError('');
      await hardwareAPIRef.current.stopSession();
      setIsSessionActive(false);
      onSessionComplete?.(shots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop session');
    }
  };

  // Draw shot overlay on canvas
  const drawShotOverlay = useCallback((shot: ShotDetection) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear previous overlay after a delay
    setTimeout(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 2000);
    
    // Draw shot marker
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 10, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw crosshair
    ctx.beginPath();
    ctx.moveTo(shot.x - 15, shot.y);
    ctx.lineTo(shot.x + 15, shot.y);
    ctx.moveTo(shot.x, shot.y - 15);
    ctx.lineTo(shot.x, shot.y + 15);
    ctx.stroke();
    
    // Draw score
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${shot.score}`, shot.x, shot.y - 20);
  }, []);

  // Update target configuration
  const updateConfiguration = async (config: Partial<TargetConfiguration>) => {
    if (!hardwareAPIRef.current) return;
    
    try {
      const updatedConfig = await hardwareAPIRef.current.setTargetConfiguration(config);
      setCurrentConfig(updatedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    }
  };

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
                {isSessionActive && (
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

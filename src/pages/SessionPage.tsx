import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  CameraOff, 
  Play, 
  Square, 
  Save, 
  ArrowLeft,
  Target,
  Activity,
  Clock
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge-2';
import { LiveTargetView } from '../components/LiveTargetView';
import { SessionAnalyticsDashboard } from '../components/SessionAnalyticsDashboard';
import { useHardware } from '../hooks/useHardware';

export const SessionPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isConnected,
    isConnecting,
    connectionError,
    connectedDevice,
    latestFrame,
    recentShots,
    activeSession,
    isSessionActive,
    connectToDevice,
    disconnectDevice,
    startSession,
    stopSession
  } = useHardware();

  // Handle session control
  const handleStartSession = async () => {
    if (!connectedDevice) return;
    
    try {
      await startSession(connectedDevice.id, 'user-id'); // TODO: Get actual user ID from auth
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    
    try {
      await stopSession(activeSession.sessionId);
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    
    try {
      await stopSession(activeSession.sessionId);
      navigate('/history');
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const handleDisconnect = async () => {
    if (!connectedDevice) return;
    
    try {
      await disconnectDevice(connectedDevice.id);
      navigate('/connect');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleBackToConnect = () => {
    navigate('/connect');
  };

  // If not connected, show connection prompt
  if (!isConnected && !isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8">
              <CameraOff className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-4">No Device Connected</h1>
              <p className="text-slate-300 mb-6">
                Please connect to your GMShoot device to start a session
              </p>
              <Button
                onClick={handleBackToConnect}
                size="lg"
                className="w-full max-w-xs"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Go to Connection Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If connecting, show loading state
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-white mb-4">Connecting to Device</h1>
              <p className="text-slate-300">
                Establishing connection to your GMShoot device...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleBackToConnect}
                className="text-slate-300 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Connect
              </Button>
              
              <div className="flex items-center space-x-2">
                <Badge variant={isConnected ? "success" : "destructive"}>
                  <Camera className="h-4 w-4 mr-2" />
                  {connectedDevice?.name || 'Connected Device'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isSessionActive && (
                <Badge variant="success" className="animate-pulse">
                  <Activity className="h-4 w-4 mr-2" />
                  Session Active
                </Badge>
              )}
              {!isSessionActive && activeSession && (
                <Badge variant="warning">
                  <Square className="h-4 w-4 mr-2" />
                  Session Paused
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Live View */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Live Target View
                </CardTitle>
                <CardDescription>
                  Real-time analysis of your shooting session
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <LiveTargetView />
              </CardContent>
            </Card>
          </div>

          {/* Session Controls and Analytics */}
          <div className="space-y-6">
            {/* Session Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Session Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!activeSession ? (
                  <Button
                    onClick={handleStartSession}
                    disabled={!isConnected}
                    size="lg"
                    className="w-full"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Session
                  </Button>
                ) : isSessionActive ? (
                  <Button
                    onClick={handleStopSession}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Pause Session
                  </Button>
                ) : activeSession && !isSessionActive ? (
                  <Button
                    onClick={handleStartSession}
                    size="lg"
                    className="w-full"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Resume Session
                  </Button>
                ) : null}

                {activeSession && (
                  <Button
                    onClick={handleEndSession}
                    variant="destructive"
                    size="lg"
                    className="w-full"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    End & Save Session
                  </Button>
                )}

                <Button
                  onClick={handleDisconnect}
                  variant="ghost"
                  size="lg"
                  className="w-full"
                >
                  <CameraOff className="h-5 w-5 mr-2" />
                  Disconnect Device
                </Button>
              </CardContent>
            </Card>

            {/* Session Analytics */}
            <SessionAnalyticsDashboard
              sessions={activeSession ? [activeSession] : []}
              shots={recentShots}
              currentSession={activeSession}
              liveData={{
                currentAccuracy: recentShots.length > 0
                  ? recentShots.reduce((sum, shot) => sum + shot.score, 0) / recentShots.length
                  : 0,
                recentShots: recentShots.slice(-5),
                sessionDuration: activeSession?.startTime
                  ? (Date.now() - activeSession.startTime.getTime()) / 1000
                  : 0
              }}
            />

            {/* Connection Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Session Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device:</span>
                    <span className="text-white font-medium">{connectedDevice?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-white font-medium capitalize">
                      {isSessionActive ? 'Active' : activeSession ? 'Paused' : 'Not Started'}
                    </span>
                  </div>
                  {activeSession?.startTime && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Started:</span>
                      <span className="text-white font-medium">
                        {new Date(activeSession.startTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {latestFrame && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Frame:</span>
                      <span className="text-white font-medium">
                        {new Date(latestFrame.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {connectionError && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <Card className="border-red-500 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CameraOff className="h-5 w-5 text-red-500" />
                <p className="text-red-700 text-sm font-medium">{connectionError}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SessionPage;
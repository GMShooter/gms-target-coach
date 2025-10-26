import React from 'react';

import { useSessionManager } from '../hooks/useSessionManager';
import type { PiDevice } from '../services/HardwareAPI';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge-2';
import { Alert, AlertDescription } from './ui/alert';

interface SessionManagerProps {
  deviceId: string;
  device: PiDevice;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ deviceId, device }) => {
  const [sessionConfig, setSessionConfig] = React.useState({
    targetDistance: 10, // meters
    targetSize: 0.5, // meters
    detectionSensitivity: 75, // percentage
    zoomPreset: 1
  });

  const {
    currentSession,
    isConnected,
    isLoading,
    error,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    emergencyStop,
    clearError
  } = useSessionManager(deviceId);

  // Handle session start
  const handleStartSession = async () => {
    clearError();
    await startSession(deviceId, {
      targetDistance: sessionConfig.targetDistance,
      targetSize: sessionConfig.targetSize,
      zoomPreset: sessionConfig.zoomPreset,
      detectionSensitivity: sessionConfig.detectionSensitivity
    });
  };

  // Handle session stop
  const handleStopSession = async () => {
    if (currentSession) {
      await stopSession(currentSession.sessionId);
    }
  };

  // Handle session pause/resume
  const handleTogglePause = async () => {
    if (currentSession) {
      if (currentSession.status === 'paused') {
        await resumeSession(currentSession.sessionId);
      } else {
        await pauseSession(currentSession.sessionId);
      }
    }
  };

  // Handle emergency stop
  const handleEmergencyStop = async () => {
    if (currentSession) {
      await emergencyStop(currentSession.sessionId);
    }
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Session Configuration */}
      {!currentSession && (
        <Card>
          <CardHeader>
            <CardTitle>Session Configuration</CardTitle>
            <CardDescription>
              Configure your shooting session parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Target Distance (meters)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={sessionConfig.targetDistance}
                  onChange={(e) => setSessionConfig(prev => ({
                    ...prev,
                    targetDistance: parseFloat(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Target Size (meters)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={sessionConfig.targetSize}
                  onChange={(e) => setSessionConfig(prev => ({
                    ...prev,
                    targetSize: parseFloat(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Detection Sensitivity (%)
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={sessionConfig.detectionSensitivity}
                  onChange={(e) => setSessionConfig(prev => ({
                    ...prev,
                    detectionSensitivity: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600">
                  {sessionConfig.detectionSensitivity}%
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Zoom Preset
                </label>
                <select
                  value={sessionConfig.zoomPreset}
                  onChange={(e) => setSessionConfig(prev => ({
                    ...prev,
                    zoomPreset: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1x (Wide)</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                  <option value={5}>5x</option>
                  <option value={10}>10x (Telephoto)</option>
                </select>
              </div>
            </div>
            <Button
              onClick={handleStartSession}
              disabled={isLoading || !isConnected}
              className="w-full"
            >
              {isLoading ? 'Starting...' : 'Start Session'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Session Display */}
      {currentSession && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Session</CardTitle>
                <CardDescription>
                  Session ID: {currentSession.sessionId}
                </CardDescription>
              </div>
              <Badge variant={currentSession.status === 'active' ? 'primary' : 'secondary'}>
                {currentSession.status === 'active' ? 'Active' : 
                 currentSession.status === 'paused' ? 'Paused' : 'Unknown'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Session Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentSession.shotCount}
                </div>
                <div className="text-sm text-gray-600">Shots</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatUptime(Math.floor((Date.now() - currentSession.startTime.getTime()) / 1000))}
                </div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {sessionConfig.targetDistance}m
                </div>
                <div className="text-sm text-gray-600">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {sessionConfig.detectionSensitivity}%
                </div>
                <div className="text-sm text-gray-600">Sensitivity</div>
              </div>
            </div>

            {/* Session Controls */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleTogglePause}
                disabled={isLoading}
                variant={currentSession.status === 'paused' ? 'default' : 'outline'}
              >
                {currentSession.status === 'paused' ? 'Resume' : 'Pause'}
              </Button>
              <Button
                onClick={handleStopSession}
                disabled={isLoading}
                variant="outline"
              >
                Stop Session
              </Button>
              <Button
                onClick={handleEmergencyStop}
                disabled={isLoading}
                variant="destructive"
              >
                Emergency Stop
              </Button>
            </div>

            {/* Device Status */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Device Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Device:</span>
                  <span className="font-medium">{device.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={device.status === 'online' ? 'success' : 'secondary'}>
                    {device.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Resolution:</span>
                  <span className="font-medium">{device.capabilities.maxResolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Seen:</span>
                  <span className="font-medium">
                    {device.lastSeen.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SessionManager;
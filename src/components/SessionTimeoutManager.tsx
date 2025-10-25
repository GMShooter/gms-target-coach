import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge-2';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionData } from '@/services/HardwareAPI';
import { 
  Clock, 
  AlertTriangle, 
  Timer, 
  Play, 
  Pause, 
  RotateCcw,
  Plus,
  Settings,
  X
} from 'lucide-react';

interface SessionTimeoutManagerProps {
  session: SessionData | null;
  onSessionTimeout: (session: SessionData) => void;
  onSessionExtend: (newEndTime: Date) => void;
  maxSessionDuration?: number;
  warningThreshold?: number;
  autoExtendOnActivity?: boolean;
}

export const SessionTimeoutManager: React.FC<SessionTimeoutManagerProps> = ({
  session,
  onSessionTimeout,
  onSessionExtend,
  maxSessionDuration = 60,
  warningThreshold = 10,
  autoExtendOnActivity = true
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(10);

  const {
    timeRemaining,
    isWarning,
    isExpired,
    isPaused,
    lastActivity,
    startTimeout,
    pauseTimeout,
    resumeTimeout,
    extendSession,
    onTimeout,
    onWarning,
    onExtend,
    formatTimeRemaining,
    sessionEndTime
  } = useSessionTimeout(session, {
    maxSessionDuration,
    warningThreshold,
    autoExtendOnActivity
  });

  // Set up callbacks
  useEffect(() => {
    onTimeout(onSessionTimeout);
    onWarning((remainingTime) => {
      // Could show a toast notification here
      console.warn(`Session warning: ${Math.floor(remainingTime / 60)} minutes remaining`);
    });
    onExtend(onSessionExtend);
  }, [onSessionTimeout, onSessionExtend, onTimeout, onWarning, onExtend]);

  // Handle session extension
  const handleExtendSession = () => {
    extendSession(extendMinutes);
  };

  // Handle timeout settings
  const handleSettingsSave = () => {
    // Settings would be saved to user preferences
    setShowSettings(false);
  };

  // Get progress percentage for visual indicator
  const getProgressPercentage = () => {
    if (!session || maxSessionDuration === 0) return 0;
    const totalSeconds = maxSessionDuration * 60;
    const elapsedSeconds = totalSeconds - timeRemaining;
    return Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));
  };

  // Get status color
  const getStatusColor = () => {
    if (isExpired) return 'destructive';
    if (isWarning) return 'warning';
    if (isPaused) return 'secondary';
    return 'success';
  };

  // Get status text
  const getStatusText = () => {
    if (isExpired) return 'Session Expired';
    if (isPaused) return 'Session Paused';
    if (isWarning) return 'Time Warning';
    return 'Session Active';
  };

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Main timeout display */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              <CardTitle className="text-lg">Session Timer</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor()} className="flex items-center gap-1">
                {isExpired && <AlertTriangle className="h-3 w-3" />}
                {isPaused && <Pause className="h-3 w-3" />}
                {!isExpired && !isPaused && <Play className="h-3 w-3" />}
                {getStatusText()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            {sessionEndTime && (
              <span>Ends at {sessionEndTime.toLocaleTimeString()}</span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Time remaining display */}
          <div className="text-center mb-4">
            <div className={`text-4xl font-bold ${isWarning ? 'text-yellow-600' : isExpired ? 'text-red-600' : 'text-green-600'}`}>
              {formatTimeRemaining}
            </div>
            <div className="text-sm text-muted-foreground">
              {isExpired ? 'Session has ended' : 'Time remaining'}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  isExpired ? 'bg-red-500' : 
                  isWarning ? 'bg-yellow-500' : 
                  isPaused ? 'bg-gray-500' : 'bg-green-500'
                }`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>{Math.round(getProgressPercentage())}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-2">
            {isPaused ? (
              <Button onClick={resumeTimeout} size="sm">
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            ) : (
              <Button onClick={pauseTimeout} size="sm" variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            
            <Button onClick={startTimeout} size="sm" variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
            
            {!isExpired && (
              <Button onClick={handleExtendSession} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Extend {extendMinutes}m
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Timeout Settings</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Configure session timeout behavior
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Max Session Duration</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={maxSessionDuration}
                    disabled
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Warning Threshold</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={warningThreshold}
                    disabled
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Extension Time</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={extendMinutes}
                    onChange={(e) => setExtendMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max="60"
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoExtendOnActivity}
                  disabled
                  className="rounded"
                />
                <label className="text-sm font-medium">Auto-extend on activity</label>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                Last activity: {lastActivity.toLocaleTimeString()}
              </div>
              <Button onClick={handleSettingsSave} size="sm">
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning dialog */}
      {isWarning && !isExpired && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg text-yellow-800">Session Time Warning</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent>
            <p className="text-sm text-yellow-700 mb-3">
              Your session will expire in {Math.floor(timeRemaining / 60)} minutes and {timeRemaining % 60} seconds.
              Extend the session to continue shooting.
            </p>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleExtendSession} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Extend {extendMinutes}m
              </Button>
              <Button onClick={pauseTimeout} size="sm" variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Pause Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired dialog */}
      {isExpired && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg text-red-800">Session Expired</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent>
            <p className="text-sm text-red-700 mb-3">
              Your shooting session has expired. Start a new session to continue.
            </p>
            
            <div className="flex items-center gap-2">
              <Button onClick={startTimeout} size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Start New Session
              </Button>
              <Button onClick={handleExtendSession} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Extend {extendMinutes}m
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SessionTimeoutManager;
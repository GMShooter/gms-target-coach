import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge-2';
import { Alert, AlertDescription } from './ui/alert';
import { hardwareAPI, type SessionData } from '../services/HardwareAPI';

interface SessionHistoryProps {
  onSessionSelect?: (session: SessionData) => void;
  onSessionResume?: (session: SessionData) => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ 
  onSessionSelect, 
  onSessionResume 
}) => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);

  // Load session history
  useEffect(() => {
    const loadSessionHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // In a real implementation, this would load from Supabase
        // For now, we'll use the session history from the session manager
        const sessionHistory = JSON.parse(localStorage.getItem('sessionHistory') || '[]');
        setSessions(sessionHistory);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session history');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionHistory();
  }, []);

  // Handle session selection
  const handleSessionSelect = (session: SessionData) => {
    setSelectedSession(session);
    onSessionSelect?.(session);
  };

  // Handle session resume
  const handleResumeSession = async (session: SessionData) => {
    if (!confirm(`Are you sure you want to resume session ${session.sessionId}?`)) {
      return;
    }

    try {
      // Check if device is still available
      const device = hardwareAPI.getDevice(session.deviceId);
      if (!device || device.status !== 'online') {
        setError('Device is not available for session resume');
        return;
      }

      // Resume session
      await hardwareAPI.startSession(session.deviceId, {
        sessionId: session.sessionId,
        userId: 'current_user', // Get from auth context
        settings: {
          ...session.settings,
          detectionSensitivity: 75 // Default value
        }
      });

      onSessionResume?.(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume session');
    }
  };

  // Handle session deletion
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      // Remove from local storage
      const updatedSessions = sessions.filter(s => s.sessionId !== sessionId);
      setSessions(updatedSessions);
      localStorage.setItem('sessionHistory', JSON.stringify(updatedSessions));
      
      // Clear selection if deleted session was selected
      if (selectedSession?.sessionId === sessionId) {
        setSelectedSession(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  // Format duration
  const formatDuration = (start: Date, end?: Date): string => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Format date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string): 'default' | 'secondary' | 'success' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'default';
      case 'paused':
        return 'warning';
      case 'emergency_stopped':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>
            View and manage your previous shooting sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-lg text-gray-600">Loading session history...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-lg text-gray-600">No session history found</div>
              <p className="text-sm text-gray-500 mt-2">
                Start a new session to begin tracking your shooting performance
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Session List */}
              <div className="grid gap-4">
                {sessions.map((session) => (
                  <Card 
                    key={session.sessionId}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedSession?.sessionId === session.sessionId 
                        ? 'ring-2 ring-blue-500' 
                        : ''
                    }`}
                    onClick={() => handleSessionSelect(session)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{session.sessionId}</h3>
                          <Badge variant={getStatusVariant(session.status) as any}>
                            {session.status === 'active' ? 'Active' :
                             session.status === 'paused' ? 'Paused' :
                             session.status === 'completed' ? 'Completed' :
                             session.status === 'emergency_stopped' ? 'Emergency Stopped' :
                             session.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(session.startTime)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Duration</div>
                          <div className="font-medium">
                            {formatDuration(session.startTime, session.endTime)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Shots</div>
                          <div className="font-medium">{session.shotCount}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Distance</div>
                          <div className="font-medium">{session.settings.targetDistance}m</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Target Size</div>
                          <div className="font-medium">{session.settings.targetSize}m</div>
                        </div>
                      </div>

                      {/* Session Actions */}
                      <div className="flex space-x-2 mt-4">
                        {session.status === 'completed' && (
                          <Button
                            onClick={() => handleResumeSession(session)}
                            variant="outline"
                            size="sm"
                          >
                            Resume
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteSession(session.sessionId)}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Session Details */}
              {selectedSession && (
                <Card>
                  <CardHeader>
                    <CardTitle>Session Details</CardTitle>
                    <CardDescription>
                      Detailed information for {selectedSession.sessionId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Session Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Session ID:</span>
                            <span className="font-medium">{selectedSession.sessionId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Device ID:</span>
                            <span className="font-medium">{selectedSession.deviceId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge variant={getStatusVariant(selectedSession.status) as any}>
                              {selectedSession.status === 'active' ? 'Active' :
                               selectedSession.status === 'paused' ? 'Paused' :
                               selectedSession.status === 'completed' ? 'Completed' :
                               selectedSession.status === 'emergency_stopped' ? 'Emergency Stopped' :
                               selectedSession.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Start Time:</span>
                            <span className="font-medium">{formatDate(selectedSession.startTime)}</span>
                          </div>
                          {selectedSession.endTime && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">End Time:</span>
                              <span className="font-medium">{formatDate(selectedSession.endTime)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Session Settings</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Target Distance:</span>
                            <span className="font-medium">{selectedSession.settings.targetDistance} meters</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Target Size:</span>
                            <span className="font-medium">{selectedSession.settings.targetSize} meters</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Detection Sensitivity:</span>
                            <span className="font-medium">{(selectedSession.settings as any).detectionSensitivity || 75}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Session Actions */}
                    <div className="flex space-x-2 pt-4 border-t">
                      {selectedSession.status === 'completed' && (
                        <Button
                          onClick={() => handleResumeSession(selectedSession)}
                          className="flex-1"
                        >
                          Resume Session
                        </Button>
                      )}
                      <Button
                        onClick={() => setSelectedSession(null)}
                        variant="outline"
                        className="flex-1"
                      >
                        Close Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionHistory;
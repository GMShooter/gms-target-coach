import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, 
  Upload, 
  Download, 
  Trash2, 
  RefreshCw, 
  Clock,
  Database,
  FileJson,
  CheckCircle,
  AlertTriangle,
  Info,
  RotateCcw,
  HardDrive
} from 'lucide-react';

import { useSessionPersistence, StoredSession } from '../hooks/useSessionPersistence';
import { SessionData } from '../services/HardwareAPI';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge-2';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';


interface SessionPersistenceManagerProps {
  currentSession?: SessionData | null;
  onSessionRecovered?: (session: SessionData) => void;
  showDetails?: boolean;
  maxVisibleSessions?: number;
}

export const SessionPersistenceManager: React.FC<SessionPersistenceManagerProps> = ({
  currentSession,
  onSessionRecovered,
  showDetails = true,
  maxVisibleSessions = 5
}) => {
  const {
    storedSessions,
    isSaving,
    lastSaveTime,
    saveSession,
    recoverSession,
    deleteStoredSession,
    clearAllSessions,
    getRecoverableSessions,
    exportSessions,
    importSessions,
    getStorageStats
  } = useSessionPersistence();

  const [showAllSessions, setShowAllSessions] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recoverableSessions = getRecoverableSessions();
  const visibleSessions = showAllSessions ? recoverableSessions : recoverableSessions.slice(0, maxVisibleSessions);
  const storageStats = getStorageStats();

  // Auto-save current session when it changes
  useEffect(() => {
    if (currentSession) {
      saveSession(currentSession);
    }
  }, [currentSession, saveSession]);

  const handleSessionRecovery = async (sessionId: string) => {
    try {
      const recoveredSession = recoverSession(sessionId);
      if (recoveredSession) {
        onSessionRecovered?.(recoveredSession);
        setSelectedSessionId(sessionId);
      }
    } catch (error) {
      console.error('Failed to recover session:', error);
    }
  };

  const handleSessionDelete = (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this saved session?')) {
      deleteStoredSession(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all saved sessions? This cannot be undone.')) {
      clearAllSessions();
      setSelectedSessionId(null);
    }
  };

  const handleExport = () => {
    exportSessions();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importSessions(file);
      setImportResult(result);
      
      if (result.success) {
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: false,
        errors: ['Import failed: ' + error],
        warnings: []
      });
    } finally {
      setIsImporting(false);
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const duration = end.getTime() - startTime.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'secondary';
      case 'emergency_stopped': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Storage Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Session Storage
          </CardTitle>
          <CardDescription>
            Local storage statistics and management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{storageStats.totalSessions}</div>
              <div className="text-xs text-muted-foreground">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{storageStats.recoverableSessions}</div>
              <div className="text-xs text-muted-foreground">Recoverable</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{storageStats.storageSizeFormatted}</div>
              <div className="text-xs text-muted-foreground">Storage Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {storageStats.isAutoSaveEnabled ? 'On' : 'Off'}
              </div>
              <div className="text-xs text-muted-foreground">Auto-Save</div>
            </div>
          </div>

          {lastSaveTime && (
            <div className="text-sm text-muted-foreground">
              Last saved: {formatDate(lastSaveTime)}
            </div>
          )}

          {/* Storage Usage Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Storage Usage</span>
              <span>{storageStats.storageSizeFormatted}</span>
            </div>
            <Progress 
              value={Math.min((storageStats.storageSize / (5 * 1024 * 1024)) * 100, 100)} 
              className="h-2" 
            />
            <div className="text-xs text-muted-foreground">
              Using {storageStats.storageSizeFormatted} of ~5MB localStorage
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={storedSessions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={storedSessions.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Import Result */}
      {importResult && (
        <Alert variant={importResult.success ? "default" : "destructive"}>
          <AlertTitle className="flex items-center gap-2">
            {importResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            Import {importResult.success ? 'Successful' : 'Failed'}
          </AlertTitle>
          <AlertDescription>
            {importResult.success ? (
              <div>
                Successfully imported {importResult.recoveredSessions.length} sessions.
                {importResult.warnings && importResult.warnings.length > 0 && (
                  <div className="mt-2">
                    <strong>Warnings:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {importResult.warnings.map((warning: string, index: number) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <strong>Errors:</strong>
                <ul className="list-disc list-inside mt-1">
                  {importResult.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Session Status */}
      {currentSession && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Current Session
            </CardTitle>
            <CardDescription>
              Active session status and auto-save information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{currentSession.sessionId}</div>
                <div className="text-sm text-muted-foreground">
                  Started: {formatDate(currentSession.startTime)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getSessionStatusColor(currentSession.status)}>
                  {currentSession.status.replace('_', ' ')}
                </Badge>
                {isSaving && (
                  <Badge variant="secondary">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Saving
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Duration:</span>
                <div>{formatDuration(currentSession.startTime, currentSession.endTime)}</div>
              </div>
              <div>
                <span className="font-medium">Shots:</span>
                <div>{currentSession.shotCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Sessions */}
      {recoverableSessions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recoverable Sessions ({recoverableSessions.length})
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllSessions(!showAllSessions)}
              >
                {showAllSessions ? 'Show Less' : `Show ${recoverableSessions.length - maxVisibleSessions} More`}
              </Button>
            </CardTitle>
            <CardDescription>
              Sessions that can be recovered and resumed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleSessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedSessionId === session.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{session.id}</h4>
                      <Badge variant={getSessionStatusColor(session.sessionData.status)}>
                        {session.sessionData.status.replace('_', ' ')}
                      </Badge>
                      {selectedSessionId === session.id && (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Started:</span>
                        <div>{formatDate(session.sessionData.startTime)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span>
                        <div>{formatDuration(session.sessionData.startTime, session.sessionData.endTime)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Shots:</span>
                        <div>{session.sessionData.shotCount}</div>
                      </div>
                      <div>
                        <span className="font-medium">Saved:</span>
                        <div>{formatDate(session.lastSaved)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSessionRecovery(session.id)}
                      disabled={selectedSessionId === session.id}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSessionDelete(session.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Session Details */}
                {showDetails && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Device ID:</span>
                        <div className="text-muted-foreground">{session.sessionData.deviceId}</div>
                      </div>
                      <div>
                        <span className="font-medium">Target Distance:</span>
                        <div className="text-muted-foreground">{session.sessionData.settings.targetDistance}m</div>
                      </div>
                      <div>
                        <span className="font-medium">Target Size:</span>
                        <div className="text-muted-foreground">{session.sessionData.settings.targetSize}cm</div>
                      </div>
                      <div>
                        <span className="font-medium">Version:</span>
                        <div className="text-muted-foreground">{session.metadata.version}</div>
                      </div>
                    </div>
                    
                    {session.shots.length > 0 && (
                      <div className="mt-2">
                        <span className="font-medium">Recent Shots:</span>
                        <div className="text-muted-foreground">
                          {session.shots.slice(-3).map((shot, index) => (
                            <div key={index} className="flex justify-between">
                              <span>Shot {shot.shotId}</span>
                              <span>Score: {shot.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Show More/Less Button */}
            {recoverableSessions.length > maxVisibleSessions && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllSessions(!showAllSessions)}
                >
                  {showAllSessions ? 'Show Less' : `Show ${recoverableSessions.length - maxVisibleSessions} More`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <HardDrive className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Recoverable Sessions</h3>
              <p>Complete or save active sessions to enable recovery</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SessionPersistenceManager;
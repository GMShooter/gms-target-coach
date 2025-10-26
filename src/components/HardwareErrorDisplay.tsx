import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  X, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

import { useHardwareErrorHandler, HardwareError } from '../hooks/useHardwareErrorHandler';

import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge-2';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';

interface HardwareErrorDisplayProps {
  onRetryAll?: () => void;
  onClearAll?: () => void;
  showDetails?: boolean;
  maxVisibleErrors?: number;
}

export const HardwareErrorDisplay: React.FC<HardwareErrorDisplayProps> = ({
  onRetryAll,
  onClearAll,
  showDetails = true,
  maxVisibleErrors = 5
}) => {
  const {
    errors,
    connectionStatus,
    isReconnecting,
    lastConnectedTime,
    connectionDowntime,
    resolveError,
    clearAllErrors,
    retryAllConnections,
    getErrorStats
  } = useHardwareErrorHandler();

  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);

  const errorStats = getErrorStats();
  const visibleErrors = showAllErrors ? errors : errors.slice(0, maxVisibleErrors);
  const unresolvedErrors = errors.filter(e => !e.resolved);

  const toggleErrorExpansion = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertCircle className="h-4 w-4" />;
      case 'low': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'connection': return <WifiOff className="h-4 w-4" />;
      case 'device': return <AlertTriangle className="h-4 w-4" />;
      case 'session': return <Clock className="h-4 w-4" />;
      case 'data': return <AlertCircle className="h-4 w-4" />;
      case 'permission': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDowntime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-5 w-5 text-red-500" />;
      default:
        return <WifiOff className="h-5 w-5 text-gray-500" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return isReconnecting ? 'Reconnecting...' : 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const handleRetryAll = () => {
    retryAllConnections();
    onRetryAll?.();
  };

  const handleClearAll = () => {
    clearAllErrors();
    onClearAll?.();
  };

  return (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {getConnectionStatusIcon()}
            Hardware Connection Status
          </CardTitle>
          <CardDescription>
            Current status and connection information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={connectionStatus === 'connected' ? 'success' : 'destructive'}>
                {getConnectionStatusText()}
              </Badge>
              {isReconnecting && (
                <Badge variant="secondary">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Reconnecting
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryAll}
                disabled={connectionStatus === 'connected' || isReconnecting}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={errors.length === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>

          {lastConnectedTime && (
            <div className="text-sm text-muted-foreground">
              Last connected: {lastConnectedTime.toLocaleString()}
            </div>
          )}

          {connectionDowntime > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Downtime:</span>
                <span className="font-mono">{formatDowntime(connectionDowntime)}</span>
              </div>
              <Progress value={Math.min((connectionDowntime / 60000) * 100, 100)} className="h-2" />
            </div>
          )}

          {/* Error Statistics */}
          {errorStats.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{errorStats.unresolved}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{errorStats.resolved}</div>
                <div className="text-xs text-muted-foreground">Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{errorStats.byType.connection || 0}</div>
                <div className="text-xs text-muted-foreground">Connection</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{errorStats.byType.device || 0}</div>
                <div className="text-xs text-muted-foreground">Device</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Errors List */}
      {unresolvedErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Errors ({unresolvedErrors.length})
            </CardTitle>
            <CardDescription>
              Recent hardware errors and their status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleErrors.map((error) => (
              <Alert
                key={error.id}
                variant={error.resolved ? "default" : "destructive"}
                className="relative"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      {getSeverityIcon(error.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <AlertTitle className="flex items-center gap-2 text-sm">
                        {getTypeIcon(error.type)}
                        <span className="truncate">{error.message}</span>
                        <Badge variant={getSeverityColor(error.severity)} className="ml-2">
                          {error.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription className="mt-1">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatTime(error.timestamp)}</span>
                          <span className="capitalize">{error.type}</span>
                          {error.retryCount !== undefined && error.retryCount > 0 && (
                            <span>Retry {error.retryCount}/{error.maxRetries}</span>
                          )}
                          {error.nextRetryTime && (
                            <span>Next retry: {formatTime(error.nextRetryTime)}</span>
                          )}
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    {!error.resolved && error.autoRetry && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {/* Retry is automatic */}}
                        disabled
                      >
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      </Button>
                    )}
                    
                    {showDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleErrorExpansion(error.id)}
                      >
                        {expandedErrors.has(error.id) ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    
                    {!error.resolved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolveError(error.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Error Details */}
                {showDetails && expandedErrors.has(error.id) && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Error ID:</span>
                        <div className="font-mono text-xs text-muted-foreground break-all">
                          {error.id}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Timestamp:</span>
                        <div className="text-muted-foreground">
                          {error.timestamp.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>
                        <div className="capitalize text-muted-foreground">
                          {error.type}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Severity:</span>
                        <div className="capitalize text-muted-foreground">
                          {error.severity}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Auto Retry:</span>
                        <div className="text-muted-foreground">
                          {error.autoRetry ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <div className="text-muted-foreground">
                          {error.resolved ? 'Resolved' : 'Active'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Alert>
            ))}

            {/* Show More/Less Button */}
            {errors.length > maxVisibleErrors && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllErrors(!showAllErrors)}
                >
                  {showAllErrors ? 'Show Less' : `Show ${errors.length - maxVisibleErrors} More`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Errors State */}
      {unresolvedErrors.length === 0 && connectionStatus === 'connected' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">All Systems Operational</h3>
              <p>No active hardware errors detected</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HardwareErrorDisplay;
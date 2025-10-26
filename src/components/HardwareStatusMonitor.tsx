import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Cpu, 
  Camera, 
  Zap, 
  Thermometer,
  Activity,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Router,
  Battery
} from 'lucide-react';

import { HardwareAPI, PiDevice } from '../services/HardwareAPI';
import { useHardwareErrorHandler } from '../hooks/useHardwareErrorHandler';
import { useWebSocket } from '../hooks/useWebSocket';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge-2';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';


interface HardwareStatusMonitorProps {
  hardwareAPI: HardwareAPI;
  onDeviceSelect?: (device: PiDevice) => void;
  showDetails?: boolean;
  refreshInterval?: number;
}

interface DeviceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  temperature: number;
  batteryLevel?: number;
  signalStrength: number;
  uptime: number;
  lastPing: number;
}

export const HardwareStatusMonitor: React.FC<HardwareStatusMonitorProps> = ({
  hardwareAPI,
  onDeviceSelect,
  showDetails = true,
  refreshInterval = 5000
}) => {
  const [devices, setDevices] = useState<PiDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<PiDevice | null>(null);
  const [deviceMetrics, setDeviceMetrics] = useState<Map<string, DeviceMetrics>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  const { connectionStatus, isReconnecting } = useHardwareErrorHandler();

  // Refresh device list and metrics
  const refreshDeviceStatus = async () => {
    setIsRefreshing(true);
    try {
      const connectedDevices = hardwareAPI.getConnectedDevices();
      setDevices(connectedDevices);
      
      // Get metrics for each device
      const newMetrics = new Map<string, DeviceMetrics>();
      
      for (const device of connectedDevices) {
        try {
          // Simulate device metrics - in real implementation, this would come from device API
          const metrics: DeviceMetrics = {
            cpuUsage: Math.random() * 100,
            memoryUsage: Math.random() * 100,
            temperature: 40 + Math.random() * 30,
            batteryLevel: device.capabilities.hasCamera ? Math.random() * 100 : undefined,
            signalStrength: 50 + Math.random() * 50,
            uptime: Date.now() - device.lastSeen.getTime(),
            lastPing: 50 + Math.random() * 100
          };
          
          newMetrics.set(device.id, metrics);
        } catch (error) {
          console.error(`Failed to get metrics for device ${device.id}:`, error);
        }
      }
      
      setDeviceMetrics(newMetrics);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Failed to refresh device status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh device status
  useEffect(() => {
    refreshDeviceStatus();
    
    const interval = setInterval(() => {
      refreshDeviceStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getDeviceStatusColor = (device: PiDevice) => {
    switch (device.status) {
      case 'online': return 'success';
      case 'connecting': return 'warning';
      case 'offline': return 'destructive';
      default: return 'secondary';
    }
  };

  const getDeviceStatusIcon = (device: PiDevice) => {
    switch (device.status) {
      case 'online': return <CheckCircle className="h-4 w-4" />;
      case 'connecting': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'offline': return <WifiOff className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSignalStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-green-500';
    if (strength >= 60) return 'text-yellow-500';
    if (strength >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getTemperatureColor = (temp: number) => {
    if (temp >= 80) return 'text-red-500';
    if (temp >= 70) return 'text-orange-500';
    if (temp >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 90) return 'text-red-500';
    if (usage >= 75) return 'text-orange-500';
    if (usage >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatUptime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleDeviceSelect = (device: PiDevice) => {
    setSelectedDevice(device);
    onDeviceSelect?.(device);
  };

  return (
    <div className="space-y-4">
      {/* Overall Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Hardware Status Monitor
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={connectionStatus === 'connected' ? 'success' : 'destructive'}>
                {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDeviceStatus}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Real-time monitoring of connected shooting hardware devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{devices.length}</div>
              <div className="text-xs text-muted-foreground">Connected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {devices.filter(d => d.status === 'online').length}
              </div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {devices.filter(d => d.status === 'connecting').length}
              </div>
              <div className="text-xs text-muted-foreground">Connecting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {devices.filter(d => d.status === 'offline').length}
              </div>
              <div className="text-xs text-muted-foreground">Offline</div>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Last updated: {lastRefreshTime.toLocaleTimeString()}
          </div>
        </CardContent>
      </Card>

      {/* Device List */}
      {devices.length > 0 ? (
        <div className="space-y-4">
          {devices.map((device) => {
            const metrics = deviceMetrics.get(device.id);
            const isSelected = selectedDevice?.id === device.id;
            
            return (
              <Card 
                key={device.id} 
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                }`}
                onClick={() => handleDeviceSelect(device)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDeviceStatusIcon(device)}
                      <span>{device.name}</span>
                      <Badge variant={getDeviceStatusColor(device)}>
                        {device.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {device.capabilities.hasCamera && (
                        <Camera className="h-4 w-4 text-blue-500" />
                      )}
                      {device.capabilities.hasZoom && (
                        <Settings className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {device.url} • Last seen: {device.lastSeen.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                
                {showDetails && metrics && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* CPU Usage */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Cpu className="h-4 w-4" />
                          <span>CPU</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={metrics.cpuUsage} className="flex-1" />
                          <span className={`text-sm font-mono ${getUsageColor(metrics.cpuUsage)}`}>
                            {Math.round(metrics.cpuUsage)}%
                          </span>
                        </div>
                      </div>

                      {/* Memory Usage */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="h-4 w-4" />
                          <span>Memory</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={metrics.memoryUsage} className="flex-1" />
                          <span className={`text-sm font-mono ${getUsageColor(metrics.memoryUsage)}`}>
                            {Math.round(metrics.memoryUsage)}%
                          </span>
                        </div>
                      </div>

                      {/* Temperature */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Thermometer className="h-4 w-4" />
                          <span>Temp</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={(metrics.temperature / 100) * 100} className="flex-1" />
                          <span className={`text-sm font-mono ${getTemperatureColor(metrics.temperature)}`}>
                            {Math.round(metrics.temperature)}°C
                          </span>
                        </div>
                      </div>

                      {/* Signal Strength */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Wifi className="h-4 w-4" />
                          <span>Signal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={metrics.signalStrength} className="flex-1" />
                          <span className={`text-sm font-mono ${getSignalStrengthColor(metrics.signalStrength)}`}>
                            {Math.round(metrics.signalStrength)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>Uptime: {formatUptime(metrics.uptime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4" />
                        <span>Ping: {Math.round(metrics.lastPing)}ms</span>
                      </div>
                      {metrics.batteryLevel !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <Battery className="h-4 w-4" />
                          <span>Battery: {Math.round(metrics.batteryLevel)}%</span>
                        </div>
                      )}
                    </div>

                    {/* Device Capabilities */}
                    <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
                      <span>Max Resolution: {device.capabilities.maxResolution}</span>
                      <span>•</span>
                      <span>Formats: {device.capabilities.supportedFormats.join(', ')}</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <WifiOff className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Devices Connected</h3>
              <p>Connect to shooting hardware devices to monitor their status</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Device Details */}
      {selectedDevice && showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Router className="h-5 w-5" />
              Device Details: {selectedDevice.name}
            </CardTitle>
            <CardDescription>
              Detailed information and configuration for selected device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Connection Information</h4>
                <div className="space-y-1 text-sm">
                  <div>Device ID: {selectedDevice.id}</div>
                  <div>URL: {selectedDevice.url}</div>
                  <div>Status: {selectedDevice.status}</div>
                  <div>Last Seen: {selectedDevice.lastSeen.toLocaleString()}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Capabilities</h4>
                <div className="space-y-1 text-sm">
                  <div>Camera: {selectedDevice.capabilities.hasCamera ? 'Yes' : 'No'}</div>
                  <div>Zoom: {selectedDevice.capabilities.hasZoom ? 'Yes' : 'No'}</div>
                  <div>Max Resolution: {selectedDevice.capabilities.maxResolution}</div>
                  <div>Supported Formats: {selectedDevice.capabilities.supportedFormats.join(', ')}</div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedDevice(null)}>
                Close Details
              </Button>
              <Button onClick={() => {/* Handle device configuration */}}>
                Configure Device
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HardwareStatusMonitor;
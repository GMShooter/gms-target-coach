/* eslint-disable import/order */
import React, { useState, useEffect, useCallback } from 'react';

import { CheckCircle, XCircle, AlertCircle, RefreshCw, Wifi, Database, Cloud, Camera } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge-2';
import { Button } from './ui/button';
import { env } from '../utils/env';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'checking';
  responseTime?: number;
  error?: string;
  lastChecked: Date;
  icon: React.ReactNode;
}

interface MicroservicesHealthCheckProps {
  onStatusChange?: (statuses: ServiceStatus[]) => void;
}

export const MicroservicesHealthCheck: React.FC<MicroservicesHealthCheckProps> = ({ 
  onStatusChange 
}) => {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Supabase Database',
      url: `${env.VITE_SUPABASE_URL}/rest/v1/`,
      status: 'checking',
      lastChecked: new Date(),
      icon: <Database className="h-4 w-4" />
    },
    {
      name: 'Supabase Edge Functions',
      url: `${env.VITE_SUPABASE_URL}/functions/v1/`,
      status: 'checking',
      lastChecked: new Date(),
      icon: <Cloud className="h-4 w-4" />
    },
    {
      name: 'Health Check Service',
      url: `${env.VITE_SUPABASE_URL}/functions/v1/health-check`,
      status: 'checking',
      lastChecked: new Date(),
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      name: 'Camera Proxy Service',
      url: `${env.VITE_SUPABASE_URL}/functions/v1/camera-proxy`,
      status: 'checking',
      lastChecked: new Date(),
      icon: <Camera className="h-4 w-4" />
    },
    {
      name: 'Roboflow API',
      url: env.VITE_ROBOFLOW_URL || 'https://detect.roboflow.com',
      status: 'checking',
      lastChecked: new Date(),
      icon: <Wifi className="h-4 w-4" />
    }
  ]);

  const [isCheckingAll, setIsCheckingAll] = useState(false);

  const checkServiceHealth = async (service: ServiceStatus): Promise<ServiceStatus> => {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(service.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          ...service,
          status: 'healthy',
          responseTime,
          lastChecked: new Date()
        };
      } else {
        return {
          ...service,
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}`,
          lastChecked: new Date()
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        ...service,
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      };
    }
  };


  const checkAllServicesCallback = useCallback(async () => {
    setIsCheckingAll(true);
    
    const updatedServices = await Promise.all(
      services.map(service => checkServiceHealth(service))
    );
    
    setServices(updatedServices);
    onStatusChange?.(updatedServices);
    setIsCheckingAll(false);
  }, [services, onStatusChange]);

  // Check services on component mount
  useEffect(() => {
    checkAllServicesCallback();
    
    // Set up periodic health checks (every 30 seconds)
    const interval = setInterval(checkAllServicesCallback, 30000);
    
    return () => clearInterval(interval);
  }, [checkAllServicesCallback]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="success" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="secondary" className="animate-pulse">Checking</Badge>;
    }
  };

  const getResponseTimeColor = (responseTime?: number) => {
    if (!responseTime) return 'text-gray-500';
    if (responseTime < 500) return 'text-green-500';
    if (responseTime < 1500) return 'text-yellow-500';
    return 'text-red-500';
  };

  const overallHealth = services.filter(s => s.status === 'healthy').length === services.length;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {overallHealth ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            Microservices Health Check
          </div>
          <Button
            onClick={checkAllServicesCallback}
            disabled={isCheckingAll}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingAll ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Real-time status of all microservices and external APIs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Status */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium">Overall Status:</span>
              {overallHealth ? (
                <Badge variant="success" className="bg-green-100 text-green-800">
                  All Systems Operational
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Some Issues Detected
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Last checked: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Individual Service Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service, index) => (
              <div key={index} className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {service.icon}
                    <span className="font-medium text-sm">{service.name}</span>
                  </div>
                  {getStatusIcon(service.status)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    {getStatusBadge(service.status)}
                  </div>
                  
                  {service.responseTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Response Time:</span>
                      <span className={`text-sm font-medium ${getResponseTimeColor(service.responseTime)}`}>
                        {service.responseTime}ms
                      </span>
                    </div>
                  )}
                  
                  {service.error && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm text-gray-600">Error:</span>
                      <span className="text-sm text-red-600 flex-1 break-all">
                        {service.error}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">URL:</span>
                    <span className="text-xs text-gray-500 truncate max-w-[200px]">
                      {service.url}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Health Check Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Health Check Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {services.filter(s => s.status === 'healthy').length}
                </div>
                <div className="text-gray-600">Healthy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {services.filter(s => s.status === 'unhealthy').length}
                </div>
                <div className="text-gray-600">Unhealthy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {services.length}
                </div>
                <div className="text-gray-600">Total Services</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {services.filter(s => s.responseTime && s.responseTime < 1000).length}
                </div>
                <div className="text-gray-600">{'<1s Response'}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MicroservicesHealthCheck;
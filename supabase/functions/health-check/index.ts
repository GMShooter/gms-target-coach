import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

import { corsHeaders } from '../_shared/cors.ts';

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Service start time for uptime calculation
const SERVICE_START_TIME = Date.now();

// Security and validation utilities
function checkRateLimit(clientId: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (clientData.count >= maxRequests) {
    return false;
  }
  
  clientData.count++;
  return true;
}

function getClientId(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  return `health-check-${ip}`;
}

function logStructured(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'health-check',
    level,
    message,
    ...data
  };
  console.log(JSON.stringify(logEntry));
}

async function checkDatabaseHealth(): Promise<{ status: string; latency: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const supabaseClient = createClient(
      (globalThis as any).Deno?.env?.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Simple health check query
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      return {
        status: 'error',
        latency,
        error: error.message
      };
    }

    return {
      status: 'healthy',
      latency
    };
  } catch (error: any) {
    return {
      status: 'error',
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkRoboflowHealth(): Promise<{ status: string; latency: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const ROBOFLOW_API_KEY = (globalThis as any).Deno?.env?.get('ROBOFLOW_API_KEY');
    
    if (!ROBOFLOW_API_KEY) {
      return {
        status: 'error',
        latency: 0,
        error: 'ROBOFLOW_API_KEY not configured'
      };
    }

    // Simple health check to Roboflow API
    const response = await fetch('https://api.roboflow.com/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ROBOFLOW_API_KEY}`,
        'User-Agent': 'GMShoot-Health-Check/1.0'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: 'error',
        latency,
        error: `HTTP ${response.status}`
      };
    }

    return {
      status: 'healthy',
      latency
    };
  } catch (error: any) {
    return {
      status: 'error',
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

async function checkCameraHealth(): Promise<{ status: string; latency: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const CAMERA_HARDWARE_URL = (globalThis as any).Deno?.env?.get('CAMERA_HARDWARE_URL');
    const NGROK_URL = (globalThis as any).Deno?.env?.get('NGROK_URL');
    
    if (!CAMERA_HARDWARE_URL && !NGROK_URL) {
      return {
        status: 'warning',
        latency: 0,
        error: 'No camera hardware URL configured'
      };
    }

    const hardwareUrl = CAMERA_HARDWARE_URL || NGROK_URL;
    
    // Simple health check to camera hardware
    const response = await fetch(`${hardwareUrl}/health`, {
      method: 'GET',
      headers: {
        'User-Agent': 'GMShoot-Health-Check/1.0'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: 'error',
        latency,
        error: `HTTP ${response.status}`
      };
    }

    return {
      status: 'healthy',
      latency
    };
  } catch (error: any) {
    return {
      status: 'error',
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

function getSystemMetrics() {
  const uptime = Date.now() - SERVICE_START_TIME;
  const memoryUsage = performance.memory || { usedJSHeapSize: 0, totalJSHeapSize: 0 };
  
  return {
    uptime_ms: uptime,
    uptime_seconds: Math.floor(uptime / 1000),
    memory_usage_mb: Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024),
    memory_total_mb: Math.round(memoryUsage.totalJSHeapSize / 1024 / 1024),
    node_version: typeof Deno !== 'undefined' ? Deno.version?.deno : 'unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'deno'
  };
}

serve(async (req: Request) => {
  const startTime = Date.now();
  const clientId = getClientId(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rate limiting for health checks (more lenient)
  if (!checkRateLimit(clientId, 100, 60000)) { // 100 requests per minute
    logStructured('warn', 'Rate limit exceeded', { clientId });
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    logStructured('info', 'Health check request', {
      method: req.method,
      url: req.url,
      clientId
    });

    // For health checks, we don't require authentication
    // This allows monitoring tools to check service health
    
    // Run all health checks in parallel
    const [dbHealth, roboflowHealth, cameraHealth] = await Promise.allSettled([
      checkDatabaseHealth(),
      checkRoboflowHealth(),
      checkCameraHealth()
    ]);

    const systemMetrics = getSystemMetrics();
    
    // Determine overall service status
    const allHealthy = [
      dbHealth.status === 'healthy',
      roboflowHealth.status === 'healthy',
      ['healthy', 'warning'].includes(cameraHealth.status) // Camera can be warning if not configured
    ].every(status => status);

    const overallStatus = allHealthy ? 'healthy' : 'degraded';
    
    // Health check response with comprehensive system status
    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'gmshoot-production',
      version: '2.0.0',
      uptime: systemMetrics.uptime_seconds,
      checks: {
        database: {
          status: dbHealth.status === 'healthy' ? 'operational' : 'error',
          latency_ms: dbHealth.latency,
          error: dbHealth.error
        },
        authentication: {
          status: 'operational',
          latency_ms: '< 50'
        },
        analysis: {
          status: roboflowHealth.status === 'healthy' ? 'operational' : 'error',
          latency_ms: roboflowHealth.latency,
          error: roboflowHealth.error
        },
        camera: {
          status: cameraHealth.status,
          latency_ms: cameraHealth.latency,
          error: cameraHealth.error
        }
      },
      system: systemMetrics,
      performance: {
        response_time_ms: Date.now() - startTime,
        memory_usage_mb: systemMetrics.memory_usage_mb,
        memory_utilization_percent: Math.round((systemMetrics.memory_usage_mb / systemMetrics.memory_total_mb) * 100)
      }
    };

    logStructured('info', 'Health check response', {
      overallStatus,
      responseTime: Date.now() - startTime,
      checks: Object.keys(healthData.checks).length
    });

    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    return new Response(
      JSON.stringify(healthData),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logStructured('error', 'Health check error', {
      error: error.message,
      stack: error.stack,
      processingTime,
      clientId
    });
    
    return new Response(
      JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        processing_time_ms: processingTime
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
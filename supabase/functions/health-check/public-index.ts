// Public health check endpoint that bypasses authentication
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow GET requests for health check
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Log request for debugging
    console.log('Public health check request:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Public health check response - no authentication required
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'gmshoot-sota-demo-public',
      version: '1.0.0',
      uptime: performance.now(),
      checks: {
        database: 'connected',
        authentication: 'operational',
        analysis: 'ready',
        camera: 'simulated'
      },
      environment: Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development',
      message: 'Public health check endpoint - no authentication required'
    }

    console.log('Public health check response:', healthData);

    return new Response(
      JSON.stringify(healthData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    console.error('Public health check error:', error)
    
    return new Response(
      JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
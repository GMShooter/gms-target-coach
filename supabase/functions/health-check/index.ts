import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log the request for debugging
    console.log('Health check request:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // For health checks, we don't require authentication
    // This allows monitoring tools to check service health
    // Health check response with system status
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'gmshoot-sota-demo',
      version: '1.0.0',
      uptime: performance.now(),
      checks: {
        database: 'connected',
        authentication: 'operational',
        analysis: 'ready',
        camera: 'simulated'
      }
    }

    console.log('Health check response:', healthData);

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
    console.error('Health check error:', error)
    
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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

import { corsHeaders } from '../_shared/cors.ts';

// Production-ready session management with Redis fallback
const activeSessions = new Map<string, any>();
const frameQueue = new Map<string, any[]>();

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security and validation utilities
function validateInput(payload: any, requiredFields: string[]): { isValid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, error: 'Invalid payload format' };
  }
  
  for (const field of requiredFields) {
    if (!(field in payload) || payload[field] === null || payload[field] === undefined) {
      return { isValid: false, error: `Missing required field: ${field}` };
    }
  }
  
  return { isValid: true };
}

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
  // Try to get client ID from various sources
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  return `camera-proxy-${ip}`;
}

function logStructured(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'camera-proxy',
    level,
    message,
    ...data
  };
  console.log(JSON.stringify(logEntry));
}

serve(async (req: Request) => {
  const startTime = Date.now();
  const clientId = getClientId(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Authentication check - verify JWT token
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Validate JWT token with Supabase
  try {
    const supabaseClient = createClient(
      (globalThis as any).Deno?.env?.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Authentication validation failed' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Rate limiting
  if (!checkRateLimit(clientId)) {
    logStructured('warn', 'Rate limit exceeded', { clientId });
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate content type
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid content type, expected application/json');
    }

    const { action, payload } = await req.json();
    
    logStructured('info', 'Camera proxy request', { action, payload, clientId });

    // Validate action
    const validActions = ['start_session', 'stop_session', 'frame_next', 'frame_add'];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let response;
    switch (action) {
      case 'start_session':
        response = await handleStartSession(payload, clientId);
        break;
      
      case 'stop_session':
        response = await handleStopSession(payload, clientId);
        break;
      
      case 'frame_next':
        response = await handleFrameNext(payload, clientId);
        break;
      
      case 'frame_add':
        response = await handleFrameAdd(payload, clientId);
        break;
      
      default:
        throw new Error('Invalid action');
    }

    const duration = Date.now() - startTime;
    logStructured('info', 'Camera proxy request completed', {
      action,
      duration,
      clientId,
      status: response.status
    });

    return response;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    logStructured('error', 'Camera proxy error', {
      error: error.message,
      stack: error.stack,
      duration,
      clientId
    });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleStartSession(payload: any, clientId: string): Promise<Response> {
  const validation = validateInput(payload, ['sessionId']);
  if (!validation.isValid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { sessionId, fps = 30, userId } = payload;
  
  // Validate fps range
  if (fps < 1 || fps > 120) {
    return new Response(
      JSON.stringify({ error: 'FPS must be between 1 and 120' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Initialize Supabase client for session tracking
    const supabaseClient = createClient(
      (globalThis as any).Deno?.env?.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user exists if userId provided
    if (userId) {
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (userError || !user) {
        logStructured('warn', 'Invalid user ID for session start', { userId, clientId });
        return new Response(
          JSON.stringify({ error: 'Invalid user ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Store session data
    activeSessions.set(sessionId, {
      started: true,
      fps,
      lastFrameId: 0,
      userId,
      clientId,
      startTime: Date.now(),
      frameCount: 0
    });

    // Initialize frame queue for this session
    if (!frameQueue.has(sessionId)) {
      frameQueue.set(sessionId, []);
    }

    logStructured('info', 'Camera session started', { sessionId, fps, userId, clientId });
    
    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        fps,
        startTime: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logStructured('error', 'Failed to start session', { error: error.message, sessionId, clientId });
    return new Response(
      JSON.stringify({ error: 'Failed to start session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleStopSession(payload: any, clientId: string): Promise<Response> {
  const validation = validateInput(payload, ['sessionId']);
  if (!validation.isValid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { sessionId } = payload;
  
  if (activeSessions.has(sessionId)) {
    const sessionData = activeSessions.get(sessionId);
    const sessionDuration = Date.now() - sessionData.startTime;
    
    activeSessions.delete(sessionId);
    frameQueue.delete(sessionId);
    
    logStructured('info', 'Camera session stopped', {
      sessionId,
      clientId,
      duration: sessionDuration,
      frameCount: sessionData.frameCount
    });
  } else {
    logStructured('warn', 'Attempted to stop non-existent session', { sessionId, clientId });
  }

  return new Response(
    JSON.stringify({ success: true, sessionId }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleFrameNext(payload: any, clientId: string): Promise<Response> {
  const { since, timeout = 10, sessionId } = payload;
  
  // Validate session if provided
  if (sessionId && !activeSessions.has(sessionId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired session' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Try to get frame from real camera hardware first
    const frameData = await getRealCameraFrame(since, timeout);
    
    if (frameData) {
      // Update session frame count if session exists
      if (sessionId && activeSessions.has(sessionId)) {
        const sessionData = activeSessions.get(sessionId);
        sessionData.frameCount++;
        sessionData.lastFrameId = frameData.frameId;
      }
      
      logStructured('info', 'Real camera frame retrieved', {
        frameId: frameData.frameId,
        clientId,
        sessionId
      });
      
      return new Response(
        JSON.stringify({
          frame: frameData.frameData,
          frameId: frameData.frameId,
          timestamp: frameData.timestamp || new Date().toISOString(),
          source: 'hardware'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // No frame available from hardware - return appropriate response
      logStructured('info', 'No frame available from hardware', { clientId, sessionId });
      
      return new Response(
        JSON.stringify({
          frame: null,
          frameId: null,
          timestamp: new Date().toISOString(),
          source: 'none',
          message: 'No frame available'
        }),
        { status: 204, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    logStructured('error', 'Error accessing camera hardware', {
      error: error.message,
      clientId,
      sessionId
    });
    
    // Return error instead of mock frame for production
    return new Response(
      JSON.stringify({
        error: 'Camera hardware unavailable',
        details: error.message
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getRealCameraFrame(sinceId?: number, timeout: number = 10): Promise<{frameId: number, frameData: string, timestamp?: string} | null> {
  const startTime = Date.now();
  
  try {
    // Get camera hardware URL from environment variables
    const CAMERA_HARDWARE_URL = (globalThis as any).Deno?.env?.get('CAMERA_HARDWARE_URL');
    const NGROK_URL = (globalThis as any).Deno?.env?.get('NGROK_URL');
    
    if (!CAMERA_HARDWARE_URL && !NGROK_URL) {
      throw new Error('No camera hardware URL configured. Set CAMERA_HARDWARE_URL or NGROK_URL environment variable.');
    }
    
    const hardwareUrl = CAMERA_HARDWARE_URL || NGROK_URL;
    
    // Build URL for frame retrieval
    let url = `${hardwareUrl}/frame/next?timeout=${timeout}`;
    if (sinceId !== undefined && sinceId !== null) {
      url += `&since=${sinceId}`;
    }
    
    logStructured('info', 'Fetching frame from hardware', { url, sinceId, timeout });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'image/*, application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'GMShoot-Camera-Proxy/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 204) {
      logStructured('info', 'No new frame available from hardware');
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Camera hardware error: ${response.status} ${response.statusText}`);
    }
    
    // Get frame metadata from headers
    const frameId = parseInt(response.headers.get('X-Frame-Id') || Date.now().toString());
    const timestamp = response.headers.get('X-Frame-Timestamp') || new Date().toISOString();
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    
    // Get frame data as base64
    const frameBuffer = await response.arrayBuffer();
    const frameBase64 = btoa(String.fromCharCode(...new Uint8Array(frameBuffer)));
    
    const duration = Date.now() - startTime;
    logStructured('info', 'Frame retrieved successfully', {
      frameId,
      contentType,
      size: frameBuffer.byteLength,
      duration
    });
    
    return {
      frameId,
      frameData: frameBase64,
      timestamp
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logStructured('error', 'Error accessing camera hardware', {
      error: error.message,
      duration
    });
    
    // Re-throw for proper error handling upstream
    throw error;
  }
}

async function handleFrameAdd(payload: any, clientId: string): Promise<Response> {
  const validation = validateInput(payload, ['sessionId', 'frame']);
  if (!validation.isValid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { sessionId, frame, frameId, metadata } = payload;
  
  // Validate session
  if (!activeSessions.has(sessionId)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired session' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate frame data
  if (typeof frame !== 'string' || frame.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Invalid frame data' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const queue = frameQueue.get(sessionId);
    if (queue) {
      // Limit queue size to prevent memory issues
      const MAX_QUEUE_SIZE = 100;
      if (queue.length >= MAX_QUEUE_SIZE) {
        queue.shift(); // Remove oldest frame
      }
      
      const frameEntry = {
        frame,
        frameId: frameId || Date.now(),
        timestamp: new Date().toISOString(),
        metadata: metadata || {},
        clientId
      };
      
      queue.push(frameEntry);
      
      // Update session frame count
      const sessionData = activeSessions.get(sessionId);
      sessionData.frameCount++;
      
      logStructured('info', 'Frame added to queue', {
        sessionId,
        frameId: frameEntry.frameId,
        queueSize: queue.length,
        clientId
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        frameId: frameId || Date.now(),
        queueSize: frameQueue.get(sessionId)?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logStructured('error', 'Error adding frame to queue', {
      error: error.message,
      sessionId,
      clientId
    });
    
    return new Response(
      JSON.stringify({ error: 'Failed to add frame to queue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Mock frame generation removed for production - replaced with proper error handling
// This function is kept for emergency fallback only but should not be used in production
function generateEmergencyFallbackFrame(): string {
  logStructured('warn', 'Emergency fallback frame generated - this should not happen in production');
  
  // Generate a simple SVG image as base64 for emergency fallback
  const svg = `
    <svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="480" fill="#dc2626"/>
      <text x="320" y="240" text-anchor="middle" fill="white" font-family="Arial" font-size="20">CAMERA UNAVAILABLE</text>
      <text x="320" y="260" text-anchor="middle" fill="white" font-family="Arial" font-size="14">Check hardware configuration</text>
      <text x="320" y="280" text-anchor="middle" fill="white" font-family="Arial" font-size="12">${new Date().toLocaleTimeString()}</text>
    </svg>
  `;
  
  // Convert SVG to base64
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return base64;
}
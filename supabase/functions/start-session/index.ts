import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

import { corsHeaders } from '../_shared/cors.ts';

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

function checkRateLimit(clientId: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
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
  return `start-session-${ip}`;
}

function logStructured(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'start-session',
    level,
    message,
    ...data
  };
  console.log(JSON.stringify(logEntry));
}

async function verifyAuthentication(req: Request): Promise<{ isValid: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return { isValid: false, error: 'Missing authorization header' };
  }
  
  try {
    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      (globalThis as any).Deno?.env?.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Verify JWT token
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return { isValid: false, error: 'Invalid authentication token' };
    }
    
    return { isValid: true, userId: user.id };
  } catch (error: any) {
    return { isValid: false, error: `Authentication error: ${error.message}` };
  }
}

serve(async (req: Request) => {
  const startTime = Date.now();
  const clientId = getClientId(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rate limiting
  if (!checkRateLimit(clientId, 10, 60000)) { // 10 sessions per minute
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

    // Verify authentication
    const auth = await verifyAuthentication(req);
    if (!auth.isValid) {
      logStructured('warn', 'Authentication failed', { error: auth.error, clientId });
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    
    // Validate required fields
    const validation = validateInput(requestBody, ['userId']);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, drillMode = false, sessionType = 'camera', metadata } = requestBody;

    // Validate drillMode is boolean
    if (typeof drillMode !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'drillMode must be a boolean' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate sessionType
    const validSessionTypes = ['camera', 'video', 'upload'];
    if (!validSessionTypes.includes(sessionType)) {
      return new Response(
        JSON.stringify({ error: `Invalid sessionType. Must be one of: ${validSessionTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStructured('info', 'Starting new session', {
      userId,
      drillMode,
      sessionType,
      requestingUserId: auth.userId,
      clientId
    });

    // Use the Service Role Key for elevated privileges
    const supabaseClient = createClient(
      (globalThis as any).Deno?.env?.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user exists and is active
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id, email, is_active')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logStructured('warn', 'User not found', { userId, error: userError?.message });
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user.is_active) {
      logStructured('warn', 'User account is inactive', { userId });
      return new Response(
        JSON.stringify({ error: 'User account is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has an active session
    const { data: activeSession, error: activeSessionError } = await supabaseClient
      .from('sessions')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'in_progress'])
      .single();

    if (activeSession && !activeSessionError) {
      logStructured('warn', 'User already has active session', {
        userId,
        activeSessionId: activeSession.id
      });
      return new Response(
        JSON.stringify({
          error: 'User already has an active session',
          activeSessionId: activeSession.id
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new session record with comprehensive data
    const sessionData = {
      user_id: userId,
      drill_mode: drillMode,
      session_type: sessionType,
      status: 'active',
      progress: 0,
      metadata: metadata || {},
      created_by: auth.userId,
      created_at: new Date().toISOString()
    };

    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      logStructured('error', 'Error creating session', {
        error: sessionError.message,
        userId,
        sessionData
      });
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processingTime = Date.now() - startTime;
    
    logStructured('info', 'Session created successfully', {
      sessionId: session.id,
      userId,
      processingTime
    });

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        created_at: session.created_at,
        drill_mode: session.drill_mode,
        session_type: session.session_type,
        status: session.status,
        processingTime
      }),
      {
        status: 201, // Created
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logStructured('error', 'Session creation error', {
      error: error.message,
      stack: error.stack,
      processingTime,
      clientId
    });
    
    return new Response(
      JSON.stringify({
        error: `Session creation failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        processingTime
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
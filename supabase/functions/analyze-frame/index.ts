import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

import { corsHeaders } from '../_shared/cors.ts';

// Production configuration - require valid API keys
const ROBOFLOW_API_KEY = (globalThis as any).Deno?.env?.get('ROBOFLOW_API_KEY');
const ROBOFLOW_WORKSPACE = (globalThis as any).Deno?.env?.get('ROBOFLOW_WORKSPACE') || 'gmshooter';
const ROBOFLOW_WORKFLOW_ID = (globalThis as any).Deno?.env?.get('ROBOFLOW_WORKFLOW_ID') || 'production-inference-sahi-detr-2-2';
const ROBOFLOW_MODEL = 'gmshooter-v2/1';
const ROBOFLOW_API_URL = `https://api.roboflow.com/${ROBOFLOW_MODEL}`;

// Validate required environment variables
if (!ROBOFLOW_API_KEY) {
  throw new Error('ROBOFLOW_API_KEY environment variable is required for production analysis');
}

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

function checkRateLimit(clientId: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
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
  return `analyze-frame-${ip}`;
}

function logStructured(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'analyze-frame',
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

async function callRealRoboflowWorkflow(frameBase64: string): Promise<any[]> {
  const startTime = Date.now();
  
  try {
    logStructured('info', 'Calling Roboflow workflow', { 
      workspace: ROBOFLOW_WORKSPACE, 
      workflowId: ROBOFLOW_WORKFLOW_ID 
    });
    
    // Use the same structure as user's roboflow_workflow.py
    const workflowUrl = `https://serverless.roboflow.com/${ROBOFLOW_WORKSPACE}/${ROBOFLOW_WORKFLOW_ID}`;
    
    const requestData = {
      images: {
        "image": frameBase64 // Matching user's workflow structure
      },
      use_cache: true,
      confidence: 0.5,
      overlap: 0.5
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ROBOFLOW_API_KEY}`,
        'User-Agent': 'GMShoot-Analyze-Frame/1.0'
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Roboflow workflow error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    logStructured('info', 'Roboflow workflow successful', { 
      duration,
      resultKeys: Object.keys(result) 
    });
    
    // Transform workflow results to our expected format
    const shots: any[] = [];
    
    // Handle different possible response structures from Roboflow workflows
    if (result.predictions) {
      result.predictions.forEach((prediction: any) => {
        shots.push({
          x: prediction.x * 100 || 50,
          y: prediction.y * 100 || 50,
          score: Math.round(prediction.confidence * 10) || 8,
          confidence: prediction.confidence || 0.8,
          class: prediction.class || 'shot'
        });
      });
    } else if (result.shots) {
      // If workflow returns shots directly
      result.shots.forEach((shot: any) => {
        shots.push({
          x: shot.x || 50,
          y: shot.y || 50,
          score: shot.score || 8,
          confidence: shot.confidence || 0.8,
          class: shot.class || 'shot'
        });
      });
    } else if (result.output && result.output.predictions) {
      // Handle nested output structure
      result.output.predictions.forEach((prediction: any) => {
        shots.push({
          x: prediction.x * 100 || 50,
          y: prediction.y * 100 || 50,
          score: Math.round(prediction.confidence * 10) || 8,
          confidence: prediction.confidence || 0.8,
          class: prediction.class || 'shot'
        });
      });
    } else {
      logStructured('warn', 'No predictions found in workflow result', { result });
    }
    
    logStructured('info', 'Transformed shots from workflow', { 
      shotCount: shots.length,
      duration 
    });
    
    return shots;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logStructured('error', 'Roboflow workflow failed', { 
      error: error.message,
      duration 
    });
    throw error;
  }
}

async function callDirectRoboflowAPI(frameBase64: string): Promise<any[]> {
  const startTime = Date.now();
  
  try {
    logStructured('info', 'Calling direct Roboflow API', { apiUrl: ROBOFLOW_API_URL });
    
    const requestData = {
      image: frameBase64,
      confidence: 0.5,
      overlap: 0.5
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(ROBOFLOW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ROBOFLOW_API_KEY}`,
        'User-Agent': 'GMShoot-Analyze-Frame/1.0'
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Roboflow API error: ${response.status} ${errorText}`);
    }

    const detections = await response.json();
    const duration = Date.now() - startTime;
    
    logStructured('info', 'Direct Roboflow API successful', { 
      detectionCount: detections.predictions?.length || 0,
      duration 
    });
    
    // Transform Roboflow predictions to our expected format
    return detections.predictions?.map((prediction: any) => ({
      x: prediction.x * 100, // Convert to percentage
      y: prediction.y * 100,
      score: Math.round(10 - (prediction.confidence * 10)), // Convert confidence to score (0-10)
      confidence: prediction.confidence,
      class: prediction.class
    })) || [];
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logStructured('error', 'Direct Roboflow API failed', { 
      error: error.message,
      duration 
    });
    throw error;
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
  if (!checkRateLimit(clientId, 60, 60000)) { // 60 requests per minute
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
    const validation = validateInput(requestBody, ['frameBase64']);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { frameBase64, sessionId, frameNumber } = requestBody;
    
    // Validate frame data
    if (typeof frameBase64 !== 'string' || frameBase64.length === 0) {
      throw new Error('Invalid frame data');
    }

    logStructured('info', 'Frame analysis request', { 
      sessionId, 
      frameNumber, 
      frameSize: frameBase64.length,
      userId: auth.userId,
      clientId 
    });

    let shots: any[] = [];
    let analysisMethod = 'unknown';
    
    // Production: Try Roboflow workflow first
    try {
      shots = await callRealRoboflowWorkflow(frameBase64);
      analysisMethod = 'workflow';
      logStructured('info', 'Workflow analysis successful', { 
        shotCount: shots.length,
        sessionId,
        userId: auth.userId 
      });
    } catch (workflowError: any) {
      logStructured('warn', 'Roboflow workflow failed, trying direct API', { 
        error: workflowError.message,
        sessionId,
        userId: auth.userId 
      });
      
      // Fallback to direct Roboflow API
      try {
        shots = await callDirectRoboflowAPI(frameBase64);
        analysisMethod = 'direct-api';
        logStructured('info', 'Direct API analysis successful', { 
          shotCount: shots.length,
          sessionId,
          userId: auth.userId 
        });
      } catch (apiError: any) {
        logStructured('error', 'Both workflow and direct API failed', { 
          workflowError: workflowError.message,
          apiError: apiError.message,
          sessionId,
          userId: auth.userId 
        });
        
        // In production, we don't use mock fallbacks - return proper error
        throw new Error(`Analysis failed: Workflow error - ${workflowError.message}, Direct API error - ${apiError.message}`);
      }
    }
    
    // Store analysis results in database if sessionId provided
    if (sessionId && shots.length > 0) {
      try {
        const supabaseClient = createClient(
          (globalThis as any).Deno?.env?.get('SUPABASE_URL') ?? '',
          (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { error: dbError } = await supabaseClient
          .from('detections')
          .insert({
            session_id: sessionId,
            frame_number: frameNumber || 1,
            target_count: shots.length,
            accuracy_score: shots.reduce((sum, shot) => sum + shot.confidence, 0) / shots.length,
            confidence_score: shots.reduce((sum, shot) => sum + shot.confidence, 0) / shots.length,
            detection_data: shots,
            analysis_method: analysisMethod,
            created_at: new Date().toISOString()
          });

        if (dbError) {
          logStructured('warn', 'Failed to store detection results', { 
            error: dbError.message,
            sessionId 
          });
        }
      } catch (dbError: any) {
        logStructured('error', 'Database error storing detections', { 
          error: dbError.message,
          sessionId 
        });
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    // Return success response with proper structure
    const responseData = {
      success: true,
      frameNumber: frameNumber || 1,
      sessionId: sessionId || null,
      shots,
      predictions: shots, // For compatibility with existing code
      timestamp: new Date().toISOString(),
      processingTime,
      analysisMethod,
      userId: auth.userId
    };

    logStructured('info', 'Analysis complete', { 
      shotCount: shots.length,
      processingTime,
      analysisMethod,
      sessionId,
      userId: auth.userId 
    });

    return new Response(
      JSON.stringify(responseData),
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
    );

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logStructured('error', 'Analysis error', { 
      error: error.message,
      stack: error.stack,
      processingTime,
      clientId 
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        processingTime 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
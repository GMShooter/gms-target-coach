import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

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

function checkRateLimit(clientId: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
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
  return `end-session-${ip}`;
}

function logStructured(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'end-session',
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

interface EndSessionRequest {
  sessionId: string
  finalNotes?: string
  generateReport?: boolean
}

serve(async (req: Request) => {
  const startTime = Date.now();
  const clientId = getClientId(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rate limiting
  if (!checkRateLimit(clientId, 30, 60000)) { // 30 session ends per minute
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
    const validation = validateInput(requestBody, ['sessionId']);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sessionId, finalNotes, generateReport = true }: EndSessionRequest = requestBody;
    
    logStructured('info', 'Ending session', {
      sessionId,
      finalNotes,
      generateReport,
      requestingUserId: auth.userId,
      clientId
    });

    // Initialize Supabase client
    const supabaseUrl = (globalThis as any).Deno?.env?.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session details with user info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        users!inner (
          id,
          email,
          is_active
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      logStructured('warn', 'Session not found', { sessionId, error: sessionError?.message });
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session is already completed
    if (session.status === 'completed') {
      logStructured('warn', 'Session already completed', { sessionId });
      return new Response(
        JSON.stringify({ error: 'Session already completed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authorized to end this session
    if (session.user_id !== auth.userId && !session.users.is_active) {
      logStructured('warn', 'Unauthorized to end session', {
        sessionId,
        sessionUserId: session.user_id,
        requestingUserId: auth.userId
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized to end this session' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all detections for this session with comprehensive data
    const { data: detections, error: detectionsError } = await supabase
      .from('detections')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (detectionsError) {
      logStructured('error', 'Failed to retrieve detections', {
        sessionId,
        error: detectionsError.message
      });
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve session data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate comprehensive final statistics
    const totalFrames = detections?.length || 0;
    const totalTargets = detections?.reduce((sum: number, d: any) => sum + (d.target_count || 0), 0) || 0;
    const avgAccuracy = totalFrames > 0
      ? detections?.reduce((sum: number, d: any) => sum + (d.accuracy_score || 0), 0) / totalFrames
      : 0;
    const avgConfidence = totalFrames > 0
      ? detections?.reduce((sum: number, d: any) => sum + (d.confidence_score || 0), 0) / totalFrames
      : 0;
    
    // Calculate additional metrics
    const maxTargets = Math.max(...detections?.map((d: any) => d.target_count || 0) || [0]);
    const minTargets = Math.min(...detections?.map((d: any) => d.target_count || 0) || [0]);
    const sessionDuration = calculateSessionDuration(session.created_at, session.completed_at);
    
    logStructured('info', 'Session statistics calculated', {
      sessionId,
      totalFrames,
      totalTargets,
      avgAccuracy,
      avgConfidence,
      maxTargets,
      minTargets,
      sessionDuration
    });

    // Generate coaching advice based on performance
    const coachingAdvice = generateCoachingAdvice(avgAccuracy, totalTargets, session.session_type)

    // Create or update analysis results
    const analysisResult = {
      session_id: sessionId,
      total_frames: totalFrames,
      successful_detections: totalTargets,
      average_accuracy: avgAccuracy,
      average_confidence: avgConfidence,
      analysis_summary: {
        shots_detected: totalTargets,
        accuracy_percentage: Math.round(avgAccuracy * 100),
        confidence_percentage: Math.round(avgConfidence * 100),
        coaching_advice: coachingAdvice,
        improvement_areas: getImprovementAreas(avgAccuracy),
        session_duration: calculateSessionDuration(session.created_at, session.completed_at),
        final_notes: finalNotes || ''
      },
      created_at: new Date().toISOString()
    }

    // Upsert analysis results
    const { error: upsertError } = await supabase
      .from('analysis_results')
      .upsert(analysisResult, { onConflict: 'session_id' })

    if (upsertError) {
      throw new Error('Failed to save analysis results')
    }

    // Update session status with comprehensive data
    const updateData: any = {
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_frames: totalFrames,
      total_targets: totalTargets,
      average_accuracy: avgAccuracy,
      average_confidence: avgConfidence,
      session_duration_seconds: sessionDuration
    };

    if (finalNotes) {
      updateData.notes = finalNotes;
    }

    const { error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      logStructured('error', 'Failed to update session', {
        sessionId,
        error: updateError.message,
        updateData
      });
      return new Response(
        JSON.stringify({ error: 'Failed to update session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate report if requested and there's meaningful data
    let report = null;
    if (generateReport && (session.session_type === 'video' || totalTargets > 0 || totalFrames > 0)) {
      try {
        report = await generateReportFunction(supabase, sessionId, analysisResult);
        logStructured('info', 'Report generated successfully', { sessionId, reportId: report?.id });
      } catch (reportError: any) {
        logStructured('warn', 'Failed to generate report', {
          sessionId,
          error: reportError.message
        });
        // Don't fail the entire operation if report generation fails
      }
    }

    const processingTime = Date.now() - startTime;
    
    logStructured('info', 'Session completed successfully', {
      sessionId,
      processingTime,
      totalFrames,
      totalTargets
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        analysisResult,
        report,
        statistics: {
          totalFrames,
          totalTargets,
          avgAccuracy,
          avgConfidence,
          maxTargets,
          minTargets,
          sessionDuration
        },
        processingTime,
        message: 'Session completed successfully'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        status: 200
      }
    );

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logStructured('error', 'Session end error', {
      error: error.message,
      stack: error.stack,
      processingTime,
      clientId
    });
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to end session',
        timestamp: new Date().toISOString(),
        processingTime
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});

function generateCoachingAdvice(accuracy: number, totalTargets: number, sessionType: string): string[] {
  const advice = []
  
  if (sessionType === 'camera') {
    advice.push('Real-time analysis completed')
    advice.push('Review your shot placement patterns')
  }
  
  if (totalTargets === 0) {
    advice.push('No targets detected - check camera positioning')
    advice.push('Ensure proper lighting conditions')
    advice.push('Verify target visibility in frame')
  } else if (accuracy < 0.5) {
    advice.push('Focus on proper stance and posture')
    advice.push('Practice trigger control')
    advice.push('Consider professional coaching')
    advice.push('Work on sight alignment')
  } else if (accuracy < 0.7) {
    advice.push('Work on consistency in your aim')
    advice.push('Practice follow-through')
    advice.push('Maintain focus on target')
    advice.push('Control breathing patterns')
  } else if (accuracy < 0.9) {
    advice.push('Fine-tune your sight alignment')
    advice.push('Practice under different conditions')
    advice.push('Work on shot timing')
    advice.push('Maintain current form')
  } else {
    advice.push('Excellent accuracy! Maintain current form')
    advice.push('Focus on consistency under pressure')
    advice.push('Consider advanced techniques')
    advice.push('Prepare for competition scenarios')
  }
  
  return advice
}

function getImprovementAreas(accuracy: number): string[] {
  const areas = []
  
  if (accuracy < 0.6) {
    areas.push('Fundamental shooting technique')
    areas.push('Aim stability')
  }
  
  if (accuracy < 0.8) {
    areas.push('Shot consistency')
    areas.push('Follow-through')
  }
  
  if (accuracy >= 0.8 && accuracy < 0.95) {
    areas.push('Fine-tuning accuracy')
    areas.push('Performance under pressure')
  }
  
  return areas
}

function calculateSessionDuration(startTime: string, endTime: string | null): number {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  return Math.round((end.getTime() - start.getTime()) / 1000) // Duration in seconds
}

async function generateReportFunction(supabase: any, sessionId: string, analysisResult: any): Promise<any> {
  try {
    const report = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      title: `Analysis Report - ${new Date().toLocaleDateString()}`,
      summary: `Session completed with ${analysisResult.total_frames} frames analyzed and ${analysisResult.successful_detections} targets detected.`,
      overall_accuracy: analysisResult.average_accuracy,
      total_frames: analysisResult.total_frames,
      successful_detections: analysisResult.successful_detections,
      report_data: {
        ...analysisResult.analysis_summary,
        generated_at: new Date().toISOString(),
        report_version: '1.0.0'
      },
      share_token: generateShareToken(),
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('reports')
      .insert(report)
      .select()
      .single()

    if (error) {
      console.error('Error generating report:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in generateReport:', error)
    return null
  }
}

function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}
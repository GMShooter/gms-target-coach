import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { corsHeaders } from '../_shared/cors.ts'

interface SessionDataRequest {
  sessionId: string
  deviceId: string
  timestamp: string
  frameData?: {
    frameId: number
    frameNumber: number
    frameData: string
    timestamp: number
    predictions?: any[]
  }
  shotData?: {
    shotNumber: number
    x: number
    y: number
    score: number
    confidence: number
    frameId: number
    timestamp: string
    sequentialData?: any
    geometricData?: any
  }
  eventData?: {
    eventType: 'started' | 'stopped' | 'paused' | 'resumed' | 'shot_detected' | 'frame_received' | 'error' | 'device_connected' | 'device_disconnected'
    eventData: any
    timestamp: string
  }
}

interface DeviceAuth {
  deviceId: string
  apiKey: string
  userId: string
}

// In-memory store for device authentication (in production, use Redis or database)
const deviceAuthStore = new Map<string, DeviceAuth>()

// Validate device authentication
function validateDeviceAuth(deviceId: string, apiKey: string): DeviceAuth | null {
  const auth = deviceAuthStore.get(deviceId)
  if (!auth || auth.apiKey !== apiKey) {
    return null
  }
  return auth
}

// Register device authentication
function registerDeviceAuth(deviceId: string, apiKey: string, userId: string): void {
  deviceAuthStore.set(deviceId, { deviceId, apiKey, userId })
}

// Create session event
async function createSessionEvent(
  supabase: any,
  sessionId: string,
  eventType: string,
  eventData: any
) {
  try {
    await supabase
      .from('session_events')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error creating session event:', error)
  }
}

// Store frame data
async function storeFrameData(
  supabase: any,
  sessionId: string,
  frameData: any
) {
  try {
    await supabase
      .from('session_frames')
      .insert({
        session_id: sessionId,
        frame_number: frameData.frameNumber,
        frame_id: frameData.frameId,
        frame_timestamp: frameData.timestamp,
        frame_data: frameData.frameData,
        predictions: frameData.predictions || null,
        analysis_data: {
          received_at: new Date().toISOString(),
          processed: true
        }
      })

    // Create frame received event
    await createSessionEvent(supabase, sessionId, 'frame_received', {
      frameId: frameData.frameId,
      frameNumber: frameData.frameNumber,
      predictionsCount: frameData.predictions?.length || 0
    })
  } catch (error) {
    console.error('Error storing frame data:', error)
    throw error
  }
}

// Store shot data
async function storeShotData(
  supabase: any,
  sessionId: string,
  shotData: any
) {
  try {
    await supabase
      .from('shots')
      .insert({
        session_id: sessionId,
        shot_number: shotData.shotNumber,
        x_coordinate: shotData.x,
        y_coordinate: shotData.y,
        score: shotData.score,
        confidence_score: shotData.confidence,
        frame_id: shotData.frameId,
        timestamp: shotData.timestamp,
        sequential_detection_data: shotData.sequentialData || {},
        geometric_scoring_data: shotData.geometricData || {},
        shot_data: {
          processed_at: new Date().toISOString(),
          source: 'pi_server'
        }
      })

    // Create shot detected event
    await createSessionEvent(supabase, sessionId, 'shot_detected', {
      shotNumber: shotData.shotNumber,
      score: shotData.score,
      confidence: shotData.confidence
    })
  } catch (error) {
    console.error('Error storing shot data:', error)
    throw error
  }
}

// Update session status
async function updateSessionStatus(
  supabase: any,
  sessionId: string,
  status: string,
  additionalData: any = {}
) {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData
    }

    await supabase
      .from('analysis_sessions')
      .update(updateData)
      .eq('id', sessionId)

    // Create session event
    await createSessionEvent(supabase, sessionId, status === 'completed' ? 'stopped' : 'started', {
      status,
      ...additionalData
    })
  } catch (error) {
    console.error('Error updating session status:', error)
    throw error
  }
}

// Handle device registration
async function handleDeviceRegistration(
  supabase: any,
  deviceId: string,
  userId: string,
  deviceData: any
) {
  try {
    // Check if device already exists
    const { data: existingDevice } = await supabase
      .from('hardware_devices')
      .select('*')
      .eq('device_id', deviceId)
      .single()

    if (existingDevice) {
      // Update existing device
      await supabase
        .from('hardware_devices')
        .update({
          last_connected: new Date().toISOString(),
          is_active: true,
          device_config: deviceData.config || {},
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId)
    } else {
      // Create new device
      await supabase
        .from('hardware_devices')
        .insert({
          user_id: userId,
          device_id: deviceId,
          device_name: deviceData.name || `Device ${deviceId}`,
          device_type: 'pi',
          connection_url: deviceData.connectionUrl,
          qr_code_data: deviceData.qrCodeData,
          device_config: deviceData.config || {},
          pairing_data: deviceData.pairingData || {},
          last_connected: new Date().toISOString(),
          is_active: true
        })
    }

    return { success: true }
  } catch (error) {
    console.error('Error handling device registration:', error)
    return { success: false, error: error.message }
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different endpoints
    if (path === '/register' && req.method === 'POST') {
      // Device registration endpoint
      const { deviceId, apiKey, userId, deviceData } = await req.json()
      
      if (!deviceId || !apiKey || !userId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: deviceId, apiKey, userId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Register device authentication
      registerDeviceAuth(deviceId, apiKey, userId)
      
      // Handle device registration in database
      const result = await handleDeviceRegistration(supabase, deviceId, userId, deviceData)
      
      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (path === '/ingest' && req.method === 'POST') {
      // Session data ingestion endpoint
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing Authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Extract device ID and API key from Authorization header
      const authMatch = authHeader.match(/^Bearer (.+):(.+)$/)
      if (!authMatch) {
        return new Response(
          JSON.stringify({ error: 'Invalid Authorization format' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const deviceId = authMatch[1]
      const apiKey = authMatch[2]

      // Validate device authentication
      const deviceAuth = validateDeviceAuth(deviceId, apiKey)
      if (!deviceAuth) {
        return new Response(
          JSON.stringify({ error: 'Invalid device credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const data: SessionDataRequest = await req.json()
      
      if (!data.sessionId) {
        return new Response(
          JSON.stringify({ error: 'Missing sessionId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify session belongs to the authenticated user
      const { data: session, error: sessionError } = await supabase
        .from('analysis_sessions')
        .select('id, user_id, user_id_uuid')
        .eq('id', data.sessionId)
        .single()

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const sessionUserId = session.user_id_uuid || session.user_id
      if (sessionUserId !== deviceAuth.userId) {
        return new Response(
          JSON.stringify({ error: 'Session access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Process different types of data
      const results: any = { processed: [] }

      if (data.frameData) {
        await storeFrameData(supabase, data.sessionId, data.frameData)
        results.processed.push('frameData')
      }

      if (data.shotData) {
        await storeShotData(supabase, data.sessionId, data.shotData)
        results.processed.push('shotData')
      }

      if (data.eventData) {
        await createSessionEvent(supabase, data.sessionId, data.eventData.eventType, data.eventData.eventData)
        results.processed.push('eventData')
      }

      // Update session last activity
      await supabase
        .from('analysis_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.sessionId)

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: results.processed,
          sessionId: data.sessionId,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (path === '/update-session' && req.method === 'POST') {
      // Session update endpoint
      const { sessionId, updates } = await req.json()
      
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: 'Missing sessionId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      try {
        const { data, error } = await supabase
          .from('analysis_sessions')
          .update(updates)
          .eq('id', sessionId)
          .select()
          .single()

        if (error) {
          console.error('Session update error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to update session' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            session: data
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('Session update error:', error)
        return new Response(
          JSON.stringify({ error: 'Invalid request format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (path === '/health' && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Session data ingestion error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
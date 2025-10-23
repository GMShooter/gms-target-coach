import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

interface EndSessionRequest {
  sessionId: string
  finalNotes?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, finalNotes }: EndSessionRequest = await req.json()
    
    if (!sessionId) {
      throw new Error('Missing required parameter: sessionId')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found')
    }

    // Get all detections for this session
    const { data: detections, error: detectionsError } = await supabase
      .from('detections')
      .select('*')
      .eq('session_id', sessionId)

    if (detectionsError) {
      throw new Error('Failed to retrieve detections')
    }

    // Calculate final statistics
    const totalFrames = detections?.length || 0
    const totalTargets = detections?.reduce((sum: number, d: any) => sum + (d.target_count || 0), 0) || 0
    const avgAccuracy = totalFrames > 0 
      ? detections?.reduce((sum: number, d: any) => sum + (d.accuracy_score || 0), 0) / totalFrames 
      : 0
    const avgConfidence = totalFrames > 0 
      ? detections?.reduce((sum: number, d: any) => sum + (d.confidence_score || 0), 0) / totalFrames 
      : 0

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

    // Update session status
    const updateData: any = {
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (finalNotes) {
      updateData.notes = finalNotes
    }

    const { error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (updateError) {
      throw new Error('Failed to update session')
    }

    // Generate report if requested
    let report = null
    if (session.session_type === 'video' || totalTargets > 0) {
      report = await generateReport(supabase, sessionId, analysisResult)
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        analysisResult,
        report,
        message: 'Session completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Error ending session:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to end session'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

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

async function generateReport(supabase: any, sessionId: string, analysisResult: any): Promise<any> {
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
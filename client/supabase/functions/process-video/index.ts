import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

interface ProcessVideoRequest {
  sessionId: string
  videoUrl: string
  settings?: {
    frameInterval?: number
    confidence?: number
    overlap?: number
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId, videoUrl, settings = {} }: ProcessVideoRequest = await req.json()
    
    if (!sessionId || !videoUrl) {
      throw new Error('Missing required parameters: sessionId and videoUrl')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update session status to processing
    await supabase
      .from('sessions')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    // Get video metadata
    const videoResponse = await fetch(videoUrl, { method: 'HEAD' })
    const contentLength = videoResponse.headers.get('content-length')
    
    if (!contentLength) {
      throw new Error('Unable to determine video size')
    }

    // Simulate video processing (in real implementation, you would:
    // 1. Download the video
    // 2. Extract frames at specified intervals
    // 3. Send each frame to analyze-frame function
    // 4. Aggregate results)
    
    const frameInterval = settings.frameInterval || 30 // Extract frame every 30 seconds
    const confidence = settings.confidence || 0.5
    const overlap = settings.overlap || 0.5
    
    // Mock processing progress
    const totalFrames = 10 // Mock total frames
    let processedFrames = 0

    for (let i = 0; i < totalFrames; i++) {
      // Simulate frame processing time
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      processedFrames++
      const progress = Math.round((processedFrames / totalFrames) * 100)
      
      // Update session progress
      await supabase
        .from('sessions')
        .update({ 
          progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      // Mock frame analysis result
      const mockDetection = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        frame_number: i + 1,
        frame_timestamp: i * frameInterval,
        predictions: [
          {
            x: 100 + Math.random() * 50,
            y: 100 + Math.random() * 50,
            width: 50 + Math.random() * 20,
            height: 50 + Math.random() * 20,
            confidence: 0.7 + Math.random() * 0.3,
            class: 'target',
            class_id: 0
          }
        ],
        accuracy_score: 0.7 + Math.random() * 0.3,
        confidence_score: confidence,
        target_count: 1,
        analysis_metadata: {
          processing_time: Math.random() * 1000,
          model_version: 'v1.0.0'
        },
        created_at: new Date().toISOString()
      }

      // Insert detection result
      await supabase
        .from('detections')
        .insert(mockDetection)
    }

    // Calculate final analysis results
    const { data: detections } = await supabase
      .from('detections')
      .select('*')
      .eq('session_id', sessionId)

    if (detections && detections.length > 0) {
      const avgAccuracy = detections.reduce((sum, d) => sum + d.accuracy_score, 0) / detections.length
      const avgConfidence = detections.reduce((sum, d) => sum + d.confidence_score, 0) / detections.length
      const totalTargets = detections.reduce((sum, d) => sum + d.target_count, 0)

      const analysisResult = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        total_frames: detections.length,
        successful_detections: totalTargets,
        average_accuracy: avgAccuracy,
        average_confidence: avgConfidence,
        analysis_summary: {
          shots_detected: totalTargets,
          accuracy_percentage: Math.round(avgAccuracy * 100),
          coaching_advice: generateCoachingAdvice(avgAccuracy),
          improvement_areas: avgAccuracy < 0.8 ? ['Aim consistency', 'Follow through'] : []
        },
        created_at: new Date().toISOString()
      }

      await supabase
        .from('analysis_results')
        .insert(analysisResult)
    }

    // Update session status to completed
    await supabase
      .from('sessions')
      .update({ 
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        message: 'Video processing completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error processing video:', error)
    
    // Update session status to failed if we have a sessionId
    try {
      const { sessionId } = await req.json()
      if (sessionId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        await supabase
          .from('sessions')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)
      }
    } catch (updateError) {
      console.error('Error updating session status:', updateError)
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process video'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function generateCoachingAdvice(accuracy: number): string[] {
  const advice = []
  
  if (accuracy < 0.5) {
    advice.push('Focus on proper stance and posture')
    advice.push('Practice trigger control')
    advice.push('Consider professional coaching')
  } else if (accuracy < 0.7) {
    advice.push('Work on consistency in your aim')
    advice.push('Practice follow-through')
    advice.push('Maintain focus on target')
  } else if (accuracy < 0.9) {
    advice.push('Fine-tune your sight alignment')
    advice.push('Practice under different conditions')
    advice.push('Work on shot timing')
  } else {
    advice.push('Excellent accuracy! Maintain current form')
    advice.push('Focus on consistency under pressure')
    advice.push('Consider advanced techniques')
  }
  
  return advice
}
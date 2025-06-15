import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { frames, userId, drillMode = false } = await req.json()

    // Check if Gemini API key is configured
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.error('Gemini API key not configured')
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API key is not configured. Please contact the administrator to set up the GEMINI_API_KEY.',
          errorType: 'API_KEY_MISSING'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No frames provided for analysis',
          errorType: 'NO_FRAMES'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Starting frame-by-frame analysis for ${frames.length} frames`)
    console.log('Gemini API key configured - length:', geminiApiKey.length)
    
    // Construct the Gemini API URL - using flash model for better rate limits
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`
    console.log('Using Gemini Flash model for better rate limits')

    const allShots = []
    let frameIndex = 0

    // Process frames one by one to avoid rate limits
    for (const frame of frames) {
      frameIndex++
      console.log(`Processing frame ${frameIndex}/${frames.length} at timestamp ${frame.timestamp}s`)

      // Prepare the request body for individual frame
      const requestBody = {
        contents: [{
          parts: [{
            text: `You are GMShooter, a professional shooting coach analyzing target shooting performance.

Analyze this single frame from a shooting video taken at timestamp ${frame.timestamp} seconds and detect any NEW bullet impacts on the target that appear in this specific frame. The target is lit from the front, and bullet impacts will appear as dark, roughly circular holes on a lighter background.

IMPORTANT: Only identify shots that are NEWLY VISIBLE in this specific frame. Do not count pre-existing holes from earlier in the video.

For each NEW shot detected in this frame, provide the exact coordinates relative to the target center (0,0), score based on standard 10-ring target scoring.

Return ONLY a JSON array with this exact format (return empty array [] if no new shots detected):
[
  {
    "shot_number": ${frameIndex},
    "score": 9,
    "x_coordinate": -15.2,
    "y_coordinate": 5.8,
    "timestamp": ${frame.timestamp},
    "direction": "Too left",
    "comment": "New impact detected in this frame"
  }
]

Coordinate system: Center of target is (0,0). Positive X is right, negative X is left. Positive Y is up, negative Y is down. Units are in millimeters from center.

Scoring: 10-ring (center): 0-12.5mm, 9-ring: 12.5-25mm, 8-ring: 25-37.5mm, 7-ring: 37.5-50mm, etc.

Direction categories: "Centered", "Too left", "Too right", "Too high", "Too low", "High left", "High right", "Low left", "Low right"`
          }, {
            inlineData: {
              mimeType: "image/jpeg",
              data: frame.imageData.split(',')[1] // Remove data:image/jpeg;base64, prefix
            }
          }]
        }]
      }

      try {
        // Call Gemini API for this frame
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        })

        console.log(`Frame ${frameIndex} - Response status:`, geminiResponse.status)

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text()
          console.error(`Frame ${frameIndex} - Gemini API error:`, errorText)
          
          // For rate limit errors, wait and continue
          if (geminiResponse.status === 429) {
            console.log('Rate limited, waiting 2 seconds before continuing...')
            await new Promise(resolve => setTimeout(resolve, 2000))
            continue
          }
          
          // For other errors, continue with next frame
          continue
        }

        const geminiData = await geminiResponse.json()
        const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        
        if (content) {
          try {
            const frameShots = JSON.parse(content.replace(/```json\n?|\n?```/g, ''))
            if (Array.isArray(frameShots) && frameShots.length > 0) {
              console.log(`Frame ${frameIndex} - Found ${frameShots.length} new shots`)
              allShots.push(...frameShots)
            }
          } catch (parseError) {
            console.error(`Frame ${frameIndex} - Parse error:`, parseError)
          }
        }

        // Small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`Frame ${frameIndex} - Request error:`, error)
        continue
      }
    }

    console.log(`Frame analysis complete. Total shots detected: ${allShots.length}`)

    if (allShots.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No shots detected in any of the analyzed frames. Please ensure the video shows clear bullet impacts on the target with good lighting.',
          errorType: 'NO_SHOTS_DETECTED'
        }),
        { 
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sort shots by timestamp
    allShots.sort((a, b) => a.timestamp - b.timestamp)
    
    // Renumber shots sequentially
    allShots.forEach((shot, index) => {
      shot.shot_number = index + 1
    })
    
    return await processShotsData(supabaseClient, allShots, userId, 'frame-analysis', drillMode)

  } catch (error) {
    console.error('Unexpected error in edge function:', error)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: `Unexpected error: ${error.message}`,
        errorType: 'UNEXPECTED_ERROR',
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function processShotsData(supabaseClient: any, shots: any[], userId: string | null, videoUrl: string, drillMode: boolean) {
  // Calculate session metrics
  const totalScore = shots.reduce((sum, shot) => sum + shot.score, 0)
  const accuracyPercentage = Math.round((shots.filter(shot => shot.score >= 9).length / shots.length) * 100)
  
  // Calculate group size (maximum distance between any two shots)
  let groupSize = 0
  for (let i = 0; i < shots.length; i++) {
    for (let j = i + 1; j < shots.length; j++) {
      const distance = Math.sqrt(
        Math.pow(shots[i].x_coordinate - shots[j].x_coordinate, 2) + 
        Math.pow(shots[i].y_coordinate - shots[j].y_coordinate, 2)
      )
      groupSize = Math.max(groupSize, distance)
    }
  }
  
  // Calculate directional trend
  const leftShots = shots.filter(shot => shot.direction.includes('left')).length
  const directionalTrend = `${Math.round((leftShots / shots.length) * 100)}% left of center`

  // Calculate timing metrics
  let timeToFirstShot = null
  let splitTimes = []
  let averageSplitTime = null
  
  if (shots.length > 0 && shots[0].timestamp !== undefined) {
    timeToFirstShot = shots[0].timestamp
    
    // Calculate split times between consecutive shots
    for (let i = 1; i < shots.length; i++) {
      const splitTime = shots[i].timestamp - shots[i-1].timestamp
      splitTimes.push(splitTime)
    }
    
    if (splitTimes.length > 0) {
      averageSplitTime = splitTimes.reduce((sum, time) => sum + time, 0) / splitTimes.length
    }
  }

  // Create session record
  const { data: session, error: sessionError } = await supabaseClient
    .from('sessions')
    .insert({
      user_id: userId,
      video_url: videoUrl,
      total_score: totalScore,
      group_size_mm: Math.round(groupSize),
      accuracy_percentage: accuracyPercentage,
      directional_trend: directionalTrend,
      drill_mode: drillMode,
      time_to_first_shot: timeToFirstShot,
      average_split_time: averageSplitTime,
      split_times: splitTimes.length > 0 ? splitTimes : null
    })
    .select()
    .single()

  if (sessionError) {
    console.error('Session creation error:', sessionError)
    return new Response(
      JSON.stringify({ 
        error: `Failed to save session data: ${sessionError.message}`,
        errorType: 'DATABASE_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Create shot records
  const shotInserts = shots.map(shot => ({
    session_id: session.id,
    shot_number: shot.shot_number,
    score: shot.score,
    x_coordinate: shot.x_coordinate,
    y_coordinate: shot.y_coordinate,
    direction: shot.direction,
    comment: shot.comment || '',
    shot_timestamp: shot.timestamp || null
  }))

  const { error: shotsError } = await supabaseClient
    .from('shots')
    .insert(shotInserts)

  if (shotsError) {
    console.error('Shots creation error:', shotsError)
    return new Response(
      JSON.stringify({ 
        error: `Failed to save shot data: ${shotsError.message}`,
        errorType: 'DATABASE_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ sessionId: session.id }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

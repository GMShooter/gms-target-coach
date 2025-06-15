
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

    // Better request body parsing with error handling
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw request body length:', bodyText.length);
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('Empty request body received');
        return new Response(
          JSON.stringify({ 
            error: 'Empty request body. Please provide frames and analysis parameters.',
            errorType: 'INVALID_REQUEST'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body. Please check your request format.',
          errorType: 'INVALID_JSON'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { frames, userId, drillMode = false } = requestBody;

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
      console.error('Invalid frames data:', { framesExists: !!frames, isArray: Array.isArray(frames), length: frames?.length });
      return new Response(
        JSON.stringify({ 
          error: 'No frames provided for analysis. Please upload a valid video.',
          errorType: 'NO_FRAMES'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Starting expert frame analysis for ${frames.length} frames using Gemini 2.5 Flash`)
    
    // Use Gemini 2.5 Flash for analysis
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`
    console.log('Using Gemini 2.5 Flash for expert-level analysis')

    const allShots = []
    let chunkIndex = 0
    const chunkSize = 3 // Process 3 frames at a time for faster processing

    // Process frames in smaller chunks for better performance
    for (let i = 0; i < frames.length; i += chunkSize) {
      chunkIndex++
      const frameChunk = frames.slice(i, i + chunkSize)
      console.log(`Processing chunk ${chunkIndex} with ${frameChunk.length} frames (timestamps: ${frameChunk[0].timestamp}s - ${frameChunk[frameChunk.length-1].timestamp}s)`)

      // Prepare the request body for frame sequence analysis
      const parts = [{
        text: `EXPERT SHOOTING ANALYSIS - RESPOND WITH JSON ONLY:

You are analyzing frame chunk ${chunkIndex} from a shooting video.

CRITICAL: Return ONLY a valid JSON array. No explanations, no markdown, just JSON.

Detect NEW bullet impacts (bright flashes, new holes) in this sequence.

For each NEW impact, return exactly:
[
  {
    "shot_number": ${chunkIndex},
    "score": 9,
    "x_coordinate": -15.2,
    "y_coordinate": 5.8,
    "timestamp": ${frameChunk[0].timestamp},
    "direction": "High Left",
    "comment": "Classic heeling pattern - anticipating recoil"
  }
]

DIRECTIONS: "Centered", "High Left", "High Right", "Low Left", "Low Right", "High", "Low", "Left", "Right"
COORDINATES: Center=(0,0), Right=+X, Up=+Y, millimeters
EMPTY: Return [] if no new impacts

JSON ONLY:`
      }]

      // Add all frames in the chunk
      frameChunk.forEach(frame => {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: frame.imageData.split(',')[1]
          }
        })
      })

      const requestBody = {
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 800
        }
      }

      try {
        // Call Gemini 2.5 Flash API for this chunk
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        })

        console.log(`Chunk ${chunkIndex} - Response status:`, geminiResponse.status)

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text()
          console.error(`Chunk ${chunkIndex} - Gemini API error:`, errorText)
          
          // For rate limit errors, try once more with delay
          if (geminiResponse.status === 429) {
            console.log('Rate limited, waiting 2 seconds...')
            await new Promise(resolve => setTimeout(resolve, 2000))
            continue
          }
          
          continue
        }

        const geminiData = await geminiResponse.json()
        let content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        
        if (content) {
          try {
            // Clean up the response - remove any markdown formatting
            content = content.replace(/```json\n?|\n?```/g, '').trim()
            
            // Remove any text before the JSON array
            const jsonMatch = content.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
              content = jsonMatch[0]
            }
            
            console.log(`Chunk ${chunkIndex} - Cleaned response:`, content.substring(0, 200))
            
            const chunkShots = JSON.parse(content)
            if (Array.isArray(chunkShots) && chunkShots.length > 0) {
              console.log(`Chunk ${chunkIndex} - Expert analysis detected ${chunkShots.length} new impacts`)
              allShots.push(...chunkShots)
            } else {
              console.log(`Chunk ${chunkIndex} - No impacts detected`)
            }
          } catch (parseError) {
            console.error(`Chunk ${chunkIndex} - Parse error:`, parseError)
            console.error(`Chunk ${chunkIndex} - Raw content:`, content)
          }
        }

        // Reduced delay between chunks
        await new Promise(resolve => setTimeout(resolve, 300))

      } catch (error) {
        console.error(`Chunk ${chunkIndex} - Request error:`, error)
        continue
      }
    }

    console.log(`Expert analysis complete. Total shots detected: ${allShots.length}`)

    if (allShots.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No shots detected in the analyzed frame sequences. Please ensure the video shows clear bullet impacts with adequate lighting.',
          errorType: 'NO_SHOTS_DETECTED'
        }),
        { 
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sort shots by timestamp and renumber sequentially
    allShots.sort((a, b) => a.timestamp - b.timestamp)
    allShots.forEach((shot, index) => {
      shot.shot_number = index + 1
    })
    
    return await processShotsData(supabaseClient, allShots, userId, 'expert-frame-analysis', drillMode)

  } catch (error) {
    console.error('Unexpected error in expert analysis function:', error)
    return new Response(
      JSON.stringify({ 
        error: `Expert analysis error: ${error.message}`,
        errorType: 'UNEXPECTED_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function processShotsData(supabaseClient: any, shots: any[], userId: string | null, videoUrl: string, drillMode: boolean) {
  // Expert-level performance analysis
  const totalShots = shots.length
  const totalScore = shots.reduce((sum, shot) => sum + shot.score, 0)
  const maxPossibleScore = totalShots * 10
  const averageScore = totalScore / totalShots
  
  // Professional accuracy calculation (9+ ring hits)
  const highScoringShots = shots.filter(shot => shot.score >= 9).length
  const accuracyPercentage = Math.round((highScoringShots / totalShots) * 100)
  
  // Expert group size calculation (maximum distance between any two shots)
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
  
  // Professional directional trend analysis
  const highLeftShots = shots.filter(shot => shot.direction.includes('High') && shot.direction.includes('Left')).length
  const lowRightShots = shots.filter(shot => shot.direction.includes('Low') && shot.direction.includes('Right')).length
  const leftShots = shots.filter(shot => shot.direction.includes('Left')).length
  const rightShots = shots.filter(shot => shot.direction.includes('Right')).length
  
  let directionalTrend = 'Centered shooting'
  if (highLeftShots > 0 && lowRightShots > 0) {
    directionalTrend = `Diagonal pattern: ${highLeftShots} high-left, ${lowRightShots} low-right (trigger control issue)`
  } else if (leftShots > rightShots) {
    directionalTrend = `${Math.round((leftShots / totalShots) * 100)}% left bias`
  } else if (rightShots > leftShots) {
    directionalTrend = `${Math.round((rightShots / totalShots) * 100)}% right bias`
  }

  // Timing metrics for drill mode
  let timeToFirstShot = null
  let splitTimes = []
  let averageSplitTime = null
  
  if (shots.length > 0 && shots[0].timestamp !== undefined) {
    timeToFirstShot = shots[0].timestamp
    
    for (let i = 1; i < shots.length; i++) {
      const splitTime = shots[i].timestamp - shots[i-1].timestamp
      splitTimes.push(splitTime)
    }
    
    if (splitTimes.length > 0) {
      averageSplitTime = splitTimes.reduce((sum, time) => sum + time, 0) / splitTimes.length
    }
  }

  // Create session record with expert analysis
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
        error: `Failed to save expert analysis: ${sessionError.message}`,
        errorType: 'DATABASE_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Create shot records with expert comments
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
        error: `Failed to save shot analysis: ${shotsError.message}`,
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

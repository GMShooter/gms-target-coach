
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

    const { videoUrl, userId, drillMode = false } = await req.json()

    // Check if Gemini API key is configured
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured. Please add your Gemini API key to Supabase Edge Function secrets.')
    }

    // Call Gemini API for video analysis
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are GMShooter, a professional shooting coach analyzing target shooting performance with precise timing capabilities.

Analyze this shooting video and detect all bullet impacts on the target. The target is lit from the front, and bullet impacts will appear as dark, roughly circular holes on a lighter background. Identify each new hole as it appears.

For each shot detected, provide the exact coordinates relative to the target center (0,0), score based on standard 10-ring target scoring, AND the precise timestamp when the shot impact appears in the video.

Return ONLY a JSON array with this exact format:
[
  {
    "shot_number": 1,
    "score": 9,
    "x_coordinate": -15.2,
    "y_coordinate": 5.8,
    "timestamp": 2.45,
    "direction": "Too left",
    "comment": "Trigger jerk detected"
  }
]

IMPORTANT TIMING REQUIREMENTS:
- timestamp: The exact time in seconds from the start of the video when this shot impact appears
- Be extremely precise with timing - accuracy to 0.1 seconds is critical for training analysis
- If this is drill mode, timing measurements are used for competitive training

Coordinate system: Center of target is (0,0). Positive X is right, negative X is left. Positive Y is up, negative Y is down. Units are in millimeters from center.

Scoring: 10-ring (center): 0-12.5mm, 9-ring: 12.5-25mm, 8-ring: 25-37.5mm, 7-ring: 37.5-50mm, etc.

Direction categories: "Centered", "Too left", "Too right", "Too high", "Too low", "High left", "High right", "Low left", "Low right"

Provide coaching comments based on shot patterns and impact locations.`
            }, {
              fileData: {
                mimeType: "video/mp4",
                fileUri: videoUrl
              }
            }]
          }]
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API failed: ${errorText}`)
    }

    const geminiData = await geminiResponse.json()
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!content) {
      throw new Error('No content received from Gemini API. The video may not contain detectable shots or the API failed to analyze it.')
    }

    // Parse JSON from Gemini response
    let shots
    try {
      shots = JSON.parse(content.replace(/```json\n?|\n?```/g, ''))
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', content)
      throw new Error('Invalid response format from Gemini API. Unable to parse shot data.')
    }

    if (!Array.isArray(shots) || shots.length === 0) {
      throw new Error('No shots detected in the video. Please ensure the video shows clear bullet impacts on the target.')
    }
    
    return await processShotsData(supabaseClient, shots, userId, videoUrl, drillMode)

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
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
    throw new Error(`Session creation failed: ${sessionError.message}`)
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
    throw new Error(`Shots creation failed: ${shotsError.message}`)
  }

  return new Response(
    JSON.stringify({ sessionId: session.id }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

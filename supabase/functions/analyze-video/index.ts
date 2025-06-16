
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

    // Parse request body
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Request body length:', bodyText.length);
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('Empty request body received');
        return new Response(
          JSON.stringify({ 
            error: 'Empty request body. Please provide detected shots and analysis parameters.',
            errorType: 'INVALID_REQUEST'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      requestBody = JSON.parse(bodyText);
      console.log('Request keys:', Object.keys(requestBody));
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body.',
          errorType: 'INVALID_JSON'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { detectedShots, modelChoice = 'gemini', userId, drillMode = false } = requestBody;

    // Validate input
    if (!detectedShots || !Array.isArray(detectedShots) || detectedShots.length === 0) {
      console.error('No detected shots provided');
      return new Response(
        JSON.stringify({ 
          error: 'No detected shots provided for analysis.',
          errorType: 'NO_SHOTS_PROVIDED'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Starting ${modelChoice.toUpperCase()} analysis for ${detectedShots.length} detected shots`);

    // Configure API based on model choice
    let apiUrl, apiKey, headers;
    
    if (modelChoice === 'gemini') {
      apiKey = Deno.env.get('GEMINI_API_KEY');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ 
            error: 'Gemini API key not configured.',
            errorType: 'API_KEY_MISSING'
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
    } else {
      // Gemma fallback (would need different API setup)
      apiKey = Deno.env.get('GEMMA_API_KEY') || Deno.env.get('GEMINI_API_KEY'); // Use Gemini as fallback for now
      if (!apiKey) {
        return new Response(
          JSON.stringify({ 
            error: 'Gemma API key not configured.',
            errorType: 'API_KEY_MISSING'
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      // For now, use Gemini with different parameters for "Gemma mode"
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
    }

    // Prepare analysis request
    const parts = [{
      text: `EXPERT SHOOTING ANALYSIS - ${modelChoice.toUpperCase()} MODE

You are analyzing ${detectedShots.length} KEY FRAMES from visual shot detection. Each frame shows a moment when a new bullet impact was detected.

CRITICAL: Return ONLY a valid JSON array. No explanations, no markdown, just JSON.

For each frame that shows a clear bullet impact (new hole), return:
[
  {
    "shot_number": 1,
    "score": 9,
    "x_coordinate": -15.2,
    "y_coordinate": 5.8,
    "timestamp": ${detectedShots[0]?.timestamp || 0},
    "direction": "High Left", 
    "comment": "Clean center shot - excellent trigger control"
  }
]

DIRECTIONS: "Centered", "High Left", "High Right", "Low Left", "Low Right", "High", "Low", "Left", "Right"
COORDINATES: Center=(0,0), Right=+X, Up=+Y, in millimeters from bullseye
SCORING: 10=bullseye, 9=inner ring, 8=next ring, etc.

EMPTY: Return [] if no clear impacts visible

JSON ONLY:`
    }];

    // Add detected shot frames
    detectedShots.forEach((shot, index) => {
      parts.push({
        text: `Frame ${index + 1} (t=${shot.timestamp}s, confidence=${(shot.confidenceScore * 100).toFixed(1)}%):`
      });
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: shot.keyFrame.split(',')[1]
        }
      });
    });

    const requestPayload = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: modelChoice === 'gemini' ? 0.1 : 0.3,
        maxOutputTokens: modelChoice === 'gemini' ? 1000 : 800
      }
    };

    console.log(`Calling ${modelChoice.toUpperCase()} API with ${detectedShots.length} key frames...`);

    try {
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestPayload)
      });

      console.log(`${modelChoice.toUpperCase()} API response status:`, apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`${modelChoice.toUpperCase()} API error:`, errorText);
        
        if (apiResponse.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: `${modelChoice.toUpperCase()} rate limit exceeded. Please try again later.`,
              errorType: 'QUOTA_EXCEEDED'
            }),
            { 
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        throw new Error(`${modelChoice.toUpperCase()} API error: ${errorText}`);
      }

      const responseData = await apiResponse.json();
      let content = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        console.error('No content in API response');
        return new Response(
          JSON.stringify({ 
            error: `${modelChoice.toUpperCase()} returned no analysis content.`,
            errorType: 'NO_CONTENT'
          }),
          { 
            status: 422,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Clean and parse response
      try {
        content = content.replace(/```json\n?|\n?```/g, '').trim();
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
        
        console.log(`${modelChoice.toUpperCase()} cleaned response:`, content.substring(0, 200));
        
        const shots = JSON.parse(content);
        if (!Array.isArray(shots)) {
          throw new Error('Response is not an array');
        }

        console.log(`${modelChoice.toUpperCase()} analysis complete: ${shots.length} shots identified`);

        if (shots.length === 0) {
          return new Response(
            JSON.stringify({ 
              error: `${modelChoice.toUpperCase()} could not identify clear bullet impacts in the detected frames.`,
              errorType: 'NO_SHOTS_DETECTED'
            }),
            { 
              status: 422,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Sort and number shots
        shots.sort((a, b) => a.timestamp - b.timestamp);
        shots.forEach((shot, index) => {
          shot.shot_number = index + 1;
        });
        
        return await processShotsData(supabaseClient, shots, userId, `${modelChoice}-visual-detection`, drillMode);

      } catch (parseError) {
        console.error(`Failed to parse ${modelChoice.toUpperCase()} response:`, parseError);
        return new Response(
          JSON.stringify({ 
            error: `${modelChoice.toUpperCase()} returned invalid response format.`,
            errorType: 'PARSE_ERROR'
          }),
          { 
            status: 422,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

    } catch (error) {
      console.error(`${modelChoice.toUpperCase()} API call failed:`, error);
      return new Response(
        JSON.stringify({ 
          error: `${modelChoice.toUpperCase()} analysis failed: ${error.message}`,
          errorType: 'API_ERROR'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Unexpected error in analysis function:', error);
    return new Response(
      JSON.stringify({ 
        error: `Analysis error: ${error.message}`,
        errorType: 'UNEXPECTED_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processShotsData(supabaseClient: any, shots: any[], userId: string | null, videoUrl: string, drillMode: boolean) {
  // Expert-level performance analysis
  const totalShots = shots.length
  const totalScore = shots.reduce((sum, shot) => sum + shot.score, 0)
  const maxPossibleScore = totalShots * 10
  const averageScore = totalScore / totalShots
  
  const highScoringShots = shots.filter(shot => shot.score >= 9).length
  const accuracyPercentage = Math.round((highScoringShots / totalShots) * 100)
  
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
        error: `Failed to save analysis: ${sessionError.message}`,
        errorType: 'DATABASE_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

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

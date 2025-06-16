
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

    // Parse request body with enhanced logging
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('Raw request body length:', bodyText.length);
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('Empty request body received');
        return new Response(
          JSON.stringify({ 
            error: 'Empty request body. Please provide detected shots or frame pairs for analysis.',
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
      console.log('Enhanced payload details:', {
        detectedShotsCount: requestBody.detectedShots?.length || 0,
        framePairsCount: requestBody.framePairs?.length || 0,
        modelChoice: requestBody.modelChoice,
        fallbackMode: requestBody.fallbackMode || false,
        payloadSizeKB: Math.round(bodyText.length / 1024)
      });
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

    const { 
      detectedShots, 
      framePairs,
      modelChoice = 'gemini', 
      userId, 
      drillMode = false, 
      fallbackMode = false 
    } = requestBody;

    // Validate input based on mode
    if (fallbackMode) {
      if (!framePairs || !Array.isArray(framePairs) || framePairs.length === 0) {
        console.error('No frame pairs provided for fallback mode');
        return new Response(
          JSON.stringify({ 
            error: 'No frame pairs provided for enhanced fallback analysis.',
            errorType: 'NO_FRAME_PAIRS_PROVIDED'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else {
      if (!detectedShots || !Array.isArray(detectedShots) || detectedShots.length === 0) {
        console.error('No detected shots provided for primary mode');
        return new Response(
          JSON.stringify({ 
            error: 'No detected shots provided for enhanced analysis.',
            errorType: 'NO_SHOTS_PROVIDED'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    console.log(`Starting enhanced ${modelChoice.toUpperCase()} analysis for ${fallbackMode ? framePairs?.length + ' frame pairs' : detectedShots?.length + ' detected shots'} (fallback: ${fallbackMode})`);

    // Configure API based on model choice with correct model names
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
      // Fixed model name
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
    } else {
      // Use the provided Gemini key for Gemma (as fallback)
      apiKey = 'AIzaSyB-BLK4CrCg-sgdUwC8sePAbNtXjbWTyxE';
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
      // Fixed model name for Gemma
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemma-2-27b-it:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
    }

    // Prepare enhanced analysis request
    let parts = [];
    
    if (fallbackMode) {
      // Enhanced fallback mode with contextual frame pairs
      parts.push({
        text: `EXPERT SHOOTING ANALYSIS - ${modelChoice.toUpperCase()} ENHANCED FALLBACK MODE (CONTEXTUAL FRAME ANALYSIS)

You are analyzing ${framePairs.length} FRAME PAIRS from contextual video sampling. Each pair shows a "before" and "after" frame to help you identify NEW bullet impacts.

CRITICAL: Return ONLY a valid JSON array. No explanations, no markdown, just JSON.

For each pair, compare the SECOND image to the FIRST image. Look for NEW bullet holes that appear in the second image that were NOT present in the first image.

For each NEW bullet impact found, return:
[
  {
    "shot_number": 1,
    "score": 9,
    "x_coordinate": -15.2,
    "y_coordinate": 5.8,
    "timestamp": ${framePairs[0]?.timestamp || 0},
    "direction": "High Left", 
    "comment": "Clean center shot - excellent trigger control"
  }
]

DIRECTIONS: "Centered", "High Left", "High Right", "Low Left", "Low Right", "High", "Low", "Left", "Right"
COORDINATES: Center=(0,0), Right=+X, Up=+Y, in millimeters from bullseye
SCORING: 10=bullseye, 9=inner ring, 8=next ring, etc.

ENHANCED FALLBACK: Compare each image pair carefully. Only report NEW holes that appear in the second image.

EMPTY: Return [] if no NEW impacts are visible in any pairs

JSON ONLY:`
      });

      // Add frame pairs in chunks
      const chunkSize = modelChoice === 'gemini' ? 8 : 10;
      
      framePairs.forEach((pair, index) => {
        if (index % chunkSize === 0 && index > 0) {
          parts.push({
            text: `--- ENHANCED CHUNK ${Math.floor(index / chunkSize) + 1} ---`
          });
        }
        
        parts.push({
          text: `Enhanced Pair ${index + 1} (t=${pair.timestamp}s) - BEFORE:`
        });
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: pair.image1_base64
          }
        });
        parts.push({
          text: `Enhanced Pair ${index + 1} (t=${pair.timestamp}s) - AFTER:`
        });
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: pair.image2_base64
          }
        });
      });
    } else {
      // Primary mode with detected shots
      const modeDescription = 'ENHANCED VIBE SHOT DETECTION';
      parts.push({
        text: `EXPERT SHOOTING ANALYSIS - ${modelChoice.toUpperCase()} MODE (${modeDescription})

You are analyzing ${detectedShots.length} ENHANCED KEY FRAMES from ViBe-based visual shot detection. Each frame shows a moment when a new bullet impact was detected by enhanced computer vision.

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

ENHANCED VIBE MODE: These frames were pre-selected by enhanced computer vision as containing new bullet holes.

EMPTY: Return [] if no clear impacts visible

JSON ONLY:`
      });

      // Add detected shot frames in chunks
      const chunkSize = modelChoice === 'gemini' ? 5 : 8;
      
      detectedShots.forEach((shot, index) => {
        if (index % chunkSize === 0 && index > 0) {
          parts.push({
            text: `--- ENHANCED CHUNK ${Math.floor(index / chunkSize) + 1} ---`
          });
        }
        
        parts.push({
          text: `Enhanced Frame ${index + 1} (t=${shot.timestamp}s, confidence=${(shot.confidenceScore * 100).toFixed(1)}%):`
        });
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: shot.keyFrame.split(',')[1]
          }
        });
      });
    }

    const requestPayload = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: modelChoice === 'gemini' ? 0.1 : 0.15,
        maxOutputTokens: modelChoice === 'gemini' ? 2048 : 1536,
        topP: 0.9
      }
    };

    const dataCount = fallbackMode ? framePairs.length : detectedShots.length;
    const dataType = fallbackMode ? 'frame pairs' : 'key frames';
    const chunkCount = fallbackMode ? 
      Math.ceil(framePairs.length / (modelChoice === 'gemini' ? 8 : 10)) :
      Math.ceil(detectedShots.length / (modelChoice === 'gemini' ? 5 : 8));

    console.log(`Calling enhanced ${modelChoice.toUpperCase()} API with ${dataCount} ${dataType} in ${chunkCount} chunks...`);

    try {
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestPayload)
      });

      console.log(`Enhanced ${modelChoice.toUpperCase()} API response status:`, apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`Enhanced ${modelChoice.toUpperCase()} API error:`, errorText);
        
        if (apiResponse.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: `Enhanced ${modelChoice.toUpperCase()} rate limit exceeded. Please try again later.`,
              errorType: 'QUOTA_EXCEEDED'
            }),
            { 
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        throw new Error(`Enhanced ${modelChoice.toUpperCase()} API error: ${errorText}`);
      }

      const responseData = await apiResponse.json();
      let content = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        console.error('No content in enhanced API response');
        return new Response(
          JSON.stringify({ 
            error: `Enhanced ${modelChoice.toUpperCase()} returned no analysis content.`,
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
        
        console.log(`Enhanced ${modelChoice.toUpperCase()} cleaned response:`, content.substring(0, 200));
        
        const shots = JSON.parse(content);
        if (!Array.isArray(shots)) {
          throw new Error('Response is not an array');
        }

        console.log(`Enhanced ${modelChoice.toUpperCase()} analysis complete: ${shots.length} shots identified`);

        if (shots.length === 0) {
          return new Response(
            JSON.stringify({ 
              error: `Enhanced ${modelChoice.toUpperCase()} could not identify clear bullet impacts in the ${fallbackMode ? 'frame pairs' : 'detected frames'}.`,
              errorType: 'NO_SHOTS_DETECTED_BY_AI'
            }),
            { 
              status: 422,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Sort and number shots by timestamp
        shots.sort((a, b) => a.timestamp - b.timestamp);
        shots.forEach((shot, index) => {
          shot.shot_number = index + 1;
        });
        
        // Calculate split times
        const splitTimes = [];
        for (let i = 1; i < shots.length; i++) {
          const splitTime = shots[i].timestamp - shots[i-1].timestamp;
          splitTimes.push(parseFloat(splitTime.toFixed(3)));
        }
        
        console.log(`Enhanced split times calculated: ${splitTimes.join(', ')}s`);
        
        return await processShotsData(
          supabaseClient, 
          shots, 
          userId, 
          `enhanced-${modelChoice}-${fallbackMode ? 'contextual-fallback' : 'vibe-detection'}`, 
          drillMode,
          splitTimes
        );

      } catch (parseError) {
        console.error(`Failed to parse enhanced ${modelChoice.toUpperCase()} response:`, parseError);
        return new Response(
          JSON.stringify({ 
            error: `Enhanced ${modelChoice.toUpperCase()} returned invalid response format.`,
            errorType: 'PARSE_ERROR'
          }),
          { 
            status: 422,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

    } catch (error) {
      console.error(`Enhanced ${modelChoice.toUpperCase()} API call failed:`, error);
      return new Response(
        JSON.stringify({ 
          error: `Enhanced ${modelChoice.toUpperCase()} analysis failed: ${error.message}`,
          errorType: 'API_ERROR'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Unexpected error in enhanced analysis function:', error);
    return new Response(
      JSON.stringify({ 
        error: `Enhanced analysis error: ${error.message}`,
        errorType: 'UNEXPECTED_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processShotsData(
  supabaseClient: any, 
  shots: any[], 
  userId: string | null, 
  videoUrl: string, 
  drillMode: boolean,
  splitTimes: number[]
) {
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
  let averageSplitTime = null
  
  if (shots.length > 0 && shots[0].timestamp !== undefined) {
    timeToFirstShot = shots[0].timestamp
    
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
        error: `Failed to save enhanced analysis: ${sessionError.message}`,
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
        error: `Failed to save enhanced shot analysis: ${shotsError.message}`,
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

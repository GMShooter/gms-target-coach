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

    const requestBody = await req.json();
    
    // Handle session finalization
    if (requestBody.finalizeSession) {
      return await finalizeSession(supabaseClient, requestBody);
    }

    // Handle batch analysis
    const { frames, framePairs, modelChoice = 'gemini', userId, drillMode = false, batchInfo } = requestBody;

    // Determine if we're using paired frame analysis (Gemma) or single frame analysis (Gemini)
    const usingPairs = framePairs && Array.isArray(framePairs);
    const dataToAnalyze = usingPairs ? framePairs : frames;

    if (!dataToAnalyze || !Array.isArray(dataToAnalyze) || dataToAnalyze.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No frames or frame pairs provided for analysis.',
          errorType: 'NO_DATA_PROVIDED'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const batchDesc = batchInfo 
      ? `batch ${batchInfo.batchIndex}/${batchInfo.totalBatches}` 
      : (usingPairs ? 'frame pairs' : 'frames');
    
    console.log(`Starting ${modelChoice.toUpperCase()} analysis for ${dataToAnalyze.length} ${usingPairs ? 'frame pairs' : 'frames'} (${batchDesc})`);

    // Configure API based on model choice
    let apiUrl, apiKey;
    
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
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    } else {
      apiKey = Deno.env.get('GEMINI_API_KEY');
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
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${apiKey}`;
    }

    // Prepare analysis request with appropriate prompt
    const parts = [];

    if (usingPairs) {
      // Paired frame analysis prompt for Gemma
      parts.push({
        text: `EXPERT SHOOTING ANALYSIS - GEMMA PAIRED FRAME MODE

You are analyzing ${dataToAnalyze.length} pairs of consecutive video frames from a shooting session. Each pair contains:
- Image A (before): The earlier frame
- Image B (after): The subsequent frame

Your task: Compare Image B to Image A and identify any NEW bullet impacts that appear in Image B that were NOT present in Image A.

CRITICAL: Return ONLY a valid JSON array. No explanations, no markdown, just JSON.

For each NEW bullet impact found when comparing the pairs, return:
[
  {
    "shot_number": 1,
    "score": 9,
    "x_coordinate": -15.2,
    "y_coordinate": 5.8,
    "timestamp": ${dataToAnalyze[0]?.timestamp || 0},
    "direction": "High Left", 
    "comment": "Clean center shot"
  }
]

DIRECTIONS: "Centered", "High Left", "High Right", "Low Left", "Low Right", "High", "Low", "Left", "Right"
COORDINATES: Center=(0,0), Right=+X, Up=+Y, in millimeters from bullseye
SCORING: 10=bullseye, 9=inner ring, 8=next ring, etc.

RETURN [] if no NEW impacts are visible when comparing Image B to Image A.

FRAME PAIRS TO ANALYZE:`
      });

      // Add frame pairs
      dataToAnalyze.forEach((pair: any, index: number) => {
        parts.push({
          text: `Pair ${index + 1} - Before (Image A):`
        });
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: pair.image1Data.split(',')[1]
          }
        });
        parts.push({
          text: `Pair ${index + 1} - After (Image B, t=${pair.timestamp}s):`
        });
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: pair.image2Data.split(',')[1]
          }
        });
      });
    } else {
      // Single frame analysis prompt for Gemini - ENHANCED WITH BETTER INSTRUCTIONS
      parts.push({
        text: `EXPERT SHOOTING ANALYSIS - GEMINI SINGLE FRAME MODE

You are analyzing ${dataToAnalyze.length} frames from a shooting video. Each frame may contain bullet impacts on a target.

CRITICAL: Your task is to identify ALL visible bullet impacts in each frame. Return ONLY a valid JSON array of all detected shots.

IMPORTANT DETECTION GUIDELINES:
- Look for dark circular holes in the target paper
- Count EVERY visible bullet hole, even if small or faint
- Include holes in all scoring rings (bullseye, inner rings, outer rings)
- Do NOT require holes to be "clear" or "perfect" - include all visible impacts
- Even damaged or torn areas of the target should be counted if they appear to be bullet impacts

For EACH bullet impact visible in the frame, return an object in the array:
[
  {
    "shot_number": 1,
    "score": 9,
    "x_coordinate": -15.2,
    "y_coordinate": 5.8,
    "timestamp": ${dataToAnalyze[0]?.timestamp || 0},
    "direction": "High Left",
    "comment": "Identified from frame"
  }
]

DIRECTIONS: "Centered", "High Left", "High Right", "Low Left", "Low Right", "High", "Low", "Left", "Right"
COORDINATES: Center=(0,0), Right=+X, Up=+Y, in millimeters from bullseye
SCORING: 10=bullseye, 9=inner ring, 8=next ring, etc.

CRITICAL: If a frame contains 8 visible holes, return an array with 8 objects. If a frame has 0 holes, return [].
DO NOT return empty arrays unless there are truly NO visible bullet impacts.

FRAMES TO ANALYZE:`
      });

      // Add individual frames
      dataToAnalyze.forEach((frame: any, index: number) => {
        parts.push({
          text: `Frame ${frame.frameNumber} (t=${frame.timestamp}s):`
        });
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: frame.imageData.split(',')[1]
          }
        });
      });
    }

    const requestPayload = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        topP: 0.9
      }
    };

    console.log(`Calling ${modelChoice.toUpperCase()} API for ${batchDesc}...`);

    try {
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      console.log(`${modelChoice.toUpperCase()} API response status:`, apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`${modelChoice.toUpperCase()} API error:`, errorText);
        
        if (apiResponse.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: `${modelChoice.toUpperCase()} rate limit exceeded.`,
              errorType: 'QUOTA_EXCEEDED'
            }),
            { 
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        if (apiResponse.status === 503) {
          return new Response(
            JSON.stringify({ 
              error: `${modelChoice.toUpperCase()} model overloaded. Please try again later.`,
              errorType: 'MODEL_OVERLOADED'
            }),
            { 
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        throw new Error(`${modelChoice.toUpperCase()} API error: ${errorText}`);
      }

      const responseData = await apiResponse.json();
      let content = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        console.log(`No content in ${modelChoice.toUpperCase()} response for ${batchDesc}`);
        return new Response(
          JSON.stringify({ 
            shots: [],
            batchInfo: batchInfo
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Enhanced response cleaning and parsing
      try {
        content = content.replace(/```json\n?|\n?```/g, '').trim();
        
        // Remove any text before the first [ and after the last ]
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
        
        console.log(`${modelChoice.toUpperCase()} cleaned response for ${batchDesc}:`, content.substring(0, 200));
        
        const shots = JSON.parse(content);
        if (!Array.isArray(shots)) {
          console.log(`Invalid array response for ${batchDesc}, treating as no shots`);
          return new Response(
            JSON.stringify({ 
              shots: [],
              batchInfo: batchInfo
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Validate shot objects
        const validShots = shots.filter((shot: any) => {
          return shot && 
                 typeof shot.x_coordinate === 'number' && 
                 typeof shot.y_coordinate === 'number' && 
                 typeof shot.score === 'number' &&
                 !isNaN(shot.x_coordinate) && 
                 !isNaN(shot.y_coordinate) && 
                 !isNaN(shot.score);
        });

        console.log(`${modelChoice.toUpperCase()} analysis complete for ${batchDesc}: ${validShots.length} valid shots identified (${shots.length} total returned)`);

        return new Response(
          JSON.stringify({ 
            shots: validShots,
            batchInfo: batchInfo
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );

      } catch (parseError) {
        console.error(`Failed to parse ${modelChoice.toUpperCase()} response for ${batchDesc}:`, parseError);
        console.error('Raw content:', content);
        return new Response(
          JSON.stringify({ 
            shots: [],
            batchInfo: batchInfo
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

    } catch (error) {
      console.error(`${modelChoice.toUpperCase()} API call failed for ${batchDesc}:`, error);
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

async function finalizeSession(supabaseClient: any, requestBody: any) {
  const { shots, splitTimes, userId, drillMode, modelChoice, totalFramesProcessed, batchesProcessed } = requestBody;

  if (!shots || shots.length === 0) {
    return new Response(
      JSON.stringify({ 
        error: 'No shots to save in session.',
        errorType: 'NO_SHOTS_TO_SAVE'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Calculate session statistics
  const totalShots = shots.length;
  const totalScore = shots.reduce((sum: number, shot: any) => sum + shot.score, 0);
  const accuracyPercentage = Math.round((shots.filter((shot: any) => shot.score >= 9).length / totalShots) * 100);
  
  // Calculate group size
  let groupSize = 0;
  for (let i = 0; i < shots.length; i++) {
    for (let j = i + 1; j < shots.length; j++) {
      const distance = Math.sqrt(
        Math.pow(shots[i].x_coordinate - shots[j].x_coordinate, 2) + 
        Math.pow(shots[i].y_coordinate - shots[j].y_coordinate, 2)
      );
      groupSize = Math.max(groupSize, distance);
    }
  }
  
  // Calculate directional trend
  const leftShots = shots.filter((shot: any) => shot.direction.includes('Left')).length;
  const rightShots = shots.filter((shot: any) => shot.direction.includes('Right')).length;
  
  let directionalTrend = 'Centered shooting';
  if (leftShots > rightShots) {
    directionalTrend = `${Math.round((leftShots / totalShots) * 100)}% left bias`;
  } else if (rightShots > leftShots) {
    directionalTrend = `${Math.round((rightShots / totalShots) * 100)}% right bias`;
  }

  // Time calculations
  const timeToFirstShot = shots.length > 0 ? shots[0].timestamp : null;
  const averageSplitTime = splitTimes && splitTimes.length > 0 
    ? splitTimes.reduce((sum: number, time: number) => sum + time, 0) / splitTimes.length 
    : null;

  // Create session
  const { data: session, error: sessionError } = await supabaseClient
    .from('sessions')
    .insert({
      user_id: userId,
      video_url: `${modelChoice}-batch-analysis`,
      total_score: totalScore,
      group_size_mm: Math.round(groupSize),
      accuracy_percentage: accuracyPercentage,
      directional_trend: directionalTrend,
      drill_mode: drillMode,
      time_to_first_shot: timeToFirstShot,
      average_split_time: averageSplitTime,
      split_times: splitTimes && splitTimes.length > 0 ? splitTimes : null
    })
    .select()
    .single();

  if (sessionError) {
    console.error('Session creation error:', sessionError);
    return new Response(
      JSON.stringify({ 
        error: `Failed to save session: ${sessionError.message}`,
        errorType: 'DATABASE_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Create shots
  const shotInserts = shots.map((shot: any) => ({
    session_id: session.id,
    shot_number: shot.shot_number,
    score: shot.score,
    x_coordinate: shot.x_coordinate,
    y_coordinate: shot.y_coordinate,
    direction: shot.direction,
    comment: shot.comment || '',
    shot_timestamp: shot.timestamp || null
  }));

  const { error: shotsError } = await supabaseClient
    .from('shots')
    .insert(shotInserts);

  if (shotsError) {
    console.error('Shots creation error:', shotsError);
    return new Response(
      JSON.stringify({ 
        error: `Failed to save shots: ${shotsError.message}`,
        errorType: 'DATABASE_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  console.log(`Session finalized: ${session.id} with ${totalShots} shots from ${batchesProcessed} batches (${totalFramesProcessed} frames)`);

  return new Response(
    JSON.stringify({ sessionId: session.id }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

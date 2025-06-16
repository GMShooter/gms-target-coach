
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
    const { frames, modelChoice = 'gemini', userId, drillMode = false, batchInfo } = requestBody;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No frames provided for analysis.',
          errorType: 'NO_FRAMES_PROVIDED'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const batchDesc = batchInfo ? `batch ${batchInfo.batchIndex}/${batchInfo.totalBatches}` : 'frames';
    console.log(`Starting ${modelChoice.toUpperCase()} analysis for ${frames.length} frames (${batchDesc})`);

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
      apiKey = Deno.env.get('GEMINI_API_KEY'); // Using same key for Gemma
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

    // Prepare analysis request with optimized prompt
    const parts = [
      {
        text: `EXPERT SHOOTING ANALYSIS - ${modelChoice.toUpperCase()} BATCH MODE

You are analyzing ${frames.length} frames from a shooting video. Each frame may contain bullet impacts on a target.

CRITICAL: Return ONLY a valid JSON array. No explanations, no markdown, just JSON.

For each frame that shows a clear bullet impact (new hole), return:
[
  {
    "shot_number": 1,
    "score": 9,
    "x_coordinate": -15.2,
    "y_coordinate": 5.8,
    "timestamp": ${frames[0]?.timestamp || 0},
    "direction": "High Left", 
    "comment": "Clean center shot"
  }
]

DIRECTIONS: "Centered", "High Left", "High Right", "Low Left", "Low Right", "High", "Low", "Left", "Right"
COORDINATES: Center=(0,0), Right=+X, Up=+Y, in millimeters from bullseye
SCORING: 10=bullseye, 9=inner ring, 8=next ring, etc.

RETURN [] if no clear impacts visible.

FRAMES TO ANALYZE:`
      }
    ];

    // Add frames in smaller chunks for better processing
    frames.forEach((frame, index) => {
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

      // Clean and parse response
      try {
        content = content.replace(/```json\n?|\n?```/g, '').trim();
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

        console.log(`${modelChoice.toUpperCase()} analysis complete for ${batchDesc}: ${shots.length} shots identified`);

        return new Response(
          JSON.stringify({ 
            shots: shots,
            batchInfo: batchInfo
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );

      } catch (parseError) {
        console.error(`Failed to parse ${modelChoice.toUpperCase()} response for ${batchDesc}:`, parseError);
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

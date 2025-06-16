
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
    const { videoData, mimeType, framePairs, modelChoice = 'gemini', userId, drillMode = false } = requestBody;

    // Determine analysis mode
    const isDirectVideo = videoData && modelChoice === 'gemini';
    const isFramePairs = framePairs && Array.isArray(framePairs) && modelChoice === 'gemma';

    if (!isDirectVideo && !isFramePairs) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request: provide either videoData (for Gemini) or framePairs (for Gemma)',
          errorType: 'INVALID_REQUEST'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Starting ${modelChoice.toUpperCase()} analysis - ${isDirectVideo ? 'Direct Video' : `${framePairs.length} Frame Pairs`}`);

    // Configure API with correct model names
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          errorType: 'API_KEY_MISSING'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // FIXED: Use correct model names
    const apiUrl = modelChoice === 'gemini' 
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`
      : `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${apiKey}`;

    // Prepare request based on analysis mode
    let requestPayload: any;

    if (isDirectVideo) {
      // DIRECT VIDEO ANALYSIS (Gemini) - Using base64 data
      requestPayload = {
        contents: [{
          parts: [
            {
              text: `EXPERT SHOOTING ANALYSIS - DIRECT VIDEO MODE

You are an expert shooting coach analyzing a shooting video. Watch the entire video and identify every new bullet impact as it appears on the target.

CRITICAL: Return ONLY a valid JSON array of all detected shots, ordered by the time they appear.

For EACH NEW bullet impact, return an object with:
{
  "shot_number": 1,
  "score": 9,
  "x_coordinate": -15.2,
  "y_coordinate": 5.8,
  "timestamp": 2.5,
  "direction": "High Left",
  "comment": "Clean shot"
}

DIRECTIONS: "Centered", "High Left", "High Right", "Low Left", "Low Right", "High", "Low", "Left", "Right"
COORDINATES: Center=(0,0), Right=+X, Up=+Y, in millimeters from bullseye
SCORING: 10=bullseye, 9=inner ring, 8=next ring, etc.
TIMESTAMP: Exact time in seconds when the hole APPEARS

If the video shows 8 shots, return an array with 8 objects. If 0 shots, return [].`
            },
            {
              inlineData: {
                mimeType: mimeType || 'video/mp4',
                data: videoData
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          topP: 0.9
        }
      };
    } else {
      // FRAME-PAIR ANALYSIS (Gemma)
      const parts = [{
        text: `EXPERT SHOOTING ANALYSIS - FRAME PAIR MODE

You are analyzing ${framePairs.length} pairs of consecutive video frames. Each pair shows a "before" and "after" moment.

Your task: Compare the "after" image to the "before" image and identify any NEW bullet impacts that appear.

CRITICAL: Return ONLY a valid JSON array. No explanations.

For each NEW bullet impact found, return:
[
  {
    "shot_number": 1,
    "score": 9,
    "x_coordinate": -15.2,
    "y_coordinate": 5.8,
    "timestamp": ${framePairs[0]?.timestamp || 0},
    "direction": "High Left", 
    "comment": "New impact detected"
  }
]

DIRECTIONS: "Centered", "High Left", "High Right", "Low Left", "Low Right", "High", "Low", "Left", "Right"
COORDINATES: Center=(0,0), Right=+X, Up=+Y, in millimeters from bullseye
SCORING: 10=bullseye, 9=inner ring, 8=next ring, etc.

RETURN [] if no NEW impacts are visible.

FRAME PAIRS TO ANALYZE:`
      }];

      // Add frame pairs
      framePairs.forEach((pair: any, index: number) => {
        parts.push({
          text: `Pair ${index + 1} - Before:`
        });
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: pair.image1Data.split(',')[1]
          }
        });
        parts.push({
          text: `Pair ${index + 1} - After (t=${pair.timestamp}s):`
        });
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: pair.image2Data.split(',')[1]
          }
        });
      });

      requestPayload = {
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          topP: 0.9
        }
      };
    }

    console.log(`Calling ${modelChoice.toUpperCase()} API with correct model name...`);

    // Make API call with retry logic
    let apiResponse;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        apiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        });

        if (apiResponse.ok) {
          break; // Success, exit retry loop
        }

        console.log(`${modelChoice.toUpperCase()} API response status:`, apiResponse.status);

        if (apiResponse.status === 503 && retryCount < maxRetries) {
          console.log(`Retrying in 2 seconds... (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          retryCount++;
          continue;
        }

        const errorText = await apiResponse.text();
        console.error(`${modelChoice.toUpperCase()} API error:`, errorText);
        
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
      } catch (fetchError) {
        if (retryCount === maxRetries) {
          throw fetchError;
        }
        console.log(`Network error, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Parse response
    const responseData = await apiResponse.json();
    let content = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.log(`No content in ${modelChoice.toUpperCase()} response`);
      return new Response(
        JSON.stringify({ 
          error: 'No analysis results returned from AI model',
          errorType: 'NO_CONTENT'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Clean and parse JSON response
    try {
      content = content.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      console.log(`${modelChoice.toUpperCase()} response:`, content.substring(0, 200));
      
      const shots = JSON.parse(content);
      if (!Array.isArray(shots)) {
        throw new Error('Response is not an array');
      }

      // Validate and process shots
      const validShots = shots.filter((shot: any) => {
        return shot && 
               typeof shot.x_coordinate === 'number' && 
               typeof shot.y_coordinate === 'number' && 
               typeof shot.score === 'number' &&
               !isNaN(shot.x_coordinate) && 
               !isNaN(shot.y_coordinate) && 
               !isNaN(shot.score);
      });

      console.log(`${modelChoice.toUpperCase()} analysis complete: ${validShots.length} valid shots identified`);

      if (validShots.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No valid shots detected. Please ensure bullet impacts are clearly visible against the target with good lighting and contrast.',
            errorType: 'NO_SHOTS_DETECTED'
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Process and save session
      const finalShots = validShots.map((shot: any, index: number) => ({
        ...shot,
        shot_number: index + 1
      }));

      // Sort by timestamp
      finalShots.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      // Calculate session statistics
      const totalShots = finalShots.length;
      const totalScore = finalShots.reduce((sum: number, shot: any) => sum + shot.score, 0);
      const accuracyPercentage = Math.round((finalShots.filter((shot: any) => shot.score >= 9).length / totalShots) * 100);
      
      // Calculate group size
      let groupSize = 0;
      for (let i = 0; i < finalShots.length; i++) {
        for (let j = i + 1; j < finalShots.length; j++) {
          const distance = Math.sqrt(
            Math.pow(finalShots[i].x_coordinate - finalShots[j].x_coordinate, 2) + 
            Math.pow(finalShots[i].y_coordinate - finalShots[j].y_coordinate, 2)
          );
          groupSize = Math.max(groupSize, distance);
        }
      }
      
      // Calculate split times
      const splitTimes = [];
      for (let i = 1; i < finalShots.length; i++) {
        if (finalShots[i].timestamp && finalShots[i-1].timestamp) {
          const splitTime = finalShots[i].timestamp - finalShots[i-1].timestamp;
          splitTimes.push(parseFloat(splitTime.toFixed(3)));
        }
      }

      // Calculate directional trend
      const leftShots = finalShots.filter((shot: any) => shot.direction?.includes('Left')).length;
      const rightShots = finalShots.filter((shot: any) => shot.direction?.includes('Right')).length;
      
      let directionalTrend = 'Centered shooting';
      if (leftShots > rightShots) {
        directionalTrend = `${Math.round((leftShots / totalShots) * 100)}% left bias`;
      } else if (rightShots > leftShots) {
        directionalTrend = `${Math.round((rightShots / totalShots) * 100)}% right bias`;
      }

      const timeToFirstShot = finalShots.length > 0 ? finalShots[0].timestamp : null;
      const averageSplitTime = splitTimes.length > 0 
        ? splitTimes.reduce((sum: number, time: number) => sum + time, 0) / splitTimes.length 
        : null;

      // Create session
      const { data: session, error: sessionError } = await supabaseClient
        .from('sessions')
        .insert({
          user_id: userId,
          video_url: isDirectVideo ? `${modelChoice}-direct-analysis` : `${modelChoice}-frame-analysis`,
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
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw new Error(`Failed to save session: ${sessionError.message}`);
      }

      // Create shots
      const shotInserts = finalShots.map((shot: any) => ({
        session_id: session.id,
        shot_number: shot.shot_number,
        score: shot.score,
        x_coordinate: shot.x_coordinate,
        y_coordinate: shot.y_coordinate,
        direction: shot.direction || 'Unknown',
        comment: shot.comment || '',
        shot_timestamp: shot.timestamp || null
      }));

      const { error: shotsError } = await supabaseClient
        .from('shots')
        .insert(shotInserts);

      if (shotsError) {
        console.error('Shots creation error:', shotsError);
        throw new Error(`Failed to save shots: ${shotsError.message}`);
      }

      console.log(`Session created: ${session.id} with ${totalShots} shots using ${modelChoice.toUpperCase()}`);

      return new Response(
        JSON.stringify({ 
          sessionId: session.id,
          shotsCount: totalShots 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (parseError) {
      console.error(`Failed to parse ${modelChoice.toUpperCase()} response:`, parseError);
      console.error('Raw content:', content);
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to parse analysis results: ${parseError.message}`,
          errorType: 'PARSE_ERROR'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Analysis function error:', error);
    return new Response(
      JSON.stringify({ 
        error: `Analysis failed: ${error.message}`,
        errorType: 'ANALYSIS_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

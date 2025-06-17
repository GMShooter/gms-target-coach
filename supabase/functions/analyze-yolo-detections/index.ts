
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
    const { detectionResults, videoMetadata, userId, drillMode = false } = requestBody;

    if (!detectionResults || !Array.isArray(detectionResults)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request: detectionResults array required',
          errorType: 'INVALID_REQUEST'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Starting Gemini analysis of ${detectionResults.length} YOLOv8 detection frames`);

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

    // Use Gemini 2.5 Flash for YOLOv8 detection analysis
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`;

    // Prepare request for Gemini analysis of YOLOv8 detections
    const parts = [{
      text: `EXPERT SHOOTING ANALYSIS - YOLOv8 DETECTION MODE

You are analyzing YOLOv8 object detection results from a shooting video. Each frame contains detected bullet holes with their coordinates and confidence scores.

Your task: Convert YOLOv8 detections into shooting analysis with scoring and feedback.

CRITICAL: Return ONLY a valid JSON array of shots. No explanations.

YOLOv8 Detection Data:
${JSON.stringify(detectionResults, null, 2)}

For each unique bullet hole detected, return:
[
  {
    "shot_number": 1,
    "score": 9,
    "x_coordinate": -15.2,
    "y_coordinate": 5.8,
    "timestamp": 2.5,
    "direction": "High Left",
    "comment": "YOLOv8 detection with 95% confidence"
  }
]

RULES:
- Convert YOLOv8 bbox coordinates to target coordinates (center=0,0, right=+X, up=+Y)
- Score based on distance from center (10=bullseye, 9=inner ring, etc.)
- Use detection confidence and position for accuracy assessment
- Filter out duplicate detections across frames
- Only include detections with confidence > 0.7

DIRECTIONS: "Centered", "High Left", "High Right", "Low Left", "Low Right", "High", "Low", "Left", "Right"`
    }];

    const requestPayload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        topP: 0.9
      }
    };

    console.log('Calling Gemini API to analyze YOLOv8 detections...');

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
          break;
        }

        console.log('Gemini API response status:', apiResponse.status);

        if (apiResponse.status === 503 && retryCount < maxRetries) {
          console.log(`Retrying in 2 seconds... (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          retryCount++;
          continue;
        }

        const errorText = await apiResponse.text();
        console.error('Gemini API error:', errorText);
        
        if (apiResponse.status === 503) {
          return new Response(
            JSON.stringify({ 
              error: 'Gemini model overloaded. Please try again later.',
              errorType: 'MODEL_OVERLOADED'
            }),
            { 
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        throw new Error(`Gemini API error: ${errorText}`);
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
      console.log('No content in Gemini response');
      return new Response(
        JSON.stringify({ 
          error: 'No analysis results returned from Gemini',
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
      
      console.log('Gemini response:', content.substring(0, 200));
      
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

      console.log(`Gemini analysis complete: ${validShots.length} valid shots from YOLOv8 detections`);

      if (validShots.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No valid shots detected from YOLOv8 results',
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
          video_url: `yolov8-analysis-${videoMetadata?.id || 'unknown'}`,
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

      console.log(`YOLOv8 Session created: ${session.id} with ${totalShots} shots`);

      return new Response(
        JSON.stringify({ 
          sessionId: session.id,
          shotsCount: totalShots,
          detectionFrames: detectionResults.length
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
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
    console.error('YOLOv8 analysis function error:', error);
    return new Response(
      JSON.stringify({ 
        error: `YOLOv8 analysis failed: ${error.message}`,
        errorType: 'ANALYSIS_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

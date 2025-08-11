import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DetectedShot {
  x: number;
  y: number;
  confidence?: number;
}

interface ExistingShot {
  x_coordinate: number;
  y_coordinate: number;
  shot_number: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { session_id, detections, frame_timestamp } = await req.json();

    if (!session_id || !detections) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id or detections' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Processing ${detections.length} detections for session ${session_id}`);

    // Get existing shots for this session
    const { data: existingShots, error: fetchError } = await supabaseClient
      .from('shots')
      .select('x_coordinate, y_coordinate, shot_number')
      .eq('session_id', session_id)
      .order('shot_number');

    if (fetchError) {
      console.error('Error fetching existing shots:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch existing shots' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingShotsSet = new Set();
    const existingShotsList: ExistingShot[] = existingShots || [];
    
    // Create coordinate sets for duplicate detection (rounded to nearest 20px)
    existingShotsList.forEach(shot => {
      const roundedX = Math.round(shot.x_coordinate / 20) * 20;
      const roundedY = Math.round(shot.y_coordinate / 20) * 20;
      existingShotsSet.add(`${roundedX},${roundedY}`);
    });

    const newShots: DetectedShot[] = [];
    let nextShotNumber = existingShotsList.length + 1;

    // Process each detection
    for (const detection of detections) {
      const roundedX = Math.round(detection.x / 20) * 20;
      const roundedY = Math.round(detection.y / 20) * 20;
      const coordKey = `${roundedX},${roundedY}`;

      // Check if this shot is new (not a duplicate)
      if (!existingShotsSet.has(coordKey)) {
        console.log(`✨ New shot detected at (${detection.x}, ${detection.y})`);
        
        // Calculate score and direction
        const { score, direction } = calculateShotMetrics(detection.x, detection.y);
        
        const newShot = {
          session_id,
          shot_number: nextShotNumber,
          score,
          x_coordinate: detection.x,
          y_coordinate: detection.y,
          shot_timestamp: frame_timestamp,
          direction,
          comment: `Shot #${nextShotNumber} - ${score}/10`
        };

        // Insert the new shot
        const { error: insertError } = await supabaseClient
          .from('shots')
          .insert([newShot]);

        if (insertError) {
          console.error('Error inserting shot:', insertError);
        } else {
          newShots.push({
            x: detection.x,
            y: detection.y,
            confidence: detection.confidence
          });
          existingShotsSet.add(coordKey);
          nextShotNumber++;
        }
      }
    }

    console.log(`📊 Added ${newShots.length} new shots to session ${session_id}`);

    return new Response(
      JSON.stringify({ 
        newShotsDetected: newShots.length,
        newShots: newShots,
        totalShots: existingShotsList.length + newShots.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Shot logging error:', error);
    return new Response(
      JSON.stringify({ error: `Shot logging failed: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateShotMetrics(x: number, y: number) {
  // Target center coordinates (adjustable)
  const TARGET_CENTER_X = 820;
  const TARGET_CENTER_Y = 420;
  const RING_SPACING_PX = 35;

  // Calculate distance from center
  const distance = Math.sqrt(
    Math.pow(x - TARGET_CENTER_X, 2) + Math.pow(y - TARGET_CENTER_Y, 2)
  );

  // Calculate score (10 = bullseye, decreasing outward)
  let score = 10;
  if (distance > RING_SPACING_PX) {
    score = Math.max(0, 10 - Math.floor((distance - RING_SPACING_PX) / RING_SPACING_PX));
  }

  // Calculate direction
  const threshold = RING_SPACING_PX * 0.5;
  let direction = "";
  
  if (y < TARGET_CENTER_Y - threshold) direction += "High";
  else if (y > TARGET_CENTER_Y + threshold) direction += "Low";
  
  if (x < TARGET_CENTER_X - threshold) direction += direction ? " Left" : "Left";
  else if (x > TARGET_CENTER_X + threshold) direction += direction ? " Right" : "Right";
  
  if (!direction) direction = "Center";

  return { score: Math.round(score), direction };
}
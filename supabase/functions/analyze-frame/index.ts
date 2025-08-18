
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

    const { frameBase64, session_id, frameNumber, timestamp } = await req.json();

    if (!frameBase64 || !session_id) {
      return new Response(
        JSON.stringify({ error: 'Frame data and session_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timestampStr = (timestamp && typeof timestamp === 'number') ? timestamp.toFixed(2) : 'N/A';
    console.log(`🔍 Roboflow analysis for frame ${frameNumber || 'unknown'} at ${timestampStr}s`);

    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY');
    
    if (!roboflowApiKey) {
      return new Response(
        JSON.stringify({ error: 'Roboflow API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 data for Roboflow
    const base64Data = frameBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Call RF-DETR Workflow API
    const roboflowResponse = await fetch('https://serverless.roboflow.com/infer/workflows/gmshooter/production-inference-sahi-detr-2-2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: roboflowApiKey,
        inputs: {
          image: {type: "base64", value: base64Data}
        }
      })
    });

    if (!roboflowResponse.ok) {
      console.error(`Roboflow API error: ${roboflowResponse.status}`);
      return new Response(
        JSON.stringify({ 
          detections: [],
          error: `Roboflow API returned status ${roboflowResponse.status}`
        }),
        { status: roboflowResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roboflowData = await roboflowResponse.json();
    const detections = roboflowData.outputs?.output_0?.predictions || [];
    
    console.log(`🎯 Roboflow detected ${detections.length} objects in frame ${frameNumber || 'unknown'}`);
    
    // Log individual detections for debugging
    detections.forEach((detection: any, index: number) => {
      console.log(`  Detection ${index + 1}: class=${detection.class}, confidence=${detection.confidence.toFixed(3)}, x=${detection.x}, y=${detection.y}`);
    });

    // Call log-shot-data function to process detections
    const logResponse = await supabaseClient.functions.invoke('log-shot-data', {
      body: {
        session_id,
        detections,
        frame_timestamp: timestamp
      }
    });

    if (logResponse.error) {
      console.error('Error logging shot data:', logResponse.error);
      return new Response(
        JSON.stringify({ error: `Failed to log shot data: ${logResponse.error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(logResponse.data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Frame analysis error:', error);
    return new Response(
      JSON.stringify({ 
        detections: [],
        error: `Frame analysis failed: ${error.message}` 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

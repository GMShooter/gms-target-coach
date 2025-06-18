
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { frameBase64, timestamp, frameNumber } = await req.json();

    if (!frameBase64) {
      return new Response(
        JSON.stringify({ error: 'Frame data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Roboflow analysis for frame ${frameNumber} at ${timestamp.toFixed(2)}s`);

    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY');
    
    if (!roboflowApiKey) {
      return new Response(
        JSON.stringify({ error: 'Roboflow API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 to blob for Roboflow
    const base64Data = frameBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Call Roboflow Inference API
    const roboflowResponse = await fetch('https://detect.roboflow.com/bullet-hole-detection/1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'api_key': roboflowApiKey,
        'image': base64Data,
        'confidence': '0.3',
        'overlap': '0.3'
      })
    });

    if (!roboflowResponse.ok) {
      console.error(`Roboflow API error: ${roboflowResponse.status}`);
      return new Response(
        JSON.stringify({ 
          detections: [],
          error: `Roboflow API returned status ${roboflowResponse.status}`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roboflowData = await roboflowResponse.json();
    const detections = roboflowData.predictions || [];
    
    console.log(`🎯 Roboflow detected ${detections.length} objects in frame ${frameNumber}`);
    
    // Log individual detections for debugging
    detections.forEach((detection: any, index: number) => {
      console.log(`  Detection ${index + 1}: class=${detection.class}, confidence=${detection.confidence.toFixed(3)}, x=${detection.x}, y=${detection.y}`);
    });

    return new Response(
      JSON.stringify({ 
        detections,
        frameNumber,
        timestamp,
        totalDetections: detections.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Frame analysis error:', error);
    return new Response(
      JSON.stringify({ 
        detections: [],
        error: `Frame analysis failed: ${error.message}` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

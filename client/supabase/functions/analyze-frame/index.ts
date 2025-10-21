import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const ROBOFLOW_API_KEY = Deno.env.get('ROBOFLOW_API_KEY');
const ROBOFLOW_MODEL = 'gmshooter/production-inference-sahi-detr-2-2';
const ROBOFLOW_API_URL = `https://detect.roboflow.com/${ROBOFLOW_MODEL}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!ROBOFLOW_API_KEY) {
      throw new Error('Roboflow API key is not configured.');
    }

    const { frameBase64 } = await req.json();
    if (!frameBase64) {
      throw new Error('frameBase64 is required.');
    }

    // Sanitize the Base64 string by removing the data URL prefix if it exists.
    const base64Data = frameBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const formData = new FormData();
    formData.append('file', base64Data, 'image.jpg');

    const roboflowResponse = await fetch(ROBOFLOW_API_URL + '?api_key=' + ROBOFLOW_API_KEY, {
      method: 'POST',
      body: formData,
    });

    if (!roboflowResponse.ok) {
      const errorText = await roboflowResponse.text();
      throw new Error(`Roboflow API error: ${roboflowResponse.status} ${errorText}`);
    }

    const detections = await roboflowResponse.json();
    
    const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    return new Response(JSON.stringify({ detections }), { headers: responseHeaders });

  } catch (error) {
    console.error('Error in analyze-frame function:', error);
    const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: responseHeaders });
  }
});
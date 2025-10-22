import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const ROBOFLOW_API_KEY = Deno.env.get('ROBOFLOW_API_KEY');
const ROBOFLOW_MODEL = 'gmshooter-v2/1'; // Updated model name
const ROBOFLOW_API_URL = `https://api.roboflow.com/${ROBOFLOW_MODEL}`;

serve(async (req: Request) => {
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

    // Prepare the request body according to Roboflow API specification
    const requestData = {
      image: frameBase64,
      confidence: 0.5,
      overlap: 0.5
    };

    console.log('Making request to Roboflow API:', ROBOFLOW_API_URL);
    
    const roboflowResponse = await fetch(ROBOFLOW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ROBOFLOW_API_KEY}`
      },
      body: JSON.stringify(requestData)
    });

    console.log('Roboflow API response status:', roboflowResponse.status);

    if (!roboflowResponse.ok) {
      const errorText = await roboflowResponse.text();
      console.error('Roboflow API error response:', errorText);
      throw new Error(`Roboflow API error: ${roboflowResponse.status} ${errorText}`);
    }

    const detections = await roboflowResponse.json();
    console.log('Roboflow API successful response, detections count:', detections.predictions?.length || 0);
    
    const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    return new Response(JSON.stringify({ detections }), { headers: responseHeaders });

  } catch (error: any) {
    console.error('Error in analyze-frame function:', error);
    const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: responseHeaders });
  }
});
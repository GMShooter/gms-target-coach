import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const ROBOFLOW_API_KEY = Deno.env.get('ROBOFLOW_API_KEY');
const ROBOFLOW_MODEL = 'gmshooter-v2/1'; // Updated model name
const ROBOFLOW_API_URL = `https://api.roboflow.com/${ROBOFLOW_MODEL}`;

// Check if we're in mock mode
const USE_MOCK_API = ROBOFLOW_API_KEY === 'mock-roboflow-key';

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

    let shots = [];
    
    if (USE_MOCK_API) {
      // Return mock analysis results for testing
      console.log('Using mock analysis results');
      
      // Extract frame number from the request or use a simple hash
      const frameNumber = Math.abs(frameBase64.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % 5 + 1;
      
      // Mock analysis results based on frame number
      const mockResults: { [key: number]: any[] } = {
        1: [{ x: 25, y: 30, score: 8, confidence: 0.8, class: 'shot' }],
        2: [{ x: 45, y: 25, score: 7, confidence: 0.7, class: 'shot' }],
        3: [{ x: 35, y: 45, score: 9, confidence: 0.9, class: 'shot' }],
        4: [{ x: 55, y: 35, score: 6, confidence: 0.6, class: 'shot' }],
        5: [{ x: 40, y: 50, score: 8, confidence: 0.8, class: 'shot' }]
      };
      
      shots = mockResults[frameNumber] || [];
    } else {
      // Prepare request body according to Roboflow API specification
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
      
      // Transform Roboflow predictions to our expected format
      shots = detections.predictions?.map((prediction: any) => ({
        x: prediction.x * 100, // Convert to percentage
        y: prediction.y * 100,
        score: Math.round(10 - (prediction.confidence * 10)), // Convert confidence to score (0-10)
        confidence: prediction.confidence,
        class: prediction.class
      })) || [];
    }
    
    const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    return new Response(JSON.stringify({
      shots,
      confidence: shots.length > 0 ? shots.reduce((sum: number, shot: any) => sum + shot.confidence, 0) / shots.length : 0
    }), { headers: responseHeaders });

  } catch (error: any) {
    console.error('Error in analyze-frame function:', error);
    const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: responseHeaders });
  }
});
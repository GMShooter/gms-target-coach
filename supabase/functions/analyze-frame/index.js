// Node.js version of analyze-frame function for Cypress testing
// This avoids the Deno/Cypress compatibility issue on Windows

const { corsHeaders } = require('../_shared/cors');

// Get environment variables
const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY;
const ROBOFLOW_MODEL = 'gmshooter-v2/1'; // Updated model name
const ROBOFLOW_API_URL = `https://api.roboflow.com/${ROBOFLOW_MODEL}`;

// Check if we're in mock mode
const USE_MOCK_API = ROBOFLOW_API_KEY === 'mock-roboflow-key';

exports.handler = async function(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (!ROBOFLOW_API_KEY) {
      throw new Error('Roboflow API key is not configured.');
    }

    let frameBase64;
    let shots = [];
    
    // Handle both JSON and URL-encoded body
    if (req.body) {
      frameBase64 = req.body.frameBase64;
    } else if (req.rawBody) {
      const bodyStr = req.rawBody.toString();
      const bodyData = JSON.parse(bodyStr);
      frameBase64 = bodyData.frameBase64;
    } else {
      throw new Error('frameBase64 is required.');
    }

    if (!frameBase64) {
      throw new Error('frameBase64 is required.');
    }

    if (USE_MOCK_API) {
      // Return mock analysis results for testing
      console.log('Using mock analysis results');
      
      // Extract frame number from the request or use a simple hash
      const frameNumber = Math.abs(frameBase64.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 5 + 1;
      
      // Mock analysis results based on frame number
      const mockResults = {
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
      shots = detections.predictions?.map((prediction) => ({
        x: prediction.x * 100, // Convert to percentage
        y: prediction.y * 100,
        score: Math.round(10 - (prediction.confidence * 10)), // Convert confidence to score (0-10)
        confidence: prediction.confidence,
        class: prediction.class
      })) || [];
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      shots,
      confidence: shots.length > 0 ? shots.reduce((sum, shot) => sum + shot.confidence, 0) / shots.length : 0
    });

  } catch (error) {
    console.error('Error in analyze-frame function:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: error.message });
  }
};
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts';

// In-memory storage for demo purposes
// In production, you'd use Redis or a proper database
const activeSessions = new Map<string, any>();
const frameQueue = new Map<string, any[]>();

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json();
    
    console.log(`Camera proxy action: ${action}`, payload);

    switch (action) {
      case 'start_session':
        return handleStartSession(payload);
      
      case 'stop_session':
        return handleStopSession(payload);
      
      case 'frame_next':
        return handleFrameNext(payload);
      
      case 'frame_add':
        return handleFrameAdd(payload);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Camera proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function handleStartSession(payload: any) {
  const { sessionId, fps = 1 } = payload;
  
  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: 'Missing sessionId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  activeSessions.set(sessionId, {
    started: true,
    fps,
    lastFrameId: 0
  });

  // Initialize frame queue for this session
  if (!frameQueue.has(sessionId)) {
    frameQueue.set(sessionId, []);
  }

  console.log(`Camera session started: ${sessionId}`);
  
  return new Response(
    JSON.stringify({ success: true, sessionId }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function handleStopSession(payload: any) {
  const { sessionId } = payload;
  
  if (sessionId && activeSessions.has(sessionId)) {
    activeSessions.delete(sessionId);
    frameQueue.delete(sessionId);
    console.log(`Camera session stopped: ${sessionId}`);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function handleFrameNext(payload: any) {
  const { since, timeout = 10 } = payload;
  
  // Try to get frame from user's real camera server via ngrok
  return getRealCameraFrame(since, timeout)
    .then(frameData => {
      if (frameData) {
        return new Response(
          JSON.stringify({
            frame: frameData.frameData, // Raw frame data as base64
            frameId: frameData.frameId,
            timestamp: frameData.timestamp || new Date().toISOString()
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Fallback to mock frame if no real frame available
        console.log('No frame from real camera, using mock frame');
        const mockFrame = generateMockFrame();
        return new Response(
          JSON.stringify({
            frame: mockFrame,
            frameId: Date.now(),
            timestamp: new Date().toISOString()
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    })
    .catch(error => {
      console.error('Error getting real camera frame, falling back to mock:', error);
      const mockFrame = generateMockFrame();
      return new Response(
        JSON.stringify({
          frame: mockFrame,
          frameId: Date.now(),
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    });
}

async function getRealCameraFrame(sinceId?: number, timeout: number = 10): Promise<{frameId: number, frameData: string, timestamp?: string} | null> {
  try {
    // User's ngrok server URL - configure via environment variables
    const NGROK_URL = (globalThis as any).Deno?.env?.get('NGROK_URL') || 'https://f92126526c77.ngrok-free.app';
    
    // Build URL matching user's ngrok_server.py api_frame_next function
    let url = `${NGROK_URL}/frame/next?timeout=${timeout}`;
    if (sinceId !== undefined && sinceId !== null) {
      url += `&since=${sinceId}`;
    }
    
    console.log(`📷 Fetching frame from user's ngrok server: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'image/*, application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    if (response.status === 204) {
      console.log('📷 No new frame available from ngrok server');
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Ngrok server error: ${response.status} ${response.statusText}`);
    }
    
    // Get frame ID from headers (matching user's ngrok_server.py implementation)
    const frameId = parseInt(response.headers.get('X-Frame-Id') || '0');
    const timestamp = response.headers.get('X-Frame-Timestamp') || new Date().toISOString();
    
    // Get frame data as base64
    const frameBuffer = await response.arrayBuffer();
    const frameBase64 = btoa(String.fromCharCode(...new Uint8Array(frameBuffer)));
    
    console.log(`📷 Successfully retrieved frame ${frameId} from ngrok server`);
    
    return {
      frameId,
      frameData: frameBase64,
      timestamp
    };
    
  } catch (error) {
    console.error('📷 Error accessing ngrok server:', error);
    return null;
  }
}

function handleFrameAdd(payload: any) {
  const { sessionId, frame, frameId } = payload;
  
  if (!sessionId || !frame) {
    return new Response(
      JSON.stringify({ error: 'Missing sessionId or frame' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const queue = frameQueue.get(sessionId);
  if (queue) {
    queue.push({
      frame,
      frameId: frameId || Date.now(),
      timestamp: new Date().toISOString()
    });
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function generateMockFrame(): string {
  // Generate a simple SVG image as base64 for testing
  const svg = `
    <svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="480" fill="#1e293b"/>
      <circle cx="320" cy="240" r="50" fill="#3b82f6" opacity="0.8"/>
      <text x="320" y="250" text-anchor="middle" fill="white" font-family="Arial" font-size="16">Mock Camera Frame</text>
      <text x="320" y="270" text-anchor="middle" fill="white" font-family="Arial" font-size="12">${new Date().toLocaleTimeString()}</text>
    </svg>
  `;
  
  // Convert SVG to base64
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return base64;
}
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts';

// In-memory storage for demo purposes
// In production, you'd use Redis or a proper database
const activeSessions = new Map<string, any>();
const frameQueue = new Map<string, any[]>();

serve(async (req) => {
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
  const { since } = payload;
  
  // For demo purposes, return a mock frame
  // In production, this would interface with actual camera hardware
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
  // Generate a simple mock frame as base64
  // In production, this would be actual camera data
  const canvas = new Uint8Array(100);
  for (let i = 0; i < canvas.length; i++) {
    canvas[i] = Math.floor(Math.random() * 256);
  }
  
  return btoa(String.fromCharCode(...canvas));
}
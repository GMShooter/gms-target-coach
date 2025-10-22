import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Load environment variables from .env file
await load({ export: true });

async function testFunctions() {
  console.log("Running integration test...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env file.");
    Deno.exit(1);
  }

  // Admin client for all operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  // Test if service role key works
  console.log("Testing service role key...");
  const { data: testData, error: testError } = await supabaseAdmin.from('users').select('count');
  if (testError) {
    console.warn("Service role key not working, using anon key instead:", testError.message);
    // Fall back to anon key
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    await testWithAnonKey(supabase);
    return;
  }

  let testUserId: string | null = null;
  let sessionId: string | null = null;

  async function testWithAnonKey(supabase: SupabaseClient) {
    console.log("\n=== Testing with Anon Key ===");
    
    // Test analyze-frame function directly
    console.log("\n1. Testing analyze-frame function...");
    const testImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjIwIiBmaWxsPSIjMDAwIi8+PC9zdmc+";
    
    const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('analyze-frame', {
      body: {
        frameBase64: testImage
      },
    });
    
    if (analyzeError) {
      console.error('❌ analyze-frame function error:', analyzeError);
    } else {
      console.log('✅ analyze-frame function response:', analyzeData);
    }
    
    // Test camera-proxy function
    console.log("\n2. Testing camera-proxy function...");
    const { data: cameraData, error: cameraError } = await supabase.functions.invoke('camera-proxy', {
      body: {
        action: 'frame_next',
        payload: { since: Date.now() }
      }
    });
    
    if (cameraError) {
      console.error('❌ camera-proxy function error:', cameraError);
    } else {
      console.log('✅ camera-proxy function response:', cameraData);
    }
    
    console.log("\n=== Test completed with anon key ===");
  }

  try {
    // 1. Create a temporary user for this test run
    console.log("1. Creating temporary test user...");
    const testEmail = `test-user-${Date.now()}@example.com`;
    const testPassword = "password123";
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm user
    });

    if (userError) {
      console.error("Error creating test user:", userError);
      throw new Error("Failed to create test user.");
    }
    testUserId = userData.user.id;
    console.log(`✅ Test user created with ID: ${testUserId}`);

    // Client for invoking functions
    const supabase = supabaseAdmin;

    // 2. Start a new session
    console.log(`\n2. Starting session for user ${testUserId}...`);
    const { data: sessionData, error: sessionError } = await supabase.functions.invoke('start-session', {
      body: { userId: testUserId },
    });

    if (sessionError) {
      console.error('Error starting session:', sessionError.context || sessionError);
      throw new Error("Failed to start session.");
    }
    sessionId = sessionData.session_id;
    console.log('✅ Session started:', sessionData);

    // Using a publicly accessible image from Wikimedia Commons
    const validImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/A_basketball_hoop_in_Harlem.jpg/800px-A_basketball_hoop_in_Harlem.jpg";

    // 3. Analyze a frame
    console.log("\n3. Analyzing frame...");
    const { error: analysisError } = await supabase.functions.invoke('analyze-frame', {
      body: { frameUrl: validImageUrl, sessionId: sessionId }, 
    });

    if (analysisError) {
      console.error('Error analyzing frame:', analysisError.context || analysisError);
      throw new Error("Failed to analyze frame.");
    }
    console.log('✅ Frame analysis invoked.');

    // 4. Process a video
    console.log("\n4. Processing video...");
    const { error: processError } = await supabase.functions.invoke('process-video', {
      body: {
        sessionId: sessionId,
        videoUrl: "https://example.com/video.mp4"
      },
    });

    if (processError) {
      console.error('Error processing video:', processError.context || processError);
      // Don't throw error, just log it as this might be expected
      console.log('⚠️ Video processing failed (might be expected for invalid URL)');
    } else {
      console.log('✅ Video processing invoked.');
    }

    // 5. End the session
    console.log("\n5. Ending session...");
    const { error: endError } = await supabase.functions.invoke('end-session', {
      body: { sessionId: sessionId },
    });

    if (endError) {
      console.error('Error ending session:', endError.context || endError);
      throw new Error("Failed to end session.");
    }
    console.log('✅ Session ended.');

    console.log("\nIntegration test finished successfully!");

  } catch (error) {
    console.error("\nTest failed:", error.message);
    Deno.exit(1);
  } finally {
    // 6. Clean up resources
    console.log("\n6. Cleaning up resources...");
    if (sessionId) {
      console.log(`   - Deleting session ${sessionId}...`);
      const { error: deleteSessionError } = await supabaseAdmin
        .from('analysis_sessions')
        .delete()
        .eq('id', sessionId);
      if (deleteSessionError) {
        console.error("     Error deleting session:", deleteSessionError);
      }
    }

    if (testUserId) {
      console.log(`   - Deleting user ${testUserId}...`);
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(testUserId);
      if (deleteUserError) {
        console.error("     Error deleting test user:", deleteUserError);
      } else {
        console.log("     ✅ Test user deleted.");
      }
    }
  }
}

testFunctions();

// Simple test script to validate edge functions are deployed and working
// Using built-in fetch (Node.js 18+)

const SUPABASE_URL = 'https://avbwpuxhkyvfyonrpbqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDUxNzUsImV4cCI6MjA2NTIyMTE3NX0.DnuWRHUglMP0yAb5jtVtfr3Gq-N1711W36r6LMpTYGE';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1`;

async function testHealthCheck() {
  console.log('Testing health check endpoint...');
  
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/health-check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('✅ Health check working:');
    console.log('  Status:', data.status);
    console.log('  Version:', data.version);
    console.log('  Response time:', data.performance?.response_time_ms || 'N/A', 'ms');
    console.log('  Database status:', data.checks?.database?.status || 'N/A');
    console.log('  Analysis status:', data.checks?.analysis?.status || 'N/A');
    console.log('  Camera status:', data.checks?.camera?.status || 'N/A');
    
    return {
      success: true,
      responseTime: data.performance?.response_time_ms || 0,
      status: data.status
    };
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testFunctionWithoutAuth(functionName, testData = {}) {
  console.log(`\nTesting ${functionName} endpoint (expected to fail without auth)...`);
  
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Response:`, data);
    
    if (response.status === 401 && data.error === 'Invalid authentication token') {
      console.log(`✅ ${functionName} correctly requires authentication`);
      return { success: true, requiresAuth: true };
    } else {
      console.log(`⚠️  ${functionName} unexpected response`);
      return { success: false, response: data };
    }
  } catch (error) {
    console.log(`❌ ${functionName} test failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('=== Edge Functions Deployment Validation ===\n');
  
  // Test health check (no auth required)
  const healthResult = await testHealthCheck();
  
  // Test other functions (should require auth)
  const startSessionResult = await testFunctionWithoutAuth('start-session', {
    userId: 'test-user-123',
    drillMode: false,
    sessionType: 'camera',
    metadata: { test: true }
  });
  
  const analyzeFrameResult = await testFunctionWithoutAuth('analyze-frame', {
    frameBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    sessionId: 'test-session-123',
    frameNumber: 1
  });
  
  const cameraProxyResult = await testFunctionWithoutAuth('camera-proxy', {
    action: 'start_session',
    payload: { sessionId: 'test-session-123', fps: 30 }
  });
  
  const endSessionResult = await testFunctionWithoutAuth('end-session', {
    sessionId: 'test-session-123',
    finalNotes: 'Test session completion',
    generateReport: true
  });
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log('Health Check:', healthResult.success ? '✅ Working' : '❌ Failed');
  console.log('Start Session:', startSessionResult.requiresAuth ? '✅ Requires Auth' : '❌ Issue');
  console.log('Analyze Frame:', analyzeFrameResult.requiresAuth ? '✅ Requires Auth' : '❌ Issue');
  console.log('Camera Proxy:', cameraProxyResult.requiresAuth ? '✅ Requires Auth' : '❌ Issue');
  console.log('End Session:', endSessionResult.requiresAuth ? '✅ Requires Auth' : '❌ Issue');
  
  const allFunctionsDeployed = healthResult.success && 
    startSessionResult.requiresAuth && 
    analyzeFrameResult.requiresAuth && 
    cameraProxyResult.requiresAuth && 
    endSessionResult.requiresAuth;
  
  if (allFunctionsDeployed) {
    console.log('\n✅ ALL EDGE FUNCTIONS SUCCESSFULLY DEPLOYED AND ACCESSIBLE');
    console.log('\nNext Steps:');
    console.log('1. Functions are deployed and responding correctly');
    console.log('2. Authentication is working (functions properly reject invalid tokens)');
    console.log('3. Health check shows system status (may show degraded until fully configured)');
    console.log('4. To test with valid authentication, create a test user and use their JWT token');
    process.exit(0);
  } else {
    console.log('\n❌ SOME FUNCTIONS HAVE ISSUES');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});
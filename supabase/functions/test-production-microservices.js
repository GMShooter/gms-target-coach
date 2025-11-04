// Production Microservices Test Script
// Tests all edge functions for Phase 3 requirements

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1`;

// Test configuration
const TEST_CONFIG = {
  timeout: 10000, // 10 second timeout
  expectedMaxResponseTime: 200, // 200ms requirement
  concurrentRequests: 100,
  testIterations: 10
};

// Utility functions
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, ...data }));
}

async function measureResponseTime(testName, testFunction) {
  const startTime = Date.now();
  try {
    const result = await testFunction();
    const responseTime = Date.now() - startTime;
    
    log('info', `${testName} completed`, {
      responseTime,
      status: result.status || 'unknown',
      success: result.success || false
    });
    
    return {
      ...result,
      responseTime,
      meetsRequirement: responseTime <= TEST_CONFIG.expectedMaxResponseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    log('error', `${testName} failed`, {
      error: error.message,
      responseTime
    });
    
    return {
      success: false,
      error: error.message,
      responseTime,
      meetsRequirement: false
    };
  }
}

// Test functions
async function testHealthCheck() {
  log('info', 'Testing health check endpoint');
  
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/health-check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testCameraProxy() {
  log('info', 'Testing camera proxy endpoint');
  
  try {
    // Test session start
    const startResponse = await fetch(`${EDGE_FUNCTION_URL}/camera-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'start_session',
        payload: {
          sessionId: `test-session-${Date.now()}`,
          fps: 30
        }
      })
    });
    
    if (!startResponse.ok) {
      throw new Error(`Session start failed: ${startResponse.status}`);
    }
    
    const startData = await startResponse.json();
    
    // Test frame next
    const frameResponse = await fetch(`${EDGE_FUNCTION_URL}/camera-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'frame_next',
        payload: {
          sessionId: startData.sessionId,
          timeout: 5
        }
      })
    });
    
    const frameData = await frameResponse.json();
    
    // Test session stop
    const stopResponse = await fetch(`${EDGE_FUNCTION_URL}/camera-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'stop_session',
        payload: {
          sessionId: startData.sessionId
        }
      })
    });
    
    return {
      success: startResponse.ok && frameResponse.ok && stopResponse.ok,
      status: startResponse.status,
      data: {
        sessionStart: startData,
        frameData,
        sessionStop: await stopResponse.json()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testAnalyzeFrame() {
  log('info', 'Testing analyze frame endpoint');
  
  try {
    // Create a test frame (small base64 encoded image)
    const testFrame = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // 1x1 transparent pixel
    
    const response = await fetch(`${EDGE_FUNCTION_URL}/analyze-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        frameBase64: testFrame,
        sessionId: `test-session-${Date.now()}`,
        frameNumber: 1
      })
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testStartSession() {
  log('info', 'Testing start session endpoint');
  
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/start-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        userId: `test-user-${Date.now()}`,
        drillMode: false,
        sessionType: 'camera',
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      })
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testEndSession() {
  log('info', 'Testing end session endpoint');
  
  try {
    // First create a session to end
    const startResponse = await fetch(`${EDGE_FUNCTION_URL}/start-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        userId: `test-user-${Date.now()}`,
        drillMode: false,
        sessionType: 'camera'
      })
    });
    
    if (!startResponse.ok) {
      throw new Error(`Failed to create test session: ${startResponse.status}`);
    }
    
    const startData = await startResponse.json();
    
    // Now end the session
    const response = await fetch(`${EDGE_FUNCTION_URL}/end-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        sessionId: startData.session_id,
        finalNotes: 'Test session completion',
        generateReport: true
      })
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Load test
async function testConcurrentRequests(testFunction, testName) {
  log('info', `Running concurrent load test for ${testName}`, {
    concurrentRequests: TEST_CONFIG.concurrentRequests
  });
  
  const promises = [];
  const startTime = Date.now();
  
  for (let i = 0; i < TEST_CONFIG.concurrentRequests; i++) {
    promises.push(testFunction());
  }
  
  try {
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    log('info', `Load test completed for ${testName}`, {
      totalTime,
      successful,
      failed,
      successRate: (successful / TEST_CONFIG.concurrentRequests * 100).toFixed(2) + '%'
    });
    
    return {
      success: failed === 0,
      totalTime,
      successful,
      failed,
      successRate: successful / TEST_CONFIG.concurrentRequests
    };
  } catch (error) {
    log('error', `Load test failed for ${testName}`, { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

// Main test runner
async function runAllTests() {
  log('info', 'Starting production microservices test suite', {
    testConfig: TEST_CONFIG
  });
  
  const testResults = {
    healthCheck: await measureResponseTime('Health Check', testHealthCheck),
    cameraProxy: await measureResponseTime('Camera Proxy', testCameraProxy),
    analyzeFrame: await measureResponseTime('Analyze Frame', testAnalyzeFrame),
    startSession: await measureResponseTime('Start Session', testStartSession),
    endSession: await measureResponseTime('End Session', testEndSession)
  };
  
  // Performance tests
  log('info', 'Running performance load tests');
  const loadTests = {
    healthCheckLoad: await testConcurrentRequests(testHealthCheck, 'Health Check'),
    cameraProxyLoad: await testConcurrentRequests(testCameraProxy, 'Camera Proxy')
  };
  
  // Results summary
  const allFunctionsMeetRequirement = Object.values(testResults).every(result => result.meetsRequirement);
  const allFunctionsSuccessful = Object.values(testResults).every(result => result.success);
  
  const summary = {
    timestamp: new Date().toISOString(),
    testConfig: TEST_CONFIG,
    functionalTests: testResults,
    loadTests,
    summary: {
      allFunctionsSuccessful,
      allFunctionsMeetRequirement,
      averageResponseTime: Object.values(testResults).reduce((sum, r) => sum + r.responseTime, 0) / Object.keys(testResults).length,
      slowestFunction: Object.entries(testResults).reduce((slowest, [name, result]) => 
        result.responseTime > slowest[1].responseTime ? [name, result] : slowest, ['', { responseTime: 0 }]),
      fastestFunction: Object.entries(testResults).reduce((fastest, [name, result]) => 
        result.responseTime < fastest[1].responseTime ? [name, result] : fastest, ['', { responseTime: Infinity }])
    }
  };
  
  log('info', 'Test suite completed', summary);
  
  // Exit with appropriate code
  if (allFunctionsSuccessful && allFunctionsMeetRequirement) {
    console.log('\n✅ ALL TESTS PASSED - Production microservices are ready!');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED - Production microservices need attention');
    console.log('\nTest Results Summary:');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }
}

// Run tests if this script is executed directly
runAllTests().catch(error => {
  log('error', 'Test suite failed to run', { error: error.message });
  process.exit(1);
});

export {
  runAllTests,
  testHealthCheck,
  testCameraProxy,
  testAnalyzeFrame,
  testStartSession,
  testEndSession,
  testConcurrentRequests
};
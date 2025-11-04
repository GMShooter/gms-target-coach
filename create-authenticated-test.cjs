// Create authenticated test for deployed functions
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://avbwpuxhkyvfyonrpbqg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY0NTE3NSwiZXhwIjoyMDY1MjIxMTc1fQ.p0fkJ5i1m_RPJO7pPFAyqvS5h0yT8kK_G8qzDG_1r7E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAuthenticatedTest() {
  console.log('🔧 Creating authenticated test...');
  
  try {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User'
      }
    });

    if (userError) {
      console.error('❌ Error creating user:', userError);
      throw userError;
    }

    console.log('✅ Created user:', userData.user.id);

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userData.user.id,
        email: userData.user.email,
        firebase_uid: userData.user.id,
        full_name: 'Test User',
        is_active: true,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('❌ Error creating user profile:', profileError);
    } else {
      console.log('✅ Created user profile');
    }

    // Sign in to get JWT token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: 'testpassword123'
    });

    if (signInError) {
      console.error('❌ Error signing in:', signInError);
      throw signInError;
    }

    console.log('✅ Successfully signed in');
    console.log('🔑 JWT Token:', signInData.session.access_token);
    console.log('👤 User ID:', userData.user.id);

    // Test functions with valid JWT
    await testFunctionsWithAuth(signInData.session.access_token, userData.user.id);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function testFunctionsWithAuth(jwtToken, userId) {
  const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1`;
  
  console.log('\n🧪 Testing functions with valid authentication...');
  
  // Test health check (no auth required)
  console.log('\n📊 Testing health-check...');
  try {
    const healthResponse = await fetch(`${EDGE_FUNCTION_URL}/health-check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check working:', healthData.status);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }

  // Test start session
  console.log('\n🚀 Testing start-session...');
  try {
    const startResponse = await fetch(`${EDGE_FUNCTION_URL}/start-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        userId: userId,
        drillMode: false,
        sessionType: 'camera',
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      })
    });

    if (startResponse.ok) {
      const startData = await startResponse.json();
      console.log('✅ Start session working:', startData.session_id);
      
      // Test analyze frame
      console.log('\n🔍 Testing analyze-frame...');
      try {
        const testFrame = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        const analyzeResponse = await fetch(`${EDGE_FUNCTION_URL}/analyze-frame`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            frameBase64: testFrame,
            sessionId: startData.session_id,
            frameNumber: 1
          })
        });

        if (analyzeResponse.ok) {
          const analyzeData = await analyzeResponse.json();
          console.log('✅ Analyze frame working:', analyzeData.success);
        } else {
          const errorData = await analyzeResponse.json();
          console.log('❌ Analyze frame failed:', analyzeResponse.status, errorData.error);
        }
      } catch (error) {
        console.log('❌ Analyze frame error:', error.message);
      }

      // Test end session
      console.log('\n🏁 Testing end-session...');
      try {
        const endResponse = await fetch(`${EDGE_FUNCTION_URL}/end-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            sessionId: startData.session_id,
            finalNotes: 'Test session completion',
            generateReport: true
          })
        });

        if (endResponse.ok) {
          const endData = await endResponse.json();
          console.log('✅ End session working:', endData.success);
        } else {
          const errorData = await endResponse.json();
          console.log('❌ End session failed:', endResponse.status, errorData.error);
        }
      } catch (error) {
        console.log('❌ End session error:', error.message);
      }

    } else {
      const errorData = await startResponse.json();
      console.log('❌ Start session failed:', startResponse.status, errorData.error);
    }
  } catch (error) {
    console.log('❌ Start session error:', error.message);
  }

  console.log('\n🎉 Authenticated tests completed!');
}

createAuthenticatedTest().then(() => {
  console.log('✅ All tests completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test process failed:', error);
  process.exit(1);
});
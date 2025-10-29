// Simple test script to verify health-check endpoint
const testHealthCheck = async () => {
  const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://avbwpuxhkyvfyonrpbqg.supabase.co';
  const healthCheckUrl = `${supabaseUrl}/functions/v1/health-check`;
  
  console.log('Testing health-check endpoint...');
  console.log('URL:', healthCheckUrl);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(healthCheckUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    console.log('✅ Health Check Response:');
    console.log('Status:', response.status);
    console.log('Response Time:', responseTime + 'ms');
    console.log('Data:', JSON.stringify(data, null, 2));
    
    if (data.status === 'ok') {
      console.log('🎉 Health check service is working correctly!');
    } else {
      console.log('⚠️ Health check service returned unexpected status:', data.status);
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.error('Full error:', error);
  }
};

// Run the test
testHealthCheck();
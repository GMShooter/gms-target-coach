// Simple Node.js script to test health-check endpoint
const https = require('https');

const healthCheckUrl = 'https://avbwpuxhkyvfyonrpbqg.supabase.co/functions/v1/health-check';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2Zm9ucnBicWciLCJpYXQiOjE3MzI4MTA2MDAsImV4cCI6MTc0Nzk2NjYwMH0.N5N2xnP_tM7nSCvRz3Y5JYhQqRBLs3xI5J6qY7oY';

console.log('🔍 Testing GMShoot SOTA Demo Health Check Endpoint');
console.log('==================================================');

const startTime = Date.now();

// Parse URL to extract hostname and path
const url = new URL(healthCheckUrl);
const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'apikey': supabaseAnonKey,
    'User-Agent': 'GMShoot-HealthCheck/1.0.0'
  }
};

const req = https.request(options, (res) => {
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  console.log(`📊 Response Status: ${res.statusCode}`);
  console.log(`⚡ Response Time: ${responseTime}ms`);
  console.log(`📋 Response Headers:`);
  
  Object.entries(res.headers).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📦 Response Body:`);
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      
      // Validate health check response
      if (jsonData.status === 'ok') {
        console.log('\n✅ Health Check PASSED');
        console.log('🎯 Service is operational');
      } else {
        console.log('\n❌ Health Check FAILED');
        console.log(`🚨 Status: ${jsonData.status}`);
      }
    } catch (error) {
      console.log('Raw response:', data);
      console.log('\n❌ Failed to parse JSON response');
    }
  });
});

req.on('error', (error) => {
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  console.log(`❌ Request Error: ${error.message}`);
  console.log(`⚡ Error Time: ${responseTime}ms`);
  console.log('\n🚨 Health Check FAILED - Network Error');
});

req.setTimeout(10000, () => {
  req.destroy();
  console.log('❌ Request Timeout (10s)');
  console.log('\n🚨 Health Check FAILED - Timeout');
});

req.end();
// Test script for analyze-frame function with JWT token
const testFrame = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function testAnalysisWithJWT() {
  try {
    console.log('🧪 Testing analyze-frame function with JWT...');
    
    // Use a valid anon JWT token for testing
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwiaWF0IjoxNzQ5NjQ1MTc1LCJleHAiOjIwNjUyMjExNzUsImF1ZCI6ImFub24iLCJzdWIiOiIiLCJlbWFpbCI6IiIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7fSwicHJvdmlkZXJfaWQiOiIiLCJyb2xlIjoiYW5vbiIsImFhbCI6ImFub24iLCJzZXNzaW9uX2lkIjoiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.M3NwYjRmZWY2NzRkNzU5ZjI3MjQ5NzE5ZmY4NzU5MzU5ZmY2NzRkNzU5ZjI';
    
    console.log('\n🧪 Test 1: With valid JWT token');
    const response1 = await fetch('http://localhost:54321/functions/v1/analyze-frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        frameBase64: testFrame
      })
    });

    console.log('🧪 Response 1 status:', response1.status);
    console.log('🧪 Response 1 headers:', Object.fromEntries(response1.headers.entries()));
    
    const result1 = await response1.json();
    console.log('🧪 Response 1 body:', result1);
    console.log('🧪 Shots count:', result1.shots?.length || 0);
    
    // Test with the deployed function
    console.log('\n🧪 Test 2: With deployed function');
    const response2 = await fetch('https://avbwpuxhkyvfyonrpbqg.supabase.co/functions/v1/analyze-frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        frameBase64: testFrame
      })
    });

    console.log('🧪 Response 2 status:', response2.status);
    console.log('🧪 Response 2 headers:', Object.fromEntries(response2.headers.entries()));
    
    const result2 = await response2.json();
    console.log('🧪 Response 2 body:', result2);
    console.log('🧪 Shots count:', result2.shots?.length || 0);
    
  } catch (error) {
    console.error('🧪 Test failed:', error);
  }
}

testAnalysisWithJWT();
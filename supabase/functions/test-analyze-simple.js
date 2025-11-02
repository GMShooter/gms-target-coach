// Simple test for analyze-frame function
const testFrame = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function testAnalyzeFunction() {
  try {
    console.log('🧪 Testing analyze-frame function...');
    
    // Test with the same anon key that works for other functions
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwiaWF0IjoxNzQ5NjQ1MTc1LCJleHAiOjIwNjUyMjExNzUsImF1ZCI6ImFub24iLCJzdWIiOiIiLCJlbWFpbCI6IiIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7fSwicHJvdmlkZXJfaWQiOiIiLCJyb2xlIjoiYW5vbiIsImFhbCI6ImFub24iLCJzZXNzaW9uX2lkIjoiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.M3NwYjRmZWY2NzRkNzU5ZjI3MjQ5NzE5ZmY4NzU5MzU5ZmY2NzRkNzU5ZjI';
    
    console.log('🧪 Test 1: analyze-frame with proper structure');
    const response = await fetch('http://localhost:54321/functions/v1/analyze-frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        frameBase64: testFrame
      })
    });

    console.log('🧪 Response status:', response.status);
    console.log('🧪 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('🧪 Response body:', result);
    console.log('🧪 Shots found:', result.shots?.length || 0);
    
    if (result.shots && result.shots.length > 0) {
      console.log('🧪 SUCCESS: analyze-frame is working!');
      result.shots.forEach((shot, i) => {
        console.log(`🧪 Shot ${i+1}:`, shot);
      });
    } else {
      console.log('🧪 ISSUE: No shots returned from analyze-frame');
    }
    
  } catch (error) {
    console.error('🧪 Test failed:', error);
  }
}

testAnalyzeFunction();
// Simple authentication test script
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('🧪 Testing Authentication Flow...');
  
  try {
    // Test 1: Sign up a new user
    console.log('\n1. Testing user signup...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signUpError) {
      console.error('❌ Signup failed:', signUpError.message);
      return;
    }
    
    console.log('✅ Signup successful:', signUpData.user?.email);
    
    // Test 2: Sign in with the user
    console.log('\n2. Testing user sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      return;
    }
    
    console.log('✅ Sign in successful:', signInData.user?.email);
    console.log('✅ User ID:', signInData.user?.id);
    
    // Test 3: Check if user record exists in users table
    console.log('\n3. Checking user record in database...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', signInData.user?.id)
      .single();
    
    if (userError) {
      console.error('❌ User record query failed:', userError.message);
      return;
    }
    
    if (userData) {
      console.log('✅ User record found in users table:');
      console.log('   - ID:', userData.id);
      console.log('   - Firebase UID:', userData.firebase_uid);
      console.log('   - Email:', userData.email);
      console.log('   - Created At:', userData.created_at);
    } else {
      console.log('❌ User record NOT found in users table');
    }
    
    // Test 4: Test auth state change listener
    console.log('\n4. Testing auth state change listener...');
    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 Auth state changed: ${event}`);
      if (event === 'SIGNED_IN') {
        console.log('✅ SIGNED_IN event detected');
        console.log('✅ Session user:', session?.user?.email);
      }
    });
    
    console.log('\n🎉 Authentication test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testAuth();
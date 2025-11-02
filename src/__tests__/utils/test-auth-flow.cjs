const { createClient } = require('@supabase/supabase-js');

// Use the same credentials as in the app
const supabase = createClient(
  'https://avbwpuxhkyvfyonrpbqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDUxNzUsImV4cCI6MjA2NTIyMTE3NX0.DnuWRHUglMP0yAb5jtVtfr3Gq-N1711W36r6LMpTYGE'
);

async function testAuthFlow() {
  console.log('🔐 Testing Authentication Flow...');
  
  try {
    // Step 1: Test sign up
    console.log('\n📝 Step 1: Testing sign up...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
    
    if (signUpError) {
      console.error('❌ Sign up error:', signUpError);
    } else {
      console.log('✅ Sign up successful:', signUpData.user?.email);
    }
    
    // Step 2: Test sign in
    console.log('\n🔑 Step 2: Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Sign in error:', signInError);
      return;
    } else {
      console.log('✅ Sign in successful:', signInData.user?.email);
      console.log('✅ Session created:', signInData.session ? 'Yes' : 'No');
    }
    
    // Step 3: Check users table
    console.log('\n👥 Step 3: Checking users table...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (usersError) {
      console.error('❌ Users table error:', usersError);
      
      // Try to check if the table exists at all
      const { data: tableInfo, error: tableError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('❌ Users table not accessible:', tableError);
      } else {
        console.log('✅ Users table exists but user not found');
      }
    } else {
      console.log('✅ User found in users table:', usersData);
    }
    
    // Step 4: Test session persistence
    console.log('\n💾 Step 4: Testing session persistence...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check error:', sessionError);
    } else {
      console.log('✅ Session persisted:', sessionData.session ? 'Yes' : 'No');
      if (sessionData.session) {
        console.log('✅ Session user:', sessionData.session.user?.email);
      }
    }
    
    // Step 5: Test sign out
    console.log('\n🚪 Step 5: Testing sign out...');
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('❌ Sign out error:', signOutError);
    } else {
      console.log('✅ Sign out successful');
    }
    
    // Step 6: Verify session cleared
    const { data: finalSessionData } = await supabase.auth.getSession();
    console.log('✅ Session cleared after sign out:', finalSessionData.session ? 'No' : 'Yes');
    
    console.log('\n🎉 Authentication flow test completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error during auth test:', error);
  }
}

testAuthFlow();
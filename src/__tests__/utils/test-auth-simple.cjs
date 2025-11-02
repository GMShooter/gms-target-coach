const { createClient } = require('@supabase/supabase-js');

// Use same credentials as in the app
const supabase = createClient(
  'https://avbwpuxhkyvfyonrpbqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDUxNzUsImV4cCI6MjA2NTIyMTE3NX0.DnuWRHUglMP0yAb5jtVtfr3Gq-N1711W36r6LMpTYGE'
);

async function testSimpleAuth() {
  console.log('🔐 Testing Simple Authentication...');
  
  try {
    // Step 1: Check existing users
    console.log('\n👥 Step 1: Checking existing users...');
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('email, created_at')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error checking users:', usersError);
    } else {
      console.log('✅ Existing users found:', existingUsers?.length || 0);
      existingUsers?.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (created: ${user.created_at})`);
      });
    }
    
    // Step 2: Try to sign in with a simple test account
    console.log('\n🔑 Step 2: Testing sign in with test account...');
    
    // First try a common test account
    const testAccounts = [
      { email: 'test@example.com', password: 'TestPassword123!' },
      { email: 'admin@example.com', password: 'AdminPassword123!' },
      { email: 'user@example.com', password: 'UserPassword123!' }
    ];
    
    let signInSuccess = false;
    
    for (const account of testAccounts) {
      console.log(`\n🔍 Trying account: ${account.email}`);
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password
      });
      
      if (signInError) {
        console.log(`❌ Sign in failed for ${account.email}:`, signInError.message);
      } else {
        console.log(`✅ Sign in successful for ${account.email}!`);
        console.log('✅ User ID:', signInData.user?.id);
        console.log('✅ Session created:', signInData.session ? 'Yes' : 'No');
        signInSuccess = true;
        break;
      }
    }
    
    if (!signInSuccess) {
      console.log('\n📝 No existing test accounts work. Creating a new test account...');
      
      // Create a new test account with valid email format
      const newEmail = `testuser${Math.floor(Math.random() * 10000)}@gmail.com`;
      const newPassword = 'TestPassword123!';
      
      console.log(`📧 Creating account: ${newEmail}`);
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      });
      
      if (signUpError) {
        console.error('❌ Sign up error:', signUpError.message);
      } else {
        console.log('✅ Sign up successful!');
        console.log('✅ User ID:', signUpData.user?.id);
        
        // Now try to sign in with the new account
        console.log('\n🔄 Testing sign in with new account...');
        const { data: newSignInData, error: newSignInError } = await supabase.auth.signInWithPassword({
          email: newEmail,
          password: newPassword
        });
        
        if (newSignInError) {
          console.error('❌ Sign in error with new account:', newSignInError.message);
        } else {
          console.log('✅ Sign in successful with new account!');
          console.log('✅ Session created:', newSignInData.session ? 'Yes' : 'No');
          signInSuccess = true;
        }
      }
    }
    
    // Step 3: Check current session
    console.log('\n💾 Step 3: Checking current session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check error:', sessionError.message);
    } else {
      if (sessionData.session) {
        console.log('✅ Active session found:');
        console.log('  User:', sessionData.session.user?.email);
        console.log('  User ID:', sessionData.session.user?.id);
        console.log('  Expires in:', sessionData.session.expires_in, 'seconds');
      } else {
        console.log('❌ No active session');
      }
    }
    
    // Step 4: Test users table sync
    if (sessionData?.session?.user) {
      console.log('\n👥 Step 4: Testing users table sync...');
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('*')
        .eq('email', sessionData.session.user.email)
        .single();
      
      if (userDataError) {
        console.error('❌ Error checking users table:', userDataError.message);
        
        // Check if the trigger is working by waiting a bit
        console.log('⏳ Waiting 2 seconds for trigger to sync...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try again
        const { data: retryData, error: retryError } = await supabase
          .from('users')
          .select('*')
          .eq('email', sessionData.session.user.email)
          .single();
        
        if (retryError) {
          console.error('❌ Still no user record after trigger:', retryError.message);
        } else {
          console.log('✅ User record found after trigger sync:', retryData);
        }
      } else {
        console.log('✅ User record found in users table:', userData);
      }
    }
    
    console.log('\n🎉 Authentication test completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error during auth test:', error);
  }
}

testSimpleAuth();
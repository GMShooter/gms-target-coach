const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations
const supabaseAdmin = createClient(
  'https://avbwpuxhkyvfyonrpbqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY0NTE3NSwiZXhwIjoyMDY1MjIxMTc1fQ.p0fkJ5i1m_RPJO7pPFAyqvS5h0yT8kK_G8qzDG_1r7E'
);

async function createConfirmedUser() {
  console.log('🔧 Creating Confirmed Test User...');
  
  try {
    const testEmail = 'testuser@gmshoot.demo';
    const testPassword = 'TestPassword123!';
    
    // Step 1: Create user in auth.users table directly
    console.log('\n📝 Step 1: Creating user in auth system...');
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: 'GMShoot Test User'
      }
    });
    
    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      return;
    }
    
    console.log('✅ Auth user created successfully!');
    console.log('✅ User ID:', authData.user.id);
    console.log('✅ Email:', authData.user.email);
    console.log('✅ Email confirmed:', authData.user.email_confirmed);
    
    // Step 2: Create corresponding record in users table
    console.log('\n👥 Step 2: Creating record in users table...');
    
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: authData.user.email,
        firebase_uid: authData.user.id, // Use Supabase UUID as firebase_uid for compatibility
        display_name: authData.user.user_metadata?.full_name || 'GMShoot Test User',
        created_at: authData.user.created_at,
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      console.error('❌ Error creating user record:', userError.message);
      console.error('❌ Details:', userError);
    } else {
      console.log('✅ User record created successfully!');
      console.log('✅ User data:', userData);
    }
    
    // Step 3: Test sign in with the new user
    console.log('\n🔑 Step 3: Testing sign in...');
    
    // Use regular client for sign in test
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      'https://avbwpuxhkyvfyonrpbqg.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDUxNzUsImV4cCI6MjA2NTIyMTE3NX0.DnuWRHUglMP0yAb5jtVtfr3Gq-N1711W36r6LMpTYGE'
    );
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Sign in test failed:', signInError.message);
    } else {
      console.log('✅ Sign in test successful!');
      console.log('✅ Session created:', signInData.session ? 'Yes' : 'No');
      console.log('✅ User email:', signInData.user?.email);
    }
    
    // Step 4: Verify users table sync
    console.log('\n🔄 Step 4: Verifying users table sync...');
    
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification error:', verifyError.message);
    } else {
      console.log('✅ User record verified in database:');
      console.log('  ID:', verifyData.id);
      console.log('  Email:', verifyData.email);
      console.log('  Firebase UID:', verifyData.firebase_uid);
      console.log('  Display Name:', verifyData.display_name);
      console.log('  Created At:', verifyData.created_at);
    }
    
    console.log('\n🎉 Confirmed test user creation completed!');
    console.log('\n📋 Login Credentials:');
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword}`);
    console.log('\n🌐 You can now use these credentials to test the login flow!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createConfirmedUser();
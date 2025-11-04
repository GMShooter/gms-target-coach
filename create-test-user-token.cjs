const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://avbwpuxhkyvfyonrpbqg.supabase.co';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUserAndGetToken() {
  console.log('🔧 Creating test user and getting token...');
  
  try {
    // First try to sign in with existing test user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (!signInError && signInData.user) {
      console.log('✅ Successfully signed in existing user:', signInData.user.id);
      
      // Get session token
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        console.log('✅ JWT Token:', sessionData.session.access_token);
        console.log('✅ User ID:', signInData.user.id);
        return { token: sessionData.session.access_token, userId: signInData.user.id };
      }
    }
    
    // If sign in fails, try to create new user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true
    });

    if (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
    
    console.log('✅ Successfully created test user:', data.user.id);
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email,
        firebase_uid: data.user.id,
        full_name: 'Test User',
        is_active: true,
        created_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.error('❌ Error creating user profile:', profileError);
    } else {
      console.log('✅ Successfully created user profile');
    }
    
    // Sign in to get token
    const { data: newSignInData } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (newSignInData.session) {
      console.log('✅ JWT Token:', newSignInData.session.access_token);
      console.log('✅ User ID:', data.user.id);
      return { token: newSignInData.session.access_token, userId: data.user.id };
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    throw error;
  }
}

createTestUserAndGetToken().then(result => {
  console.log('🏁 Test user and token creation completed');
  console.log('TOKEN:', result.token);
  console.log('USER_ID:', result.userId);
}).catch(error => {
  console.error('❌ Process failed:', error);
  process.exit(1);
});
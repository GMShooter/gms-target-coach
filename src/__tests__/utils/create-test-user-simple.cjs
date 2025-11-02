const { createClient } = require('@supabase/supabase-js');

// Use regular client auth instead of admin
const supabaseUrl = 'https://avbwpuxhkyvfyonrpbqg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDUxNzUsImV4cCI6MjA2NTIyMTE3NX0.DnuWRHUglMP0yAb5jtVtfr3Gq-N1711W36r6LMpTYGE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUser() {
  console.log('🔧 Creating test user with client auth...');
  
  try {
    // Try to sign up first
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123',
      options: {
        emailRedirectTo: 'http://localhost:3000/demo'
      }
    });

    if (error) {
      console.error('❌ Error signing up:', error);
      
      // If user already exists, try to sign in
      if (error.message.includes('already registered')) {
        console.log('👤 User already exists, trying to sign in...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'testpassword123'
        });
        
        if (signInError) {
          console.error('❌ Error signing in:', signInError);
        } else {
          console.log('✅ Successfully signed in existing user');
          console.log('📋 User data:', signInData);
        }
      }
    } else {
      console.log('✅ Successfully created new user');
      console.log('📋 User data:', data);
    }
    
    // Check if user exists in public users table
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!authError && user) {
      console.log('🔍 Checking if user exists in public users table...');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('firebase_uid', user.id)
        .single();
      
      if (userError) {
        console.log('ℹ️ User not found in public table (this is expected):', userError.message);
      } else {
        console.log('✅ User found in public users table:', userData);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('🏁 Test user creation process completed');
}

createTestUser();
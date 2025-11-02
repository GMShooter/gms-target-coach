const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://avbwpuxhkyvfyonrpbqg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY0NTE3NSwiZXhwIjoyMDY1MjExNzV9.DnuWRHUglMP0yAb5jtVtfr3Gq-N1711W36r6LMpTYGE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  console.log('🔧 Creating test user...');
  
  try {
    // Create test user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true
    });

    if (error) {
      console.error('❌ Error creating user:', error);
      
      // If user already exists, try to get existing user
      if (error.message.includes('already registered')) {
        console.log('👤 User already exists, trying to sign in...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'testpassword123'
        });
        
        if (signInError) {
          console.error('❌ Sign in error:', signInError);
        } else {
          console.log('✅ Successfully signed in existing user:', signInData.user?.id);
        }
      }
    } else {
      console.log('✅ Successfully created test user:', data.user?.id);
      
      // Also create record in users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          firebase_uid: data.user.id, // Use auth user ID as firebase_uid
          full_name: 'Test User',
          created_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.error('❌ Error creating user profile:', profileError);
      } else {
        console.log('✅ Successfully created user profile');
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUser().then(() => {
  console.log('🏁 Test user creation process completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Process failed:', error);
  process.exit(1);
});
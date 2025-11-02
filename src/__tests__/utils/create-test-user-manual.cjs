const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations
const supabaseAdmin = createClient(
  'https://avbwpuxhkyvfyonrpbqg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY0NTE3NSwiZXhwIjoyMDY1MjExNzV9.DnuWRHUglMP0yAb5jtVtfr3Gq-N1711W36r6LMpTYGE'
);

async function createTestUserManually() {
  try {
    console.log('🔧 Creating test user manually with service role...');
    
    // First, create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true
    });
    
    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      
      // If user already exists, try to get existing user
      if (authError.message.includes('already registered')) {
        console.log('👤 User already exists, getting existing user...');
        
        const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(
          'test@example.com'
        );
        
        if (getUserError) {
          console.error('❌ Error getting existing user:', getUserError);
        } else {
          console.log('✅ Found existing user:', existingUser);
          
          // Now create user record manually
          const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .upsert({
              id: existingUser.user.id,
              email: existingUser.user.email,
              firebase_uid: existingUser.user.id, // Use Supabase UUID as firebase_uid
              display_name: existingUser.user.user_metadata?.display_name || 'Test User',
              created_at: existingUser.user.created_at,
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString()
            })
            .select()
            .single();
          
          if (userError) {
            console.error('❌ Error creating user record:', userError);
          } else {
            console.log('✅ User record created successfully:', userData);
          }
        }
      }
    } else {
      console.log('✅ Auth user created:', authData);
      
      // Create user record manually
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          firebase_uid: authData.user.id, // Use Supabase UUID as firebase_uid
          display_name: authData.user.user_metadata?.display_name || 'Test User',
          created_at: authData.user.created_at,
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        })
        .select()
        .single();
      
      if (userError) {
        console.error('❌ Error creating user record:', userError);
      } else {
        console.log('✅ User record created successfully:', userData);
      }
    }
    
    // Verify user record exists
    console.log('🔍 Verifying user record...');
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'test@example.com')
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying user record:', verifyError);
    } else {
      console.log('✅ User record verified:', verifyData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUserManually();
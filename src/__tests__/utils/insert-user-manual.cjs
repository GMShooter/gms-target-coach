const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations
const supabaseUrl = 'https://avbwpuxhkyvfyonrpbqg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YndwdXhoa3l2ZnlvbnJwYnFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY0NTE3NSwiZXhwIjoyMDY1MjExNzV9.p0fkJ5i1m_RPJO7pPFAyqvS5h0yT8kK_G8qzDG_1r7E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertUserManually() {
  try {
    console.log('🔧 Manually inserting user record with service role...');
    
    const userId = 'a2adce73-7cca-472d-8633-76c069f31818';
    const testEmail = 'test.user+demo@gmail.com';
    
    // Insert user record directly
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: testEmail,
        firebase_uid: userId, // Use Supabase UUID as firebase_uid
        display_name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      console.error('❌ Error inserting user record:', userError);
    } else {
      console.log('✅ Successfully inserted user record:', userData);
    }
    
    // Verify insertion
    console.log('🔍 Verifying user record...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
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

insertUserManually();
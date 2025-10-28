import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

await load({ export: true });

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Check if required environment variables are set
if (!supabaseUrl) {
  console.error('Error: SUPABASE_URL environment variable is not set');
  Deno.exit(1);
}

if (!serviceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  Deno.exit(1);
}

console.log('Testing service role key...');
console.log('URL:', supabaseUrl);
console.log('Key starts with:', serviceRoleKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, serviceRoleKey);
const { data, error } = await supabase.from('users').select('count');
console.log('Test result:', { data, error });
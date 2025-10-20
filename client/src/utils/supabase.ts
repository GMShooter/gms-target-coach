import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

export const createSession = async (userId: string, sessionType: string) => {
  if (!userId) throw new Error("User ID is required to create a session.");

  const { data, error } = await supabase
    .from('sessions')
    .insert([{ user_id: userId, status: 'processing', session_type: sessionType }])
    .select('id')
    .single();

  if (error) {
    console.error('Error creating session:', error);
    throw error;
  }

  return data.id;
};

export const endSession = async (sessionId: string) => {
  if (!sessionId) throw new Error("Session ID is required to end a session.");

  const { error } = await supabase.functions.invoke('end-session', {
    body: { session_id: sessionId },
  });

  if (error) {
    console.error("Error ending session:", error);
    throw error;
  }
};
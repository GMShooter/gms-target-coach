import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createSession = async (userId: string, sessionType: string) => {
  if (!userId) throw new Error("User ID is required to create a session.");

  const { data, error } = await supabase
    .from('analysis_sessions')
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

export const startSession = async (userId: string, drillMode: boolean = false) => {
  if (!userId) throw new Error("User ID is required to start a session.");

  const { data, error } = await supabase.functions.invoke('start-session', {
    body: { userId, drillMode },
  });

  if (error) {
    console.error('Error starting session:', error);
    throw error;
  }

  return data;
};

export const analyzeFrame = async (frameBase64: string) => {
  const { data, error } = await supabase.functions.invoke('analyze-frame', {
    body: { frameBase64 },
  });

  if (error) {
    console.error('Error analyzing frame:', error);
    throw error;
  }

  return data;
};
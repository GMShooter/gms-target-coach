-- Migration 012: Simple Essential Fixes for SOTA Demo MVP
--
-- This migration applies only the essential fixes needed for the demo

-- Fix users table RLS policy type mismatch
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING ((select auth.uid())::text = firebase_uid);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING ((select auth.uid())::text = firebase_uid);

-- Fix analysis_sessions table RLS policies
DROP POLICY IF EXISTS "Users can view own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON analysis_sessions;

CREATE POLICY "Users can view own sessions" ON analysis_sessions
  FOR SELECT USING (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

CREATE POLICY "Users can create own sessions" ON analysis_sessions
  FOR INSERT WITH CHECK (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

CREATE POLICY "Users can update own sessions" ON analysis_sessions
  FOR UPDATE USING (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

CREATE POLICY "Users can delete own sessions" ON analysis_sessions
  FOR DELETE USING (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

-- Create missing session_frames table if it doesn't exist
CREATE TABLE IF NOT EXISTS session_frames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  frame_number INTEGER NOT NULL,
  frame_id INTEGER NOT NULL,
  frame_url TEXT,
  frame_timestamp FLOAT,
  frame_data JSONB DEFAULT '{}',
  analysis_data JSONB DEFAULT '{}',
  predictions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on session_frames
ALTER TABLE session_frames ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for session_frames
CREATE POLICY "Users can view own session frames" ON session_frames
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM analysis_sessions WHERE 
      ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

CREATE POLICY "Users can insert own session frames" ON session_frames
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM analysis_sessions WHERE 
      ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

-- Create indexes for session_frames
CREATE INDEX IF NOT EXISTS idx_session_frames_session_id ON session_frames(session_id);
CREATE INDEX IF NOT EXISTS idx_session_frames_frame_number ON session_frames(frame_number);
CREATE INDEX IF NOT EXISTS idx_session_frames_frame_id ON session_frames(frame_id);
CREATE INDEX IF NOT EXISTS idx_session_frames_session_frame_number ON session_frames(session_id, frame_number);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Simple Essential Fixes Migration Completed Successfully';
  RAISE NOTICE 'Fixed RLS policies for users and analysis_sessions tables';
  RAISE NOTICE 'Created session_frames table with proper RLS policies';
  RAISE NOTICE 'Database is now ready for SOTA Demo MVP';
END $$;
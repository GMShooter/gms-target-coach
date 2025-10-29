-- Comprehensive fixes for GMShoot v2 SOTA Demo MVP
-- Fix UUID vs VARCHAR type mismatch and add missing tables

-- Fix users table RLS policy type mismatch
-- Problem: auth.uid() returns UUID but firebase_uid is VARCHAR
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = firebase_uid);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = firebase_uid);

-- Create missing session_frames table
CREATE TABLE IF NOT EXISTS session_frames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  frame_number INTEGER NOT NULL,
  frame_id INTEGER NOT NULL,
  frame_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  frame_data TEXT, -- Base64 encoded frame data
  predictions JSONB,
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for session_frames table
CREATE INDEX IF NOT EXISTS idx_session_frames_session_id ON session_frames(session_id);
CREATE INDEX IF NOT EXISTS idx_session_frames_frame_number ON session_frames(session_id, frame_number);

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id_status ON sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_detections_session_id ON detections(session_id);

-- Fix sessions table RLS policies to work with both columns during transition
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

-- Create new RLS policies that work with both columns during transition
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create trigger for updated_at on session_frames
CREATE TRIGGER update_session_frames_updated_at
  BEFORE UPDATE ON session_frames
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
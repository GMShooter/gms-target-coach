-- Migration 011: Final Database Fixes for SOTA Demo MVP
--
-- This migration consolidates all previous fixes and resolves conflicts
-- It ensures the database is in a clean state for the demo

-- First, let's ensure we have the correct table structure
-- Drop existing tables if they exist in inconsistent state
DROP TABLE IF EXISTS session_frames CASCADE;
DROP TABLE IF EXISTS shots CASCADE;
DROP TABLE IF EXISTS session_events CASCADE;
DROP TABLE IF EXISTS hardware_devices CASCADE;

-- Ensure analysis_sessions table exists with correct structure
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_id_uuid UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  session_type TEXT CHECK (session_type IN ('video', 'camera')),
  drill_mode BOOLEAN DEFAULT FALSE,
  performance_summary TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,
  coaching_advice TEXT,
  target_image_url TEXT,
  title VARCHAR(200),
  description TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  video_url TEXT,
  video_metadata JSONB,
  settings JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create shots table for sequential shot detection data
CREATE TABLE IF NOT EXISTS shots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  shot_number INTEGER NOT NULL,
  x_coordinate FLOAT NOT NULL,
  y_coordinate FLOAT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  scoring_zone TEXT,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  frame_id INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shot_data JSONB DEFAULT '{}',
  sequential_detection_data JSONB DEFAULT '{}',
  geometric_scoring_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_frames table for frame-by-frame analysis
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

-- Create hardware_devices table for paired device management
CREATE TABLE IF NOT EXISTS hardware_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT UNIQUE NOT NULL,
  device_name TEXT,
  device_type TEXT DEFAULT 'pi',
  qr_code_data TEXT,
  connection_url TEXT,
  last_connected TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  device_config JSONB DEFAULT '{}',
  pairing_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_events table for session lifecycle events
CREATE TABLE IF NOT EXISTS session_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('started', 'stopped', 'paused', 'resumed', 'shot_detected', 'frame_received', 'error', 'device_connected', 'device_disconnected')),
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure users table exists with correct structure
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  preferences JSONB DEFAULT '{}'
);

-- Ensure other required tables exist
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  frame_number INTEGER NOT NULL,
  frame_url TEXT,
  frame_timestamp FLOAT,
  predictions JSONB,
  accuracy_score FLOAT CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  target_count INTEGER DEFAULT 0,
  analysis_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  overall_accuracy FLOAT CHECK (overall_accuracy >= 0 AND overall_accuracy <= 1),
  total_frames INTEGER DEFAULT 0,
  successful_detections INTEGER DEFAULT 0,
  report_data JSONB NOT NULL,
  share_token TEXT UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  preference_key VARCHAR(100) NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Consolidated sessions insert" ON analysis_sessions;
DROP POLICY IF EXISTS "Consolidated sessions select" ON analysis_sessions;
DROP POLICY IF EXISTS "Consolidated sessions update" ON analysis_sessions;
DROP POLICY IF EXISTS "Consolidated sessions delete" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can view own results" ON analysis_results;
DROP POLICY IF EXISTS "Users can view own analysis results" ON analysis_results;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Public reports viewable by share token" ON reports;
DROP POLICY IF EXISTS "Consolidated reports access" ON reports;
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can view own shots" ON shots;
DROP POLICY IF EXISTS "Users can insert own shots" ON shots;
DROP POLICY IF EXISTS "Users can view own session frames" ON session_frames;
DROP POLICY IF EXISTS "Users can insert own session frames" ON session_frames;
DROP POLICY IF EXISTS "Users can view own devices" ON hardware_devices;
DROP POLICY IF EXISTS "Users can manage own devices" ON hardware_devices;
DROP POLICY IF EXISTS "Users can view own session events" ON session_events;
DROP POLICY IF EXISTS "Users can insert own session events" ON session_events;

-- Create clean, optimized RLS policies
-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING ((select auth.uid()) IS NOT NULL AND (select auth.uid())::text = firebase_uid);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL AND (select auth.uid())::text = firebase_uid);

-- Analysis sessions table policies
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

-- Analysis results table policies
CREATE POLICY "Users can view own analysis results" ON analysis_results
  FOR SELECT USING (
    (select auth.uid()) IS NOT NULL AND
    session_id IN (
      SELECT id FROM analysis_sessions
      WHERE ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

-- Reports table policies
CREATE POLICY "Consolidated reports access" ON reports
  FOR SELECT USING (
    -- Authenticated users can view their own reports through their sessions
    ((select auth.uid()) IS NOT NULL AND
     session_id IN (
       SELECT id FROM analysis_sessions 
       WHERE ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
     ))
    OR
    -- Public reports are viewable by anyone with share token
    (is_public = TRUE AND share_token IS NOT NULL)
  );

-- User preferences table policies
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (
    (select auth.uid()) IS NOT NULL AND
    user_id = (select auth.uid())
  ) WITH CHECK (
    (select auth.uid()) IS NOT NULL AND
    user_id = (select auth.uid())
  );

-- Shots table policies
CREATE POLICY "Users can view own shots" ON shots
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM analysis_sessions WHERE 
      ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

CREATE POLICY "Users can insert own shots" ON shots
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM analysis_sessions WHERE 
      ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

-- Session frames table policies
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

-- Hardware devices table policies
CREATE POLICY "Users can view own devices" ON hardware_devices
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own devices" ON hardware_devices
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- Session events table policies
CREATE POLICY "Users can view own session events" ON session_events
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM analysis_sessions WHERE 
      ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

CREATE POLICY "Users can insert own session events" ON session_events
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM analysis_sessions WHERE 
      ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

-- Create all necessary indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id_uuid ON analysis_sessions(user_id_uuid);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at ON analysis_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_status ON analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_type ON analysis_sessions(session_type);

CREATE INDEX IF NOT EXISTS idx_analysis_results_session_id ON analysis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_frame_number ON analysis_results(frame_number);
CREATE INDEX IF NOT EXISTS idx_analysis_results_accuracy_score ON analysis_results(accuracy_score);

CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_share_token ON reports(share_token);
CREATE INDEX IF NOT EXISTS idx_reports_is_public ON reports(is_public);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);

CREATE INDEX IF NOT EXISTS idx_shots_session_id ON shots(session_id);
CREATE INDEX IF NOT EXISTS idx_shots_shot_number ON shots(shot_number);
CREATE INDEX IF NOT EXISTS idx_shots_timestamp ON shots(timestamp);
CREATE INDEX IF NOT EXISTS idx_shots_session_shot_number ON shots(session_id, shot_number);

CREATE INDEX IF NOT EXISTS idx_session_frames_session_id ON session_frames(session_id);
CREATE INDEX IF NOT EXISTS idx_session_frames_frame_number ON session_frames(frame_number);
CREATE INDEX IF NOT EXISTS idx_session_frames_frame_id ON session_frames(frame_id);
CREATE INDEX IF NOT EXISTS idx_session_frames_session_frame_number ON session_frames(session_id, frame_number);

CREATE INDEX IF NOT EXISTS idx_hardware_devices_user_id ON hardware_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_hardware_devices_device_id ON hardware_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_hardware_devices_is_active ON hardware_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_hardware_devices_last_connected ON hardware_devices(last_connected);

CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_event_type ON session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_timestamp ON session_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_session_events_session_timestamp ON session_events(session_id, timestamp);

-- Create or replace the update_updated_at_column function with proper security
DROP FUNCTION IF EXISTS update_updated_at_column();
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql'
SECURITY DEFINER
SET search_path = 'public';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_analysis_sessions_updated_at ON analysis_sessions;
CREATE TRIGGER update_analysis_sessions_updated_at
  BEFORE UPDATE ON analysis_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hardware_devices_updated_at ON hardware_devices;
CREATE TRIGGER update_hardware_devices_updated_at
  BEFORE UPDATE ON hardware_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log completion of this final migration
DO $$
BEGIN
  RAISE NOTICE 'Final Database Fixes Migration Completed Successfully';
  RAISE NOTICE 'All tables have been recreated with proper structure';
  RAISE NOTICE 'RLS policies have been optimized for performance';
  RAISE NOTICE 'All necessary indexes have been created';
  RAISE NOTICE 'Database is now ready for SOTA Demo MVP';
END $$;
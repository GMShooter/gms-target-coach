-- Apply fixes safely with proper checks for existing tables

-- First ensure all required tables exist
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

-- Ensure analysis_sessions table exists (renamed from sessions)
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

-- Ensure other tables exist
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can view own results" ON analysis_results;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Public reports viewable by share token" ON reports;
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;

-- Create restrictive policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid()::text = firebase_uid);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid()::text = firebase_uid);

-- Create restrictive policies for analysis_sessions
CREATE POLICY "Users can view own sessions" ON analysis_sessions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid()::text = user_id OR auth.uid() = user_id_uuid)
  );

CREATE POLICY "Users can create own sessions" ON analysis_sessions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (auth.uid()::text = user_id OR auth.uid() = user_id_uuid)
  );

CREATE POLICY "Users can update own sessions" ON analysis_sessions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid()::text = user_id OR auth.uid() = user_id_uuid)
  );

CREATE POLICY "Users can delete own sessions" ON analysis_sessions
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND 
    (auth.uid()::text = user_id OR auth.uid() = user_id_uuid)
  );

-- Create restrictive policy for analysis_results
CREATE POLICY "Users can view own results" ON analysis_results
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    session_id IN (
      SELECT id FROM analysis_sessions 
      WHERE (auth.uid()::text = user_id OR auth.uid() = user_id_uuid)
    )
  );

-- Create restrictive policies for reports
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    session_id IN (
      SELECT id FROM analysis_sessions 
      WHERE (auth.uid()::text = user_id OR auth.uid() = user_id_uuid)
    )
  );

CREATE POLICY "Public reports viewable by share token" ON reports
  FOR SELECT USING (
    is_public = TRUE AND 
    share_token IS NOT NULL
  );

-- Create restrictive policy for user_preferences
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- Ensure all required indexes exist
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

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

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

-- Create security functions
CREATE OR REPLACE FUNCTION verify_user_access(table_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM analysis_sessions 
    WHERE id = table_id 
    AND (auth.uid()::text = user_id OR auth.uid() = user_id_uuid)
    AND auth.uid() IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create performance optimization function
CREATE OR REPLACE FUNCTION get_user_sessions_with_reports(p_user_id TEXT)
RETURNS TABLE (
  session_id UUID,
  session_title TEXT,
  session_status TEXT,
  session_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  report_id UUID,
  report_title TEXT,
  overall_accuracy FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.status,
    s.session_type,
    s.created_at,
    r.id as report_id,
    r.title as report_title,
    r.overall_accuracy
  FROM analysis_sessions s
  LEFT JOIN reports r ON s.id = r.session_id
  WHERE (s.user_id = p_user_id OR s.user_id_uuid::text = p_user_id)
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
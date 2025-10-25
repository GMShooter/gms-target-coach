-- Migration 010: Session Data Ingestion Tables
-- 
-- This migration creates tables needed for real-time session data ingestion
-- from Pi server, including shots, session frames, and hardware devices

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

-- Create indexes for performance optimization
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

-- Enable Row Level Security on new tables
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shots table
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

-- Create RLS policies for session_frames table
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

-- Create RLS policies for hardware_devices table
CREATE POLICY "Users can view own devices" ON hardware_devices
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own devices" ON hardware_devices
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- Create RLS policies for session_events table
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

-- Create triggers for updated_at timestamp
CREATE TRIGGER update_hardware_devices_updated_at
  BEFORE UPDATE ON hardware_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments explaining the new tables
COMMENT ON TABLE shots IS 'Sequential shot detection data with geometric scoring integration';
COMMENT ON TABLE session_frames IS 'Frame-by-frame analysis data for real-time sessions';
COMMENT ON TABLE hardware_devices IS 'Paired hardware devices for shooting analysis';
COMMENT ON TABLE session_events IS 'Session lifecycle events for auditing and debugging';

-- Create optimized functions for session data retrieval
CREATE OR REPLACE FUNCTION get_session_shots_with_scoring(p_session_id UUID)
RETURNS TABLE (
  shot_id UUID,
  shot_number INTEGER,
  x_coordinate FLOAT,
  y_coordinate FLOAT,
  score INTEGER,
  scoring_zone TEXT,
  confidence_score FLOAT,
  timestamp TIMESTAMP WITH TIME ZONE,
  geometric_data JSONB,
  sequential_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.shot_number,
    s.x_coordinate,
    s.y_coordinate,
    s.score,
    s.scoring_zone,
    s.confidence_score,
    s.timestamp,
    s.geometric_scoring_data,
    s.sequential_detection_data
  FROM shots s
  WHERE s.session_id = p_session_id
  ORDER BY s.shot_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for session statistics
CREATE OR REPLACE FUNCTION get_session_statistics(p_session_id UUID)
RETURNS TABLE (
  total_shots INTEGER,
  average_score FLOAT,
  highest_score INTEGER,
  lowest_score INTEGER,
  accuracy_percentage FLOAT,
  session_duration_seconds INTEGER,
  shots_per_minute FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_shots,
    AVG(s.score) as average_score,
    MAX(s.score) as highest_score,
    MIN(s.score) as lowest_score,
    AVG(s.score) * 10.0 as accuracy_percentage,
    EXTRACT(EPOCH FROM (MAX(s.timestamp) - MIN(s.timestamp)))::INTEGER as session_duration_seconds,
    CASE 
      WHEN EXTRACT(EPOCH FROM (MAX(s.timestamp) - MIN(s.timestamp))) > 0 
      THEN COUNT(*) / (EXTRACT(EPOCH FROM (MAX(s.timestamp) - MIN(s.timestamp))) / 60.0)
      ELSE 0 
    END as shots_per_minute
  FROM shots s
  WHERE s.session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log completion of this migration
DO $$
BEGIN
  RAISE NOTICE 'Session Data Ingestion Migration Completed Successfully';
  RAISE NOTICE 'Created tables: shots, session_frames, hardware_devices, session_events';
  RAISE NOTICE 'Added optimized functions for session data retrieval';
END $$;
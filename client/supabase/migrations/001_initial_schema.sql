-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  session_type TEXT CHECK (session_type IN ('video', 'camera')),
  drill_mode BOOLEAN DEFAULT FALSE,
  performance_summary TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,
  coaching_advice TEXT,
  target_image_url TEXT
);

-- Create detections table for individual shot detections
CREATE TABLE IF NOT EXISTS detections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  shot_number INTEGER NOT NULL,
  x_coordinate FLOAT NOT NULL,
  y_coordinate FLOAT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  direction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analysis_results table for frame-by-frame analysis
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
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

-- Create reports table for generated reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_detections_session_id ON detections(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_session_id ON analysis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_share_token ON reports(share_token);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Sessions policies
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid()::text = user_id);

-- Detections policies
CREATE POLICY "Users can view own detections" ON detections
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE auth.uid()::text = user_id
    )
  );

-- Analysis results policies
CREATE POLICY "Users can view own analysis results" ON analysis_results
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE auth.uid()::text = user_id
    )
  );

-- Reports policies
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE auth.uid()::text = user_id
    )
  );

CREATE POLICY "Public reports viewable by share token" ON reports
  FOR SELECT USING (is_public = TRUE AND share_token IS NOT NULL);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
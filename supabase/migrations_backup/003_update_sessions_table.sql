-- Update sessions table to use UUID for user_id to match users table
-- First, create a new column with UUID type
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

-- Migrate data from text to UUID if needed
UPDATE sessions 
SET user_id_uuid = user_id::uuid 
WHERE user_id_uuid IS NULL AND user_id IS NOT NULL;

-- Update RLS policies to reference new column
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

-- Create new RLS policies that work with both columns during transition
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid()::text = user_id OR auth.uid() = user_id_uuid);

CREATE POLICY "Users can create own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.uid() = user_id_uuid);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid()::text = user_id OR auth.uid() = user_id_uuid);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid()::text = user_id OR auth.uid() = user_id_uuid);

-- Update sessions table name to analysis_sessions to match code
ALTER TABLE IF EXISTS sessions RENAME TO analysis_sessions;

-- Update indexes for renamed table
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_sessions_created_at;
DROP INDEX IF EXISTS idx_sessions_status;

CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id_uuid ON analysis_sessions(user_id_uuid);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at ON analysis_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_status ON analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_type ON analysis_sessions(session_type);

-- Update trigger for renamed table
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_analysis_sessions_updated_at
  BEFORE UPDATE ON analysis_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
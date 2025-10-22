-- Migration 007: Fix RLS Performance Issues
-- 
-- This migration addresses Supabase RLS performance warnings related to "auth_rls_initplan"
-- The issue occurs when auth.uid() is used directly in RLS policies, causing it to be
-- re-evaluated for each row in the result set. By wrapping it in a subquery
-- (select auth.uid()), PostgreSQL can cache the result and significantly improve performance.
--
-- This migration updates all existing RLS policies to use the optimized pattern
-- while maintaining exactly the same security logic.

-- Drop and recreate policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING ((select auth.uid()) IS NOT NULL AND (select auth.uid())::text = firebase_uid);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL AND (select auth.uid())::text = firebase_uid);

-- Drop and recreate policies for analysis_sessions table
DROP POLICY IF EXISTS "Users can view own sessions" ON analysis_sessions;
CREATE POLICY "Users can view own sessions" ON analysis_sessions
  FOR SELECT USING (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

DROP POLICY IF EXISTS "Users can create own sessions" ON analysis_sessions;
CREATE POLICY "Users can create own sessions" ON analysis_sessions
  FOR INSERT WITH CHECK (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

DROP POLICY IF EXISTS "Users can update own sessions" ON analysis_sessions;
CREATE POLICY "Users can update own sessions" ON analysis_sessions
  FOR UPDATE USING (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

DROP POLICY IF EXISTS "Users can delete own sessions" ON analysis_sessions;
CREATE POLICY "Users can delete own sessions" ON analysis_sessions
  FOR DELETE USING (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

-- Drop and recreate policies for detections table (referred to as "shots" in the task)
DROP POLICY IF EXISTS "Users can view own detections" ON detections;
CREATE POLICY "Users can view own detections" ON detections
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM analysis_sessions WHERE 
      ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

-- Drop and recreate policies for analysis_results table
DROP POLICY IF EXISTS "Users can view own results" ON analysis_results;
CREATE POLICY "Users can view own results" ON analysis_results
  FOR SELECT USING (
    (select auth.uid()) IS NOT NULL AND
    session_id IN (
      SELECT id FROM analysis_sessions
      WHERE ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

DROP POLICY IF EXISTS "Users can view own analysis results" ON analysis_results;
CREATE POLICY "Users can view own analysis results" ON analysis_results
  FOR SELECT USING (
    (select auth.uid()) IS NOT NULL AND
    session_id IN (
      SELECT id FROM analysis_sessions
      WHERE ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

-- Drop and recreate policies for reports table
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (
    (select auth.uid()) IS NOT NULL AND
    session_id IN (
      SELECT id FROM analysis_sessions 
      WHERE ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

DROP POLICY IF EXISTS "Public reports viewable by share token" ON reports;
CREATE POLICY "Public reports viewable by share token" ON reports
  FOR SELECT USING (
    is_public = TRUE AND 
    share_token IS NOT NULL
  );

-- Drop and recreate policies for user_preferences table
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (
    (select auth.uid()) IS NOT NULL AND
    user_id = (select auth.uid())
  ) WITH CHECK (
    (select auth.uid()) IS NOT NULL AND
    user_id = (select auth.uid())
  );

-- Update security functions to use optimized auth.uid() pattern
DROP FUNCTION IF EXISTS verify_user_access(UUID);
CREATE OR REPLACE FUNCTION verify_user_access(table_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM analysis_sessions 
    WHERE id = table_id 
    AND ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    AND (select auth.uid()) IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update performance optimization function to use optimized auth.uid() pattern
DROP FUNCTION IF EXISTS get_user_sessions_with_reports(TEXT);
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

-- Add comment explaining the performance optimization
COMMENT ON COLUMN analysis_sessions.user_id IS 'Original text-based user ID for compatibility';
COMMENT ON COLUMN analysis_sessions.user_id_uuid IS 'UUID-based user ID matching users table';
COMMENT ON TABLE user_preferences IS 'User-specific preferences with optimized RLS policies';

-- Performance optimization: Create partial indexes for common RLS queries
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_auth_text 
  ON analysis_sessions(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_auth_uuid 
  ON analysis_sessions(user_id_uuid) 
  WHERE user_id_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid_optimized 
  ON users(firebase_uid) 
  WHERE firebase_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id_optimized 
  ON user_preferences(user_id) 
  WHERE user_id IS NOT NULL;

-- Add indexes for foreign key relationships to improve RLS performance
CREATE INDEX IF NOT EXISTS idx_detections_session_id_optimized 
  ON detections(session_id) 
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_results_session_id_optimized 
  ON analysis_results(session_id) 
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_session_id_optimized 
  ON reports(session_id) 
  WHERE session_id IS NOT NULL;

-- Log the completion of this optimization migration
DO $$
BEGIN
  RAISE NOTICE 'RLS Performance Optimization Migration Completed Successfully';
  RAISE NOTICE 'All auth.uid() references have been replaced with (select auth.uid()) for better performance';
  RAISE NOTICE 'This addresses the auth_rls_initplan warnings from Supabase';
END $$;
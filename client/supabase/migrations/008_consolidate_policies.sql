-- Migration 008: Consolidate Multiple Permissive Policies
--
-- This migration consolidates multiple permissive policies on the same tables and actions
-- to resolve Supabase performance warnings. Having multiple permissive policies for the
-- same role and action forces PostgreSQL to evaluate each policy separately, which
-- impacts query performance.
--
-- This migration combines related policies using OR operators while maintaining
-- exactly the same security logic.

-- Consolidate policies for reports table
-- There are currently two SELECT policies: "Users can view own reports" and "Public reports viewable by share token"
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Public reports viewable by share token" ON reports;

-- Create a single consolidated policy for reports
CREATE POLICY "Consolidated reports access" ON reports
  FOR SELECT USING (
    -- Users can view their own reports through their sessions
    ((select auth.uid()) IS NOT NULL AND
     session_id IN (
       SELECT id FROM analysis_sessions 
       WHERE ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
     ))
    OR
    -- Public reports are viewable by anyone with the share token
    (is_public = TRUE AND share_token IS NOT NULL)
  );

-- Consolidate policies for analysis_sessions table
-- There are currently separate policies for INSERT, SELECT, UPDATE, DELETE
DROP POLICY IF EXISTS "Users can create own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON analysis_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON analysis_sessions;

-- Create consolidated policies for each action on analysis_sessions
CREATE POLICY "Consolidated sessions insert" ON analysis_sessions
  FOR INSERT WITH CHECK (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

CREATE POLICY "Consolidated sessions select" ON analysis_sessions
  FOR SELECT USING (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

CREATE POLICY "Consolidated sessions update" ON analysis_sessions
  FOR UPDATE USING (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

CREATE POLICY "Consolidated sessions delete" ON analysis_sessions
  FOR DELETE USING (
    (select auth.uid()) IS NOT NULL AND 
    ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
  );

-- Consolidate policies for detections table (referred to as "shots" in the task)
-- There's currently one SELECT policy, but we'll ensure it follows the consolidated pattern
DROP POLICY IF EXISTS "Users can view own detections" ON detections;

-- Create consolidated policy for detections
CREATE POLICY "Consolidated detections access" ON detections
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM analysis_sessions WHERE 
      ((select auth.uid())::text = user_id OR (select auth.uid()) = user_id_uuid)
    )
  );

-- Add comments explaining the consolidation benefits
COMMENT ON POLICY "Consolidated reports access" ON reports IS 'Consolidated policy combining user ownership and public access with share token';
COMMENT ON POLICY "Consolidated sessions insert" ON analysis_sessions IS 'Consolidated INSERT policy for user session creation';
COMMENT ON POLICY "Consolidated sessions select" ON analysis_sessions IS 'Consolidated SELECT policy for user session viewing';
COMMENT ON POLICY "Consolidated sessions update" ON analysis_sessions IS 'Consolidated UPDATE policy for user session modification';
COMMENT ON POLICY "Consolidated sessions delete" ON analysis_sessions IS 'Consolidated DELETE policy for user session removal';
COMMENT ON POLICY "Consolidated detections access" ON detections IS 'Consolidated policy for accessing detections through user sessions';

-- Log the completion of this consolidation migration
DO $$
BEGIN
  RAISE NOTICE 'Policy Consolidation Migration Completed Successfully';
  RAISE NOTICE 'Multiple permissive policies have been consolidated for better performance';
  RAISE NOTICE 'This addresses the multiple_permissive_policies warnings from Supabase';
END $$;
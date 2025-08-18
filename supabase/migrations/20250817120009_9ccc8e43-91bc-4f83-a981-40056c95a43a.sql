-- Fix security warnings by updating RLS policies without changing user_id constraint

-- Update training_data table RLS policies - restrict public access
DROP POLICY IF EXISTS "Users can view all training data" ON public.training_data;

CREATE POLICY "Users can view their own training data" 
ON public.training_data 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Update sessions table RLS policies - allow authenticated users to only see their own sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.sessions;

CREATE POLICY "Users can view their own sessions" 
ON public.sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can update their own sessions" 
ON public.sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update shots table RLS policies - restrict to user's own sessions
DROP POLICY IF EXISTS "Users can view shots from their sessions" ON public.shots;
DROP POLICY IF EXISTS "Users can create shots for their sessions" ON public.shots;
DROP POLICY IF EXISTS "Users can update shots from their sessions" ON public.shots;
DROP POLICY IF EXISTS "Users can delete shots from their sessions" ON public.shots;

CREATE POLICY "Users can view shots from their sessions" 
ON public.shots 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = shots.session_id 
  AND sessions.user_id = auth.uid()
));

CREATE POLICY "Users can create shots for their sessions" 
ON public.shots 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = shots.session_id 
  AND sessions.user_id = auth.uid()
));

CREATE POLICY "Users can update shots from their sessions" 
ON public.shots 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = shots.session_id 
  AND sessions.user_id = auth.uid()
));

CREATE POLICY "Users can delete shots from their sessions" 
ON public.shots 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = shots.session_id 
  AND sessions.user_id = auth.uid()
));
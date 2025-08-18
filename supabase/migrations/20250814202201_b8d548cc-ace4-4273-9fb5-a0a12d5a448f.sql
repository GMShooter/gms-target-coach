-- Fix security vulnerability: Restrict training video access to owners only

-- Drop the overly permissive policy that allows anyone to view all training videos
DROP POLICY IF EXISTS "Users can view all training videos" ON public.training_videos;

-- Create a secure policy that only allows users to view their own training videos
CREATE POLICY "Users can view their own training videos"
ON public.training_videos
FOR SELECT
USING ((auth.uid())::text = user_id);

-- Ensure only authenticated users can view training videos at all
CREATE POLICY "Only authenticated users can view training videos"
ON public.training_videos
FOR SELECT
USING (auth.role() = 'authenticated');
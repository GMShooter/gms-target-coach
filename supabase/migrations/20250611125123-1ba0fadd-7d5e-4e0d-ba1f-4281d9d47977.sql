
-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  video_url TEXT,
  total_score INTEGER,
  group_size_mm FLOAT,
  accuracy_percentage FLOAT,
  directional_trend TEXT
);

-- Create shots table
CREATE TABLE public.shots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  shot_number INTEGER NOT NULL,
  score INTEGER NOT NULL,
  x_coordinate FLOAT NOT NULL,
  y_coordinate FLOAT NOT NULL,
  comment TEXT,
  direction TEXT NOT NULL
);

-- Enable Row Level Security on both tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sessions table
CREATE POLICY "Users can view their own sessions" 
  ON public.sessions 
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own sessions" 
  ON public.sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own sessions" 
  ON public.sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own sessions" 
  ON public.sessions 
  FOR DELETE 
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Create RLS policies for shots table
CREATE POLICY "Users can view shots from their sessions" 
  ON public.shots 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE sessions.id = shots.session_id 
      AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create shots for their sessions" 
  ON public.shots 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE sessions.id = shots.session_id 
      AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can update shots from their sessions" 
  ON public.shots 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE sessions.id = shots.session_id 
      AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can delete shots from their sessions" 
  ON public.shots 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE sessions.id = shots.session_id 
      AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
    )
  );

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true);

-- Create storage policy for videos bucket
CREATE POLICY "Anyone can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Anyone can view videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

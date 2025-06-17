
-- Create storage bucket for training videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-videos', 'training-videos', true);

-- Create storage policies for training videos bucket
CREATE POLICY "Anyone can view training videos" ON storage.objects
FOR SELECT USING (bucket_id = 'training-videos');

CREATE POLICY "Authenticated users can upload training videos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'training-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own training videos" ON storage.objects
FOR UPDATE USING (bucket_id = 'training-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own training videos" ON storage.objects
FOR DELETE USING (bucket_id = 'training-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create training_videos table
CREATE TABLE public.training_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hash TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  size BIGINT NOT NULL,
  duration DOUBLE PRECISION NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id TEXT NOT NULL,
  storage_url TEXT NOT NULL
);

-- Enable RLS on training_videos
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

-- Create policies for training_videos
CREATE POLICY "Users can view all training videos" ON public.training_videos
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert training videos" ON public.training_videos
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own training videos" ON public.training_videos
FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own training videos" ON public.training_videos
FOR DELETE USING (auth.uid()::text = user_id);

-- Create training_data table
CREATE TABLE public.training_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.training_videos(id) ON DELETE CASCADE,
  detections JSONB NOT NULL DEFAULT '[]',
  annotations JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_validated BOOLEAN NOT NULL DEFAULT false,
  used_for_training BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on training_data
ALTER TABLE public.training_data ENABLE ROW LEVEL SECURITY;

-- Create policies for training_data
CREATE POLICY "Users can view all training data" ON public.training_data
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert training data" ON public.training_data
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update training data" ON public.training_data
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete training data" ON public.training_data
FOR DELETE USING (auth.role() = 'authenticated');

-- Create model_versions table
CREATE TABLE public.model_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  model_type TEXT NOT NULL DEFAULT 'yolov8',
  training_data_count INTEGER NOT NULL DEFAULT 0,
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'training',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on model_versions
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for model_versions
CREATE POLICY "Anyone can view model versions" ON public.model_versions
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert model versions" ON public.model_versions
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update model versions" ON public.model_versions
FOR UPDATE USING (auth.role() = 'authenticated');

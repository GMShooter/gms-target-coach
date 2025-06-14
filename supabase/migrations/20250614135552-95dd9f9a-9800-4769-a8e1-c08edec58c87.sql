
-- Add timing columns to the shots table
ALTER TABLE public.shots ADD COLUMN shot_timestamp FLOAT;

-- Add split times tracking to the sessions table  
ALTER TABLE public.sessions ADD COLUMN split_times JSONB;

-- Add drill mode tracking columns to sessions
ALTER TABLE public.sessions ADD COLUMN drill_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE public.sessions ADD COLUMN time_to_first_shot FLOAT;
ALTER TABLE public.sessions ADD COLUMN average_split_time FLOAT;

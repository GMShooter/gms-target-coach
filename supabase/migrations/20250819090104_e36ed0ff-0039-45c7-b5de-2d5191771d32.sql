-- Fix database functions security by setting search_path
CREATE OR REPLACE FUNCTION public.validate_session_exists()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    -- Check if the session exists and belongs to the authenticated user
    IF NOT EXISTS (
        SELECT 1 
        FROM public.sessions 
        WHERE id = NEW.session_id 
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Invalid session_id or unauthorized access' 
        USING ERRCODE = 'P0001', 
        HINT = 'Ensure the session exists and belongs to the current user';
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_session(input_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM sessions 
    WHERE 
      id = input_session_id AND 
      user_id = auth.uid() AND 
      created_at IS NOT NULL
  );
END;
$function$;
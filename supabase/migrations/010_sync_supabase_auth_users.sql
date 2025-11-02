-- Create trigger to automatically sync Supabase Auth users to users table
-- This fixes the issue where Supabase Auth users aren't being created in the users table

-- Function to handle user profile creation/update
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new user into users table
  INSERT INTO public.users (id, email, firebase_uid, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.id::text, -- Store Supabase UUID as firebase_uid for compatibility
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', EXCLUDED.email),
    updated_at = NOW(),
    last_login = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle user profile updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update existing user in users table
  UPDATE public.users SET
    email = NEW.email,
    display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    updated_at = NOW(),
    last_login = NOW()
  WHERE id = NEW.id;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update user profile on auth changes
CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Create existing users sync function
CREATE OR REPLACE FUNCTION public.sync_existing_users()
RETURNS void AS $$
BEGIN
  -- Sync existing auth users to users table
  INSERT INTO public.users (id, email, firebase_uid, display_name, created_at, updated_at)
  SELECT 
    au.id,
    au.email,
    au.id::text,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email),
    COALESCE(au.created_at, NOW()),
    NOW()
  FROM auth.users au
  LEFT JOIN public.users u ON au.id = u.id
  WHERE u.id IS NULL;
    
  -- Update last_login for existing users
  UPDATE public.users SET
    last_login = au.last_sign_in_at,
    updated_at = NOW()
  FROM auth.users au
  WHERE public.users.id = au.id
    AND au.last_sign_in_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_existing_users() TO authenticated;

-- Sync existing users immediately
SELECT public.sync_existing_users();
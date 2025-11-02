-- Migration 010: Create User Synchronization Trigger
--
-- This migration creates a trigger that automatically creates user records
-- in the users table when users authenticate via Supabase Auth
-- This fixes the "Database error granting user" issue

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user record if it doesn't exist
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    last_sign_in_at = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user record when auth user is updated
  UPDATE public.users SET
    email = NEW.email,
    full_name = NEW.raw_user_meta_data->>'full_name',
    last_sign_in_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- Ensure RLS policies are enabled and working
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the trigger
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically creates user records in public.users when users authenticate via Supabase Auth';
COMMENT ON TRIGGER on_auth_user_updated ON auth.users IS 'Automatically updates user records in public.users when auth users are updated';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'User Synchronization Trigger Migration Completed Successfully';
  RAISE NOTICE 'Users will now be automatically synced from auth.users to public.users';
  RAISE NOTICE 'This fixes the "Database error granting user" issue';
END $$;
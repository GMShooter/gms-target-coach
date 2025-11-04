-- Phase 1: Fix Authentication Schema Issues
-- This migration fixes UUID vs VARCHAR type mismatch and implements Supabase-only auth

-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Update users table to use proper UUID column for Supabase auth
-- First, add the new UUID column
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_uid UUID;

-- Migrate data from firebase_uid to auth_uid if needed
UPDATE users SET auth_uid = firebase_uid::UUID WHERE firebase_uid IS NOT NULL AND auth_uid IS NULL;

-- Make auth_uid NOT NULL after migration
ALTER TABLE users ALTER COLUMN auth_uid SET NOT NULL;

-- Drop the old firebase_uid column
ALTER TABLE users DROP COLUMN IF EXISTS firebase_uid;

-- Update indexes
DROP INDEX IF EXISTS idx_users_firebase_uid;
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(auth_uid);

-- Create proper RLS policies using UUID comparison
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_uid);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_uid);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = auth_uid);

-- Fix sessions table RLS policies to use proper UUID comparison
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

-- Update sessions table user_id to UUID type
ALTER TABLE sessions ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Create new RLS policies for sessions with proper UUID comparison
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle user profile synchronization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_uid, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (auth_uid) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    last_login = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user login updates
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET 
    last_login = NOW(),
    updated_at = NOW()
  WHERE auth_uid = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last login on sign in
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_login();

-- Create function to get user profile with proper error handling
CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS TABLE (
  auth_uid UUID,
  email VARCHAR,
  display_name VARCHAR,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  preferences JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.auth_uid,
    u.email,
    u.display_name,
    u.avatar_url,
    u.created_at,
    u.last_login,
    u.preferences
  FROM users u
  WHERE u.auth_uid = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
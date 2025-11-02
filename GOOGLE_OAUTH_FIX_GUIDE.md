# Google OAuth Configuration Fix Guide

## Problem Identified
```
oauth2: "invalid_client" "Unauthorized" during GET /callback exchange
```

## Immediate Fix Required

### 1. Supabase Dashboard Configuration
Go to your Supabase project dashboard → Authentication → Providers → Google

**Required Settings:**
- **Client ID**: Must match your Google OAuth App Client ID
- **Client Secret**: Must match your Google OAuth App Client Secret
- **Redirect URL**: Must be exactly `http://localhost:3000/auth/callback`

### 2. Google Cloud Console Configuration
Go to Google Cloud Console → APIs & Services → Credentials

**OAuth 2.0 Client ID Settings:**
- **Authorized JavaScript origins**: `http://localhost:3000`
- **Authorized redirect URIs**: `http://localhost:3000/auth/callback`

### 3. Environment Variables
Ensure your `.env` file has:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Testing Steps
1. Restart development server after configuration changes
2. Clear browser cookies/cache
3. Test Google OAuth flow again
4. Check browser network tab for 302 redirects
5. Verify final redirect to `/demo` page

## Database Performance Fixes

### 1. Fix User Sync Trigger (Permission Issue)
The migration failed due to permissions. Run this SQL directly in Supabase SQL Editor:

```sql
-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 2. Fix RLS Performance Issues
Replace multiple policies with consolidated ones (already done in migration 008).

## Security Fixes

### 1. Function Security
Fix mutable search_path in functions:

```sql
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_user_update() SET search_path = public;
```

### 2. RLS Policy Optimization
Replace `auth.uid()` with `(select auth.uid())` in policies to prevent per-row re-evaluation.

## Next Steps After OAuth Fix

1. **Test Authentication Flow**
   - Email/password login should work
   - Google OAuth should work after configuration fix
   - User should be redirected to `/demo` page
   - User record should appear in `users` table

2. **Test UI Components**
   - Verify new SimpleLoginPage renders correctly
   - Verify new SimpleDemoPage shows GMShoot logo
   - Test all interactive elements

3. **Complete Phase 3**
   - Capture UI screenshots
   - Create screen recording of workflow
   - Provide completion report

## Critical Files to Check

1. `src/pages/SimpleLoginPage.tsx` - New clean login UI
2. `src/pages/SimpleDemoPage.tsx` - New demo UI with logo
3. `src/services/AuthService.ts` - Google OAuth implementation
4. `src/hooks/useAuth.tsx` - Authentication state management

## Verification Commands

After fixing OAuth, test with:
```bash
# Check development server
npm run dev

# Test authentication flow
# Visit http://localhost:3000
# Try both email and Google login
# Check browser console for errors
# Verify redirect to /demo page
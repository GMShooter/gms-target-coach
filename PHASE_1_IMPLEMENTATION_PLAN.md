# Phase 1: Foundational Stability Checks - Implementation Plan

## 🚨 CRITICAL ISSUE IDENTIFIED: Missing User Creation Logic

### Root Cause Analysis
- **Users table exists** but no records are created when users sign up
- **AuthService** only manages Supabase Auth state, never inserts into `users` table
- **RLS policies** fail because no matching user record exists
- **Authentication flow breaks** despite Supabase Auth working correctly

### Solution: Database Trigger for User Sync

## 1. Critical Database Fix

### File: `supabase/migrations/010_auth_user_sync_trigger.sql`

```sql
-- Migration 010: Create Auth User Sync Trigger
--
-- This migration creates a trigger that automatically creates user records
-- in the users table when new users sign up through Supabase Auth
-- This fixes the critical issue where users can authenticate but
-- no records exist in the users table, breaking RLS policies
--

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user record into users table
  INSERT INTO users (
    firebase_uid,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id::text,  -- Convert UUID to text for firebase_uid field
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public';

-- Create trigger to fire on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment explaining the trigger
COMMENT ON TRIGGER on_auth_user_created IS 'Automatically creates user records in users table when new users sign up through Supabase Auth';

-- Create function to handle user profile updates
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user record in users table if it exists
  UPDATE users SET
    email = NEW.email,
    full_name = NEW.raw_user_meta_data->>'full_name',
    updated_at = NOW()
  WHERE firebase_uid = NEW.id::text;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public';

-- Create trigger to fire on user profile updates
DROP TRIGGER IF EXISTS on_auth_user_updated;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- Add comment explaining the trigger
COMMENT ON TRIGGER on_auth_user_updated IS 'Automatically updates user records in users table when user profiles are updated in Supabase Auth';

-- Log completion of this critical fix
DO $$
BEGIN
  RAISE NOTICE 'Auth User Sync Trigger Migration Completed Successfully';
  RAISE NOTICE 'Fixed critical authentication issue by creating triggers to sync Supabase Auth users to users table';
  RAISE NOTICE 'Users will now be automatically created/updated in users table when they sign up or update profiles';
END $$;
```

## 2. Modified AuthService for User Creation

### File: `src/services/AuthService.ts` - Add to `setSession` method (around line 316)

```typescript
/**
 * Set session and update auth state
 * @private
 */
private async setSession(session: SupabaseSession): Promise<void> {
  const authUser: AuthUser = {
    id: session.user.id,
    email: session.user.email || '',
    fullName: session.user.user_metadata?.full_name || '',
    avatarUrl: session.user.user_metadata?.avatar_url || '',
    createdAt: session.user.created_at || new Date().toISOString(),
    lastSignInAt: session.user.last_sign_in_at
  };

  this.authState = {
    user: authUser,
    session,
    isLoading: false,
    error: null,
    isAuthenticated: true
  };

  // CRITICAL FIX: Ensure user record exists in database
  await this.ensureUserRecord(authUser);

  this.notifyListeners();
}

/**
 * Ensure user record exists in users table
 * @private
 */
private async ensureUserRecord(authUser: AuthUser): Promise<void> {
  try {
    // Check if user record already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('firebase_uid')
      .eq('firebase_uid', authUser.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user existence:', checkError);
      return;
    }

    // If user doesn't exist, create record
    if (!existingUser) {
      console.log('Creating user record in database:', authUser.email);
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          firebase_uid: authUser.id,
          email: authUser.email,
          full_name: authUser.fullName,
          created_at: authUser.createdAt,
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating user record:', insertError);
        // Don't throw error - auth should still work
      } else {
        console.log('User record created successfully');
      }
    } else {
      console.log('User record already exists');
    }
  } catch (error) {
    console.error('Failed to ensure user record:', error);
    // Don't throw error - auth should still work
  }
}
```

## 3. Health Check Edge Function

### File: `supabase/functions/health-check/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, Content-Type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Health check response
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'gmshoot-sota-demo',
      version: '1.0.0',
      uptime: Deno.pid ? 'process-running' : 'deno-runtime'
    };

    return new Response(
      JSON.stringify(healthData),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
```

## 4. Health Check Test Component

### File: `src/components/HealthCheckButton.tsx`

```typescript
import React, { useState } from 'react';
import { MagicButton } from './ui/magic-button';

interface HealthStatus {
  status: 'ok' | 'error' | 'loading';
  timestamp?: string;
  error?: string;
}

export const HealthCheckButton: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({ status: 'loading' });
  const [isLoading, setIsLoading] = useState(false);

  const checkHealth = async () => {
    setIsLoading(true);
    setHealthStatus({ status: 'loading' });

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setHealthStatus(data);
      
      console.log('Health check successful:', data);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Microservices Health Check</h3>
      
      <MagicButton 
        onClick={checkHealth} 
        loading={isLoading}
        disabled={isLoading}
      >
        Check Health Status
      </MagicButton>

      {healthStatus.status !== 'loading' && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Health Status:</h4>
          <div className={`p-3 rounded ${healthStatus.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p><strong>Status:</strong> {healthStatus.status}</p>
            {healthStatus.timestamp && (
              <p><strong>Timestamp:</strong> {new Date(healthStatus.timestamp).toLocaleString()}</p>
            )}
            {healthStatus.error && (
              <p><strong>Error:</strong> {healthStatus.error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

## 5. ESLint Fixes

### Common Issues to Fix:

1. **Import Order**: Ensure proper import ordering
2. **Unused Variables**: Remove unused imports and variables
3. **Accessibility**: Add proper ARIA labels
4. **Type Safety**: Fix any TypeScript errors

### Commands to Run:

```bash
# Run ESLint to identify issues
npm run lint

# Fix auto-fixable issues
npm run lint --fix

# Check for remaining issues manually
npm run lint
```

## 6. Implementation Sequence

### Step 1: Apply Database Migration
```bash
# Apply the critical user sync trigger migration
supabase db push supabase/migrations/010_auth_user_sync_trigger.sql
```

### Step 2: Update AuthService
- Modify `src/services/AuthService.ts` with user record creation logic
- Test authentication flow

### Step 3: Create Health Check Function
```bash
# Create and deploy health check edge function
supabase functions deploy health-check
```

### Step 4: Add Health Check UI
- Add `HealthCheckButton` component to demo page
- Test microservice connectivity

### Step 5: Fix ESLint Issues
- Run `npm run lint`
- Fix all reported errors and warnings
- Verify zero lint errors

## 7. Evidence Collection

### Auth Verification Evidence Required:
1. **Screenshot of browser console** showing successful Supabase SIGNED_IN event
2. **Screenshot of user redirect** to /demo page
3. **Database query result** showing user record in users table

### Microservice Health Check Evidence Required:
1. **Code of health-check function**
2. **Screenshot of network response** showing successful health check
3. **Screenshot of Health Check Button** working in UI

### ESLint Evidence Required:
1. **Console output** of `npm run lint` showing zero errors or warnings
2. **Before/after comparison** of fixed files

## 8. Success Criteria

### Phase 1 Complete When:
- ✅ User can sign in with email/password
- ✅ Supabase SIGNED_IN event appears in console
- ✅ User is redirected to /demo page
- ✅ User record exists in Supabase users table
- ✅ Health check endpoint returns {"status": "ok"}
- ✅ Health check button works in UI
- ✅ `npm run lint` shows zero errors or warnings

### Only Then Proceed to Phase 2:
- Real-Time Engine implementation
- Frame change detection
- Production sanity checks
- Core data flow fixes

---

**This critical fix addresses the foundational authentication issue that was preventing the entire application from working properly.**
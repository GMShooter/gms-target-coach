# GMShooter v2 - Database Schema Documentation

## Overview
GMShooter v2 uses Supabase as its backend database, which provides PostgreSQL database with real-time capabilities and built-in authentication.

## Database Tables

### 1. users
Stores user profile information and preferences.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  preferences JSONB DEFAULT '{}'
);
```

#### Indexes:
- `idx_users_email` on email
- `idx_users_firebase_uid` on firebase_uid
- `idx_users_created_at` on created_at

### 2. analysis_sessions
Stores video and camera analysis sessions.

```sql
CREATE TABLE analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200),
  description TEXT,
  session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('video', 'camera')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  video_url TEXT,
  video_metadata JSONB,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

#### Indexes:
- `idx_analysis_sessions_user_id` on user_id
- `idx_analysis_sessions_status` on status
- `idx_analysis_sessions_created_at` on created_at
- `idx_analysis_sessions_type` on session_type

### 3. analysis_results
Stores frame-by-frame analysis results.

```sql
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  frame_number INTEGER NOT NULL,
  frame_url TEXT,
  frame_timestamp FLOAT, -- Time in seconds from video start
  predictions JSONB NOT NULL, -- Roboflow API response
  accuracy_score FLOAT CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  target_count INTEGER DEFAULT 0,
  analysis_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Indexes:
- `idx_analysis_results_session_id` on session_id
- `idx_analysis_results_frame_number` on frame_number
- `idx_analysis_results_accuracy_score` on accuracy_score
- `idx_analysis_results_created_at` on created_at

### 4. reports
Stores generated analysis reports.

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  summary TEXT,
  overall_accuracy FLOAT CHECK (overall_accuracy >= 0 AND overall_accuracy <= 1),
  total_frames INTEGER DEFAULT 0,
  successful_detections INTEGER DEFAULT 0,
  report_data JSONB NOT NULL, -- Aggregated analysis data
  share_token VARCHAR(32) UNIQUE, -- For public sharing
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Indexes:
- `idx_reports_session_id` on session_id
- `idx_reports_share_token` on share_token
- `idx_reports_is_public` on is_public
- `idx_reports_created_at` on created_at

### 5. user_preferences
Stores user-specific preferences and settings.

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  preference_key VARCHAR(100) NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);
```

#### Indexes:
- `idx_user_preferences_user_id` on user_id
- `idx_user_preferences_key` on preference_key

## Storage Buckets

### 1. analysis-videos
Stores uploaded video files.

#### Bucket Policy:
```sql
-- Allow authenticated users to upload their own videos
CREATE POLICY "Users can upload their own videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'analysis-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to access their own videos
CREATE POLICY "Users can view their own videos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'analysis-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 2. analysis-frames
Stores extracted frame images.

#### Bucket Policy:
```sql
-- Allow authenticated users to access frames from their sessions
CREATE POLICY "Users can view their analysis frames" ON storage.objects
FOR SELECT USING (
  bucket_id = 'analysis-frames' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Database Functions

### 1. update_session_progress
Updates session progress and status.

```sql
CREATE OR REPLACE FUNCTION update_session_progress(
  session_id UUID,
  progress INTEGER,
  status VARCHAR(20) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE analysis_sessions
  SET 
    progress = progress,
    status = COALESCE(status, status),
    updated_at = NOW()
  WHERE id = session_id;
  
  IF progress = 100 AND status IS NULL THEN
    UPDATE analysis_sessions
    SET 
      status = 'completed',
      completed_at = NOW()
    WHERE id = session_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 2. calculate_session_accuracy
Calculates overall accuracy for a session.

```sql
CREATE OR REPLACE FUNCTION calculate_session_accuracy(session_id UUID)
RETURNS FLOAT AS $$
DECLARE
  avg_accuracy FLOAT;
BEGIN
  SELECT AVG(accuracy_score) INTO avg_accuracy
  FROM analysis_results
  WHERE session_id = calculate_session_accuracy.session_id;
  
  RETURN COALESCE(avg_accuracy, 0);
END;
$$ LANGUAGE plpgsql;
```

## Database Triggers

### 1. update_updated_at
Automatically updates updated_at columns.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_sessions_updated_at
  BEFORE UPDATE ON analysis_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Row Level Security (RLS)

### 1. users table
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
FOR SELECT USING (auth.uid() = firebase_uid);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE USING (auth.uid() = firebase_uid);
```

### 2. analysis_sessions table
```sql
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON analysis_sessions
FOR SELECT USING (user_id = auth.uid());

-- Users can create their own sessions
CREATE POLICY "Users can create sessions" ON analysis_sessions
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions" ON analysis_sessions
FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions" ON analysis_sessions
FOR DELETE USING (user_id = auth.uid());
```

### 3. analysis_results table
```sql
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Users can view results from their own sessions
CREATE POLICY "Users can view own results" ON analysis_results
FOR SELECT USING (
  session_id IN (
    SELECT id FROM analysis_sessions 
    WHERE user_id = auth.uid()
  )
);
```

### 4. reports table
```sql
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON reports
FOR SELECT USING (
  session_id IN (
    SELECT id FROM analysis_sessions 
    WHERE user_id = auth.uid()
  )
);

-- Anyone can view public reports via share token
CREATE POLICY "Public reports viewable by share token" ON reports
FOR SELECT USING (is_public = TRUE AND share_token IS NOT NULL);
```

## Database Migrations

### Initial Schema (202310200001_init.sql)
- Creates all tables
- Sets up RLS policies
- Creates initial indexes

### Future Migrations
- Add new features as needed
- Optimize queries with additional indexes
- Update policies for new functionality

## Performance Optimization

### Indexing Strategy
- Primary keys are automatically indexed
- Foreign keys have indexes for join performance
- Frequently queried columns have indexes
- Composite indexes for complex queries

### Query Optimization
- Use EXPLAIN ANALYZE for slow queries
- Implement pagination for large result sets
- Use materialized views for complex aggregations
- Cache frequently accessed data

### Connection Pooling
- Supabase provides connection pooling
- Monitor connection usage
- Implement query timeouts

## Backup Strategy

### Automated Backups
- Daily automated backups by Supabase
- Point-in-time recovery available
- Cross-region replication for disaster recovery

### Manual Backups
- Export schema and data before major changes
- Test restore procedures regularly
- Document backup procedures

## Monitoring

### Key Metrics
- Query performance
- Connection count
- Storage usage
- Row count growth

### Alerts
- Slow query alerts
- Storage capacity warnings
- Connection limit warnings
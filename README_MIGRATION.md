# GMShooter v2 - Migration Guide

This document outlines the migration from the original GMShooter codebase to the new v2 implementation.

## What's Been Migrated

### ✅ Components
- **IconBadge** - Reusable icon badge component with variants
- **CameraAnalysis** - Real-time camera analysis component
- **ReportList** - Session history and report listing
- **Report** - Detailed report view with analysis results

### ✅ Hooks
- **useCameraAnalysis** - Camera analysis state management and polling

### ✅ Backend Infrastructure
- **Supabase Edge Functions**:
  - `analyze-frame` - Roboflow API integration for target detection
  - `start-session` - Session initialization
  - `camera-proxy` - Real-time camera feed management
- **Database Schema** - Complete schema with RLS policies
- **Configuration** - Supabase configuration file

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the client directory based on `.env.example`:

```bash
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 2. Supabase Setup

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase**:
   ```bash
   cd client/supabase
   supabase init
   ```

3. **Start Local Development**:
   ```bash
   supabase start
   ```

4. **Apply Migrations**:
   ```bash
   supabase db push
   ```

5. **Deploy Functions**:
   ```bash
   supabase functions deploy --no-verify-jwt
   ```

### 3. Roboflow API Integration

Set up your Roboflow API key in the Supabase Edge Function secrets:

```bash
supabase secrets set ROBOFLOW_API_KEY=your_roboflow_api_key
```

### 4. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password and Google)
3. Copy the configuration to your environment variables
4. Update the Firebase configuration in `src/firebase.ts`

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   External      │
│                 │    │                 │    │   Services      │
│ React + TS      │◄──►│ Database +      │◄──►│ Roboflow API    │
│ Tailwind CSS    │    │ Edge Functions  │    │ Firebase Auth   │
│ shadcn/ui       │    │ Storage         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Features

### Video Analysis
- Upload and process shooting videos
- Frame-by-frame analysis using Roboflow
- Progress tracking and results display

### Camera Analysis
- Real-time camera feed processing
- Live shot detection and analysis
- Session management and recording

### Reporting
- Comprehensive session reports
- Performance metrics and coaching advice
- Historical data tracking

## Database Schema

### Core Tables
- `sessions` - Analysis sessions metadata
- `detections` - Individual shot detections
- `analysis_results` - Frame-by-frame analysis data
- `reports` - Generated reports

### Security
- Row Level Security (RLS) enabled
- User-based data isolation
- Secure API access through Supabase

## Development Workflow

1. **Local Development**:
   ```bash
   cd client
   npm start
   ```

2. **Supabase Local**:
   ```bash
   cd client/supabase
   supabase start
   ```

3. **Function Development**:
   ```bash
   supabase functions serve
   ```

## Testing

The migrated components maintain the same functionality as the original but with:
- TypeScript support
- Updated imports
- Enhanced error handling
- Consistent styling with the new design system

## Deployment

### Frontend
```bash
cd client
npm run build
```

### Backend
```bash
cd client/supabase
supabase db push
supabase functions deploy --no-verify-jwt
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS headers are properly configured in Edge Functions
2. **Authentication**: Check Firebase configuration and environment variables
3. **Database**: Verify Supabase connection and RLS policies
4. **Functions**: Check function logs for errors in Supabase Dashboard

### Debug Mode

Enable debug logging in Supabase config:
```toml
[edge_runtime]
log_level = "debug"
```

## Next Steps

1. Complete end-to-end testing
2. Add comprehensive unit tests
3. Implement CI/CD pipeline
4. Set up monitoring and analytics
5. Optimize performance and caching

## Original vs V2 Comparison

| Feature | Original | V2 | Status |
|---------|----------|----|---------|
| Video Analysis | ✅ | ✅ | Migrated |
| Camera Analysis | ✅ | ✅ | Migrated |
| Reports | ✅ | ✅ | Migrated |
| Authentication | ✅ | ✅ | Enhanced |
| UI/UX | Good | Modern | Improved |
| TypeScript | Partial | Full | Complete |
| Testing | Basic | Comprehensive | Planned |
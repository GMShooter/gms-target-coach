# GMShooter v2 - API Integration Requirements

## Overview
GMShooter v2 integrates with multiple external services to provide video and camera analysis capabilities.

## External APIs

### 1. Supabase
- **Purpose**: Backend database and storage
- **Base URL**: `https://avbwpuxhkyvfyonrpbqg.supabase.co`
- **Authentication**: JWT (anon key for client-side)
- **Client Configuration**:
  ```typescript
  import { createClient } from '@supabase/supabase-js'
  
  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  )
  ```

#### Tables:
- `analysis_sessions`: Stores video analysis sessions
- `analysis_results`: Stores frame-by-frame analysis results
- `users`: User profiles and preferences

#### Storage:
- `analysis-videos`: Bucket for uploaded video files
- `analysis-frames`: Bucket for extracted frames

#### Functions:
- `process-video`: Processes uploaded videos
- `analyze-frame`: Analyzes individual frames
- `generate-report`: Generates analysis reports

### 2. Firebase Authentication
- **Purpose**: User authentication and authorization
- **Configuration**:
  ```typescript
  import { initializeApp } from 'firebase/app'
  import { getAuth, GoogleAuthProvider } from 'firebase/auth'
  
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    // ... other config
  }
  ```

#### Authentication Methods:
- Email/Password
- Google OAuth
- Password reset

### 3. Roboflow API
- **Purpose**: Computer vision analysis for shooting target detection
- **Base URL**: `https://api.roboflow.com`
- **Authentication**: API Key
- **Model**: Target detection model
- **Endpoint**: `POST /{model_id}/{version}`

#### Request Format:
```typescript
const analyzeFrame = async (imageData: string) => {
  const response = await fetch('https://api.roboflow.com/{model_id}/{version}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_ROBOFLOW_API_KEY}`
    },
    body: JSON.stringify({
      image: imageData,
      confidence: 0.5,
      overlap: 0.5
    })
  })
  
  return response.json()
}
```

#### Response Format:
```typescript
interface RoboflowResponse {
  predictions: {
    x: number
    y: number
    width: number
    height: number
    confidence: number
    class: string
    class_id: number
  }[]
  image: {
    width: number
    height: number
  }
}
```

## Internal API Hooks

### useVideoAnalysis
```typescript
interface UseVideoAnalysisReturn {
  // State
  isUploading: boolean
  isProcessing: boolean
  progress: number
  results: AnalysisResult[]
  error: string | null
  videoFile: File | null
  sessionId: string | null
  
  // Functions
  uploadVideo: (file: File) => Promise<string | null>
  processVideo: (sessionId: string) => Promise<void>
  testWithFrames: () => Promise<void>
  resetState: () => void
}
```

### useCameraAnalysis
```typescript
interface UseCameraAnalysisReturn {
  // State
  isStreaming: boolean
  isAnalyzing: boolean
  currentFrame: string | null
  results: AnalysisResult[]
  error: string | null
  
  // Functions
  startCamera: () => Promise<void>
  stopCamera: () => void
  captureFrame: () => void
  analyzeFrame: (imageData: string) => Promise<void>
  resetState: () => void
}
```

## API Error Handling

### Supabase Errors
- Handle network errors with retry logic
- Display user-friendly error messages
- Log detailed errors for debugging

### Firebase Auth Errors
- Handle authentication failures
- Implement proper sign-out flow
- Manage user session persistence

### Roboflow API Errors
- Handle rate limiting (429)
- Process invalid image formats
- Handle API quota exceeded

## API Security

### Client-Side
- Use environment variables for API keys
- Implement request timeouts
- Validate input before sending

### Server-Side (Supabase Functions)
- Validate all incoming requests
- Implement rate limiting
- Use secure storage for sensitive data

## API Performance Optimization

### Caching Strategy
- Cache analysis results in Supabase
- Implement client-side caching for frequently accessed data
- Use CDN for static assets

### Request Optimization
- Batch multiple frame analyses
- Implement progressive loading
- Use compression for large payloads

## API Testing

### Unit Tests
- Mock external API responses
- Test error handling scenarios
- Verify request/response formats

### Integration Tests
- Test end-to-end API flows
- Verify authentication flows
- Test file upload/download

### Load Testing
- Test concurrent video uploads
- Verify API rate limits
- Monitor performance under load

## API Monitoring

### Metrics to Track
- Request/response times
- Error rates by endpoint
- User authentication success/failure
- Video processing times

### Alerting
- High error rates
- API quota exceeded
- Long processing times
- Authentication failures

## API Versioning

### Current Version: v1.0.0
- Initial API implementation
- Basic video and camera analysis
- Firebase authentication integration

### Future Versions
- v1.1.0: Enhanced analysis algorithms
- v1.2.0: Multi-user collaboration
- v2.0.0: Real-time analysis streaming
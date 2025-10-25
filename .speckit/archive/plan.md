# GMShoot v2 Technical Implementation Plan

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with MagicUI components
- **Routing**: React Router v6
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Authentication**: Supabase Auth (migrated from Firebase)
- **Build System**: Vite with custom transformers
- **Deployment**: Firebase Hosting

### Backend
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Real-time Communication**: Supabase Realtime & WebSockets
- **Serverless Functions**: Supabase Edge Functions
- **Hardware Communication**: WebSocket + REST API

### Hardware Integration
- **Device Platform**: Raspberry Pi 4
- **Camera System**: USB/CSI camera with 1080p@30fps
- **Network**: WiFi/Ethernet with ngrok tunneling
- **Communication**: WebSocket server on Pi
- **Processing**: On-device shot detection and frame analysis

### Third-party Services
- **QR Code Scanning**: qr-scanner library
- **Device Tunneling**: ngrok for dynamic URLs
- **Authentication**: Supabase Auth with Google OAuth
- **AI Coaching**: Gemini API (optional feature)

## Architecture

### Component Structure
```
src/
├── components/
│   ├── ui/              # Reusable UI components (MagicUI)
│   ├── LiveTargetView.tsx    # Real-time hardware feed
│   ├── QRScanner.tsx         # Device pairing interface
│   ├── SessionManager.tsx     # Session control interface
│   ├── HardwareStatusMonitor.tsx # Device status display
│   ├── SessionAnalyticsDashboard.tsx # Real-time statistics
│   ├── SessionHistory.tsx      # Historical session data
│   ├── SessionSharing.tsx       # Mobile mirroring
│   ├── HardwareErrorDisplay.tsx  # Error handling UI
│   └── HardwareTroubleshootingGuide.tsx # User guidance
├── hooks/
│   ├── useHardwareAPI.ts       # Hardware communication
│   ├── useHardwareAuth.ts       # Device authentication
│   ├── useSessionManager.ts     # Session lifecycle
│   ├── useSessionPersistence.ts  # Data persistence
│   ├── useSessionTimeout.ts     # Auto-cleanup
│   ├── useHardwareErrorHandler.ts # Error handling
│   ├── useWebSocket.ts         # Real-time communication
│   └── useAuth.tsx            # Authentication state
├── services/
│   ├── HardwareAPI.ts          # Pi server communication
│   ├── HardwareAuth.ts         # Device authentication
│   ├── GeometricScoring.ts     # Distance-based scoring
│   └── SequentialShotDetection.ts # Shot numbering
├── utils/
│   ├── supabase.ts           # Database client
│   └── env.ts                # Environment variables
└── App.tsx                    # Main application component
```

### Data Flow
1. User authenticates via Supabase Auth
2. QR scanner discovers Pi devices via ngrok URLs
3. HardwareAPI establishes WebSocket connection to Pi server
4. Real-time frame streaming and shot detection
5. SequentialShotDetection numbers shots using frame difference
6. GeometricScoring calculates scores based on distance
7. Session data stored in Supabase with real-time updates
8. Mobile mirroring via QR code generation for session access

### Hardware Communication Flow
1. QRScanner reads device connection details
2. HardwareAuth authenticates with Pi server using API keys
3. WebSocket connection established for real-time communication
4. Pi server streams video frames and shot detection data
5. SequentialShotDetection processes frames for shot numbering
6. GeometricScoring calculates scores for each detected shot
7. SessionManager tracks session state and statistics
8. Data persisted to Supabase with automatic recovery

### Authentication Flow
1. User authenticates via Supabase Auth (email/password or Google OAuth)
2. Auth state managed in React context with useAuth hook
3. Protected routes check authentication state
4. User profile synchronized with Supabase database
5. Hardware devices linked to user account for persistence

## Implementation Details

### Hardware API Integration
- Implement WebSocket client for Pi server communication
- Add QR code parsing for device discovery
- Create device authentication with API key management
- Handle connection failures and automatic reconnection
- Support multiple concurrent device connections

### Live Target View
- Implement real-time video display from hardware stream
- Add canvas overlay for shot visualization
- Create zoom controls and pan functionality
- Implement shot number and score overlay
- Add session controls (start/stop/pause/resume)

### Sequential Shot Detection
- Implement frame difference algorithm
- Add configurable sensitivity parameters
- Create shot confirmation through consecutive frames
- Handle false positive detection filtering
- Store shot coordinates and timing data

### Geometric Scoring
- Calculate distance-based scoring algorithms
- Implement perspective correction for camera angles
- Add distance compensation for target ranges
- Support multiple target types (competition, training, silhouette)
- Create session statistics and performance analysis

### QR Code Device Pairing
- Integrate qr-scanner library for device discovery
- Parse ngrok URLs and device credentials
- Implement device storage in user preferences
- Add device management interface
- Handle device switching and reconnection

### Session Management
- Create session lifecycle management
- Implement real-time statistics calculation
- Add session data persistence and recovery
- Create session history and comparison features
- Handle session timeout and auto-cleanup

### Mobile Mirroring
- Generate QR codes for mobile session access
- Implement responsive mobile interface
- Add real-time synchronization between devices
- Create mobile-specific controls and features
- Ensure touch-optimized interactions

### Gamification System
- Implement XP calculation based on performance
- Create achievement system with milestones
- Design talent tree with unlockable features
- Build leaderboard system for competition
- Add daily challenges and progress tracking

## Performance Optimizations

### Frontend
- Implement code splitting with React.lazy
- Optimize WebSocket communication for low latency
- Use React.memo for expensive components
- Implement virtual scrolling for session history
- Add hardware acceleration for video rendering

### Backend
- Optimize database queries with proper indexing
- Implement real-time data synchronization
- Use connection pooling for WebSocket connections
- Optimize Edge Functions for session data ingestion
- Add caching for frequently accessed data

### Hardware Communication
- Implement efficient frame compression
- Use binary protocols for shot detection data
- Add adaptive quality based on network conditions
- Implement local caching for connection interruptions
- Optimize for sub-100ms latency requirements

## Security Considerations

### Authentication
- Implement secure session management
- Add rate limiting for authentication attempts
- Use secure storage for API keys
- Implement proper device authorization
- Add session timeout and cleanup

### Hardware Security
- Encrypt all communication with Pi devices
- Implement device authentication with API keys
- Add device authorization and revocation
- Use secure tunneling for remote access
- Protect against unauthorized device access

### Data Protection
- Encrypt sensitive data in transit and at rest
- Implement proper access controls
- Add input validation and sanitization
- Use secure CORS policies
- Protect user privacy and shooting data

## Testing Strategy

### Unit Tests
- Test hardware communication protocols
- Test shot detection algorithms
- Test geometric scoring calculations
- Test session management logic
- Test authentication and authorization
- Achieve >90% code coverage

### Integration Tests
- Test hardware pairing workflows
- Test real-time data synchronization
- Test session persistence and recovery
- Test error handling and recovery
- Test mobile mirroring functionality

### End-to-End Tests
- Test complete shooting sessions
- Test device discovery and pairing
- Test mobile mirroring workflows
- Test gamification features
- Test cross-browser compatibility

### Hardware Testing
- Test with actual Raspberry Pi devices
- Test connection stability and reconnection
- Test shot detection accuracy
- Test real-time performance requirements
- Test mobile device compatibility

## Deployment Strategy

### Development Environment
- Local development with Vite hot reloading
- Mock hardware API for development without devices
- Local Supabase instance for development
- Test QR code generation and scanning
- Simulate hardware connections for testing

### Production Environment
- Deploy to Firebase Hosting with CI/CD
- Use environment-specific configurations
- Implement monitoring and error tracking
- Set up hardware infrastructure monitoring
- Create deployment documentation

### Hardware Deployment
- Automated Pi server deployment scripts
- Remote device management and updates
- Monitoring for device health and status
- Backup and recovery procedures
- Security updates and maintenance
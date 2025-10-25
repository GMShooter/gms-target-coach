# GMShoot v2 Application Specification

## Overview
GMShoot v2 is a hardware-first shooting analysis application that integrates with Raspberry Pi hardware for real-time shooting analysis. The application has pivoted from web-centric video analysis to hardware-integrated shooting analysis with QR code device pairing, real-time target visualization, and geometric scoring algorithms.

## User Stories

### Hardware Integration
- As a shooter, I want to pair my shooting system with the web app via QR code scanning
- As a shooter, I want to see a real-time live feed from my target camera
- As a shooter, I want the app to automatically detect and number my shots sequentially
- As a shooter, I want to receive accurate scoring based on geometric distance calculations
- As a shooter, I want to start and stop shooting sessions with a single click

### Device Management
- As a user, I want to discover and pair with Raspberry Pi devices automatically
- As a user, I want to manage multiple paired devices and switch between them
- As a user, I want to see connection status and battery life of my devices
- As a user, I want to troubleshoot connection issues with guided help

### Session Management
- As a shooter, I want to create shooting sessions that track all my shots
- As a shooter, I want to see real-time statistics during my session (accuracy, grouping, consistency)
- As a shooter, I want to pause and resume sessions without losing data
- As a shooter, I want to review my session history and compare performance over time

### Analysis and Feedback
- As a shooter, I want to see visual overlays showing where each shot landed on target
- As a shooter, I want to receive immediate feedback on shot accuracy and score
- As a shooter, I want to see shot grouping analysis and consistency metrics
- As a shooter, I want to receive personalized recommendations based on my performance

### Mobile Integration
- As a mobile user, I want to scan a QR code to mirror the session on my phone
- As a mobile user, I want to see real-time updates on my mobile device while shooting
- As a mobile user, I want to control session features from my mobile device

### Gamification (WoW-style)
- As a shooter, I want to earn experience points (XP) for completing sessions
- As a shooter, I want to unlock achievements for reaching milestones (accuracy streaks, improvement)
- As a shooter, I want to progress through a talent tree unlocking new features
- As a shooter, I want to compare my performance with other shooters on leaderboards

### Admin Features
- As an administrator, I want to access video analysis features for advanced coaching
- As an administrator, I want to manage user accounts and system settings
- As an administrator, I want to view system analytics and performance metrics

## Functional Requirements

### Hardware API Integration
- Implement WebSocket connection to Raspberry Pi server
- Support QR code scanning for device discovery and pairing
- Handle device authentication with API keys
- Manage real-time data streaming from hardware
- Implement automatic reconnection for dropped connections

### Live Target View
- Display real-time video feed from target camera
- Overlay shot detection visualization on target
- Show shot numbers and scores in real-time
- Implement zoom controls for detailed target viewing
- Add session controls (start/stop/pause)

### Sequential Shot Detection
- Implement frame difference algorithm for shot detection
- Number shots sequentially within sessions
- Detect shot confirmation through multiple consecutive frames
- Handle false positive detection with configurable sensitivity
- Store shot coordinates and timestamps

### Geometric Scoring
- Calculate shot scores based on distance from target center
- Apply perspective correction for camera angles
- Compensate for target distance and size
- Support multiple target types (competition, training, silhouette)
- Provide instant score feedback

### Session Management
- Create, start, stop, and resume shooting sessions
- Track session metadata (date, location, weather conditions)
- Store complete shot history with coordinates and scores
- Calculate session statistics (accuracy, consistency, improvement)
- Implement session data persistence and recovery

### QR Code Device Pairing
- Scan QR codes containing device connection information
- Parse ngrok tunnel URLs and device credentials
- Store paired devices in user preferences
- Manage device connection status and switching
- Handle device discovery and automatic pairing

### Mobile Mirroring
- Generate QR codes for mobile session access
- Implement responsive mobile interface
- Provide real-time synchronization between desktop and mobile
- Add mobile-specific controls and features
- Ensure touch-optimized interactions

### Gamification System
- Implement XP calculation based on session performance
- Create achievement system with milestones and badges
- Design talent tree with unlockable features
- Build leaderboard system for competition
- Add daily challenges and goals

## Non-Functional Requirements

### Performance
- Real-time hardware feed latency under 100ms
- Shot detection response time under 200ms
- Page load times under 3 seconds
- Animations running at 60fps
- Support for concurrent multiple device connections

### Reliability
- Automatic reconnection for dropped hardware connections
- Data persistence during network interruptions
- Graceful degradation when hardware is unavailable
- Error recovery and user guidance
- Session data backup and restore

### Usability
- Intuitive hardware pairing process
- Clear visual feedback for all interactions
- Responsive design for all device sizes
- Accessibility compliance (WCAG 2.1 AA)
- Progressive disclosure of advanced features

### Security
- Secure device authentication with API keys
- Encrypted communication with hardware devices
- User data protection and privacy
- Secure session management
- Protection against unauthorized device access

## Design Requirements

### Visual Design
- Dark theme optimized for shooting range environments
- High contrast elements for outdoor visibility
- Consistent use of GMShoot branding
- Modern, professional appearance
- Clear visual hierarchy for information display

### Interactive Elements
- Large, touch-friendly buttons for mobile use
- Clear visual feedback for hardware status
- Smooth animations and transitions
- Intuitive gesture controls for mobile
- Keyboard shortcuts for power users

### Data Visualization
- Real-time shot overlay on target
- Interactive session statistics charts
- Progress indicators for achievements
- Visual feedback for performance trends
- Clear score display with color coding

## Technical Constraints

### Hardware Requirements
- Raspberry Pi 4 or equivalent
- Camera capable of 1080p video at 30fps
- Network connectivity (WiFi or Ethernet)
- Support for ngrok tunneling or equivalent
- Minimum 2GB RAM and 16GB storage

### Browser Compatibility
- Modern browsers with WebSocket support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile browsers with camera and QR scanning support
- Progressive enhancement for older browsers

### Network Requirements
- Minimum 1Mbps upload speed for video streaming
- Stable connection for real-time communication
- Support for WebSocket connections
- Fallback options for poor connectivity
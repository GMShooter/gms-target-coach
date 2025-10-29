# SOTA Demo MVP Sprint Tasks

## Phase 1: Project Cleansing & Focus (Day 1)

### 1.1 Git Branch Setup
- [ ] Create and check out new git branch named `feature/sota-demo-mvp`

### 1.2 Create Workflow Files
- [x] Create `.kilocode/workflows/sota-demo-plan.md`
- [ ] Create `.kilocode/workflows/sota-demo-tasks.md`

### 1.3 Archive Non-Essential Code
- [ ] Create `archive/` directory at root level
- [ ] Move non-essential pages from `src/pages/` to `archive/`:
  - [ ] Move `About.tsx`
  - [ ] Move `ConnectPage.tsx`
  - [ ] Move `HistoryPage.tsx`
  - [ ] Move `Home.tsx`
  - [ ] Move `ReportPage.tsx`
  - [ ] Move `SessionPage.tsx`
  - [ ] Keep only `LoginPage.tsx`
- [ ] Move non-essential components from `src/components/` to `archive/`:
  - [ ] Move `Report.tsx`
  - [ ] Move `SessionHistory.tsx`
  - [ ] Move `VideoAnalysis.tsx`
  - [ ] Move `QRScanner.tsx`
  - [ ] Move `SessionAnalyticsDashboard.tsx`
  - [ ] Move `SessionManager.tsx`
  - [ ] Move `SessionPersistenceManager.tsx`
  - [ ] Move `SessionSharing.tsx`
  - [ ] Move `SessionTimeoutManager.tsx`
  - [ ] Move `TargetVisualization.tsx`
  - [ ] Move `TestTailwind.tsx`
  - [ ] Keep `ui/` directory
  - [ ] Keep `layout/` directory
  - [ ] Keep `LiveTargetView.tsx`
- [ ] Move non-essential hooks from `src/hooks/` to `archive/`:
  - [ ] Move `useAnalysisQuery.ts`
  - [ ] Move `useCameraAnalysis.ts`
  - [ ] Move `useHardware.ts`
  - [ ] Move `useHardwareAPI.ts`
  - [ ] Move `useHardwareAuth.ts`
  - [ ] Move `useHardwareErrorHandler.ts`
  - [ ] Move `useHardwareQuery.ts`
  - [ ] Move `useWebSocket.ts`
  - [ ] Keep `useAuth.tsx`
  - [ ] Keep `useAuthQuery.tsx`
- [ ] Move testing directories to `archive/`:
  - [ ] Move entire `.storybook/` directory
  - [ ] Move most Cypress tests from `cypress/e2e/` to `archive/`
  - [ ] Keep only essential test files for demo flow

## Phase 2: Foundation Stabilization (Day 2)

### 2.1 Database Schema Fixes
- [ ] Locate migration file for UUID vs VARCHAR fix
- [ ] Ensure `auth.uid()::text = firebase_uid` is in place
- [ ] Apply migration using Supabase CLI/MCP

### 2.2 Authentication Stabilization
- [ ] Remove all Firebase authentication code from `src/hooks/useAuth.tsx`
- [ ] Remove all mock authentication logic
- [ ] Ensure Supabase email/password sign-in flow works
- [ ] Verify new user record creation in database
- [ ] Implement redirect to `/demo` route on successful login
- [ ] Create new empty `LiveDemoPage.tsx` at `/demo` route

### 2.3 Testing Authentication Flow
- [ ] Test user registration
- [ ] Test user login
- [ ] Test redirect to demo page
- [ ] Verify database user record creation

## Phase 3: Real-Time Metrics Engine (Days 3-4)

### 3.1 Remove Mock Implementations
- [ ] Delete `src/services/MockHardwareAPI.ts`
- [ ] Delete `src/services/MockAnalysisService.ts`
- [ ] Remove all environment-based mock switching logic (`VITE_USE_MOCK_...`)
- [ ] Clean up mock logic from all hooks and services

### 3.2 Create Live Analysis Hook
- [ ] Create `src/hooks/useLiveAnalysis.ts`
- [ ] Implement session state management
- [ ] Add shot list state management
- [ ] Implement `fetchAndAnalyzeNextFrame` function
- [ ] Chain real API calls: camera-proxy -> analyze-frame -> Roboflow
- [ ] Integrate `SequentialShotDetection.ts` logic
- [ ] Integrate `GeometricScoring.ts` for metrics calculation
- [ ] Implement real-time metrics updates
- [ ] Return necessary data for UI (current frame, shot overlays, metrics)

### 3.3 Test Real-Time Engine
- [ ] Test frame fetching
- [ ] Test analysis pipeline
- [ ] Test shot detection
- [ ] Test metrics calculation
- [ ] Test real-time updates

## Phase 4: The "Wow Effect" UI (Days 5-6)

### 4.1 Create Demo Page Structure
- [ ] Create `src/pages/LiveDemoPage.tsx`
- [ ] Implement two-panel layout (70% left, 30% right)
- [ ] Add route configuration for `/demo`

### 4.2 Implement Left Panel - Live Target View
- [ ] Integrate `LiveTargetView` component
- [ ] Connect to `useLiveAnalysis` hook
- [ ] Display live target feed
- [ ] Render shot overlays
- [ ] Add real-time frame updates

### 4.3 Implement Right Panel - Metrics Dashboard
- [ ] Use shadcn/ui Card and Table components
- [ ] Display key metrics (MPI, Group Size) with large typography
- [ ] Implement number animations on change
- [ ] Use AnimatedList from MagicUI for shot log
- [ ] Integrate charts.tsx for score trend
- [ ] Add shimmer-button for "Start Session"

### 4.4 UI Polish and Animation
- [ ] Add smooth transitions
- [ ] Implement loading states
- [ ] Add error handling UI
- [ ] Optimize for responsiveness
- [ ] Add micro-interactions

### 4.5 UI Testing
- [ ] Test component rendering
- [ ] Test real-time updates
- [ ] Test user interactions
- [ ] Test responsive design
- [ ] Capture screenshot for deliverable

## Phase 5: Deploy to Production (Day 7)

### 5.1 Production Configuration
- [ ] Configure production environment variables
- [ ] Set up Supabase URL/Key for production
- [ ] Set up Roboflow Key for production
- [ ] Use Firebase MCP server for configuration management

### 5.2 Production Build
- [ ] Run `npm run build`
- [ ] Verify build success
- [ ] Check for build warnings/errors
- [ ] Optimize build output

### 5.3 Deploy to Firebase Hosting
- [ ] Use Firebase MCP server for deployment
- [ ] Deploy contents of build directory
- [ ] Verify deployment success
- [ ] Test deployed application

### 5.4 Final Deliverable
- [ ] Report back with live URL
- [ ] Provide deployment summary
- [ ] Document any issues
- [ ] Prepare stakeholder demo guide

## Daily Reporting Requirements

### End of Day 1
- [ ] Report project cleansing completion
- [ ] List archived files
- [ ] Confirm clean workspace

### End of Day 2
- [ ] Report database fixes applied
- [ ] Confirm authentication flow working
- [ ] Provide demo page access confirmation

### End of Day 3-4
- [ ] Report real-time engine progress
- [ ] Confirm mock removal completion
- [ ] Provide hook functionality status

### End of Day 5-6
- [ ] Report UI implementation progress
- [ ] Provide screenshot of completed UI
- [ ] Confirm "wow effect" achieved

### End of Day 7
- [ ] Report production deployment
- [ ] Provide live URL
- [ ] Confirm stakeholder access
- [ ] Complete sprint summary

## Blocker Escalation Process

### Critical Blockers
1. Database migration failures
2. Authentication system breakdown
3. Real-time engine not functioning
4. UI components not rendering
5. Deployment failures

### Escalation Steps
1. Immediate notification to project lead
2. Detailed error documentation
3. Proposed solution options
4. Estimated impact on timeline
5. Backup plan activation

## Success Metrics

### Technical Metrics
- [ ] Authentication success rate: 100%
- [ ] Real-time analysis latency: <500ms
- [ ] UI rendering performance: 60fps
- [ ] Build success rate: 100%
- [ ] Deployment success rate: 100%

### User Experience Metrics
- [ ] Login to demo time: <10 seconds
- [ ] Real-time update smoothness: No lag
- [ ] Visual polish: "Wow effect" achieved
- [ ] Mobile responsiveness: Fully functional
- [ ] Cross-browser compatibility: Chrome, Safari, Firefox

### Business Metrics
- [ ] Stakeholder approval: Obtained
- [ ] Demo readiness: Confirmed
- [ ] Production stability: 99.9% uptime
- [ ] User feedback: Positive
- [ ] Technical debt: Minimal
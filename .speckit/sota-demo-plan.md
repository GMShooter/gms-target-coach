# SOTA Demo MVP Sprint Plan

## Mission Objective
Build and deploy a hyper-focused, single-screen application that proves our core technology is real, functional, and impressive. Achieve the "Steve Jobs wow effect" through ruthless focus on core user experience.

## Sprint Timeline: 7 Days

### Phase 1: Project Cleansing & Focus (Day 1)
**Objective**: Ruthlessly archive all code not essential for single-screen demo. A clean workspace is a fast workspace.

**Key Activities**:
- Create archive/ directory for non-essential code
- Move non-essential pages, components, hooks, and tests to archive
- Keep only essential components for live demo view
- Establish clean, focused development environment

### Phase 2: Foundation Stabilization (Day 2)
**Objective**: Build our demo on solid ground. Fix critical database and authentication issues.

**Key Activities**:
- Fix database schema UUID vs VARCHAR type mismatch
- Remove all Firebase authentication code and mock logic
- Ensure Supabase email/password flow works perfectly
- Implement redirect to /demo route on successful login

### Phase 3: Real-Time Metrics Engine (Days 3-4)
**Objective**: Bring the "magic" to life. Build stateful, real-time analysis engine.

**Key Activities**:
- Delete all mock API services and switching logic
- Create useLiveAnalysis.ts hook for session state management
- Implement real API call chain: camera-proxy -> analyze-frame -> Roboflow
- Integrate SequentialShotDetection and GeometricScoring logic
- Calculate and update metrics in real-time

### Phase 4: The "Wow Effect" UI (Days 5-6)
**Objective**: Build a single, beautiful, and highly polished screen to demonstrate our SOTA technology.

**Key Activities**:
- Create LiveDemoPage.tsx with two-panel layout
- Implement LiveTargetView with shot overlays (70% width)
- Build Live SOTA Metrics dashboard (30% width)
- Add animated metrics, shot log, and score trend charts
- Integrate MagicUI components for polish

### Phase 5: Deploy to Production (Day 7)
**Objective**: Deploy SOTA Demo MVP to Firebase Hosting for stakeholders to review.

**Key Activities**:
- Configure production environment variables
- Run production build
- Deploy to Firebase Hosting
- Deliver live URL for stakeholder review

## Success Criteria
- User can sign in and land on /demo page
- Real-time analysis works with actual hardware/API integration
- Beautiful, polished UI with "wow effect"
- Successfully deployed to production
- Stakeholder approval of demo quality

## Risk Mitigation
- Daily progress reports to maintain focus
- Immediate issue escalation for blockers
- Backup plans for critical dependencies
- Regular stakeholder communication
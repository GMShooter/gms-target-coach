# GMShoot v2 Relaunch Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for the GMShoot v2 relaunch, following the hardware-first analysis pipeline specification. The plan is structured in 5 phases, with Phase 1 being critical blocking prerequisites that must be completed before any user story implementation.

## Current State Analysis

Based on the codebase analysis:

**✅ Already Implemented:**
- Basic MagicUI components and utilities
- HardwareAPI service with extensive functionality
- Supabase configuration and migrations
- Authentication system
- Basic routing structure
- Some existing components (QRScanner, LiveTargetView, etc.)

**⚠️ Needs Attention:**
- Environment variables configuration (using REACT_APP_ prefix instead of VITE_)
- Supabase security and performance warnings (partially addressed in migration 007)
- Component integration with MagicUI/shadcn/ui
- Proper page structure and routing for hardware workflow
- End-to-end testing setup

## Phase 1: Foundation & Triage (Blocking Prerequisites)

**Purpose**: Create stable, secure, and visually correct baseline
**Critical**: No user story work can begin until this phase is complete

### T001: Environment Variables Audit
**Current Issue**: `.env.example` uses `REACT_APP_` prefix but Vite expects `VITE_`
**Files to Modify**:
- `vite.config.ts` - Ensure proper environment variable loading
- `.env.example` - Update to use `VITE_` prefix
- `src/utils/env.ts` - Create environment variable utilities

**Expected Outcome**: All environment variables load correctly in development and production

### T002: Supabase Security Warnings Resolution
**Current State**: Migration 007 addresses RLS performance but may not cover all security warnings
**Actions**:
- Review Supabase dashboard for remaining security warnings
- Create new migration if needed
- Ensure all RLS policies are properly restrictive

### T003: Supabase Performance Warnings Resolution
**Current State**: Migration 007 addresses auth_rls_initplan warnings
**Actions**:
- Verify all performance warnings are resolved
- Test RLS policy performance with sample data
- Add missing indexes if needed

### T004: MagicUI & shadcn/ui Integration
**Current State**: Basic MagicUI exists, needs full shadcn/ui integration
**Actions**:
- Install missing shadcn/ui components
- Update `components.json` configuration
- Ensure consistent styling across all components

### T005: Core App Layout Build
**Current State**: App.tsx has basic layout, needs professional redesign
**Actions**:
- Create `src/components/layout/AppLayout.tsx`
- Implement responsive header with navigation
- Add proper content areas for different page types
- Integrate MagicDock navigation

### T006: Login Page Rebuild
**Current State**: MagicLogin component exists, needs integration with new layout
**Actions**:
- Update `src/pages/LoginPage.tsx` (create if doesn't exist)
- Ensure MagicUI components are properly used
- Add proper error handling and validation
- Integrate with new AppLayout

## Phase 2: User Story 1 - Connect and View First Analysis (MVP)

**Goal**: End-to-end hardware connection and first analyzed shot
**Success Criteria**: Cypress test passes, core value demonstrable

### T007-T008: Cypress Test Setup
**Files to Create**:
- `cypress/e2e/hardware-session.cy.ts`
- Test fixtures for Pi Server responses
- Test fixtures for Supabase analyze-frame function

**Test Scenarios**:
1. QR code scanning simulation
2. Hardware connection establishment
3. Live feed display
4. Shot detection and analysis overlay
5. Error handling for invalid QR codes

### T009: Hardware API Service Implementation
**Current State**: HardwareAPI.ts is extensive but may need updates for spec compliance
**Actions**:
- Review and update `startSession` and `getLatestFrame` methods
- Ensure proper error handling and retry logic
- Add ngrok URL handling from QR codes
- Implement proper authentication flow

### T010: Secure Roboflow Proxy
**Current State**: `supabase/functions/analyze-frame/index.ts` exists and looks correct
**Actions**:
- Verify ROBOFLOW_API_KEY is properly configured as secret
- Test the Edge Function locally
- Ensure proper error handling and logging
- Add request validation and rate limiting if needed

### T011: QR Scanner Component
**Current State**: QRScanner component exists, needs integration with hardware workflow
**Actions**:
- Update `src/components/QRScanner.tsx` to use MagicUI
- Implement proper QR code parsing for GMShoot format
- Add global state management for ngrok URL (Zustand or Context)
- Handle invalid QR codes with proper error messages

### T012: Hardware State Hook
**Files to Create/Update**:
- `src/hooks/useHardware.ts` - Create or update existing
- Manage polling for new frames
- Handle analysis function invocation
- Manage connection state and error handling
- Integrate with global state manager

### T013: Live View Component
**Current State**: LiveTargetView exists, needs enhancement for spec compliance
**Actions**:
- Update `src/components/LiveTargetView.tsx` with MagicUI
- Implement canvas overlay for analysis results
- Add real-time frame polling
- Handle connection status and error states
- Display shot coordinates and scores as overlay

### T014: Pages and Routing
**Files to Create/Update**:
- `src/pages/ConnectPage.tsx` - Create for QR scanning
- `src/pages/SessionPage.tsx` - Update for live view
- Update App.tsx routing for hardware workflow
- Ensure proper navigation between pages

## Phase 3: User Story 2 - Manage Full Shooting Session

### T015: Database Schema for Sessions
**Current State**: Analysis tables exist, verify against spec requirements
**Actions**:
- Review existing tables vs spec requirements
- Create migration if `sessions` and `shots` tables don't match spec
- Ensure proper foreign key relationships
- Add indexes for performance

### T016: Session Control UI
**Actions**:
- Add Start/End Session buttons to SessionPage
- Implement session status display
- Add session controls to MagicDock if needed
- Ensure proper state management

### T017: Session State Management
**Actions**:
- Enhance useHardware.ts or create useSession.ts
- Manage session states: 'idle', 'active', 'ended'
- Track active session_id
- Handle session persistence and recovery

### T018: Backend Logic for Sessions
**Actions**:
- Implement session creation in Supabase
- Add shot recording logic after analysis
- Ensure proper data relationships
- Handle session lifecycle events

### T019: Real-time Stats UI
**Files to Create**:
- `src/components/SessionAnalyticsDashboard.tsx`
- Display running shot count
- Show session duration
- Add real-time performance metrics
- Use MagicUI components for consistency

## Phase 4: User Story 3 - Review Past Session Performance

### T020: History Page UI
**Files to Create/Update**:
- `src/pages/HistoryPage.tsx` - Create or update
- Display sessions list using Card components
- Add filtering and sorting options
- Implement pagination if needed

### T021: Data Fetching for History
**Actions**:
- Implement Supabase queries for user sessions
- Add proper error handling and loading states
- Cache data for performance
- Handle empty states gracefully

### T022: Report Page UI
**Files to Create**:
- `src/pages/ReportPage.tsx` - Create
- Display session details and shot data
- Add export functionality
- Ensure responsive design

### T023: Data Fetching for Report
**Actions**:
- Fetch shots by session_id from URL
- Include analysis results and metadata
- Handle data transformation for display
- Add error handling for invalid session IDs

### T024: Data Visualization
**Actions**:
- Create target graphic component
- Plot shot coordinates as points
- Implement scoring zone visualization
- Add interactive features (hover for details)
- Use canvas or SVG for rendering

## Phase 5: Polish & Deployment

### T025: Documentation
**Files to Create/Update**:
- `README.md` - Comprehensive setup guide
- `DEPLOYMENT.md` - Deployment instructions
- API documentation for hardware integration
- Troubleshooting guide

### T026: CI/CD Pipeline
**Files to Update**:
- `.github/workflows/ci.yml` - Fix or create
- Add Cypress E2E tests to pipeline
- Ensure production builds work correctly
- Add deployment automation

### T027: Final Review
**Actions**:
- Test on desktop and mobile devices
- Verify responsiveness and accessibility
- Performance testing with Lighthouse
- Security review and testing

### T028: Deploy Application
**Actions**:
- Deploy to Firebase Hosting
- Configure environment variables in production
- Test all features in live environment
- Set up monitoring and error tracking

## Implementation Strategy

### Development Approach
1. **Phase 1 First**: Complete all foundation tasks before proceeding
2. **Parallel Development**: Tasks marked [P] can be done simultaneously
3. **Test-Driven**: Write failing tests first, then implement
4. **Incremental**: Each phase should produce a working increment

### Key Technical Decisions

#### State Management
- Use React Context for global hardware state
- Consider Zustand for complex state if needed
- Ensure state persistence across page refreshes

#### Error Handling
- Implement comprehensive error boundaries
- User-friendly error messages
- Graceful degradation for hardware issues

#### Performance
- Lazy loading for heavy components
- Optimized re-renders with React.memo
- Efficient polling strategies for hardware data

#### Security
- Never expose API keys to client
- Proper authentication for hardware communication
- Validate all inputs and QR codes

### Risk Mitigation

#### Hardware Dependencies
- Mock hardware responses for development/testing
- Fallback UI when hardware unavailable
- Clear error messages for connection issues

#### Performance Risks
- Monitor frame polling frequency
- Implement efficient data structures
- Use WebSockets for real-time updates where possible

#### Testing Challenges
- Use cy.intercept() for hardware simulation
- Create comprehensive test fixtures
- Test error scenarios and edge cases

## Success Metrics

### Phase 1 Success Criteria
- [ ] All environment variables load correctly
- [ ] Zero Supabase security warnings
- [ ] Zero Supabase performance warnings
- [ ] MagicUI components integrated throughout
- [ ] Professional login page and layout

### Phase 2 Success Criteria
- [ ] Cypress test for hardware workflow passes
- [ ] QR code scanning works with mock data
- [ ] Live feed displays with analysis overlay
- [ ] End-to-end latency < 2 seconds

### Phase 3 Success Criteria
- [ ] Sessions can be started/stopped
- [ ] All shots are recorded and numbered
- [ ] Real-time stats display correctly
- [ ] Data persists in Supabase

### Phase 4 Success Criteria
- [ ] History page lists all past sessions
- [ ] Report pages show detailed shot analysis
- [ ] Data visualization renders correctly
- [ ] Navigation between views works smoothly

### Phase 5 Success Criteria
- [ ] Lighthouse score 90+ for Performance/Accessibility
- [ ] CI/CD pipeline runs successfully
- [ ] Application deployed and functional
- [ ] Documentation is complete and accurate

## Next Steps

1. **Begin Phase 1**: Start with T001 environment variables audit
2. **Setup Development**: Ensure proper development environment
3. **Parallel Work**: Once foundation is complete, work on multiple Phase 2 tasks simultaneously
4. **Regular Testing**: Run Cypress tests frequently during development
5. **Continuous Integration**: Commit and test each phase completion

This plan provides a clear roadmap for the GMShoot v2 relaunch, ensuring all requirements are met while building upon the existing codebase effectively.
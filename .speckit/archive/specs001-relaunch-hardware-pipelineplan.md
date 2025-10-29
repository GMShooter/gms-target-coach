# Implementation Plan: GMShoot v2 Relaunch: Hardware-First Analysis Pipeline

**Branch**: `001-relaunch-hardware-pipeline` | **Date**: 2023-10-26 | **Spec**: `/specs/001-relaunch-hardware-pipeline/spec.md`

## Summary

This plan outlines the full relaunch of the GMShoot v2 application. We will build a stable, secure, and visually compelling hardware-first analysis platform. The core technical approach involves a React frontend communicating with a Python-based Raspberry Pi server (via ngrok), which sends frames to a secure Supabase Edge Function that proxies analysis requests to the Roboflow API.

## Technical Context

**Language/Version**: TypeScript (React 18+ with Vite), Python 3.9+ (on Pi), Deno (for Supabase Functions)
**Primary Dependencies**: React, Vite, Supabase-js, Tailwind CSS, shadcn/ui, MagicUI, Cypress, Jest
**Storage**: Supabase (PostgreSQL) for session and shot data.
**Testing**: Jest/RTL for component tests, Cypress for End-to-End (E2E) tests.
**Target Platform**: Modern Web Browsers (Chrome, Firefox, Safari), Raspberry Pi 4 for the hardware server.
**Project Type**: Web Application
**Performance Goals**: < 2-second feedback loop for shot analysis. UI interactions at 60 fps.
**Constraints**: Roboflow API key must remain secure on the backend. The application must be resilient to intermittent hardware connection drops.
**Scale/Scope**: Initial scope is for single-user sessions, with a foundation for future multi-user features.

## Constitution Check

*This project aligns with our constitution by prioritizing a user-focused, secure, and high-performance implementation. All new development will adhere to the defined technical standards.*

## Project Structure

### Documentation (this feature)

```text
specs/001-relaunch-hardware-pipeline/
├── spec.md              # The feature specification you are reading
├── plan.md              # This file
└── tasks.md             # The detailed task breakdown for implementation
Source Code (repository root)
code
Text
# Web application structure
supabase/
├── functions/
│   └── analyze-frame/   # Secure Roboflow proxy
└── migrations/          # New database schema for sessions/shots

src/
├── components/
│   ├── ui/              # shadcn/ui and MagicUI components
│   ├── layout/          # The new AppLayout component
│   ├── LiveTargetView.tsx # Core component for the live session
│   └── QRScanner.tsx      # Component for hardware pairing
├── pages/
│   ├── LoginPage.tsx
│   ├── ConnectPage.tsx
│   ├── SessionPage.tsx
│   └── HistoryPage.tsx
├── services/
│   └── HardwareAPI.ts     # Client-side API for talking to the Pi server
├── hooks/
│   └── useHardware.ts     # Hook to manage state for the hardware connection
└── __tests__/

cypress/
└── e2e/
    └── hardware-session.cy.ts # New E2E test for the core workflow
Structure Decision: We will use the Web Application structure. The src directory contains the React frontend code. The supabase directory contains all backend code, including Edge Functions (functions/) and database schema changes (migrations/). This cleanly separates frontend and backend concerns.
Complexity Tracking
N/A - This plan establishes the baseline and does not violate the constitution.
code
Code
---

### File 3: `/specs/001-relaunch-hardware-pipeline/tasks.md`

```markdown
# Tasks: GMShoot v2 Relaunch: Hardware-First Analysis Pipeline

**Input**: Design documents from `/specs/001-relaunch-hardware-pipeline/`
**Prerequisites**: `plan.md`, `spec.md`

## Format: `[ID] [P?] [Story] Description`

-   **[P]**: Can run in parallel
-   **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Foundation & Triage (Blocking Prerequisites)

**Purpose**: Create a stable, secure, and visually correct baseline before implementing any user stories.
**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

-   [ ] T001 [P] [Foundation] **Fix Environment Variables:** Audit and fix `vite.config.ts` and all `.env` files to ensure `VITE_` variables are loaded correctly in both development and production builds.
-   [ ] T002 [Foundation] **Resolve Supabase Security Warnings:** Create a new database migration in `supabase/migrations/` that resolves all 15 security warnings by tightening RLS policies and updating auth configurations per Supabase recommendations.
-   [ ] T003 [Foundation] **Resolve Supabase Performance Warnings:** Create a new database migration in `supabase/migrations/` that optimizes all RLS policies (using `(select auth.uid())`) and consolidates permissive policies.
-   [ ] T004 [P] [Foundation] **Integrate MagicUI & shadcn/ui:** Install and configure both libraries into the project.
-   [ ] T005 [Foundation] **Build Core App Layout:** Create the main `src/components/layout/AppLayout.tsx` component with a responsive header and main content area.
-   [ ] T006 [Foundation] **Rebuild Login Page:** Create `src/pages/LoginPage.tsx` using MagicUI components, ensuring it is centered, functional, and visually polished.

**Checkpoint**: Foundation ready. The app should be runnable, secure, and the login page should look and feel professional.

---

## Phase 2: User Story 1 - Connect and View First Analysis (Priority: P1) 🎯 MVP

**Goal**: Deliver the end-to-end flow of connecting to hardware and seeing one analyzed shot.
**Independent Test**: The Cypress E2E test for this story should pass, validating the entire frontend logic.

### Tests for User Story 1 ⚠️

> **NOTE**: These tests will use `cy.intercept()` to simulate responses from the Pi Server and Supabase. This provides a "clear design" for testing by isolating the frontend, making tests fast and reliable for CI/CD.

-   [ ] T007 [P] [US1] Create Cypress test file `cypress/e2e/hardware-session.cy.ts`.
-   [ ] T008 [US1] In the new test, write a failing test case that simulates scanning a QR code and expects to see a live feed image and an analysis overlay. Use `cy.intercept()` to define fixture responses for the Pi Server and Supabase function.

### Implementation for User Story 1

-   [ ] T009 [P] [US1] **Hardware API Service:** Implement `startSession` and `getLatestFrame` functions in `src/services/HardwareAPI.ts`.
-   [ ] T010 [P] [US1] **Secure Roboflow Proxy:** Create the `supabase/functions/analyze-frame/index.ts` Edge Function. Add the `ROBOFLOW_API_KEY` as a secret in the Supabase dashboard.
-   [ ] T011 [P] [US1] **QR Scanner Component:** Build the `src/components/QRScanner.tsx` component. On a successful scan, store the ngrok URL in a global state (e.g., Zustand or Context).
-   [ ] T012 [US1] **Hardware State Hook:** Create the `src/hooks/useHardware.ts` hook to manage the polling for new frames and calling the analysis function.
-   [ ] T013 [US1] **Live View Component:** Build the `src/components/LiveTargetView.tsx`. This component will use the `useHardware.ts` hook to get data and will render the image and the `<canvas>` overlay for analysis results.
-   [ ] T014 [US1] **Wire Pages and Routing:** Create the `ConnectPage` and `SessionPage` and configure the router to handle the flow from QR scanning to the live view.

**Checkpoint**: User Story 1 should be fully functional and the Cypress test should pass. The core value of the app is now demonstrable.

---

## Phase 3: User Story 2 - Manage a Full Shooting Session (Priority: P2)

**Goal**: Allow users to start, stop, and save a complete shooting session.

### Implementation for User Story 2

-   [ ] T015 [US2] **Database Schema for Sessions:** Create a new migration in `supabase/migrations/` to add the `sessions` and `shots` tables as defined in `plan.md`.
-   [ ] T016 [P] [US2] **Session Control UI:** Add "Start", "Stop", and "End" buttons to the `SessionPage`.
-   [ ] T017 [US2] **State Management:** Enhance `useHardware.ts` or a new `useSession.ts` hook to manage the session state (`'idle'`, `'active'`, `'ended'`).
-   [ ] T018 [US2] **Backend Logic:**
    -   Clicking "Start" now calls a Supabase RPC or inserts directly into the `sessions` table to create a new session record.
    -   After each successful analysis, insert the result into the `shots` table, linking it to the active session ID.
-   [ ] T019 [P] [US2] **Real-time Stats UI:** Build a simple `SessionAnalyticsDashboard` component to display the running count of shots for the active session.

**Checkpoint**: Users can now complete and save an entire shooting practice.

---

## Phase 4: User Story 3 - Review Past Session Performance (Priority: P3)

**Goal**: Allow users to review their saved sessions.

### Implementation for User Story 3

-   [ ] T020 [P] [US3] **History Page UI:** Create the `src/pages/HistoryPage.tsx` to display a list of sessions.
-   [ ] T021 [US3] **Data Fetching:** Implement the logic to query the `sessions` table (for the current user) and display the list on the History page.
-   [ ] T022 [P] [US3] **Report Page UI:** Create a `ReportPage.tsx` component that can display the details of a single session.
-   [ ] T023 [US3] **Detailed Data Fetching:** When a user clicks a session from the history list, navigate to the `ReportPage` and fetch all shots associated with that `session_id`.
-   [ ] T024 [US3] **Data Visualization:** On the report page, render the saved shot data, including a visual plot of all shots on a target graphic.

**Checkpoint**: The application now has a complete core feature loop: practice, save, and review.

---

## Phase 5: Polish & Deployment

-   [ ] T025 [P] **Documentation:** Write a `README.md` that explains how to set up and run the project.
-   [ ] T026 **CI/CD Pipeline:** Fix the `.github/workflows/ci.yml` file to run the new Cypress tests and a production build on every push.
-   [ ] T027 **Final Review:** Perform a final review of the UI for responsiveness and consistency.
-   [ ] T028 **Deploy:** Deploy the application to Firebase Hosting.
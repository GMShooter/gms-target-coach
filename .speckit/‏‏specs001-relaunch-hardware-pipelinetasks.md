# Tasks GMShoot v2 Relaunch Hardware-First Analysis Pipeline

Input Design documents from `specs001-relaunch-hardware-pipeline`
Prerequisites plan.md (required), spec.md (required for user stories)

## Format `[ID] [P] [Story] Description`

-   [P] Can run in parallel (different files, no dependencies)
-   [Story] Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1 Foundation & Triage (Blocking Prerequisites)

Purpose Create a stable, secure, and visually correct baseline before implementing any user stories.
⚠️ CRITICAL No user story work can begin until this phase is complete.

-   [ ] T001 [P] [Foundation] Fix Environment Variables Audit and fix `vite.config.ts` and all `.env` files to ensure `VITE_` variables are loaded correctly in both development and production builds.
-   [ ] T002 [Foundation] Resolve Supabase Security Warnings Create a new database migration in `supabasemigrations` that resolves all 15 security warnings by tightening RLS policies and updating auth configurations per Supabase recommendations.
-   [ ] T003 [Foundation] Resolve Supabase Performance Warnings Create a new database migration in `supabasemigrations` that optimizes all RLS policies (using `(select auth.uid())`) and consolidates permissive policies.
-   [ ] T004 [P] [Foundation] Integrate MagicUI & shadcnui Install and configure both libraries into the project.
-   [ ] T005 [Foundation] Build Core App Layout Create the main `srccomponentslayoutAppLayout.tsx` component with a responsive header and main content area.
-   [ ] T006 [Foundation] Rebuild Login Page Create `srcpagesLoginPage.tsx` using MagicUI components, ensuring it is centered, functional, and visually polished.

Checkpoint Foundation ready. The app should be runnable, secure, and the login page should look and feel professional.

---

## Phase 2 User Story 1 - Connect and View First Analysis (Priority P1) 🎯 MVP

Goal Deliver the end-to-end flow of connecting to hardware and seeing one analyzed shot.
Independent Test The Cypress E2E test for this story should pass, validating the entire frontend logic without live hardware by using `cy.intercept()`.

### Tests for User Story 1 ⚠️

 NOTE Write these tests FIRST, ensure they FAIL before implementation.

-   [ ] T007 [P] [US1] Create Cypress test file `cypresse2ehardware-session.cy.ts`.
-   [ ] T008 [US1] In `hardware-session.cy.ts`, write a failing test case that simulates the full US1 journey. Use `cy.intercept()` to define fixture responses for the Pi Server (`sessionstart`, `framelatest`) and the Supabase `analyze-frame` function.

### Implementation for User Story 1

-   [ ] T009 [P] [US1] Hardware API Service Implement `startSession` and `getLatestFrame` functions in `srcservicesHardwareAPI.ts`.
-   [ ] T010 [P] [US1] Secure Roboflow Proxy Create the `supabasefunctionsanalyze-frameindex.ts` Edge Function. Store the `ROBOFLOW_API_KEY` as a secret in the Supabase dashboard and load it via `Deno.env.get()`.
-   [ ] T011 [P] [US1] QR Scanner Component Build the `srccomponentsQRScanner.tsx` component. On a successful scan, store the ngrok URL in a global state manager (e.g., Zustand or React Context).
-   [ ] T012 [US1] Hardware State Hook Create the `srchooksuseHardware.ts` hook. It will manage polling for new frames (using the service from T009) and invoking the analysis function (from T010).
-   [ ] T013 [US1] Live View Component Build the `srccomponentsLiveTargetView.tsx`. This component will use the `useHardware.ts` hook to get data and will render the live image and a `canvas` overlay for the analysis results.
-   [ ] T014 [US1] Wire Pages and Routing Create `srcpagesConnectPage.tsx` and `srcpagesSessionPage.tsx`. Configure the router to handle the flow from QR scanning to the live view.

Checkpoint User Story 1 should be fully functional and the Cypress test from T008 should now pass. The core value of the app is demonstrable.

---

## Phase 3 User Story 2 - Manage a Full Shooting Session (Priority P2)

Goal Allow users to start, stop, and save a complete shooting session.
Independent Test A user can start a session, see shots counted in the UI, end the session, and verify the data is saved in the Supabase table.

### Implementation for User Story 2

-   [ ] T015 [US2] Database Schema for Sessions Create a new migration in `supabasemigrations` to add the `sessions` and `shots` tables as defined in `plan.md`.
-   [ ] T016 [P] [US2] Session Control UI Add Start Session, and End Session buttons to the `SessionPage.tsx`.
-   [ ] T017 [US2] Session State Management Enhance `useHardware.ts` (or create a new `useSession.ts` hook) to manage the session state (`'idle'`, `'active'`, `'ended'`) and the active `session_id`.
-   [ ] T018 [US2] Backend Logic for Sessions
    -   Implement the logic so clicking Start Session inserts a new record into the `sessions` table and stores the returned ID in the state.
    -   Modify the analysis flow so that after each successful analysis, a new record is inserted into the `shots` table, linked to the active `session_id`.
-   [ ] T019 [P] [US2] Real-time Stats UI Create a `SessionAnalyticsDashboard` component in `srccomponents` to display the running count of shots for the active session.

Checkpoint Users can now complete and save an entire shooting practice. The data is visible in the Supabase database.

---

## Phase 4 User Story 3 - Review Past Session Performance (Priority P3)

Goal Allow users to review their saved sessions.
Independent Test A user can navigate to the history page, see a list of past sessions, and click one to view its details.

### Implementation for User Story 3

-   [ ] T020 [P] [US3] History Page UI Create the `srcpagesHistoryPage.tsx` to display a list of sessions using `Card` components.
-   [ ] T021 [US3] Data Fetching for History In `HistoryPage.tsx`, implement the Supabase query to fetch all sessions for the currently logged-in user and display them.
-   [ ] T022 [P] [US3] Report Page UI Create `srcpagesReportPage.tsx` to display the details of a single session.
-   [ ] T023 [US3] Data Fetching for Report In `ReportPage.tsx`, use the session ID from the URL to fetch all associated records from the `shots` table.
-   [ ] T024 [US3] Data Visualization On the report page, implement a component that renders the saved shot coordinates as points on a target graphic.

Checkpoint The application now has a complete core feature loop practice, save, and review.

---

## Phase 5 Polish & Deployment

Purpose Finalize the application for a stable release.

-   [ ] T025 [P] Documentation Write a comprehensive `README.md` that explains how to set up the frontend, the Supabase backend (including secrets), and run the project.
-   [ ] T026 CICD Pipeline Fix the `.githubworkflowsci.yml` file to run linting, Jest tests, and the new Cypress E2E tests on every push to the main branch.
-   [ ] T027 Final Review Perform a final review of the entire application on both desktop and mobile to ensure responsiveness and a consistent user experience.
-   [ ] T028 Deploy Deploy the application to Firebase Hosting and confirm all features are working in the live environment.
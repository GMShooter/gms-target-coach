---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize React 18+ with TypeScript, Vite, and Tailwind CSS dependencies
- [ ] T003 [P] Configure linting (ESLint) and formatting (Prettier) tools
- [ ] T004 [P] Setup Supabase configuration and Edge Functions structure
- [ ] T005 [P] Configure testing framework (Jest for unit, Cypress for E2E)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

GMShoot v2 Foundational Tasks:

- [ ] T006 Setup Supabase database schema with RLS policies
- [ ] T007 [P] Implement Supabase Auth with proper session management
- [ ] T008 [P] Setup hardware API abstraction layer (real + mock implementations)
- [ ] T009 [P] Configure WebSocket infrastructure for real-time communication
- [ ] T010 Create base React components following atomic → composite hierarchy
- [ ] T011 Configure Zustand for global state management
- [ ] T012 Setup error handling and loading states infrastructure
- [ ] T013 Configure environment variables and security (API keys in Edge Functions)
- [ ] T014 [P] Setup QR code scanning for device pairing

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (MANDATORY per Constitution) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation (TDD approach)**

- [ ] T015 [P] [US1] Unit tests for components in src/__tests__/components/
- [ ] T016 [P] [US1] Integration tests for user journey in cypress/e2e/
- [ ] T017 [P] [US1] Hardware API mock tests for development environment
- [ ] T018 [P] [US1] Performance tests to verify <2s analysis latency

### Implementation for User Story 1

- [ ] T019 [P] [US1] Create atomic React components in src/components/ui/
- [ ] T020 [P] [US1] Create composite components in src/components/
- [ ] T021 [US1] Implement hardware integration hooks in src/hooks/
- [ ] T022 [US1] Implement Supabase service functions in src/services/
- [ ] T023 [US1] Create page components in src/pages/
- [ ] T024 [US1] Add Zustand state management for feature
- [ ] T025 [US1] Add proper error handling and loading states
- [ ] T026 [US1] Add accessibility compliance (WCAG 2.1 AA)
- [ ] T027 [US1] Add logging for user story 1 operations

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (MANDATORY per Constitution) ⚠️

- [ ] T028 [P] [US2] Unit tests for components in src/__tests__/components/
- [ ] T029 [P] [US2] Integration tests for user journey in cypress/e2e/
- [ ] T030 [P] [US2] Hardware API mock tests for development environment
- [ ] T031 [P] [US2] Performance tests to verify <2s analysis latency

### Implementation for User Story 2

- [ ] T032 [P] [US2] Create atomic React components in src/components/ui/
- [ ] T033 [P] [US2] Create composite components in src/components/
- [ ] T034 [US2] Implement hardware integration hooks in src/hooks/
- [ ] T035 [US2] Implement Supabase service functions in src/services/
- [ ] T036 [US2] Create page components in src/pages/
- [ ] T037 [US2] Add Zustand state management for feature
- [ ] T038 [US2] Add proper error handling and loading states
- [ ] T039 [US2] Add accessibility compliance (WCAG 2.1 AA)
- [ ] T040 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (MANDATORY per Constitution) ⚠️

- [ ] T041 [P] [US3] Unit tests for components in src/__tests__/components/
- [ ] T042 [P] [US3] Integration tests for user journey in cypress/e2e/
- [ ] T043 [P] [US3] Hardware API mock tests for development environment
- [ ] T044 [P] [US3] Performance tests to verify <2s analysis latency

### Implementation for User Story 3

- [ ] T045 [P] [US3] Create atomic React components in src/components/ui/
- [ ] T046 [P] [US3] Create composite components in src/components/
- [ ] T047 [US3] Implement hardware integration hooks in src/hooks/
- [ ] T048 [US3] Implement Supabase service functions in src/services/
- [ ] T049 [US3] Create page components in src/pages/
- [ ] T050 [US3] Add Zustand state management for feature
- [ ] T051 [US3] Add proper error handling and loading states
- [ ] T052 [US3] Add accessibility compliance (WCAG 2.1 AA)

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T053 [P] Documentation updates in README.md and component docs
- [ ] T054 Code cleanup and refactoring following TypeScript strict mode
- [ ] T055 Performance optimization to maintain <2s analysis latency
- [ ] T056 [P] Additional unit tests in src/__tests__/components/
- [ ] T057 Security hardening (RLS policies, API key security)
- [ ] T058 Lighthouse optimization to maintain 90+ score
- [ ] T059 Accessibility audit for WCAG 2.1 AA compliance
- [ ] T060 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in tests/contract/test_[name].py"
Task: "Integration test for [user journey] in tests/integration/test_[name].py"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

<!--
Sync Impact Report:
Version change: N/A → 1.0.0 (initial constitution)
List of modified principles: N/A (new constitution)
Added sections: All sections (Core Principles, Technical Standards, Development Workflow, Governance)
Removed sections: N/A
Templates requiring updates: 
✅ .specify/templates/plan-template.md (Constitution Check section updated with GMShoot v2 specific gates)
✅ .specify/templates/spec-template.md (Added GMShoot v2 Constitution Compliance Requirements)
✅ .specify/templates/tasks-template.md (Updated task categorization to reflect constitution principles)
Follow-up TODOs: None
Validation completed: No remaining bracket tokens, version line matches report, dates in ISO format, principles are declarative and testable
-->

# GMShoot v2 Constitution

## Core Principles

### I. Hardware-First Development
Every feature MUST consider hardware integration from the start. Hardware APIs MUST be abstracted through clean interfaces that support both real hardware and mock implementations for development. All hardware-dependent features MUST work with mock data in development environments.

### II. Real-Time Analysis Pipeline
Shot analysis MUST follow a strict real-time pipeline: frame capture → AI analysis → result storage → UI update. Analysis latency MUST remain under 2 seconds from capture to display. All analysis results MUST be persisted immediately for session continuity.

### III. Test-Driven Development (NON-NEGOTIABLE)
TDD is mandatory: Tests MUST be written → User approved → Tests MUST fail → Then implementation proceeds. Red-Green-Refactor cycle is strictly enforced. All features MUST have comprehensive unit, integration, and E2E tests before deployment.

### IV. Component Architecture
UI MUST follow a strict component hierarchy: atomic components → composite components → pages → layouts. All components MUST be independently testable, documented, and reusable. State management MUST use React hooks for local state and Zustand for global state.

### V. Security & Privacy First
All user data MUST be protected with Row Level Security (RLS) policies. API keys MUST be secured in Supabase Edge Functions. User authentication MUST use Supabase Auth with proper session management. All hardware communication MUST use secure WebSocket connections with proper authentication.

## Technical Standards

### Technology Stack
Frontend MUST use React 18+ with TypeScript, Vite for build tooling, and Tailwind CSS for styling. Backend MUST use Supabase for database, authentication, and Edge Functions. Hardware integration MUST use WebSocket for real-time communication and QR codes for device pairing.

### Performance Requirements
Analysis latency MUST be under 2 seconds. Lighthouse score MUST be 90+ for Performance and Accessibility. Bundle size MUST be optimized with code splitting. API responses MUST be strategically cached to improve performance.

### Code Quality Standards
All code MUST follow TypeScript strict mode with proper type definitions. Components MUST use functional patterns with hooks. All functions MUST have proper error handling and loading states. Code MUST be formatted with Prettier and linted with ESLint.

## Development Workflow

### Spec-Driven Development
All features MUST follow Spec-Kit workflow: specification → implementation plan → task breakdown → development → testing → deployment. Specifications MUST include user stories, acceptance criteria, and measurable success outcomes.

### Incremental Delivery
Features MUST be developed in small, independently testable increments. Each user story MUST be deliverable as a standalone MVP. Features MUST be tested independently before integration with existing functionality.

### Quality Gates
All code changes MUST pass automated tests before merging. Code review is REQUIRED for all changes. Documentation MUST be updated with feature changes. Accessibility compliance MUST be verified for all user-facing components.

## Governance

This constitution supersedes all other development practices and guidelines. Amendments require documentation, team approval, and migration plan. All pull requests and reviews MUST verify compliance with these principles. Complexity that violates these principles MUST be explicitly justified and approved.

For runtime development guidance, refer to the project README.md and component documentation.

**Version**: 1.0.0 | **Ratified**: 2025-10-25 | **Last Amended**: 2025-10-25

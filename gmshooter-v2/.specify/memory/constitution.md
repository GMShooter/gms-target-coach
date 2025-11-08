# GMShoot Constitution

## Core Principles

### I. Data-Driven Architecture
The application is fundamentally a data processing pipeline where the UI is a function of the state. All operations flow through a central state object that serves as the single source of truth. State mutations are controlled and predictable, ensuring reproducible analysis results.

### II. Separation of Concerns
Each module has a single, well-defined responsibility with clear boundaries:
- Data Acquisition Layer handles all external data sources
- Analysis Engine contains pure, stateless business logic
- UI Layer orchestrates components and displays results
- Client modules encapsulate external API interactions

### III. Test-First Development (NON-NEGOTIABLE)
All functionality must be developed using TDD:
- Tests written before implementation code
- Tests must fail initially, then pass after implementation
- Red-Green-Refactor cycle strictly enforced
- Analysis Engine must have 100% test coverage as it contains critical business logic

### IV. External API Isolation
All external service interactions must be encapsulated in dedicated client modules:
- Roboflow client handles all computer vision API calls
- Network client manages all ngrok server communications
- Client interfaces must be mockable for testing
- API keys and credentials managed through environment variables

### V. State Management Protocol
State mutations follow strict protocols:
- Only the UI layer may modify session state
- Analysis Engine is purely functional - never mutates state
- All state changes trigger automatic UI re-rendering
- State structure must be serializable for persistence

### VI. Statistical Integrity
All shooting analysis calculations must be:
- Mathematically sound and verifiable
- Based on established ballistics and statistics principles
- Implemented with proper handling of edge cases
- Documented with clear explanations of methodologies

## Technical Standards

### Technology Stack Requirements
- Python 3.8+ as the primary development language
- Streamlit for the UI layer
- NumPy, SciPy, Pandas for statistical calculations
- PIL/OpenCV for image processing
- Requests for HTTP communications
- Inference SDK for Roboflow integration

### Code Quality Standards
- All code must follow PEP 8 style guidelines
- Type hints required for all function signatures
- Docstrings required for all public functions and classes
- Maximum cyclomatic complexity of 10 per function
- No hardcoded values - configuration through environment variables

### Performance Requirements
- Image processing must complete within 2 seconds per frame
- Statistical calculations must complete within 500ms
- UI must remain responsive during all operations
- Memory usage must not exceed 500MB during normal operation

## Development Workflow

### Feature Development Process
1. Create or update tests for the new functionality
2. Implement the minimal code to make tests pass
3. Refactor while maintaining test coverage
4. Update documentation
5. Verify integration with existing components

### Code Review Requirements
- All changes must be reviewed before merging
- Reviewer must verify test coverage and quality
- Reviewer must verify compliance with this constitution
- Automated checks must pass before manual review

### Testing Strategy
- Unit tests for all business logic (target: 95% coverage)
- Integration tests for all external API interactions
- End-to-end tests for critical user workflows
- Performance tests for all image processing operations

## Security Requirements

### Data Protection
- All API keys must be stored in environment variables
- No sensitive data in logs or error messages
- User data must be validated before processing
- Temporary files must be securely cleaned up

### Network Security
- All external API calls must use HTTPS
- Request timeouts must be implemented for all network operations
- Proper error handling for all network failures
- Rate limiting considerations for external API calls

## Governance

### Constitution Authority
This constitution supersedes all other development practices and guidelines. Any conflicts between this constitution and other documentation must be resolved in favor of this constitution.

### Amendment Process
Amendments require:
1. Written proposal documenting the change
2. Review and approval by project maintainers
3. Updated documentation and migration plan
4. Communication to all development team members

### Compliance Verification
- All pull requests must verify constitution compliance
- Automated checks must validate adherence to technical standards
- Code reviews must include explicit constitution compliance verification
- Regular audits to ensure ongoing compliance

### Version Control
- Constitution version follows MAJOR.MINOR.PATCH format
- Major version indicates breaking changes to development practices
- Minor version indicates additions or clarifications
- Patch version indicates corrections or minor updates

**Version**: 1.0.0 | **Ratified**: 2025-11-03 | **Last Amended**: 2025-11-03

# GMShoot v2: Core Analysis Feature Implementation Plan

## Overview

This document provides a complete, actionable set of instructions for implementing and testing the core shot analysis pipeline of GMShoot v2 application using the provided test frames. The approach follows Test-Driven Development (TDD) principles.

## Current State Analysis

**Completed Foundation**: All 27 tasks from the original specification have been completed, including:
- ✅ Environment variables fixed with VITE_ prefix
- ✅ MagicUI and shadcn/ui integration complete
- ✅ Core app layout and navigation built
- ✅ Login page rebuilt with modern UI
- ✅ Supabase security and performance warnings resolved
- ✅ Hardware API service implemented
- ✅ QR scanner component built
- ✅ Live view component with canvas overlay
- ✅ Session management complete
- ✅ History and reporting pages built
- ✅ Data visualization implemented
- ✅ CI/CD pipeline fixed
- ✅ Application deployed to https://gmshooter.web.app

**Available Assets**: 5 test frames in `public/test_videos_frames/` (1.svg through 5.svg) simulating real shooting session data

## Development Environment Setup

### Prerequisites
1. **Environment Variables**: Ensure `.env.development` contains:
   ```
   VITE_USE_MOCK_HARDWARE=true
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Dependencies**: All dependencies already installed from previous work

3. **Test Frames**: 5 SVG files available in `public/test_videos_frames/`:
   - Frame 1: Center shot (320, 240)
   - Frame 2: Slightly off-center (320, 240) 
   - Frame 3: Upper left (340, 230)
   - Frame 4: Lower right (315, 255)
   - Frame 5: Bottom center (335, 245)

## Phase 1: Create Mock Hardware Service for Test Frame Cycling

### Objective
Create a mock hardware service that cycles through the 5 test frames, enabling development without live hardware dependency.

### Implementation Steps

1. **Create Mock Hardware API Service**
   - **File**: `src/services/MockHardwareAPI.ts`
   - **Function**: `getLatestFrame()`
   - **Logic**: Maintain static index counter (1-5), return corresponding frame URL
   - **Return Format**: `Promise<{ frameUrl: string, frameId: number }>`

2. **Environment Variable Integration**
   - **File**: `src/hooks/useHardware.ts`
   - **Logic**: Check `VITE_USE_MOCK_HARDWARE` environment variable
   - **Behavior**: Use MockHardwareAPI when true, real HardwareAPI when false

3. **Configuration**
   - Add to `.env.development`: `VITE_USE_MOCK_HARDWARE=true`
   - Ensure mock service cycles through frames 1-5 continuously

### Success Criteria
- Application loads and displays test frames in sequence
- No dependency on external hardware or ngrok
- Smooth cycling between frames with appropriate timing
- Frame IDs increment correctly (1→2→3→4→5→1...)

## Phase 2: Build Analysis UI with MCP Components

### Objective
Enhance the LiveTargetView component to properly display frames from mock service and prepare for analysis results.

### Implementation Steps

1. **Use MCP Power for UI Components**
   - Leverage available MCP tools for generating modern UI components
   - Focus on responsive design and accessibility
   - Use MagicUI components already integrated in project

2. **Update LiveTargetView Component**
   - **File**: `src/components/LiveTargetView.tsx`
   - **Integration**: Use `useHardware.ts` hook for frame data
   - **Display**: Show image from received frameUrl
   - **Analysis Area**: Dedicated div/overlay for analysis results
   - **Loading States**: Clear loading indicators while waiting for analysis

3. **Component Requirements**
   - Responsive design for mobile and desktop
   - Clear visual feedback for all states
   - Accessibility compliance (ARIA labels, keyboard navigation)
   - Smooth transitions between frames

### Success Criteria
- UI correctly displays sequence of 5 test frames
- Analysis result area is visible and properly styled
- Loading states work correctly
- Component is responsive and accessible

## Phase 3: Write End-to-End Cypress Test (TDD Approach)

### Objective
Create a comprehensive Cypress test that defines success criteria and validates the entire analysis pipeline.

### Implementation Steps

1. **Create Test File**
   - **File**: `cypress/e2e/static_analysis_pipeline.cy.ts`
   - **Approach**: Test-Driven Development (write failing test first)

2. **Define Mock Analysis Data**
   - **File**: `cypress/fixtures/analysis_results.json`
   - **Content**: Expected analysis results for each of the 5 frames
   - **Format**: 
     ```json
     [
       { "frameId": 1, "score": 9.8, "location": { "x": 320, "y": 240 }, "confidence": 0.95 },
       { "frameId": 2, "score": 8.5, "location": { "x": 315, "y": 245 }, "confidence": 0.87 },
       // ... etc for frames 3-5
     ]
     ```

3. **Test Logic Implementation**
   - **Navigation**: `cy.visit()` to LiveTargetView page
   - **API Interception**: Use `cy.intercept()` for Supabase Edge Function calls
   - **Frame Validation**: Assert correct frame images are displayed
   - **Analysis Validation**: Assert analysis results appear correctly in UI
   - **Loop Testing**: Validate all 5 frames in sequence

### Test Scenarios
1. **Frame Display Test**
   - Verify each test frame (1-5) displays correctly
   - Check image src attributes match expected frame URLs
   - Validate frame transitions are smooth

2. **Analysis Pipeline Test**
   - Mock Supabase Edge Function (`/functions/v1/analyze-frame`)
   - Intercept calls based on frameId
   - Return corresponding mock analysis data
   - Verify analysis overlay displays results

3. **End-to-End Flow Test**
   - Complete cycle through all 5 frames
   - Verify analysis results for each frame
   - Check UI state management throughout process

### Success Criteria
- Test initially fails (as expected in TDD)
- Test passes after implementing full pipeline
- All 5 frames are processed correctly
- Analysis results display properly for each frame
- Screenshots capture final state for validation

## Phase 4: Implement Full Analysis Pipeline & Pass Test

### Objective
Write the complete analysis pipeline code that makes the Cypress test pass.

### Implementation Steps

1. **Update useHardware Hook**
   - **File**: `src/hooks/useHardware.ts`
   - **Analysis Logic**: Call Supabase Edge Function for each frame
   - **State Management**: Store analysis results in state
   - **Error Handling**: Graceful handling of analysis failures

2. **Enhance LiveTargetView Component**
   - **Analysis Display**: Show analysis results from hook state
   - **Visual Overlay**: Render shot location and score on target
   - **Real-time Updates**: React to analysis state changes

3. **Edge Function Integration**
   - **Function**: `supabase/functions/analyze-frame/index.ts`
   - **API Call**: Integrate with Roboflow API (or mock for testing)
   - **Response Processing**: Format analysis results for frontend

### Success Criteria
- Cypress test `static_analysis_pipeline.cy.ts` passes completely
- All 5 frames are analyzed and results displayed
- Analysis overlay shows correct shot locations and scores
- Error handling works for failed analyses
- Performance meets <2 second analysis requirement

## Phase 5: Validate with Screenshots & Final Testing

### Objective
Comprehensive validation of the implemented analysis pipeline with visual documentation.

### Implementation Steps

1. **Screenshot Capture**
   - **Cypress Configuration**: Enable automatic screenshots
   - **Test Execution**: Run `static_analysis_pipeline.cy.ts` to completion
   - **Screenshots**: Capture at key points in the test flow

2. **Visual Analysis**
   - **Frame Display**: Verify all 5 test frames display correctly
   - **Analysis Results**: Confirm analysis overlays are accurate
   - **UI Responsiveness**: Check on different screen sizes
   - **Performance**: Verify analysis timing meets requirements

3. **Manual Testing**
   - **Local Development**: Test with `VITE_USE_MOCK_HARDWARE=true`
   - **Browser Testing**: Test in Chrome, Firefox, Safari
   - **Mobile Testing**: Verify responsive behavior on mobile devices

### Success Criteria
- All screenshots show correct analysis pipeline behavior
- Visual analysis confirms UI meets design requirements
- Performance benchmarks are met (<2 second analysis time)
- Application is ready for live hardware integration

## Technical Specifications

### Mock Hardware Service Interface
```typescript
interface MockHardwareResponse {
  frameUrl: string;
  frameId: number;
}

interface MockHardwareAPI {
  getLatestFrame(): Promise<MockHardwareResponse>;
}
```

### Analysis Data Structure
```typescript
interface AnalysisResult {
  frameId: number;
  score: number;
  location: { x: number; y: number };
  confidence: number;
  timestamp: string;
}
```

### Test Frame Coordinates
- Frame 1: { x: 320, y: 240 } (Center)
- Frame 2: { x: 315, y: 245 } (Upper-left)
- Frame 3: { x: 340, y: 230 } (Upper-right)
- Frame 4: { x: 315, y: 255 } (Lower-left)
- Frame 5: { x: 335, y: 245 } (Bottom-center)

## Development Commands

### Phase 1
```bash
# Create mock service
echo "Creating MockHardwareAPI.ts..."
# Add environment variable
echo "VITE_USE_MOCK_HARDWARE=true" >> .env.development
# Test mock service
npm run dev
```

### Phase 2
```bash
# Build UI components
echo "Building analysis UI with MCP..."
# Test UI changes
npm run dev
```

### Phase 3
```bash
# Create Cypress test
echo "Creating static_analysis_pipeline.cy.ts..."
# Generate test fixtures
echo "Creating analysis_results.json..."
# Run failing test
npm run test:e2e --spec "cypress/e2e/static_analysis_pipeline.cy.ts"
```

### Phase 4
```bash
# Implement full pipeline
echo "Implementing analysis pipeline..."
# Test implementation
npm run test:e2e --spec "cypress/e2e/static_analysis_pipeline.cy.ts"
```

### Phase 5
```bash
# Final validation
echo "Running final validation..."
npm run test:e2e --spec "cypress/e2e/static_analysis_pipeline.cy.ts" --config "screenshotsFolder=cypress/screenshots/validation"
# Analyze screenshots
echo "Check cypress/screenshots/validation/ for results"
```

## Success Metrics

### Performance Targets
- **Frame Cycling**: <1 second between frames
- **Analysis Time**: <2 seconds from frame to result display
- **UI Responsiveness**: <100ms for state updates
- **Test Coverage**: >90% for analysis pipeline code

### Quality Gates
- All Cypress tests pass
- No console errors in development
- Screenshots show correct analysis overlay positioning
- Mock service cycles through all 5 frames correctly
- Analysis results match expected coordinates and scores

## Next Steps After Implementation

1. **Live Hardware Integration**: Replace mock service with real hardware API
2. **ngrok Testing**: Test with actual Raspberry Pi server
3. **Roboflow Integration**: Use real Roboflow API for analysis
4. **Performance Optimization**: Optimize for real-world usage patterns
5. **User Testing**: Conduct user acceptance testing

## Troubleshooting Guide

### Common Issues
1. **Mock Service Not Working**
   - Check `VITE_USE_MOCK_HARDWARE=true` in .env.development
   - Verify import path in useHardware.ts
   - Check browser console for import errors

2. **Cypress Test Failing**
   - Verify mock analysis data format
   - Check cy.intercept() URL matching
   - Ensure test waits for async operations

3. **Analysis Not Displaying**
   - Check LiveTargetView state management
   - Verify analysis result data structure
   - Check CSS styling for overlay visibility

4. **Performance Issues**
   - Optimize frame loading (cache if needed)
   - Check for memory leaks in frame cycling
   - Profile analysis function execution time

## Conclusion

This implementation plan provides a complete, test-driven approach to building the core analysis feature using the provided test frames. By following these phases systematically, the development agent can create a robust, well-tested analysis pipeline that's ready for live hardware integration.

The plan leverages:
- **TDD Principles**: Failing tests first, then implementation
- **Mock Services**: Enables development without hardware dependencies
- **MCP Power**: Modern UI component generation
- **Comprehensive Testing**: Cypress E2E with visual validation
- **Performance Focus**: <2 second analysis requirement
- **Quality Assurance**: Multiple validation checkpoints

Following this plan will result in a fully functional analysis pipeline that's ready for production deployment and user testing.
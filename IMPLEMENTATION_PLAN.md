# GMShoot v2 Implementation Plan: Fixing Core Issues

## Executive Summary

After comprehensive analysis of the codebase, I've identified critical issues preventing the project from reaching production readiness. The main problems are:

1. **Deno/Cypress Compatibility Issue**: E2E tests fail due to Deno runtime errors
2. **Mock Implementation Inconsistencies**: Client and server mock implementations are misaligned
3. **Test Data Mismatches**: Fixture data doesn't match implementation expectations
4. **Environment Configuration**: No clear separation between mock and production modes

## Detailed Implementation Plan

### Phase 4A: Fix Deno/Cypress Compatibility (Priority: CRITICAL)

**Problem**: Cypress tests fail with "Bootstrap exception: Error: The handle is invalid. (os error 6)" when trying to run with Supabase Edge Functions.

**Root Cause**: Incompatibility between Cypress test environment and Deno runtime in Edge Functions.

**Solution**: Implement client-side only mock for testing environment.

**Tasks**:
1. Update `useHardware.ts` to skip Edge Function calls when in mock mode
2. Update `hardwareStore.ts` to handle mock analysis results directly
3. Create unified mock data service for consistent test results
4. Update Cypress tests to work with client-side mock only

### Phase 4B: Fix Mock Implementation Inconsistencies (Priority: HIGH)

**Problem**: Mock implementation is split between client-side (`MockHardwareAPI`) and server-side (`analyze-frame` Edge Function), causing inconsistencies.

**Current Issues**:
- `MockHardwareAPI` returns frame URLs like `/test_videos_frames/1.svg`
- `analyze-frame` expects frameBase64 and returns different data structure
- Test fixtures expect different data structure than what's returned

**Solution**: Consolidate all mock logic to client-side only.

**Tasks**:
1. Remove mock mode from `analyze-frame` Edge Function
2. Create unified mock analysis service in client
3. Ensure consistent data structures across all mock components
4. Update test fixtures to match implementation

### Phase 4C: Fix Test Data Mismatches (Priority: HIGH)

**Problem**: Test fixtures in `cypress/fixtures/analysis_results.json` don't match the data structure returned by mock implementation.

**Issues**:
- Fixtures have `location.x` but implementation returns `coordinates.x`
- Fixtures have `score` but implementation calculates it differently
- Frame IDs don't match between fixtures and implementation

**Solution**: Align test data with implementation.

**Tasks**:
1. Update test fixtures to match mock implementation structure
2. Update Cypress tests to use correct data structure
3. Ensure frame IDs match between fixtures and MockHardwareAPI
4. Verify shot coordinates are consistent

### Phase 4D: Fix Environment Configuration (Priority: MEDIUM)

**Problem**: Environment variables are mixed between mock and real values, causing confusion.

**Issues**:
- `.env.development` has real Supabase URL but mock Roboflow key
- No clear way to switch between fully mock and partially real modes
- Environment variable loading is inconsistent

**Solution**: Create clear environment separation.

**Tasks**:
1. Create separate `.env.mock` for fully mock development
2. Create `.env.local` template for local development
3. Update environment loading to handle different modes
4. Add documentation for environment setup

## Implementation Details

### 1. Fix useHardware.ts for Client-Side Mock

```typescript
// In useHardware.ts, modify the polling logic:
const pollForFrames = useCallback((deviceId: string, sessionId: string): void => {
  const poll = async () => {
    try {
      const frame = await api.getLatestFrame(deviceId);
      store.setLatestFrame(frame);
      
      // If frame has shot data, add to recent shots
      if (frame.hasShot && frame.shotData) {
        store.addShot(frame.shotData);
      }
      
      // Skip Edge Function call in mock mode - use client-side analysis
      if (import.meta.env.VITE_USE_MOCK_HARDWARE === 'true') {
        // Use client-side mock analysis
        const mockAnalysis = generateMockAnalysis(frame.frameNumber);
        store.setAnalysisResult(mockAnalysis);
      } else {
        // Call Supabase Edge Function for analysis
        try {
          store.setAnalyzing(true);
          const { data, error } = await supabase.functions.invoke('analyze-frame', {
            body: {
              frameBase64: frame.frame // Pass frame data for analysis
            }
          });
         
          if (error) {
            console.error('Analysis failed:', error);
          } else if (data) {
            // Store analysis result in state for UI display
            store.setAnalysisResult({
              frameId: Math.random().toString(36).substring(7),
              shots: data.shots || [],
              confidence: data.confidence || 0,
              timestamp: new Date().toISOString()
            });
          }
        } catch (analysisError) {
          console.error('Failed to call analysis function:', analysisError);
        } finally {
          store.setAnalyzing(false);
        }
      }
    } catch (error) {
      console.error('Failed to poll for frames:', error);
    }
  };
```

### 2. Create Unified Mock Analysis Service

```typescript
// Create src/services/MockAnalysisService.ts
export const generateMockAnalysis = (frameNumber: number) => {
  const mockResults: { [key: number]: any } = {
    1: { shots: [{ x: 25, y: 30, score: 8, confidence: 0.8 }], confidence: 0.8 },
    2: { shots: [{ x: 45, y: 25, score: 7, confidence: 0.7 }], confidence: 0.7 },
    3: { shots: [{ x: 35, y: 45, score: 9, confidence: 0.9 }], confidence: 0.9 },
    4: { shots: [{ x: 55, y: 35, score: 6, confidence: 0.6 }], confidence: 0.6 },
    5: { shots: [{ x: 40, y: 50, score: 8, confidence: 0.8 }], confidence: 0.8 }
  };
  
  return {
    frameId: frameNumber.toString(),
    shots: mockResults[frameNumber]?.shots || [],
    confidence: mockResults[frameNumber]?.confidence || 0,
    timestamp: new Date().toISOString()
  };
};
```

### 3. Update Test Fixtures

```json
// Update cypress/fixtures/analysis_results.json
[
  { "frameId": "1", "shots": [{ "x": 25, "y": 30, "score": 8, "confidence": 0.8 }], "confidence": 0.8 },
  { "frameId": "2", "shots": [{ "x": 45, "y": 25, "score": 7, "confidence": 0.7 }], "confidence": 0.7 },
  { "frameId": "3", "shots": [{ "x": 35, "y": 45, "score": 9, "confidence": 0.9 }], "confidence": 0.9 },
  { "frameId": "4", "shots": [{ "x": 55, "y": 35, "score": 6, "confidence": 0.6 }], "confidence": 0.6 },
  { "frameId": "5", "shots": [{ "x": 40, "y": 50, "score": 8, "confidence": 0.8 }], "confidence": 0.8 }
]
```

### 4. Environment Configuration Strategy

```bash
# .env.mock (for fully mock development)
VITE_USE_MOCK_HARDWARE=true
VITE_USE_MOCK_AUTH=true
VITE_SUPABASE_URL=https://mock.supabase.co
VITE_SUPABASE_ANON_KEY=mock-anon-key
VITE_ROBOFLOW_API_KEY=mock-roboflow-key

# .env.local (for local development with real services)
VITE_USE_MOCK_HARDWARE=false
VITE_USE_MOCK_AUTH=false
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-real-anon-key
VITE_ROBOFLOW_API_KEY=your-real-roboflow-key
```

## Testing Strategy

### Phase 4A Testing: Deno/Cypress Fix
1. Run Cypress with mock mode enabled
2. Verify no Deno runtime errors
3. Check that all tests pass
4. Validate frame cycling works correctly

### Phase 4B Testing: Mock Consistency
1. Test frame cycling through all 5 frames
2. Verify analysis results are consistent
3. Check shot overlays display correctly
4. Validate loading states work properly

### Phase 4C Testing: Data Alignment
1. Run tests with updated fixtures
2. Verify all assertions pass
3. Check data structure consistency
4. Validate error handling works

### Phase 4D Testing: Environment Switching
1. Test with .env.mock configuration
2. Test with .env.local configuration
3. Verify seamless switching between modes
4. Check environment variable loading

## Success Criteria

Phase 4 will be complete when:
1. ✅ Cypress tests run without Deno errors
2. ✅ All 5 test frames cycle correctly
3. ✅ Analysis results display consistently
4. ✅ Shot overlays render at correct positions
5. ✅ Loading states work as expected
6. ✅ Error handling works gracefully
7. ✅ Environment switching is seamless

## Next Steps

After Phase 4 is complete:
1. Begin Phase 5: Validate with Screenshots & Final Testing
2. Capture screenshots of all 5 frames with analysis
3. Document final implementation
4. Prepare for production deployment
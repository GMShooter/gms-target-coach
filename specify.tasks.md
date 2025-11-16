# GMShoot Production-Readiness Implementation Tasks

## Executive Summary

This document provides detailed implementation tasks for addressing the production-readiness gaps identified in the GMShoot codebase assessment. Tasks are organized by priority and include specific code changes, file modifications, and implementation details.

## 1. Critical Fixes (Immediate Priority - Week 1)

### 1.1 Fix Syntax Error in shot_analysis.py
**Priority**: Critical
**File**: `src/analysis_engine/shot_analysis.py:286`
**Estimated Time**: 15 minutes

**Task Details**:
- Remove extra closing parenthesis in line 286
- Test the fix by running the module
- Verify no other syntax errors exist in the file

**Code Changes**:
```python
# Current (broken):
t = max(0, min(1, np.dot(point_vec, line_vec) / (line_len ** 2)))

# Fixed:
t = max(0, min(1, np.dot(point_vec, line_vec) / (line_len ** 2))
```

**Verification**:
- Run `python -m py_compile src/analysis_engine/shot_analysis.py`
- Ensure no syntax errors are reported

### 1.2 Fix Roboflow API Response Parsing
**Priority**: Critical
**File**: `src/clients/roboflow_client.py:129-139`
**Estimated Time**: 30 minutes

**Task Details**:
- Update API response parsing to match actual structure
- Test with example response from `roboflow_example_output.json`
- Add error handling for malformed responses

**Code Changes**:
```python
# Current (broken):
if "outputs" in first_result:
    output = first_result["outputs"]

# Fixed:
if "output" in first_result:
    output = first_result["output"]
    predictions = output["predictions"]["predictions"]
```

**Verification**:
- Test with actual API response structure
- Verify shot detection returns expected results

### 1.3 Resolve Duplicate Imports in app.py
**Priority**: High
**File**: `src/ui_layer/app.py:23-24`
**Estimated Time**: 15 minutes

**Task Details**:
- Remove duplicate import statements
- Verify all required imports are present
- Test application startup

**Code Changes**:
```python
# Remove duplicate imports on lines 26-27:
# from src.ui_layer.components.controls import controls_component
# from src.ui_layer.components.metrics_panel import metrics_panel_component
# from src.ui_layer.state_management import state_manager
```

**Verification**:
- Run `streamlit run src/ui_layer/app.py`
- Ensure no import errors occur

### 1.4 Install Missing Dependencies
**Priority**: Critical
**File**: `requirements.txt`
**Estimated Time**: 10 minutes

**Task Details**:
- Add inference_sdk to requirements.txt
- Install the dependency
- Verify Roboflow client can import inference_sdk

**Code Changes**:
```bash
# Add to requirements.txt:
inference-sdk>=0.19.0
```

**Commands**:
```bash
pip install inference-sdk>=0.19.0
```

**Verification**:
- Run `python -c "import inference_sdk; print('SDK imported successfully')"`
- Check Roboflow client no longer runs in mock mode

### 1.5 Implement Real API Configuration
**Priority**: High
**File**: `.env`
**Estimated Time**: 20 minutes

**Task Details**:
- Replace placeholder values with actual configuration
- Create .env.example with proper structure
- Add configuration validation

**Code Changes**:
```env
# .env file:
VITE_ROBOFLOW_API_KEY=your_actual_api_key_here
BASE=https://your-actual-ngrok-url.ngrok-free.app
```

**Verification**:
- Test API connectivity with real credentials
- Verify configuration loading works correctly

## 2. Short-term Improvements (High Priority - Week 2)

### 2.1 Add Comprehensive Error Handling
**Priority**: High
**Files**: Multiple modules
**Estimated Time**: 4 hours

**Task Details**:
- Replace generic exception catching with specific types
- Add custom exception classes for different error types
- Implement proper error logging and recovery

**Implementation Tasks**:
1. Create custom exception classes in `src/utils/exceptions.py`
2. Update `src/clients/roboflow_client.py` with specific error handling
3. Update `src/data_acquisition/network_client.py` with network error handling
4. Add error recovery mechanisms where appropriate

**Code Example**:
```python
# src/utils/exceptions.py
class RoboflowError(Exception):
    """Roboflow API specific errors"""
    pass

class NetworkError(Exception):
    """Network communication errors"""
    pass

# Usage in client modules
try:
    result = api_call()
except RoboflowError as e:
    logger.error(f"Roboflow API error: {e}")
    # Handle Roboflow-specific error
except NetworkError as e:
    logger.error(f"Network error: {e}")
    # Handle network-specific error
```

### 2.2 Implement 1 FPS Validation
**Priority**: High
**File**: `src/data_acquisition/network_client.py`
**Estimated Time**: 2 hours

**Task Details**:
- Add timing verification for frame fetching
- Implement frame rate validation with tolerance
- Add logging for frame rate violations

**Implementation Tasks**:
1. Add frame timing tracking to NetworkClient class
2. Implement validation logic with configurable tolerance
3. Add warning logs for frame rate violations
4. Create configuration option for frame rate tolerance

**Code Example**:
```python
class NetworkClient:
    def __init__(self):
        self.last_frame_time = None
        self.frame_interval = 1.0  # 1 second for 1 fps
        self.tolerance = 0.1  # 10% tolerance
    
    def validate_frame_rate(self):
        current_time = time.time()
        if self.last_frame_time:
            actual_interval = current_time - self.last_frame_time
            expected_interval = self.frame_interval
            tolerance = expected_interval * self.tolerance
            
            if actual_interval < expected_interval - tolerance:
                logger.warning(f"Frame arrived too early: {actual_interval:.2f}s")
            elif actual_interval > expected_interval + tolerance:
                logger.warning(f"Frame arrived too late: {actual_interval:.2f}s")
        
        self.last_frame_time = current_time
```

### 2.3 Add Configuration Validation
**Priority**: High
**File**: `src/utils/config.py`
**Estimated Time**: 2 hours

**Task Details**:
- Add validation for all environment variables
- Implement startup configuration checks
- Add clear error messages for missing configurations

**Implementation Tasks**:
1. Add validate() method to Config class
2. Implement specific validation for each configuration section
3. Add configuration validation to application startup
4. Create helpful error messages for configuration issues

**Code Example**:
```python
class Config:
    def validate(self) -> bool:
        """Validate all configuration parameters"""
        errors = []
        
        # Validate Roboflow configuration
        if not self.roboflow.api_key:
            errors.append("Roboflow API key is required")
        if not self.roboflow.model_id:
            errors.append("Roboflow model ID is required")
        
        # Validate ngrok configuration
        if not self.ngrok.base_url:
            errors.append("ngrok base URL is required")
        if not self.ngrok.base_url.startswith("http"):
            errors.append("ngrok base URL must be a valid HTTP/HTTPS URL")
        
        if errors:
            raise ConfigurationError("\n".join(errors))
        
        return True
```

### 2.4 Add Basic Unit Tests
**Priority**: High
**Files**: `tests/unit/test_shot_analysis.py`, `tests/unit/test_roboflow_client.py`
**Estimated Time**: 6 hours

**Task Details**:
- Create test suite for core functionality
- Implement tests for shot analysis calculations
- Add tests for Roboflow client (both mock and real modes)
- Set up test framework and CI configuration

**Implementation Tasks**:
1. Create test directory structure
2. Write tests for shot distance calculations
3. Write tests for statistical analysis functions
4. Write tests for Roboflow client mock mode
5. Configure pytest and test coverage

**Code Example**:
```python
# tests/unit/test_shot_analysis.py
import pytest
from src.analysis_engine.shot_analysis import Shot

def test_shot_distance_calculation():
    """Test distance calculation between two shots"""
    shot1 = Shot(x=100, y=100)
    shot2 = Shot(x=200, y=200)
    expected_distance = 141.4213562373095  # sqrt(100^2 + 100^2)
    assert abs(shot1.distance_to(shot2) - expected_distance) < 0.001

def test_shot_confidence_filtering():
    """Test filtering shots by confidence threshold"""
    shots = [
        Shot(x=100, y=100, confidence=0.95),
        Shot(x=200, y=150, confidence=0.87),
        Shot(x=150, y=200, confidence=0.92)
    ]
    filtered = Shot.filter_by_confidence(shots, 0.90)
    assert len(filtered) == 2
    assert all(shot.confidence >= 0.90 for shot in filtered)
```

## 3. Medium-term Enhancements (Month 1)

### 3.1 Add Session Persistence
**Priority**: Medium
**File**: `src/ui_layer/state_management.py`
**Estimated Time**: 4 hours

**Task Details**:
- Add save/load functionality for analysis sessions
- Implement JSON serialization for session state
- Add UI controls for session management

**Implementation Tasks**:
1. Add session serialization methods
2. Implement file-based session storage
3. Add session management UI components
4. Test session persistence across application restarts

### 3.2 Add Performance Monitoring
**Priority**: Medium
**File**: `src/utils/performance_monitor.py` (new)
**Estimated Time**: 6 hours

**Task Details**:
- Create performance monitoring utility
- Add timing decorators for critical operations
- Implement performance alerting thresholds
- Create performance dashboard components

**Implementation Tasks**:
1. Create PerformanceMonitor class
2. Add timing decorators for API calls
3. Implement performance logging
4. Create performance metrics display

### 3.3 Add Health Check Endpoints
**Priority**: Medium
**File**: `src/ui_layer/app.py`
**Estimated Time**: 3 hours

**Task Details**:
- Add application health monitoring endpoints
- Implement dependency health checks
- Create health status dashboard

**Implementation Tasks**:
1. Add /health endpoint
2. Implement dependency health checks
3. Create health status UI
4. Add health monitoring alerts

## 4. Implementation Checklist

### Phase 1 Checklist (Week 1)
- [ ] Fix syntax error in shot_analysis.py
- [ ] Fix Roboflow API response parsing
- [ ] Resolve duplicate imports in app.py
- [ ] Install missing inference_sdk dependency
- [ ] Implement real API configuration
- [ ] Verify application starts without errors
- [ ] Test basic shot detection workflow

### Phase 2 Checklist (Week 2)
- [ ] Add comprehensive error handling
- [ ] Implement 1 FPS validation
- [ ] Add configuration validation
- [ ] Create basic unit test suite
- [ ] Verify error handling works correctly
- [ ] Test frame rate validation
- [ ] Run unit tests with >80% coverage

### Phase 3 Checklist (Month 1)
- [ ] Add session persistence
- [ ] Implement performance monitoring
- [ ] Add health check endpoints
- [ ] Test session save/load functionality
- [ ] Verify performance monitoring works
- [ ] Test health check endpoints

This task list provides detailed implementation guidance for making GMShoot production-ready while maintaining its existing architectural foundation.
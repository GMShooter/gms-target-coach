# GMShoot v2 - Production Readiness Implementation Plan

## Overview

This plan addresses critical production readiness issues identified in the project analysis. Focus is on stabilizing the build/deployment pipeline, resolving testing blockers, and implementing production-ready code.

## Phase 1: Critical Infrastructure Fixes (Immediate - 1-2 days)

### 1.1 Dependency Conflict Resolution

#### Issue: Vite 7.1.12 requires @types/node@^20.19.0 || >=22.12.0 but project has @types/node@16.18.126

**Solution:**
```bash
# Update @types/node to compatible version
npm install @types/node@^20.19.0

# If compatibility issues arise, downgrade Vite to stable version
npm install vite@^5.4.0
```

#### Issue: npm audit vulnerabilities (10 total - 4 moderate, 6 high)

**Solution:**
```bash
# Fix non-breaking vulnerabilities first
npm audit fix

# For breaking changes, evaluate each vulnerability individually
npm audit fix --force
```

### 1.2 Jest Configuration Fixes

#### Issue: Multiple @types/jest versions causing conflicts

**Solution:**
```json
// package.json - remove duplicate
{
  "devDependencies": {
    "@types/jest": "^29.5.14", // Keep latest version
    // Remove "@types/jest": "^27.5.2"
  }
}
```

#### Issue: Jest configuration for modern React and TypeScript

**Solution:**
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx)'
  ],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts'
  ]
};
```

### 1.3 Deno/Cypress Compatibility Resolution

#### Issue: Deno panic when Cypress tries to spawn child processes on Windows

**Solution 1: Client-side Only Testing (Immediate)**
```typescript
// cypress/support/e2e.ts
// Disable Edge Function calls during testing
beforeEach(() => {
  cy.window().then((win) => {
    win.localStorage.setItem('VITE_USE_MOCK_HARDWARE', 'true');
    win.localStorage.setItem('VITE_SKIP_EDGE_FUNCTIONS', 'true');
  });
});
```

**Solution 2: Separate Test Environment (Short-term)**
```typescript
// cypress.config.ts
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    env: {
      // Use mock environment for testing
      useMockHardware: true,
      skipEdgeFunctions: true
    },
    setupNodeEvents(on, config) {
      // Prevent Deno-related processes
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--disable-web-security');
        }
        return launchOptions;
      });
    }
  }
});
```

## Phase 2: Production Implementation (Short-term - 3-5 days)

### 2.1 Environment Configuration Management

#### Issue: Mixed environment variables and no clear separation

**Solution:**
```typescript
// src/config/environments.ts
export interface EnvironmentConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  useMockHardware: boolean;
  enableEdgeFunctions: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const development: EnvironmentConfig = {
  apiUrl: 'http://localhost:3001',
  supabaseUrl: process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  useMockHardware: true,
  enableEdgeFunctions: false,
  logLevel: 'debug'
};

const staging: EnvironmentConfig = {
  apiUrl: 'https://staging-api.gmshoot.com',
  supabaseUrl: process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  useMockHardware: false,
  enableEdgeFunctions: true,
  logLevel: 'info'
};

const production: EnvironmentConfig = {
  apiUrl: 'https://api.gmshoot.com',
  supabaseUrl: process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  useMockHardware: false,
  enableEdgeFunctions: true,
  logLevel: 'warn'
};

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'staging': return staging;
    case 'production': return production;
    default: return development;
  }
};
```

### 2.2 Production Hardware Service Implementation

#### Issue: Heavy reliance on mocks with no production path

**Solution:**
```typescript
// src/services/ProductionHardwareAPI.ts
export class ProductionHardwareAPI implements HardwareAPIInterface {
  private config: EnvironmentConfig;
  private supabase: SupabaseClient;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.supabase = createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  async connectViaQRCode(qrData: string): Promise<PiDevice | null> {
    try {
      // Real QR code parsing and device connection
      const device = await this.parseAndValidateQRCode(qrData);
      if (!device) return null;

      // Establish real connection
      await this.establishConnection(device);
      return device;
    } catch (error) {
      console.error('Failed to connect to device:', error);
      throw new HardwareConnectionError('Device connection failed', error);
    }
  }

  async startSession(deviceId: string, request: SessionStartRequest): Promise<SessionData | null> {
    try {
      // Real session creation with hardware
      const session = await this.createHardwareSession(deviceId, request);
      
      // Register with Supabase
      await this.registerSessionInDatabase(session);
      
      return session;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw new SessionCreationError('Session creation failed', error);
    }
  }

  // ... other production methods
}
```

### 2.3 Analysis Service Production Implementation

#### Issue: MockAnalysisService with no production equivalent

**Solution:**
```typescript
// src/services/ProductionAnalysisService.ts
export class ProductionAnalysisService {
  private supabase: SupabaseClient;
  private config: EnvironmentConfig;

  constructor(config: EnvironmentConfig) {
    this.config = config;
    this.supabase = createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  async analyzeFrame(frameData: FrameData): Promise<AnalysisResult> {
    try {
      if (this.config.enableEdgeFunctions) {
        // Use Supabase Edge Functions for analysis
        const { data, error } = await this.supabase.functions.invoke('analyze-frame', {
          body: { frameData }
        });
        
        if (error) throw error;
        return data;
      } else {
        // Fallback to client-side analysis
        return this.performClientSideAnalysis(frameData);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      throw new AnalysisError('Frame analysis failed', error);
    }
  }

  private async performClientSideAnalysis(frameData: FrameData): Promise<AnalysisResult> {
    // Implement client-side computer vision as fallback
    // Use TensorFlow.js or similar for local processing
    return {
      shots: [],
      confidence: 0,
      timestamp: new Date().toISOString()
    };
  }
}
```

## Phase 3: Testing Infrastructure (Short-term - 2-3 days)

### 3.1 Unit Test Implementation

#### Issue: Missing unit test coverage for critical components

**Solution:**
```typescript
// src/__tests__/components/LiveTargetView.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LiveTargetView } from '../components/LiveTargetView';
import { useHardware } from '../hooks/useHardware';

// Mock the hook
jest.mock('../hooks/useHardware');
const mockUseHardware = useHardware as jest.MockedFunction<typeof useHardware>;

describe('LiveTargetView', () => {
  beforeEach(() => {
    mockUseHardware.mockReturnValue({
      isConnected: true,
      isSessionActive: false,
      shots: [],
      analysisResult: null,
      connectToDevice: jest.fn(),
      disconnectDevice: jest.fn(),
      startSession: jest.fn(),
      stopSession: jest.fn(),
      // ... other return values
    });
  });

  it('renders connection status correctly', () => {
    render(<LiveTargetView deviceId="test-device" />);
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
  });

  it('starts session when start button clicked', async () => {
    const mockStartSession = jest.fn();
    mockUseHardware.mockReturnValue({
      ...mockUseHardware(),
      startSession: mockStartSession
    });

    render(<LiveTargetView deviceId="test-device" />);
    
    fireEvent.click(screen.getByTestId('start-session-button'));
    
    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalledWith('test-device', expect.any(Object));
    });
  });

  // ... more tests
});
```

### 3.2 Integration Test Implementation

#### Issue: No integration tests for service interactions

**Solution:**
```typescript
// src/__tests__/integration/HardwareIntegration.test.ts
import { ProductionHardwareAPI } from '../../services/ProductionHardwareAPI';
import { ProductionAnalysisService } from '../../services/ProductionAnalysisService';

describe('Hardware Integration', () => {
  let hardwareAPI: ProductionHardwareAPI;
  let analysisService: ProductionAnalysisService;

  beforeEach(() => {
    const config = getEnvironmentConfig();
    hardwareAPI = new ProductionHardwareAPI(config);
    analysisService = new ProductionAnalysisService(config);
  });

  it('should connect to device and start session', async () => {
    const mockQRData = 'mock-qr-data';
    const device = await hardwareAPI.connectViaQRCode(mockQRData);
    
    expect(device).toBeTruthy();
    expect(device?.id).toBeDefined();
  });

  it('should analyze frame and return results', async () => {
    const mockFrameData: FrameData = {
      id: 'test-frame',
      timestamp: new Date().toISOString(),
      imageUrl: 'test.jpg',
      shots: []
    };

    const result = await analysisService.analyzeFrame(mockFrameData);
    
    expect(result).toHaveProperty('shots');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('timestamp');
  });
});
```

### 3.3 E2E Test Fixes

#### Issue: E2E tests blocked by Deno/Cypress compatibility

**Solution:**
```typescript
// cypress/e2e/production_workflow.cy.ts
describe('Production Workflow', () => {
  beforeEach(() => {
    // Ensure production-like environment
    cy.window().then((win) => {
      win.localStorage.setItem('VITE_USE_MOCK_HARDWARE', 'false');
      win.localStorage.setItem('VITE_ENABLE_EDGE_FUNCTIONS', 'true');
    });
    
    // Mock production API responses
    cy.intercept('GET', '/api/devices', { fixture: 'devices.json' });
    cy.intercept('POST', '/api/sessions', { fixture: 'session.json' });
    cy.intercept('POST', '/api/analyze', { fixture: 'analysis.json' });
  });

  it('should complete full shooting session workflow', () => {
    cy.visit('/');
    
    // Login
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password');
    cy.get('[data-testid="submit-button"]').click();
    
    // Connect to device
    cy.get('[data-testid="connect-device-button"]').click();
    cy.get('[data-testid="qr-scanner"]').should('be.visible');
    
    // Start session
    cy.get('[data-testid="start-session-button"]').click();
    cy.get('[data-testid="session-active"]').should('be.visible');
    
    // Verify analysis
    cy.get('[data-testid="analysis-results"]').should('be.visible');
    cy.get('[data-testid="shot-overlay"]').should('exist');
    
    // End session
    cy.get('[data-testid="stop-session-button"]').click();
    cy.get('[data-testid="session-summary"]').should('be.visible');
  });
});
```

## Phase 4: Error Handling & Logging (Medium-term - 2-3 days)

### 4.1 Centralized Error Handling

#### Issue: Inconsistent error handling patterns

**Solution:**
```typescript
// src/utils/errorHandler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' = 'medium',
    public context?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: Error, context?: any): void {
    const appError = this.normalizeError(error, context);
    
    // Log error
    this.logger.error(appError);
    
    // Send to error tracking service
    this.sendToErrorService(appError);
    
    // Show user-friendly message
    this.showUserMessage(appError);
  }

  private normalizeError(error: Error, context?: any): AppError {
    if (error instanceof AppError) {
      return error;
    }
    
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      'medium',
      context
    );
  }

  private sendToErrorService(error: AppError): void {
    // Send to Sentry, LogRocket, or similar service
    if (process.env.NODE_ENV === 'production') {
      // Implementation depends on error service
    }
  }

  private showUserMessage(error: AppError): void {
    // Show toast, notification, or error page
    // Implementation depends on UI framework
  }
}
```

### 4.2 Comprehensive Logging

#### Issue: No proper logging for debugging and monitoring

**Solution:**
```typescript
// src/utils/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private logLevel: LogLevel;
  private config: EnvironmentConfig;

  constructor() {
    this.config = getEnvironmentConfig();
    this.logLevel = this.getLogLevel(this.config.logLevel);
  }

  debug(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, data);
      this.sendToRemote('debug', message, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, data);
      this.sendToRemote('info', message, data);
    }
  }

  warn(message: string, data?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, data);
      this.sendToRemote('warn', message, data);
    }
  }

  error(message: string, error?: Error): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error);
      this.sendToRemote('error', message, { error: error?.stack });
    }
  }

  private getLogLevel(level: string): LogLevel {
    switch (level) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  private sendToRemote(level: string, message: string, data?: any): void {
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service (e.g., LogRocket, Datadog)
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          data,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(() => {
        // Silently fail to avoid infinite loops
      });
    }
  }
}
```

## Phase 5: Performance & Security (Medium-term - 3-4 days)

### 5.1 Performance Optimization

#### Issue: No performance monitoring or optimization

**Solution:**
```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(name: string): void {
    this.metrics.set(name, performance.now());
  }

  endTimer(name: string): number {
    const startTime = this.metrics.get(name);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    this.metrics.delete(name);
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration}ms`);
    }
    
    return duration;
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.startTimer(name);
      try {
        const result = await fn();
        this.endTimer(name);
        resolve(result);
      } catch (error) {
        this.endTimer(name);
        reject(error);
      }
    });
  }

  getMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    this.metrics.forEach((value, key) => {
      metrics[key] = value;
    });
    return metrics;
  }
}
```

### 5.2 Security Hardening

#### Issue: Missing security validations and protections

**Solution:**
```typescript
// src/utils/security.ts
export class SecurityUtils {
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .trim()
      .substring(0, 1000); // Limit length
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateQRCode(qrData: string): boolean {
    try {
      const parsed = JSON.parse(qrData);
      return parsed.deviceId && parsed.authToken && parsed.apiUrl;
    } catch {
      return false;
    }
  }

  static generateCSRFToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
```

## Implementation Timeline

### Week 1: Critical Fixes
- Day 1-2: Dependency conflicts and security vulnerabilities
- Day 3-4: Jest configuration and unit tests
- Day 5: Deno/Cypress compatibility resolution

### Week 2: Production Implementation
- Day 1-2: Environment configuration management
- Day 3-4: Production hardware service implementation
- Day 5: Production analysis service implementation

### Week 3: Testing & Quality
- Day 1-2: Unit and integration test implementation
- Day 3-4: E2E test fixes and validation
- Day 5: Test coverage and quality assurance

### Week 4: Hardening & Monitoring
- Day 1-2: Error handling and logging implementation
- Day 3-4: Performance optimization
- Day 5: Security hardening and final validation

## Success Criteria

### Technical Criteria
- ✅ All tests passing (unit, integration, E2E)
- ✅ Zero security vulnerabilities
- ✅ Build success rate > 95%
- ✅ Test coverage > 80%
- ✅ Performance scores > 90

### Business Criteria
- ✅ Production deployment successful
- ✅ Zero critical bugs in production
- ✅ User acceptance testing passed
- ✅ Performance benchmarks met
- ✅ Security audit passed

## Risk Mitigation

### High Risk Items
1. **Dependency conflicts** - Mitigate with thorough testing and rollback plans
2. **Production deployment** - Use blue-green deployment strategy
3. **Data migration** - Implement proper backup and rollback procedures
4. **Performance degradation** - Monitor closely and have optimization ready

### Contingency Plans
1. **Rollback strategy** - Keep previous version deployable
2. **Hotfix process** - Quick deployment path for critical fixes
3. **Monitoring alerts** - Immediate notification for production issues
4. **Customer communication** - Prepared templates for issue notifications

## Conclusion

This comprehensive plan addresses all critical production readiness issues identified in the analysis. With focused execution over 4 weeks, the project can achieve production-ready status with proper testing, monitoring, and security measures in place.

The key is systematic implementation of each phase with proper testing and validation at each step. Regular progress reviews and risk assessments will ensure successful delivery.
# Production Monitoring and CI/CD Implementation Plan

## Overview
This document outlines the implementation of production-ready monitoring, error tracking, and CI/CD pipeline for GMShoot v2.

## 1. Sentry Integration - Error Tracking & Performance Monitoring

### Purpose
- Track runtime errors and exceptions
- Monitor performance bottlenecks
- Get detailed error context for debugging

### Implementation Steps

#### 1.1 Install Sentry Dependencies
```bash
npm install @sentry/react @sentry/vite-plugin
```

#### 1.2 Configure Sentry in Vite
Update `vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    sentryVitePlugin({
      org: 'your-org',
      project: 'your-project',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    // ... other plugins
  ],
})
```

#### 1.3 Initialize Sentry in React App
Update `src/main.tsx`:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://your-project.ingest.sentry.io/project-id",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.2, // Capture 20% of transactions for performance
  environment: process.env.NODE_ENV || 'development',
  beforeSend(event) {
    // Filter out sensitive data
    if (event.exception) {
      event.exception.values[0].stacktrace.frames.forEach(frame => {
        if (frame.filename) {
          frame.filename = frame.filename.replace(/\/.*\//, '/src/');
        }
      });
    }
    return event;
  }
});
```

#### 1.4 Add Error Boundaries
Create `src/components/ErrorBoundary.tsx`:
```typescript
import React from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, { hasError: boolean }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600">We've been notified and are working on a fix.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 2. LogRocket Integration - Session Replay & User Analytics

### Purpose
- Record user sessions for debugging
- Track user behavior and interactions
- Get performance insights

### Implementation Steps

#### 2.1 Install LogRocket
```bash
npm install logrocket logrocket-react
```

#### 2.2 Initialize LogRocket
Update `src/main.tsx`:
```typescript
import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

// Only initialize in production
if (process.env.NODE_ENV === 'production') {
  LogRocket.init('your-org/your-app', {
    release: process.env.npm_package_version,
    network: {
      requestSanitizer: (request) => {
        // Remove sensitive headers
        if (request.headers) {
          delete request.headers.authorization;
          delete request.headers.cookie;
        }
        return request;
      },
      responseSanitizer: (response) => {
        // Remove sensitive response data
        if (response.body && typeof response.body === 'string') {
          response.body = response.body.replace(/"password":"[^"]*"/g, '"password":"[REDACTED]"');
        }
        return response;
      }
    }
  });
  
  setupLogRocketReact(LogRocket);
}
```

#### 2.3 Integrate with Sentry
Add to Sentry initialization:
```typescript
Sentry.init({
  // ... existing config
  integrations: [
    new Sentry.BrowserTracing(),
    new LogRocketSentry(LogRocket),
  ],
});
```

## 3. GitHub Actions CI/CD Pipeline

### Purpose
- Automated testing on every push/PR
- Automated deployment to staging/production
- Code quality checks and security scanning

### Implementation Steps

#### 3.1 Create GitHub Actions Workflow
Create `.github/workflows/ci-cd.yml`:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  CACHE_VERSION: 'v1'

jobs:
  # Code Quality and Security
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run Prettier check
        run: npm run format:check

      - name: Run TypeScript check
        run: npm run type-check

      - name: Security audit
        run: npm audit --audit-level=moderate

      - name: Run CodeQL Analysis
        uses: github/codeql-action/init@v2
        with:
          languages: javascript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  # Testing
  test:
    runs-on: ubuntu-latest
    needs: quality
    strategy:
      matrix:
        test-type: [unit, e2e]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Unit Tests
        if: matrix.test-type == 'unit'
        run: npm run test:unit

      - name: Run E2E Tests
        if: matrix.test-type == 'e2e'
        run: npm run test:e2e
        env:
          CYPRESS_baseUrl: http://localhost:3000

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  # Build and Deploy
  deploy:
    runs-on: ubuntu-latest
    needs: [quality, test]
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          VITE_LOGROCKET_APP_ID: ${{ secrets.LOGROCKET_APP_ID }}

      - name: Deploy to staging
        run: |
          # Add deployment commands here
          echo "Deploying to staging..."

      - name: Deploy to production
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: |
          # Add production deployment commands here
          echo "Deploying to production..."

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

#### 3.2 Update Package.json Scripts
Add to `package.json`:
```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write src/**/*.{ts,tsx}",
    "format:check": "prettier --check src/**/*.{ts,tsx}",
    "type-check": "tsc --noEmit",
    "test:unit": "jest --coverage",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "pre-commit": "npm run lint && npm run type-check && npm run test:unit",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## 4. Security Enhancements

### 4.1 ESLint Security Plugins
```bash
npm install eslint-plugin-security --save-dev
```

Update `.eslintrc.js`:
```javascript
module.exports = {
  extends: [
    // ... existing extends
    'plugin:security/recommended'
  ],
  plugins: [
    // ... existing plugins
    'security'
  ],
  rules: {
    // Security rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-unsafe-regex': 'error'
  }
};
```

### 4.2 Content Security Policy
Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://js.sentry-cdn.com https://cdn.logrocket.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.supabase.co https://sentry.io https://*.logrocket.io;
  font-src 'self';
  object-src 'none';
  media-src 'self';
  frame-src 'none';
">
```

## 5. Environment Configuration

### 5.1 Production Environment Variables
Create `.env.production`:
```env
# Sentry
VITE_SENTRY_DSN=https://your-project.ingest.sentry.io/project-id
VITE_SENTRY_AUTH_TOKEN=your-auth-token

# LogRocket
VITE_LOGROCKET_APP_ID=your-org/your-app

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# Firebase
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### 5.2 Environment-Specific Configurations
Update `src/utils/env.ts`:
```typescript
export const env = {
  // ... existing vars
  VITE_SENTRY_DSN: getEnvVar('VITE_SENTRY_DSN'),
  VITE_LOGROCKET_APP_ID: getEnvVar('VITE_LOGROCKET_APP_ID'),
  VITE_NODE_ENV: getEnvVar('NODE_ENV') || 'development',
};

export const isProduction = env.VITE_NODE_ENV === 'production';
export const isDevelopment = env.VITE_NODE_ENV === 'development';
```

## 6. Performance Optimization

### 6.1 Bundle Analysis
```bash
npm install --save-dev @rollup/plugin-analyzer rollup-plugin-visualizer
```

Update `vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    // ... existing plugins
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react', 'framer-motion'],
          utils: ['clsx', 'tailwind-merge'],
        },
      },
    },
  },
})
```

### 6.2 Performance Monitoring
Add to Sentry initialization:
```typescript
Sentry.init({
  // ... existing config
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ['localhost', 'your-domain.com'],
      routingInstrumentation: Sentry.reactRouterV6Instrumentation,
    }),
  ],
  tracesSampleRate: isProduction ? 0.2 : 1.0,
});
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Set up GitHub Actions workflow
- [ ] Configure ESLint security plugins
- [ ] Add CodeQL scanning

### Week 2: Monitoring
- [ ] Install and configure Sentry
- [ ] Add error boundaries
- [ ] Set up LogRocket

### Week 3: Optimization
- [ ] Configure bundle analysis
- [ ] Add performance monitoring
- [ ] Optimize build configuration

### Week 4: Testing & Deployment
- [ ] Test CI/CD pipeline
- [ ] Monitor error tracking in staging
- [ ] Deploy to production

## Success Metrics

### Code Quality
- Zero high-severity security vulnerabilities
- 90%+ test coverage
- Zero ESLint errors

### Performance
- Bundle size < 1MB (gzipped)
- First Contentful Paint < 2s
- Largest Contentful Paint < 3s

### Monitoring
- 100% of errors captured in Sentry
- Session replay for 90% of user errors
- Alert response time < 5 minutes

## Next Steps

1. **Immediate**: Set up GitHub Actions workflow for automated testing
2. **Short-term**: Implement Sentry for error tracking
3. **Medium-term**: Add LogRocket for user session monitoring
4. **Long-term**: Optimize performance and set up production monitoring dashboard

## Dependencies

### Required Packages
```json
{
  "@sentry/react": "^7.0.0",
  "@sentry/vite-plugin": "^0.7.0",
  "logrocket": "^2.0.0",
  "logrocket-react": "^5.0.0",
  "eslint-plugin-security": "^1.7.0",
  "@rollup/plugin-analyzer": "^4.0.0",
  "rollup-plugin-visualizer": "^5.0.0"
}
```

### Environment Variables Needed
```env
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
LOGROCKET_APP_ID=
SLACK_WEBHOOK=
```

This plan provides a comprehensive approach to making GMShoot v2 production-ready with proper monitoring, error tracking, and CI/CD pipeline.
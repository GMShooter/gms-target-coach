# GMShooter v2 - Testing Requirements

## Testing Strategy
GMShooter v2 follows a comprehensive testing approach with multiple layers of testing to ensure reliability, performance, and user satisfaction.

## Testing Pyramid

### 1. Unit Tests (70%)
- Fast, isolated tests for individual functions and components
- Mock external dependencies
- Test business logic and utility functions

### 2. Integration Tests (20%)
- Test component interactions
- Test API integrations
- Test data flow between components

### 3. End-to-End Tests (10%)
- Test complete user workflows
- Test critical paths
- Test cross-browser compatibility

## Testing Tools

### Unit Testing
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **MSW**: API mocking for service workers

### Integration Testing
- **React Testing Library**: Testing component interactions
- **Supabase Test Helpers**: Database testing utilities
- **Firebase Test Utils**: Authentication testing

### End-to-End Testing
- **Cypress**: E2E test runner
- **Cypress Studio**: Visual test creation
- **BrowserStack**: Cross-browser testing

### Visual Testing
- **Storybook**: Component documentation and visual testing
- **Chromatic**: Visual regression testing
- **Percy**: Visual diff testing

### Performance Testing
- **Lighthouse**: Performance auditing
- **WebPageTest**: Performance monitoring
- **Bundle Analyzer**: Bundle size analysis

## Unit Testing Guidelines

### Component Testing
```typescript
// Example: Button component test
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies correct variant styles', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-500')
  })
})
```

### Hook Testing
```typescript
// Example: useVideoAnalysis hook test
import { renderHook, act } from '@testing-library/react-hooks'
import { useVideoAnalysis } from './useVideoAnalysis'

describe('useVideoAnalysis Hook', () => {
  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useVideoAnalysis())
    
    expect(result.current.isUploading).toBe(false)
    expect(result.current.isProcessing).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.results).toEqual([])
    expect(result.current.error).toBe(null)
  })

  it('handles video upload correctly', async () => {
    const { result } = renderHook(() => useVideoAnalysis())
    const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' })
    
    await act(async () => {
      const sessionId = await result.current.uploadVideo(mockFile)
      expect(sessionId).toBeDefined()
    })
    
    expect(result.current.isUploading).toBe(false)
    expect(result.current.sessionId).toBeDefined()
  })
})
```

### Utility Function Testing
```typescript
// Example: Supabase utility test
import { createSession } from './supabase'
import { supabase } from '../lib/supabase'

jest.mock('../lib/supabase')

describe('Supabase Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates session successfully', async () => {
    const mockSession = { id: 'session-123' }
    ;(supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockSession, error: null })
        })
      })
    })

    const result = await createSession('user-123', 'video')
    expect(result).toBe('session-123')
  })

  it('handles session creation error', async () => {
    const mockError = new Error('Database error')
    ;(supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: mockError })
        })
      })
    })

    await expect(createSession('user-123', 'video')).rejects.toThrow('Database error')
  })
})
```

## Integration Testing Guidelines

### Component Integration
```typescript
// Example: VideoAnalysis integration test
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VideoAnalysis } from './VideoAnalysis'
import { supabase } from '../lib/supabase'

// Mock Supabase
jest.mock('../lib/supabase')

describe('VideoAnalysis Integration', () => {
  beforeEach(() => {
    ;(supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null })
    })
    ;(supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'session-123' }, error: null })
        })
      })
    })
  })

  it('uploads and processes video end-to-end', async () => {
    render(<VideoAnalysis />)
    
    const fileInput = screen.getByLabelText(/upload video/i)
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' })
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.getByText(/processing/i)).toBeInTheDocument()
    }, { timeout: 5000 })
  })
})
```

### API Integration
```typescript
// Example: API integration test
import { analyzeFrame } from './roboflow'
import { server } from '../mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Roboflow API Integration', () => {
  it('analyzes frame successfully', async () => {
    const mockResponse = {
      predictions: [
        { x: 100, y: 100, width: 50, height: 50, confidence: 0.95, class: 'target' }
      ]
    }
    
    server.use(
      rest.post('https://api.roboflow.com/test/model', (req, res, ctx) => {
        return res(ctx.json(mockResponse))
      })
    )
    
    const result = await analyzeFrame('data:image/jpeg;base64,test')
    expect(result.predictions).toHaveLength(1)
    expect(result.predictions[0].confidence).toBe(0.95)
  })
})
```

## End-to-End Testing Guidelines

### User Workflows
```typescript
// Example: Cypress E2E test
describe('Video Analysis Workflow', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password')
    cy.visit('/analysis')
  })

  it('completes full video analysis workflow', () => {
    // Upload video
    cy.get('[data-testid="video-upload"]').attachFile('test-video.mp4')
    cy.get('[data-testid="upload-button"]').click()
    
    // Wait for upload
    cy.get('[data-testid="upload-progress"]', { timeout: 10000 })
      .should('contain', '100%')
    
    // Wait for processing
    cy.get('[data-testid="processing-status"]', { timeout: 30000 })
      .should('contain', 'Completed')
    
    // View results
    cy.get('[data-testid="results-container"]').should('be.visible')
    cy.get('[data-testid="accuracy-score"]').should('contain', '%')
    
    // Generate report
    cy.get('[data-testid="generate-report"]').click()
    cy.get('[data-testid="report-view"]').should('be.visible')
  })
})
```

### Cross-Browser Testing
```typescript
// Example: Cross-browser test configuration
const browsers = [
  {
    name: 'chrome',
    family: 'chromium',
    channel: 'stable',
    os: 'windows'
  },
  {
    name: 'firefox',
    family: 'firefox',
    channel: 'stable',
    os: 'windows'
  },
  {
    name: 'safari',
    family: 'webkit',
    channel: 'stable',
    os: 'mac'
  }
]

describe('Cross-Browser Compatibility', () => {
  browsers.forEach(browser => {
    describe(`${browser.name} on ${browser.os}`, () => {
      it('renders landing page correctly', () => {
        cy.visit('/')
        cy.get('[data-testid="landing-page"]').should('be.visible')
        cy.get('[data-testid="logo"]').should('be.visible')
        cy.get('[data-testid="cta-button"]').should('be.visible')
      })
    })
  })
})
```

## Visual Testing Guidelines

### Storybook Configuration
```typescript
// .storybook/main.ts
export default {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    'chromatic'
  ]
}
```

### Component Stories
```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered'
  }
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Button'
  }
}

export const WithIcon: Story = {
  args: {
    children: 'With Icon',
    leftIcon: <PlusIcon />
  }
}

export const Variants: Story = {
  render: () => (
    <div className="space-x-2">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
    </div>
  )
}
```

## Performance Testing

### Lighthouse CI Configuration
```yaml
# .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
```

### Bundle Analysis
```javascript
// scripts/analyze-bundle.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ]
}
```

## Accessibility Testing

### Axe Configuration
```typescript
// jest.setup.js
import { configureAxe } from 'jest-axe'

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false } // Disable if testing with incomplete design
  }
})

expect.extend(toHaveNoViolations)
```

### Accessibility Tests
```typescript
// Example: Accessibility test
import { render, act } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { LoginScreen } from './LoginScreen'

describe('LoginScreen Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<LoginScreen />)
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

## Test Data Management

### Fixtures
```typescript
// fixtures/user.ts
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User'
}

// fixtures/analysis.ts
export const mockAnalysisResults = [
  {
    id: 'result-1',
    frameNumber: 1,
    accuracy: 0.95,
    confidence: 0.87,
    predictions: [
      { x: 100, y: 100, width: 50, height: 50, confidence: 0.95, class: 'target' }
    ]
  }
]
```

### Factories
```typescript
// factories/session.ts
import { faker } from '@faker-js/faker'

export const createSession = (overrides = {}) => ({
  id: faker.datatype.uuid(),
  userId: faker.datatype.uuid(),
  title: faker.lorem.words(3),
  status: 'completed',
  progress: 100,
  createdAt: faker.date.past(),
  ...overrides
})
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Coverage

### Coverage Requirements
- **Minimum Coverage**: 80%
- **Critical Components**: 90%
- **Utility Functions**: 95%

### Coverage Configuration
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.stories.@(js|jsx|ts|tsx)',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

## Testing Best Practices

### General Guidelines
1. **Test behavior, not implementation**
2. **Write descriptive test names**
3. **Use meaningful assertions**
4. **Keep tests simple and focused**
5. **Mock external dependencies**
6. **Test edge cases and error conditions**

### Test Organization
1. **Group related tests** with `describe`
2. **Use `beforeEach`** for common setup
3. **Use `test` or `it`** for individual tests
4. **Arrange, Act, Assert** pattern

### Maintenance
1. **Review tests regularly**
2. **Update tests with code changes**
3. **Remove obsolete tests**
4. **Refactor test code**
5. **Monitor test performance**
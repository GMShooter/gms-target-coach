# GMShoot v2 UI/UX Fix Plan

## Executive Summary

**UI/UX Status: CRITICAL** 🚨

GMShoot v2 has significant UI/UX issues that prevent basic functionality. The main problems are button rendering failures and authentication system breakdowns. This plan addresses all identified issues with specific implementation solutions.

---

## 1. Critical UI Issues Analysis

### 1.1 Button Rendering Problems

#### Root Cause Analysis
1. **Missing CSS Animations**: Components reference undefined animation classes
2. **Missing Dependencies**: Framer Motion may not be properly bundled
3. **CSS Custom Properties**: Undefined CSS variables in components
4. **Import Path Issues**: Incorrect component imports

#### Specific Issues Identified

##### Issue 1: Missing Animation Classes
```typescript
// src/components/ui/magic-button.tsx:20
shimmer: "bg-primary text-primary-foreground before:absolute before:inset-0 before:h-full before:w-full before:translate-x-full before:skew-x-12 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer relative overflow-hidden",
```

**Problem**: `animate-shimmer` class is referenced but not defined in any CSS file.

##### Issue 2: Missing CSS Custom Properties
```typescript
// src/components/ui/magic-card.tsx:116
className="bg-border pointer-events-none absolute inset-0 rounded-[inherit] duration-300 group-hover:opacity-100"
```

**Problem**: `bg-border` CSS custom property is not defined.

##### Issue 3: Framer Motion Dependencies
```typescript
// src/components/ui/magic-button.tsx:49
<motion.button
  className={cn(buttonVariants({ variant, size, className }))}
  ref={ref}
  disabled={disabled || loading}
  whileTap={{ scale: 0.95 }}
  whileHover={{ scale: 1.02 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
  {...(props as any)}
>
```

**Problem**: Framer Motion may not be properly imported or bundled.

### 1.2 Authentication System Issues

#### Root Cause Analysis
1. **Dual Authentication Systems**: Both Firebase and Supabase implemented
2. **Database Schema Mismatch**: UUID vs VARCHAR comparison issues
3. **Context Provider Problems**: Auth context not properly wrapping components
4. **Missing Google OAuth**: Incomplete Google authentication implementation

#### Specific Issues Identified

##### Issue 1: Database Type Mismatch
```sql
-- supabase/migrations/002_add_users_table.sql:24
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = firebase_uid);
```

**Problem**: Comparing UUID (`auth.uid()`) with VARCHAR (`firebase_uid`) causes authentication failures.

##### Issue 2: Incomplete Google OAuth
```typescript
// src/hooks/useAuth.tsx:66
// Note: Google OAuth would need to be implemented in AuthService
// For now, we'll show an error message
setError('Google sign-in not yet implemented. Please use email sign-in.');
```

**Problem**: Google OAuth is not implemented, showing error to users.

##### Issue 3: Mock Authentication Logic
```typescript
// src/hooks/useAuth.tsx:52
if (env.VITE_USE_MOCK_AUTH === 'true' || env.VITE_USE_MOCK_HARDWARE === 'true') {
  // Mock Google sign-in for testing
  const mockUser: AuthUser = {
    id: 'mock-user-id',
    email: 'mockuser@example.com',
    fullName: 'Mock User',
    createdAt: new Date().toISOString()
  };
  setUser(mockUser);
  setLoading(false);
  return;
}
```

**Problem**: Mock authentication logic interferes with real authentication.

---

## 2. UI/UX Fix Implementation Plan

### 2.1 Button Rendering Fixes (Days 1-2)

#### Task 1: Define Missing CSS Animations
**File**: `src/index.css` or `src/App.css`

```css
/* Add missing animation keyframes */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -30px, 0);
  }
  70% {
    transform: translate3d(0, -15px, 0);
  }
  90% {
    transform: translate3d(0, -4px, 0);
  }
}

/* Apply animation classes */
.animate-shimmer {
  animation: shimmer 2s infinite;
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.animate-bounce {
  animation: bounce 1s infinite;
}
```

#### Task 2: Define CSS Custom Properties
**File**: `src/index.css` or `src/App.css`

```css
/* Define CSS custom properties */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

/* Dark mode custom properties */
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

#### Task 3: Fix Framer Motion Dependencies
**File**: `package.json`

```json
{
  "dependencies": {
    "framer-motion": "^10.16.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

**File**: `src/components/ui/magic-button.tsx`

```typescript
// Fix imports and ensure proper bundling
import React, { forwardRef } from "react"
import { motion } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

// Ensure motion components are properly exported
const MotionButton = motion.button;

// Update component to use MotionButton
const MagicButton = forwardRef<HTMLButtonElement, MagicButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, ripple = false, children, disabled, ...props }, ref) => {
    return (
      <MotionButton
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...props}
      >
        {/* Rest of component */}
      </MotionButton>
    )
  },
)
```

### 2.2 Authentication System Fixes (Days 3-4)

#### Task 1: Fix Database Schema Type Mismatch
**File**: `supabase/migrations/002_add_users_table.sql`

```sql
-- Fix type mismatch in users table RLS policies
-- Option 1: Convert firebase_uid to UUID
ALTER TABLE users ALTER COLUMN firebase_uid TYPE UUID USING firebase_uid::uuid;

-- Option 2: Convert auth.uid() to text (recommended for Firebase compatibility)
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = firebase_uid);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = firebase_uid);

-- Option 3: Use proper Firebase integration (best long-term solution)
-- This would involve using Firebase Auth exclusively or implementing proper UID conversion
```

#### Task 2: Implement Google OAuth Properly
**File**: `src/services/AuthService.ts`

```typescript
// Add Google OAuth implementation
class AuthService {
  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        this.setError(this.getAuthErrorMessage(error));
        return { success: false, error: this.getAuthErrorMessage(error) };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }
}
```

**File**: `src/hooks/useAuth.tsx`

```typescript
// Update Google sign-in handler
const handleGoogleSignIn = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Remove mock logic and use real Google OAuth
    const result = await authService.signInWithGoogle();
    
    if (!result.success) {
      setError(result.error || 'Failed to sign in with Google');
    }
  } catch (error: any) {
    console.error('Google sign in error:', error);
    setError(error.message || 'Failed to sign in with Google');
  } finally {
    setLoading(false);
  }
};
```

#### Task 3: Remove Mock Authentication Logic
**File**: `src/hooks/useAuth.tsx`

```typescript
// Remove mock authentication paths
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Remove mock authentication logic
  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Remove mock hardware check
      // if (env.VITE_USE_MOCK_HARDWARE === 'true') { ... }
      
      // Use only real authentication
      const result = await authService.signIn({ email, password });
      
      if (result.success) {
        syncAuthState();
      } else {
        setError(result.error || 'Failed to sign in with email');
      }
    } catch (error: any) {
      console.error('Email sign in error:', error);
      setError(error.message || 'Failed to sign in with email');
    } finally {
      setLoading(false);
    }
  };

  // Similar updates for handleEmailSignUp and handleGoogleSignIn
};
```

#### Task 4: Fix Auth Context Provider
**File**: `src/App.tsx`

```typescript
// Ensure proper AuthProvider wrapping
import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Your routes here */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

### 2.3 Component Rendering Fixes (Days 5-6)

#### Task 1: Fix Magic UI Components
**File**: `src/components/ui/magic-card.tsx`

```typescript
// Fix CSS custom property usage
export function MagicCard({
  children,
  className,
  variant,
  size,
  gradientSize = 200,
  gradientColor = "#262626",
  gradientOpacity = 0.8,
  gradientFrom = "#9E7AFF",
  gradientTo = "#FE8BBB",
  hover,
}: MagicCardProps) {
  // Fix CSS custom property reference
  return (
    <div
      className={getCardClasses()}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerEnter={reset}
    >
      <motion.div
        className="bg-gray-200 pointer-events-none absolute inset-0 rounded-[inherit] duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
            ${gradientFrom}, 
            ${gradientTo}, 
            #e5e7eb 100%
            )
          `,
        }}
      />
      <div className="bg-white absolute inset-px rounded-[inherit]" />
      <motion.div
        className="pointer-events-none absolute inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
            `,
          opacity: gradientOpacity,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
```

#### Task 2: Fix Text Gradient Component
**File**: `src/components/ui/text-gradient.tsx`

```typescript
// Fix missing pattern references
import React, { forwardRef } from "react"
import { cn } from "../../lib/utils"

export interface TextGradientProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'ocean' | 'cosmic' | 'sunset'
  size?: string
  weight?: string
  animation?: string
}

const TextGradient = forwardRef<HTMLSpanElement, TextGradientProps>(
  ({ className, variant = 'primary', size, weight, animation, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Fix pattern references
          variant === 'ocean' ? 'bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent' :
          variant === 'cosmic' ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent' :
          variant === 'sunset' ? 'bg-gradient-to-r from-orange-400 to-pink-600 bg-clip-text text-transparent' :
          variant === 'primary' ? 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent' :
          variant === 'secondary' ? 'bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent' :
          variant === 'tertiary' ? 'bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent' :
          variant === 'quaternary' ? 'bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent' :
          'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent',
          size,
          weight,
          animation && (animation === 'float' ? 'animate-bounce' : `animate-${animation}`),
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  },
)
TextGradient.displayName = "TextGradient"

export { TextGradient }
```

### 2.4 Error Handling and User Feedback (Days 7-8)

#### Task 1: Add Error Boundaries
**File**: `src/components/ErrorBoundary.tsx`

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">An error occurred while rendering this component.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### Task 2: Add Loading States
**File**: `src/components/LoadingSpinner.tsx`

```typescript
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`} />
  );
};

export default LoadingSpinner;
```

#### Task 3: Add Toast Notifications
**File**: `src/components/Toast.tsx`

```typescript
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};
```

---

## 3. Testing Strategy

### 3.1 UI Component Testing

#### Button Component Tests
```typescript
// src/__tests__/components/magic-button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MagicButton } from '../components/ui/magic-button';

describe('MagicButton', () => {
  test('renders correctly', () => {
    render(<MagicButton>Click me</MagicButton>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<MagicButton onClick={handleClick}>Click me</MagicButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('shows loading state', () => {
    render(<MagicButton loading>Loading</MagicButton>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  test('applies variant styles', () => {
    render(<MagicButton variant="gradient">Gradient Button</MagicButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gradient-to-r');
  });
});
```

#### Authentication Component Tests
```typescript
// src/__tests__/components/magic-login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MagicLogin } from '../components/ui/magic-login';

describe('MagicLogin', () => {
  test('renders login form', () => {
    render(<MagicLogin onLogin={jest.fn()} />);
    
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    const handleLogin = jest.fn();
    render(<MagicLogin onLogin={handleLogin} />);
    
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password' } });
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(handleLogin).toHaveBeenCalledWith('test@example.com', 'password');
    });
  });

  test('shows validation errors', async () => {
    render(<MagicLogin onLogin={jest.fn()} />);
    
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('email-error')).toBeInTheDocument();
      expect(screen.getByTestId('password-error')).toBeInTheDocument();
    });
  });
});
```

### 3.2 Integration Testing

#### Authentication Flow Tests
```typescript
// src/__tests__/integration/auth-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App';
import { BrowserRouter } from 'react-router-dom';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async () => {
    renderWithRouter(<App />);
    
    // Navigate to login
    fireEvent.click(screen.getByText('Sign In'));
    
    // Fill form
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password' } });
    
    // Submit form
    fireEvent.click(screen.getByTestId('login-button'));
    
    // Wait for successful login
    await waitFor(() => {
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });
  });

  test('should show error with invalid credentials', async () => {
    renderWithRouter(<App />);
    
    // Navigate to login
    fireEvent.click(screen.getByText('Sign In'));
    
    // Fill form with invalid credentials
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'invalid@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'wrongpassword' } });
    
    // Submit form
    fireEvent.click(screen.getByTestId('login-button'));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toBeInTheDocument();
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });
});
```

---

## 4. Performance Optimization

### 4.1 Bundle Optimization

#### Code Splitting
```typescript
// src/App.tsx - Implement code splitting
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load components
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

#### Tree Shaking
```javascript
// vite.config.ts - Optimize bundle
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion', 'class-variance-authority'],
          auth: ['@supabase/supabase-js']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['framer-motion', 'class-variance-authority']
  }
});
```

### 4.2 CSS Optimization

#### Critical CSS
```typescript
// src/styles/critical.css - Critical above-the-fold CSS
.critical-container {
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.critical-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
}

.critical-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## 5. Success Metrics

### 5.1 UI/UX Metrics

| Metric | Target | Current Status |
|--------|--------|----------------|
| Button Rendering Success Rate | 100% | 70% (broken) |
| Authentication Success Rate | 95% | 60% (broken) |
| Page Load Time | <2 seconds | 3-5 seconds |
| First Contentful Paint | <1.5 seconds | 2-3 seconds |
| Cumulative Layout Shift | <0.1 | 0.3-0.5 |

### 5.2 Error Rate Metrics

| Metric | Target | Current Status |
|--------|--------|----------------|
| JavaScript Errors | <1% | 5-10% |
| Authentication Errors | <2% | 15-20% |
| Component Rendering Errors | <0.5% | 3-5% |
| Network Errors | <1% | 2-3% |

### 5.3 User Experience Metrics

| Metric | Target | Current Status |
|--------|--------|----------------|
| User Satisfaction Score | >8/10 | 4/10 |
| Task Completion Rate | >90% | 60% |
| Error Recovery Rate | >80% | 30% |
| Accessibility Score | AA | Not assessed |

---

## 6. Implementation Timeline

### Week 1: Critical Fixes (Days 1-5)
- [ ] Fix CSS animations and custom properties
- [ ] Fix Framer Motion dependencies
- [ ] Fix database schema type mismatch
- [ ] Implement Google OAuth
- [ ] Remove mock authentication logic

### Week 2: Component Improvements (Days 6-10)
- [ ] Fix Magic UI components
- [ ] Add error boundaries
- [ ] Add loading states
- [ ] Add toast notifications
- [ ] Improve form validation

### Week 3: Testing and Optimization (Days 11-15)
- [ ] Implement UI component tests
- [ ] Add integration tests
- [ ] Optimize bundle size
- [ ] Implement performance monitoring
- [ ] Add accessibility improvements

### Week 4: Final Polish (Days 16-20)
- [ ] Conduct user testing
- [ ] Fix remaining UI issues
- [ ] Optimize performance
- [ ] Complete documentation
- [ ] Prepare for production

---

## 7. Risk Assessment

### High-Risk Issues
1. **CSS Animation Conflicts**: Multiple animation libraries may conflict
2. **Authentication Breakdown**: Database changes may break existing users
3. **Component Dependencies**: UI components may have circular dependencies

### Medium-Risk Issues
1. **Performance Regression**: New features may impact performance
2. **Browser Compatibility**: New CSS features may not work in all browsers
3. **Accessibility Issues**: New components may not be accessible

### Mitigation Strategies
1. **Incremental Deployment**: Deploy changes gradually
2. **Comprehensive Testing**: Test all changes thoroughly
3. **Rollback Plan**: Have quick rollback procedures ready
4. **User Feedback**: Collect and act on user feedback quickly

---

## 8. Conclusion

The UI/UX issues in GMShoot v2 are critical and require immediate attention. The main problems are:

1. **Button Rendering Failures**: Missing CSS animations and dependencies
2. **Authentication System Breakdown**: Database schema issues and incomplete OAuth implementation
3. **Component Rendering Issues**: Missing CSS custom properties and import problems

Following this 4-week fix plan will address all identified issues and result in a fully functional, user-friendly interface.

**Expected Outcomes:**
- 100% button rendering success rate
- 95% authentication success rate
- <2 second page load times
- AA accessibility compliance
- >8/10 user satisfaction score

The fixes outlined in this plan are essential for production readiness and must be completed before any production deployment can be considered.
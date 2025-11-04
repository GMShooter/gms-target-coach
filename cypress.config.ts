import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false, // Disable video recording to avoid Deno compatibility issues
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    env: {
      // Environment variables for testing - use VITE_ prefix for consistency
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'test-key',
      VITE_USE_MOCK_AUTH: 'true',
      VITE_USE_MOCK_HARDWARE: 'true',
      // Legacy environment variables for backward compatibility
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key',
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || 'test-api-key',
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || 'test.firebaseapp.com',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'test-project',
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'test.appspot.com',
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '123456789',
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '1:123456789:web:abcdef',
      // Deno compatibility flags
      SKIP_DENO_SERVICES: 'true',
      DENO_DISABLED: 'true',
      USE_NODE_FALLBACK: 'true',
    },
    setupNodeEvents(on, config) {
      // Enhanced Deno compatibility for all platforms
      config.env.SKIP_DENO_SERVICES = 'true';
      config.env.DENO_DISABLED = 'true';
      config.env.USE_NODE_FALLBACK = 'true';
      
      // Disable video recording completely to avoid Deno issues
      config.video = false;
      
      // Set longer timeouts for mock services
      config.defaultCommandTimeout = 15000;
      config.requestTimeout = 15000;
      config.responseTimeout = 15000;
      
      // Handle API mocking for Deno compatibility
      on('task', {
        // Mock Deno-based edge functions
        mockEdgeFunction({ functionName, response }: any) {
          return new Promise((resolve) => {
            setTimeout(() => resolve(response), 100);
          });
        },
        
        // Mock file operations that might use Deno
        mockFileOperation({ operation, path, data }: any) {
          return new Promise((resolve) => {
            setTimeout(() => resolve({ success: true, data }), 50);
          });
        }
      });
      
      return config;
    },
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});
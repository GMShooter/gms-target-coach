import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    env: {
      // Environment variables for testing
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key',
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || 'test-api-key',
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || 'test.firebaseapp.com',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'test-project',
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'test.appspot.com',
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '123456789',
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '1:123456789:web:abcdef',
    },
    setupNodeEvents(on, config) {
      // Skip Deno-based services for Windows compatibility
      if (process.platform === 'win32') {
        config.env.SKIP_DENO_SERVICES = 'true';
        // Disable video recording on Windows to avoid Deno issues
        config.video = false;
        // Use Node.js instead of Deno for Edge Functions
        config.env.DENO_DISABLED = 'true';
      }
      // implement node event listeners here
    },
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});
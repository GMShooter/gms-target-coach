import * as Sentry from "@sentry/react";

import { env } from "./utils/env";

// Initialize Sentry in production
export function initSentry() {
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL.includes('production')) {
    Sentry.init({
      dsn: "https://your-dsn@sentry.io/project-id", // Replace with actual DSN
      tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
      environment: "production",
      beforeSend(event) {
        // Filter out sensitive information
        if (event.exception) {
          const error = event.exception.values?.[0];
          if (error?.value?.includes("password") ||
              error?.value?.includes("token") ||
              error?.value?.includes("secret")) {
            return null; // Don't send sensitive errors
          }
        }
        return event;
      },
    });
  }
}

// Custom error reporting function
export function reportError(error: Error, context?: Record<string, any>) {
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL.includes('production')) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
      }
      Sentry.captureException(error);
    });
  } else {
    console.error("Error reported:", error, context);
  }
}

// Performance monitoring
export function startTransaction(name: string, op: string = "navigation") {
  // Simplified implementation for compatibility
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL.includes('production')) {
    console.log(`Starting transaction: ${name} (${op})`);
    return {
      finish: () => console.log(`Finished transaction: ${name}`)
    };
  }
  return null;
}

// User feedback
export function captureUserFeedback(email: string, comments: string) {
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL.includes('production')) {
    // Note: captureUserFeedback is not available in the current Sentry version
    // This would need to be implemented with a custom form or feedback mechanism
    console.warn('Sentry user feedback not available in current version');
  }
}
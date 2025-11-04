import * as LogRocket from 'logrocket';

import { env } from './utils/env';

// Initialize LogRocket in production
export function initLogRocket() {
  // Production-ready service - always initialize LogRocket
  LogRocket.init('your-app-id/logrocket', { // Replace with actual app ID
    network: {
      requestSanitizer: (request: any) => {
        // Remove sensitive headers
        if (request.headers) {
          const { authorization, ...sanitizedHeaders } = request.headers;
          request.headers = sanitizedHeaders;
        }
        
        // Remove sensitive data from request body
        if (request.body && typeof request.body === 'string') {
          try {
            const body = JSON.parse(request.body);
            if (body.password || body.token || body.secret) {
              const sanitizedBody = { ...body };
              if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
              if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
              if (sanitizedBody.secret) sanitizedBody.secret = '[REDACTED]';
              request.body = JSON.stringify(sanitizedBody);
            }
          } catch (e) {
            // If parsing fails, leave as is
          }
        }
        
        return request;
      },
      responseSanitizer: (response: any) => {
        // Remove sensitive data from response body
        if (response.body && typeof response.body === 'string') {
          try {
            const body = JSON.parse(response.body);
            if (body.password || body.token || body.secret) {
              const sanitizedBody = { ...body };
              if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
              if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
              if (sanitizedBody.secret) sanitizedBody.secret = '[REDACTED]';
              response.body = JSON.stringify(sanitizedBody);
            }
          } catch (e) {
            // If parsing fails, leave as is
          }
        }
        
        return response;
      }
    },
    console: {
      shouldAggregateConsoleErrors: true,
    },
  });
}

// Identify user in LogRocket
export function identifyUser(userId: string, userInfo?: Record<string, any>) {
  // Production-ready service - always identify user
  LogRocket.identify(userId, {
    ...userInfo,
    // Add any additional user properties you want to track
  });
}

// Track custom events
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  // Production-ready service - always track events
  LogRocket.track(eventName, properties);
}

// Get session URL for support
export function getSessionURL(callback: (sessionURL: string | null) => void) {
  // Production-ready service - always get session URL
  LogRocket.getSessionURL((sessionURL: string | null) => {
    callback(sessionURL);
  });
}

// Start recording for specific features
export function startRecording(feature: string) {
  // Production-ready service - always start recording
  trackEvent(`Recording Started`, { feature });
}

// Stop recording
export function stopRecording(feature: string) {
  // Production-ready service - always stop recording
  trackEvent(`Recording Stopped`, { feature });
}
import { setupServer } from 'msw/node';
import { http } from 'msw';
import type { DefaultBodyType, PathParams, HttpResponseResolver, StrictRequest } from 'msw';

// Mock API handlers
export const handlers = [
  // Supabase auth handlers
  http.post('https://avbwpuxhkyvfyonrpbqg.supabase.co/auth/v1/token', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { displayName: 'Test User' },
        },
      })
    );
  }),

  http.post('https://avbwpuxhkyvfyonrpbqg.supabase.co/auth/v1/logout', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(ctx.status(200));
  }),

  // Supabase database handlers
  http.get('https://avbwpuxhkyvfyonrpbqg.supabase.co/rest/v1/users', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'user-123',
          email: 'test@example.com',
          display_name: 'Test User',
          firebase_uid: 'firebase-123',
          created_at: new Date().toISOString(),
        },
      ])
    );
  }),

  http.post('https://avbwpuxhkyvfyonrpbqg.supabase.co/rest/v1/users', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        firebase_uid: 'firebase-123',
        created_at: new Date().toISOString(),
      })
    );
  }),

  http.get('https://avbwpuxhkyvfyonrpbqg.supabase.co/rest/v1/analysis_sessions', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'session-123',
          user_id: 'user-123',
          title: 'Test Session',
          session_type: 'video',
          status: 'completed',
          progress: 100,
          created_at: new Date().toISOString(),
        },
      ])
    );
  }),

  http.post('https://avbwpuxhkyvfyonrpbqg.supabase.co/rest/v1/analysis_sessions', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'session-123',
        user_id: 'user-123',
        title: 'Test Session',
        session_type: 'video',
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
      })
    );
  }),

  http.get('https://avbwpuxhkyvfyonrpbqg.supabase.co/rest/v1/analysis_results', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'result-1',
          session_id: 'session-123',
          frame_number: 1,
          frame_timestamp: 0.5,
          predictions: [],
          accuracy_score: 0.95,
          confidence_score: 0.87,
          target_count: 1,
          created_at: new Date().toISOString(),
        },
      ])
    );
  }),

  // Supabase Storage handlers
  http.post('https://avbwpuxhkyvfyonrpbqg.supabase.co/storage/v1/upload/resumable', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json({
        Key: 'videos/session-123/test-video.mp4',
      })
    );
  }),

  // Supabase Edge Functions handlers
  http.post('https://avbwpuxhkyvfyonrpbqg.supabase.co/functions/v1/process-video', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json({
        sessionId: 'session-123',
        status: 'processing',
      })
    );
  }),

  http.post('https://avbwpuxhkyvfyonrpbqg.supabase.co/functions/v1/analyze-frame', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json({
        frameNumber: 1,
        accuracy: 0.95,
        confidence: 0.87,
        aimPosition: { x: 100, y: 100 },
        targetPosition: { x: 105, y: 105 },
        predictions: [
          {
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            confidence: 0.95,
            class: 'target',
            class_id: 1,
          },
        ],
      })
    );
  }),

  http.post('https://avbwpuxhkyvfyonrpbqg.supabase.co/functions/v1/start-session', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json({
        sessionId: 'session-123',
        status: 'started',
      })
    );
  }),

  http.post('https://avbwpuxhkyvfyonrpbqg.supabase.co/functions/v1/end-session', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json({
        sessionId: 'session-123',
        status: 'completed',
        reportId: 'report-123',
      })
    );
  }),

  // Roboflow API handlers
  http.post('https://api.roboflow.com/test/model', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json({
        predictions: [
          {
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            confidence: 0.95,
            class: 'target',
            class_id: 1,
          },
        ],
        image: {
          width: 640,
          height: 480,
        },
      })
    );
  }),

  // Firebase Auth handlers
  http.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json({
        idToken: 'mock-id-token',
        email: 'test@example.com',
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'firebase-123',
        displayName: 'Test User',
      })
    );
  }),

  http.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    return res(
      ctx.status(200),
      ctx.json({
        idToken: 'mock-google-id-token',
        email: 'test@gmail.com',
        refreshToken: 'mock-google-refresh-token',
        expiresIn: '3600',
        localId: 'firebase-google-123',
        displayName: 'Google User',
      })
    );
  }),

  // Generic error handler
  http.all('*', ({ request, params }: { request: StrictRequest<DefaultBodyType>, params: PathParams }) => {
    console.warn(`Unhandled MSW request: ${request.method} ${request.url}`);
    return Response.json(
      { error: 'Not Found' },
      { status: 404 }
    );
  }),
];

// Create MSW server
export const server = setupServer(...handlers);
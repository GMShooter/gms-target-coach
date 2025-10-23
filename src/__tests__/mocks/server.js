// Simple mock server without MSW for now
const handlers = [];

const server = {
  listen: () => {
    console.log('Mock server started (simplified version)');
  },
  close: () => {
    console.log('Mock server closed');
  },
  resetHandlers: () => {
    console.log('Mock handlers reset');
  }
};

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Setup common mock responses
const setupMockFetch = () => {
  mockFetch.mockImplementation((url, options) => {
    // Mock Supabase auth
    if (url.includes('/auth/v1/token')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { displayName: 'Test User' },
          },
        }),
      });
    }

    // Mock Supabase functions
    if (url.includes('/functions/v1/analyze-frame')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          detections: {
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
          },
        }),
      });
    }

    // Mock test frames
    if (url.includes('/test_videos_frames/')) {
      // Return different SVG content based on the frame number
      const frameNumber = url.match(/\/(\d)\.svg$/)?.[1] || '1';
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(`<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f0f0"/>
  <circle cx="320" cy="240" r="50" fill="#ff0000" stroke="#000" stroke-width="2"/>
  <circle cx="320" cy="240" r="5" fill="#00ff00"/>
  <text x="320" y="50" text-anchor="middle" font-family="Arial" font-size="24" fill="#000">Test Frame ${frameNumber}</text>
</svg>`),
      });
    }

    // Default response
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    });
  });
};

// Initialize mock fetch
setupMockFetch();

module.exports = { handlers, server, setupMockFetch };
// Jest setup file to handle Vite environment variables
// This file runs before any tests and sets up environment

require('@testing-library/jest-dom');
const { TextEncoder: UtilTextEncoder, TextDecoder: UtilTextDecoder } = require('util');
const { fetch: fetchPolyfill } = require('whatwg-fetch');

// Setup TextEncoder/TextDecoder for JSDOM
global.TextEncoder = UtilTextEncoder;
global.TextDecoder = UtilTextDecoder;

// Setup fetch polyfill for Firebase Auth
global.fetch = fetchPolyfill;

// Mock the env module to avoid import.meta issues
jest.mock('./utils/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'test-bucket',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-sender',
    VITE_FIREBASE_APP_ID: 'test-app-id',
    VITE_FIREBASE_MEASUREMENT_ID: 'test-measurement',
    VITE_ROBOFLOW_API_KEY: 'test-roboflow-key',
    VITE_NGROK_URL: 'http://localhost:4040',
    VITE_GEMINI_API_KEY: 'test-key',
  }
}));

// Mock Supabase client
jest.mock('./utils/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn()
          }
        }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(),
      update: jest.fn()
    }))
  }
}));

// Mock import.meta.env for Jest
const mockImportMeta = {
  env: {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'test-key',
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'test.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || 'test-project',
    VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'test-bucket',
    VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'test-sender',
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || 'test-app-id',
    VITE_FIREBASE_MEASUREMENT_ID: process.env.VITE_FIREBASE_MEASUREMENT_ID || 'test-measurement',
    VITE_ROBOFLOW_API_KEY: process.env.VITE_ROBOFLOW_API_KEY || 'test-roboflow-key',
    VITE_NGROK_URL: process.env.VITE_NGROK_URL || 'http://localhost:4040',
  }
};

// Make import.meta available globally
(global as any).importMeta = mockImportMeta;

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  // Suppress console.log in tests unless explicitly needed
  log: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.log,
  // Keep error and warn for debugging
  error: originalConsole.error,
  warn: originalConsole.warn,
  info: originalConsole.info,
  debug: originalConsole.debug,
};

// Mock WebSocket for tests
global.WebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
})) as any;

// Mock getUserMedia for camera tests
if (!global.navigator) {
  global.navigator = {} as any;
}
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
    })),
  },
  writable: true,
  configurable: true,
});

// Mock HTMLVideoElement for camera tests
global.HTMLVideoElement = jest.fn(() => ({
  play: jest.fn(),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  src: '',
  videoWidth: 640,
  videoHeight: 480,
})) as any;

// Mock HTMLCanvasElement for drawing tests
global.HTMLCanvasElement = jest.fn(() => ({
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    })),
    putImageData: jest.fn(),
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    closePath: jest.fn(),
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,test'),
  width: 640,
  height: 480,
})) as any;

// Mock URL.createObjectURL for blob handling
global.URL = global.URL || {};
global.URL.createObjectURL = jest.fn(() => 'blob:test-url') as any;

// Mock Blob constructor
global.Blob = jest.fn((content, options) => ({
  content,
  options,
  size: content ? content.length : 0,
  type: options?.type || 'application/octet-stream',
})) as any;

// Mock FileReader for file reading
global.FileReader = jest.fn(() => ({
  readAsDataURL: jest.fn(),
  readAsText: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  result: null,
  readyState: 0,
  error: null,
})) as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();
global.sessionStorage = sessionStorageMock as any;

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;

// Suppress specific warnings that are expected in tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  // Suppress warnings about act() updates
  if (message.includes('act(...) is not supported')) {
    return;
  }
  // Supress warnings about findDOMNode
  if (message.includes('findDOMNode is deprecated')) {
    return;
  }
  originalWarn(...args);
};

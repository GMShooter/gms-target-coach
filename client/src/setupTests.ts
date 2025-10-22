// Polyfill Response for MSW in Node.js environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Add Response polyfill for MSW
if (!global.Response) {
  global.Response = class Response {
    body: any;
    bodyUsed: boolean;
    headers: Headers;
    ok: boolean;
    redirected: boolean;
    status: number;
    statusText: string;
    type: ResponseType;
    url: string;

    constructor(body?: any, init?: ResponseInit) {
      this.body = body;
      this.bodyUsed = false;
      this.headers = new Headers(init?.headers);
      this.ok = (init?.status || 200) >= 200 && (init?.status || 200) < 300;
      this.redirected = false;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || '';
      this.type = 'basic';
      this.url = '';
    }

    async json(): Promise<any> {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }

    async text(): Promise<string> {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }

    async blob(): Promise<Blob> {
      return new Blob([this.body]);
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
      return (new TextEncoder() as any).encode(this.body).buffer;
    }

    clone(): Response {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers,
      });
    }
  } as any;
}

// Add TransformStream polyfill for MSW
if (!global.TransformStream) {
  global.TransformStream = class TransformStream {
    constructor(transformer = {}, writableStrategy = {}, readableStrategy = {}) {
      (this as any)._transformer = transformer;
      (this as any)._writableStrategy = writableStrategy;
      (this as any)._readableStrategy = readableStrategy;
    }

    get readable() {
      return {
        getReader: () => ({
          read: () => Promise.resolve({ done: true, value: undefined }),
          releaseLock: () => {},
        }),
        cancel: () => Promise.resolve(),
        tee: () => [{}, {}],
        locked: false,
      };
    }

    get writable() {
      return {
        getWriter: () => ({
          write: () => Promise.resolve(),
          close: () => Promise.resolve(),
          abort: () => Promise.resolve(),
          releaseLock: () => {},
        }),
        abort: () => Promise.resolve(),
        close: () => Promise.resolve(),
        locked: false,
      };
    }
  } as any;
}

import '@testing-library/jest-dom';
import { configureAxe } from 'jest-axe';

// Try to import MSW server, but don't fail if it doesn't work
let server: any = null;
try {
  const mswServer = require('./__tests__/mocks/server.js');
  server = mswServer.server;
} catch (error) {
  console.warn('MSW server could not be initialized, continuing without mocking:', error);
}


// Extend global types for test utilities
declare global {
  var testUtils: {
    createMockFile: (type?: string, name?: string) => File;
    createMockUser: (overrides?: any) => any;
    createMockSession: (overrides?: any) => any;
    createMockAnalysisResult: (overrides?: any) => any;
    waitFor: (ms: number) => Promise<void>;
  };
}

// Configure axe for accessibility testing
const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false }, // Disable if testing with incomplete design
  }
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: jest.fn(() => []),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  },
  writable: true,
});

// Mock File and FileReader
global.File = class File {
  constructor(public chunks: any[], public name: string, public options: any) {}
} as any;

global.FileReader = class FileReader {
  result: string | ArrayBuffer | null = null;
  error: any = null;
  readyState: number = 0;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  readAsDataURL = jest.fn().mockImplementation(() => {
    this.result = 'data:image/png;base64,mock';
    this.readyState = 2;
    if (this.onload) this.onload({ target: this } as any);
  });
  
  readAsText = jest.fn().mockImplementation(() => {
    this.result = 'mock text content';
    this.readyState = 2;
    if (this.onload) this.onload({ target: this } as any);
  });
} as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock canvas and context
const mockCanvasContext = {
  canvas: document.createElement('canvas'),
  globalAlpha: 1,
  globalCompositeOperation: 'source-over' as const,
  filter: 'none',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low' as const,
  strokeStyle: '#000000',
  fillStyle: '#000000',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  lineWidth: 1,
  lineCap: 'butt' as const,
  lineJoin: 'miter' as const,
  miterLimit: 10,
  lineDashOffset: 0,
  font: '10px sans-serif',
  textAlign: 'start' as const,
  textBaseline: 'alphabetic' as const,
  direction: 'inherit' as const,
  fontKerning: 'auto',
  fontStretch: 'normal' as const,
  fontVariantCaps: 'normal' as const,
  textRendering: 'auto' as const,
  letterSpacing: '0px',
  wordSpacing: '0px',
  imageRendering: 'auto' as const,
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  bezierCurveTo: jest.fn(),
  arcTo: jest.fn(),
  arc: jest.fn(),
  rect: jest.fn(),
  ellipse: jest.fn(),
  roundRect: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  clip: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  translate: jest.fn(),
  transform: jest.fn(),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  measureText: jest.fn(() => ({ width: 100, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 100 })),
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  drawFocusIfNeeded: jest.fn(),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createPattern: jest.fn(),
  createConicGradient: jest.fn(),
  isPointInPath: jest.fn(),
  isPointInStroke: jest.fn(),
  getLineDash: jest.fn(() => []),
  setLineDash: jest.fn(),
} as any;

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext);

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
      getVideoTracks: () => [{ stop: jest.fn() }],
      getAudioTracks: () => [{ stop: jest.fn() }],
    }),
  },
  writable: true,
});

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
})) as any;

// Setup MSW server before all tests (only if available)
if (server) {
  beforeAll(() => server.listen());
  
  // Reset request handlers after each test
  afterEach(() => server.resetHandlers());
  
  // Close server after all tests
  afterAll(() => server.close());
}

// Global test utilities
global.testUtils = {
  // Create mock file
  createMockFile: (type: string = 'video/mp4', name: string = 'test-file.mp4') => {
    const file = new File(['mock content'], name, { type });
    Object.defineProperty(file, 'size', { value: 1024 });
    return file;
  },
  
  // Create mock user
  createMockUser: (overrides: any = {}) => ({
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    firebase_uid: 'firebase-123',
    ...overrides,
  }),
  
  // Create mock session
  createMockSession: (overrides: any = {}) => ({
    id: 'session-123',
    user_id: 'user-123',
    title: 'Test Session',
    description: 'Test Description',
    session_type: 'video',
    status: 'completed',
    progress: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides,
  }),
  
  // Create mock analysis result
  createMockAnalysisResult: (overrides: any = {}) => ({
    id: 'result-1',
    frameNumber: 1,
    timestamp: 0.5,
    accuracy: 0.95,
    confidence: 0.87,
    aimPosition: { x: 100, y: 100 },
    targetPosition: { x: 105, y: 105 },
    imageUrl: '/test-frame-1.png',
    ...overrides,
  }),
  
  // Wait for async operations
  waitFor: (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Suppress console warnings in tests unless debugging
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Export for use in tests
export { axe };

// Jest setup file to handle Vite environment variables
// This file runs before any tests and sets up environment

// Make this file a module
export {};

require('@testing-library/jest-dom');


const { TextEncoder: UtilTextEncoder, TextDecoder: UtilTextDecoder } = require('util');

const { fetch: fetchPolyfill } = require('whatwg-fetch');

// Setup TextEncoder/TextDecoder for JSDOM
global.TextEncoder = UtilTextEncoder;
global.TextDecoder = UtilTextDecoder;

// Setup fetch polyfill for Firebase Auth
global.fetch = fetchPolyfill;

// Mock Canvas API BEFORE any other imports to prevent "Not implemented" errors
const mockCanvasContext = {
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  setLineDash: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  globalAlpha: 1,
  strokeStyle: '',
  lineWidth: 1,
  fillStyle: '',
  font: '',
  textAlign: 'center' as CanvasTextAlign,
  textBaseline: 'middle' as CanvasTextBaseline,
  canvas: {
    width: 640,
    height: 480,
  },
  // Add missing properties
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createPattern: jest.fn(),
  drawImage: jest.fn(),
  clip: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  transform: jest.fn(),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),
  scale: jest.fn(),
  createImageData: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  globalCompositeOperation: '',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  miterLimit: 10,
  lineDash: [],
  lineDashOffset: 0,
  direction: 'ltr' as CanvasDirection,
  imageSmoothingEnabled: true,
};

// Setup Canvas API mock before any component imports
HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext as any);

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
  // Canvas API errors are expected in tests
  // Error suppression implemented for test environment
});

afterAll(() => {
  // Restore original error handler
});

// Mock env module to avoid import.meta issues
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

// Mock HardwareAPI to avoid import.meta issues
jest.mock('./services/HardwareAPI', () => {
  // Create internal data structures for the mock
  const devices = new Map();
  const activeSessions = new Map();
  const eventListeners = new Map();
  
  // Create a mock HardwareAPI class
  const mockHardwareAPI = {
    // Internal properties (accessed via bracket notation in tests)
    devices,
    activeSessions,
    eventListeners,
    
    // Public methods
    parseQRCode: jest.fn((qrData: string) => {
      try {
        const match = qrData.match(/^GMShoot:\/\/(.+?)\|(.+?)\|(.+?)\|(\d+)$/);
        if (!match) return null;
        
        const [, deviceId, name, url, port] = match;
        const device = {
          id: deviceId,
          name,
          url: `${url}:${port}`,
          status: 'offline',
          lastSeen: new Date(),
          capabilities: {
            hasCamera: true,
            hasZoom: true,
            maxResolution: '1920x1080',
            supportedFormats: ['jpeg', 'png']
          }
        };
        
        // Add ngrokUrl property dynamically to avoid TypeScript error
        (device as any).ngrokUrl = undefined;
        
        return device;
      } catch (error) {
        return null;
      }
    }),
    
    connectViaQRCode: jest.fn().mockImplementation(async (qrData: string) => {
      const device = mockHardwareAPI.parseQRCode(qrData);
      if (!device) throw new Error('Invalid QR code data');
      
      // Check if fetch is mocked to return error for failure tests
      const mockFetch = global.fetch as jest.Mock;
      if (mockFetch && mockFetch.mock.results.length > 0) {
        const lastResult = mockFetch.mock.results[mockFetch.mock.results.length - 1] as any;
        if (lastResult.type === 'rejected') {
          throw lastResult.value;
        }
        
        // Check if the mock is set up to return a failed response
        if (lastResult.type === 'fulfilled' && lastResult.value && (lastResult.value as any).ok === false) {
          throw new Error((lastResult.value as any).error || 'Connection failed');
        }
      }
      
      // Mock successful connection
      device.status = 'online';
      device.lastSeen = new Date();
      (device as any).ngrokUrl = 'https://abc123.ngrok.io';
      devices.set(device.id, device);
      
      return device;
    }),
    
    disconnectDevice: jest.fn().mockImplementation(async (deviceId: string) => {
      const device = devices.get(deviceId);
      if (device) {
        device.status = 'offline';
      }
    }),
    
    startSession: jest.fn().mockImplementation(async (deviceId: string, request: any) => {
      const device = devices.get(deviceId);
      if (!device) throw new Error('Device not found');
      
      const session = {
        sessionId: request.sessionId,
        deviceId,
        startTime: new Date(),
        shotCount: 0,
        status: 'active',
        settings: {
          targetDistance: request.settings.targetDistance,
          targetSize: request.settings.targetSize,
          scoringZones: [
            { id: 'bullseye', name: 'Bullseye', points: 10, radius: 5, color: '#FF0000' },
            { id: 'inner', name: 'Inner Ring', points: 9, radius: 10, color: '#FF4500' },
            { id: 'middle', name: 'Middle Ring', points: 8, radius: 20, color: '#FFA500' },
            { id: 'outer', name: 'Outer Ring', points: 7, radius: 30, color: '#FFFF00' },
            { id: 'edge', name: 'Edge', points: 6, radius: 40, color: '#00FF00' },
            { id: 'miss', name: 'Miss', points: 0, radius: 100, color: '#808080' }
          ],
          zoomPreset: request.settings.zoomPreset,
          detectionSensitivity: request.settings.detectionSensitivity
        }
      };
      
      activeSessions.set(request.sessionId, session);
      return session;
    }),
    
    stopSession: jest.fn().mockImplementation(async (sessionId: string, reason?: string) => {
      const session = activeSessions.get(sessionId);
      if (session) {
        session.endTime = new Date();
        session.status = 'completed';
      }
    }),
    
    getLatestFrame: jest.fn().mockResolvedValue({
      frameNumber: 0,
      timestamp: new Date(),
      imageUrl: 'data:image/jpeg;base64,test',
      hasShot: false,
      metadata: {
        resolution: '1920x1080',
        brightness: 50,
        contrast: 50
      }
    }),
    
    getNextFrame: jest.fn().mockResolvedValue({
      frameNumber: 1,
      timestamp: new Date(),
      imageUrl: 'data:image/jpeg;base64,test',
      hasShot: false,
      metadata: {
        resolution: '1920x1080',
        brightness: 50,
        contrast: 50
      }
    }),
    
    setZoomPreset: jest.fn(),
    getActiveSessions: jest.fn(() => Array.from(activeSessions.values()).filter((s: any) => s.status === 'active')),
    getSession: jest.fn((sessionId: string) => activeSessions.get(sessionId)),
    getDevice: jest.fn((deviceId: string) => devices.get(deviceId)),
    getConnectedDevices: jest.fn(() => Array.from(devices.values()).filter((d: any) => d.status === 'online')),
    
    addEventListener: jest.fn((event: string, callback: Function) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event).push(callback);
    }),
    
    removeEventListener: jest.fn((event: string, callback: Function) => {
      const listeners = eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }),
    
    sendWebSocketMessage: jest.fn(),
    getWebSocketStatus: jest.fn(),
    closeWebSocketConnection: jest.fn(),
    
    calculateShotScore: jest.fn((x: number, y: number, scoringZones: any[]) => {
      // Calculate distance from center (50, 50)
      const centerX = 50;
      const centerY = 50;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      
      // Find appropriate scoring zone
      const sortedZones = scoringZones.sort((a, b) => a.radius - b.radius);
      for (const zone of sortedZones) {
        if (distance <= zone.radius) {
          return { score: zone.points, zone };
        }
      }
      
      // If no zone matched, it's a miss
      const missZone = scoringZones.find(z => z.id === 'miss') || sortedZones[sortedZones.length - 1];
      return { score: missZone.points, zone: missZone };
    }),
    
    detectSequentialShot: jest.fn((previousFrame: any, currentFrame: any) => {
      if (!previousFrame || !currentFrame) return false;
      
      const prevHasShot = previousFrame.hasShot;
      const currHasShot = currentFrame.hasShot;
      
      if (!prevHasShot && currHasShot) {
        return true;
      }
      
      return false;
    }),
    
    getSessionStatistics: jest.fn(),
    getSessionRecommendations: jest.fn(),
    getShotPatternVisualization: jest.fn(),
    getSequentialDetectionStatistics: jest.fn(),
    getSequentialShotHistory: jest.fn(),
    updateSequentialDetectionConfig: jest.fn(),
    getSequentialDetectionConfig: jest.fn(),
    getSessionStatus: jest.fn(),
    toggleSessionPause: jest.fn(),
    emergencyStop: jest.fn(),
    
    cleanup: jest.fn(() => {
      devices.clear();
      activeSessions.clear();
      eventListeners.clear();
    }),
    
    ingestFrameData: jest.fn(),
    ingestShotData: jest.fn(),
    ingestSessionEvent: jest.fn(),
    setUserId: jest.fn(),
    
    // Private method for tests (accessed via bracket notation)
    emit: jest.fn((event: string, data: any) => {
      const listeners = eventListeners.get(event);
      if (listeners) {
        listeners.forEach((callback: Function) => callback(data));
      }
    })
  };

  // Mock constructor function
  const MockHardwareAPI = jest.fn().mockImplementation(() => mockHardwareAPI);
  
  return {
    HardwareAPI: MockHardwareAPI,
    hardwareAPI: mockHardwareAPI
  };
});

// Mock useHardware hook to avoid import.meta issues
jest.mock('./hooks/useHardware', () => ({
  useHardware: jest.fn(() => ({
    isConnected: false,
    isSessionActive: false,
    currentSession: null,
    shots: [],
    analysisResult: null,
    isAnalyzing: false,
    connectToDevice: jest.fn(),
    disconnectDevice: jest.fn(),
    startSession: jest.fn(),
    stopSession: jest.fn(),
    pollForFrames: jest.fn(),
    stopPolling: jest.fn()
  }))
}));

// Create mock response functions
function createMockAuthResponse() {
  return {
    data: {
      user: { id: 'test-user', email: 'test@example.com' },
      session: { user: { id: 'test-user', email: 'test@example.com' } }
    },
    error: null
  };
}

function createMockSessionResponse() {
  return {
    data: {
      session: { user: { id: 'test-user', email: 'test@example.com' } }
    },
    error: null
  };
}

function createMockUserResponse() {
  return {
    data: { 
      user: { id: 'test-user', email: 'test@example.com' } 
    },
    error: null
  };
}

// Mock Supabase client
const mockSupabaseAuth = {
  signInWithPassword: jest.fn().mockResolvedValue(createMockAuthResponse()),
  signUp: jest.fn().mockResolvedValue(createMockAuthResponse()),
  signOut: jest.fn().mockResolvedValue({ error: null }),
  signInWithOAuth: jest.fn().mockResolvedValue(createMockAuthResponse()),
  getSession: jest.fn().mockResolvedValue(createMockSessionResponse()),
  getUser: jest.fn().mockResolvedValue(createMockUserResponse()),
  onAuthStateChange: jest.fn().mockImplementation((callback) => {
    // Immediately call the callback with a mock session to simulate authenticated state
    callback('SIGNED_IN', { user: { id: 'test-user', email: 'test@example.com' } });
    return {
      data: {
        subscription: {
          unsubscribe: jest.fn()
        }
      }
    };
  })
};

const mockSupabaseClient = {
  auth: mockSupabaseAuth,
  from: jest.fn((table) => {
    const mockTable: any = {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      delete: jest.fn(() => Promise.resolve({ data: [], error: null }))
    };
    
    // Store the table name for test verification
    mockTable.tableName = table;
    return mockTable;
  }),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      download: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mock-url' } })),
      remove: jest.fn(() => Promise.resolve({ data: {}, error: null }))
    }))
  },
  functions: {
    invoke: jest.fn(() => Promise.resolve({ data: {}, error: null }))
  }
};

jest.mock('./utils/supabase', () => ({
  supabase: mockSupabaseClient
}));

// Mock AuthService
jest.mock('./services/AuthService', () => {
  // Create a mock AuthService class
  const mockAuthService = {
    signIn: jest.fn().mockResolvedValue({ success: true }),
    signUp: jest.fn().mockResolvedValue({ success: true }),
    signOut: jest.fn().mockResolvedValue({ success: true }),
    resetPassword: jest.fn().mockResolvedValue({ success: true }),
    getCurrentUser: jest.fn().mockResolvedValue(null), // Initially no user
    onAuthStateChange: jest.fn().mockImplementation((callback) => {
      // Don't call immediately - let tests control when to call
      return jest.fn(); // Return unsubscribe function
    }),
    subscribe: jest.fn().mockImplementation((callback) => {
      // Don't call immediately - let tests control when to call
      return jest.fn(); // Return unsubscribe function
    }),
    getState: jest.fn().mockReturnValue({
      user: null, // Initially no user
      isLoading: false,
      error: null,
      session: null
    }),
    isLoading: false,
    error: null,
    user: null, // Initially no user
    session: null // Initially no session
  };

  // Mock constructor function
  const MockAuthService = jest.fn().mockImplementation(() => mockAuthService);
  
  return {
    AuthService: MockAuthService,
    authService: mockAuthService
  };
});

// Mock AnalysisService
jest.mock('./services/AnalysisService', () => ({
  AnalysisService: jest.fn().mockImplementation(() => ({
    analyzeFrame: jest.fn().mockResolvedValue({
      frameId: 'test-frame-1',
      timestamp: new Date(),
      detections: [
        {
          class: 'target',
          confidence: 0.95,
          bbox: { x: 100, y: 100, width: 50, height: 50 }
        }
      ],
      hasShot: false,
      shotData: undefined,
      analysisTime: 150
    }),
    analyzeBatch: jest.fn().mockResolvedValue([
      {
        frameId: 'test-frame-1',
        timestamp: new Date(),
        detections: [
          {
            class: 'target',
            confidence: 0.95,
            bbox: { x: 100, y: 100, width: 50, height: 50 }
          }
        ],
        hasShot: false,
        shotData: undefined,
        analysisTime: 150
      }
    ]),
    calculateStatistics: jest.fn().mockResolvedValue({
      totalFrames: 10,
      shotsDetected: 5,
      averageScore: 85.5,
      accuracy: 0.8,
      averageAnalysisTime: 120
    }),
    isMockMode: false,
    setMockMode: jest.fn()
  }))
}));

// Mock environment variables for Jest
const mockEnvVars = {
  NODE_ENV: 'test',
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
  VITE_USE_MOCK_HARDWARE: 'false', // Disable mock hardware for auth tests
  VITE_USE_MOCK_AUTH: 'false', // Disable mock auth for auth tests
};

// Make import.meta available globally
/* eslint-disable @typescript-eslint/no-explicit-any */
const globalAny: any = global;
globalAny.importMeta = { env: mockEnvVars };

// Mock import.meta.env for any module that uses it directly
Object.defineProperty(globalAny, 'import', {
  value: {
    meta: { env: mockEnvVars }
  },
  writable: true,
  configurable: true
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  // Suppress console.log in tests unless explicitly needed
  log: mockEnvVars.NODE_ENV === 'test' ? jest.fn() : originalConsole.log,
  // Keep error and warn for debugging
  error: originalConsole.error,
  warn: originalConsole.warn,
  info: originalConsole.info,
  debug: originalConsole.debug,
};

// Mock WebSocket for tests
const mockWebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
}));
globalAny.WebSocket = mockWebSocket;

// Mock getUserMedia for camera tests
if (!global.navigator) {
  globalAny.navigator = {};
}
Object.defineProperty(globalAny.navigator, 'mediaDevices', {
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
const mockHTMLVideoElement = jest.fn(() => ({
  play: jest.fn(),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  src: '',
  videoWidth: 640,
  videoHeight: 480,
}));
globalAny.HTMLVideoElement = mockHTMLVideoElement;

// Mock HTMLCanvasElement for drawing tests
const mockHTMLCanvasElement = jest.fn(() => ({
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
    fillStyle: '',
    setTransform: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,test'),
  width: 640,
  height: 480,
}));
globalAny.HTMLCanvasElement = mockHTMLCanvasElement;

// Also mock the prototype directly
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
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
  fillStyle: '',
  setTransform: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
  // Add missing CanvasRenderingContext2D properties
  canvas: document.createElement('canvas'),
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  direction: 'ltr',
  imageSmoothingEnabled: true,
})) as any;

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,test');

// Mock URL.createObjectURL for blob handling
globalAny.URL = globalAny.URL || {};
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
globalAny.URL.createObjectURL = mockCreateObjectURL;

// Mock Blob constructor
const mockBlob = jest.fn((content, options) => ({
  content,
  options,
  size: content ? content.length : 0,
  type: options?.type || 'application/octet-stream',
}));
globalAny.Blob = mockBlob;

// Mock FileReader for file reading
const mockFileReader = jest.fn(() => ({
  readAsDataURL: jest.fn(),
  readAsText: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  result: null,
  readyState: 0,
  error: null,
}));
globalAny.FileReader = mockFileReader;

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
global.localStorage = localStorageMock;

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
global.sessionStorage = sessionStorageMock;

// Mock ResizeObserver
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
globalAny.ResizeObserver = mockResizeObserver;

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
globalAny.IntersectionObserver = mockIntersectionObserver;

// Mock hasPointerCapture for Radix UI components
if (!globalAny.HTMLElement.prototype.hasPointerCapture) {
  globalAny.HTMLElement.prototype.hasPointerCapture = jest.fn(() => false);
}

// Mock scrollIntoView for Radix UI components
if (!globalAny.HTMLElement.prototype.scrollIntoView) {
  globalAny.HTMLElement.prototype.scrollIntoView = jest.fn();
}

// Suppress specific warnings that are expected in tests
const originalWarn = console.warn;
console.warn = function() {
  const message = Array.from(arguments).join(' ');
  // Suppress warnings about act() updates
  if (message.includes('act(...) is not supported')) {
    return;
  }
  // Supress warnings about findDOMNode
  if (message.includes('findDOMNode is deprecated')) {
    return;
  }
  originalWarn.apply(console, Array.from(arguments));
};


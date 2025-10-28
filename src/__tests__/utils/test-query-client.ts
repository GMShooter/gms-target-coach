import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Create a test query client with default configuration
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Mock fetch for testing
export const mockFetch = (response: Response | Error) => {
  const mockFn = jest.fn((input?: RequestInfo | URL, init?: RequestInit) => {
    if (response instanceof Error) {
      return Promise.reject(response);
    }
    return Promise.resolve(response);
  });
  global.fetch = mockFn;
  return mockFn as any;
};

// Restore original fetch
export const restoreFetch = () => {
  const fetchMock = global.fetch as any;
  if (fetchMock && fetchMock.mockRestore) {
    fetchMock.mockRestore();
  }
};

// Create a mock fetch response
export const createMockFetchResponse = (data: any, status = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  } as Response;
};

// Create a mock fetch error
export const createMockFetchError = (status = 500, message = 'Internal Server Error') => {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(JSON.stringify({ error: message })),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  } as Response;
};

// Create a mock mutation response
export const createMockMutationResponse = (data: any) => {
  return {
    data,
    isSuccess: true,
    isError: false,
    isLoading: false,
  };
};

// Create a mock mutation error
export const createMockMutationError = (error: Error) => {
  return {
    data: undefined,
    isSuccess: false,
    isError: true,
    error,
    isLoading: false,
  };
};

// Wrapper component for testing with React Query
export const createQueryWrapper = (queryClient?: QueryClient) => {
  const testQueryClient = queryClient || createTestQueryClient();
  
  return ({ children }: { children: React.ReactNode }) => React.createElement(
    QueryClientProvider,
    { client: testQueryClient },
    children
  );
};

// Helper to create a wrapper with a specific query client
export const wrapperWithClient = (client: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => React.createElement(
    QueryClientProvider,
    { client },
    children
  );
};

// Simple test to ensure this file is recognized as a test file
describe('Test Query Client Utilities', () => {
  it('should create a test query client', () => {
    const client = createTestQueryClient();
    expect(client).toBeInstanceOf(QueryClient);
  });

  it('should create mock fetch response', () => {
    const data = { test: 'data' };
    const response = createMockFetchResponse(data);
    
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
  });

  it('should create mock fetch error', () => {
    const error = createMockFetchError(500, 'Test Error');
    
    expect(error.ok).toBe(false);
    expect(error.status).toBe(500);
  });

  it('should create a query wrapper', () => {
    const wrapper = createQueryWrapper();
    expect(typeof wrapper).toBe('function');
  });

  it('should create a wrapper with client', () => {
    const client = new QueryClient();
    const wrapper = wrapperWithClient(client);
    expect(typeof wrapper).toBe('function');
  });
});
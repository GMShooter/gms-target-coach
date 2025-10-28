import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time in milliseconds that data remains fresh
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Time in milliseconds that inactive queries will be garbage collected
      gcTime: 10 * 60 * 1000, // 10 minutes
      // Number of times to retry failed requests
      retry: 3,
      // Delay between retries in milliseconds
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Whether to refetch on window focus
      refetchOnWindowFocus: false,
      // Whether to refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Number of times to retry failed mutations
      retry: 1,
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

// Export hooks for easy importing
export { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
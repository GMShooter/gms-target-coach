# TanStack Query Migration Guide

This guide explains how to migrate from the current state management to TanStack Query for better data handling and testability.

## Overview

We're migrating from:
- Custom Zustand stores with manual state management
- Complex useEffect-based polling and data fetching
- Manual error handling and loading states

To:
- TanStack Query for server state management
- Simplified hooks with built-in caching and error handling
- Better testability with predictable data flow

## Migration Steps

### 1. Update Imports

**Before:**
```typescript
import { useHardwareStore } from '../store/hardwareStore';
import { useAuth } from './useAuth';
```

**After:**
```typescript
import { useHardwareQuery } from './useHardwareQuery';
import { useAuthQuery } from './useAuthQuery';
```

### 2. Replace Hook Usage

**Before:**
```typescript
const { 
  connectedDevice, 
  isConnected, 
  isConnecting, 
  connectionError,
  activeSession,
  isSessionActive,
  latestFrame,
  recentShots,
  analysisResult,
  isAnalyzing,
  connectToDevice,
  disconnectDevice,
  startSession,
  stopSession
} = useHardware();
```

**After:**
```typescript
const { 
  connectedDevice, 
  isConnected, 
  isConnecting, 
  connectionError,
  activeSession,
  isSessionActive,
  latestFrame,
  recentShots,
  analysisResult,
  isAnalyzing,
  connectToDevice,
  disconnectDevice,
  startSession,
  stopSession
} = useHardwareQuery();
```

### 3. Update Component Logic

**Before:**
```typescript
// Manual state checking
if (store.isConnected) {
  // Handle connection
}

// Manual error handling
try {
  await connectToDevice(qrData);
} catch (error) {
  console.error(error);
}
```

**After:**
```typescript
// TanStack Query handles loading/error states automatically
const { connectToDevice } = useHardwareQuery();

// Built-in error handling
const result = await connectToDevice(qrData);
// Error is handled by the mutation
```

### 4. Update Tests

**Before:**
```typescript
// Complex mocking required
jest.mock('../store/hardwareStore', () => ({
  useHardwareStore: () => ({
    connectedDevice: null,
    isConnected: false,
    // ... many properties
  })
}));
```

**After:**
```typescript
// Simpler mocking with query client
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 3 },
    mutations: { retry: 1 },
  },
});

// Tests can now focus on business logic
```

## Benefits of Migration

### 1. Better Caching
- Automatic background refetching
- Stale data management
- Optimistic updates
- Query invalidation strategies

### 2. Improved Error Handling
- Built-in retry logic
- Error boundary integration
- Consistent error state management

### 3. Simplified Testing
- Predictable data flow
- Easy to mock queries
- Reduced test complexity
- Better test isolation

### 4. Performance Optimizations
- Automatic request deduplication
- Background refetching
- Memory management
- Reduced re-renders

### 5. Developer Experience
- DevTools for debugging
- Loading states handled automatically
- Less boilerplate code
- Better TypeScript support

## Migration Checklist

### Phase 1: Setup
- [x] Install TanStack Query packages
- [x] Create query client configuration
- [x] Set up QueryProvider in App.tsx
- [x] Create new hooks with TanStack Query

### Phase 2: Component Migration
- [ ] Update components to use new hooks
- [ ] Remove old hook imports
- [ ] Test component functionality

### Phase 3: Testing
- [ ] Update test files to work with new hooks
- [ ] Mock TanStack Query in tests
- [ ] Verify all tests pass

### Phase 4: Cleanup
- [ ] Remove old Zustand stores
- [ ] Remove old hook files
- [ ] Update documentation

## Code Examples

### Data Fetching with TanStack Query

```typescript
// Simple query
const { data: user, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutation with optimistic updates
const { mutate: updateUser, isLoading } = useMutation({
  mutationFn: (userData) => updateUser(userData),
  onMutate: (variables) => {
    // Optimistic update
    queryClient.setQueryData(['user', userId], oldData => ({
      ...oldData,
      ...variables
    }));
  },
  onSuccess: (newData) => {
    // Update cache with actual data
    queryClient.setQueryData(['user', userId], newData);
  },
});
```

### Query Invalidation

```typescript
// Invalidate related queries
queryClient.invalidateQueries({
  queryKey: ['sessions'],
  exact: false,
  refetchType: 'active'
});

// Invalidate specific query
queryClient.invalidateQueries({
  queryKey: ['user', userId]
});
```

## Testing with TanStack Query

### Mocking Queries

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

test('should fetch user data', async () => {
  const { result } = renderHook(() => useUser('123'), { wrapper });
  
  await waitFor(() => result.current.isSuccess);
  
  expect(result.current.data).toEqual({
    id: '123',
    name: 'Test User'
  });
});
```

### Mocking Mutations

```typescript
import { renderHook, act } from '@testing-library/react';

test('should update user data', async () => {
  const { result } = renderHook(() => useUpdateUser(), { wrapper });
  
  const mockUpdate = jest.fn().mockResolvedValue(updatedUser);
  
  await act(async () => {
    await result.current.mutateAsync(userData);
  });
  
  expect(mockUpdate).toHaveBeenCalledWith(userData);
});
```

## Common Patterns

### Dependent Queries

```typescript
// Query that depends on user data
const { data: user } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});

const { data: sessions } = useQuery({
  queryKey: ['sessions', userId],
  queryFn: () => fetchUserSessions(userId),
  enabled: !!user, // Only run if user exists
});
```

### Infinite Queries

```typescript
const { 
  data, 
  fetchNextPage, 
  hasNextPage, 
  isFetching 
} = useInfiniteQuery({
  queryKey: ['sessions', userId],
  queryFn: ({ pageParam = 1 }) => fetchSessionsPage(userId, pageParam),
  getNextPageParam: (lastPage) => lastPage + 1,
});
```

## Troubleshooting

### Common Issues

1. **Query not refetching**
   - Check query key consistency
   - Verify `enabled` condition
   - Use `invalidateQueries` properly

2. **Memory leaks**
   - Use `gcTime` to clean up old data
   - Avoid storing large objects in query cache
   - Use `select` to transform data if needed

3. **Test failures**
   - Wrap async operations in `act()`
   - Use `waitFor` for async state changes
   - Mock query client properly

### Performance Tips

1. **Query Keys**
   - Use stable, serializable query keys
   - Include all relevant variables
   - Use arrays for hierarchical data

2. **Select Options**
   - Use `select` to transform data
   - Prevent unnecessary re-renders
   - Keep derived data in queries

3. **Background Updates**
   - Configure `refetchOnWindowFocus`
   - Use `refetchInterval` for real-time data
   - Set appropriate `staleTime`

## Best Practices

### 1. Query Design
- Keep queries focused and single-purpose
- Use descriptive query keys
- Implement proper error boundaries
- Handle loading states appropriately

### 2. Mutation Design
- Use optimistic updates where appropriate
- Provide rollback functions
- Handle partial failures gracefully
- Update cache after mutations

### 3. Testing Strategy
- Test loading, error, and success states
- Test query invalidation scenarios
- Mock network conditions properly
- Test error recovery mechanisms

This migration will significantly improve the maintainability and testability of the GMShoot application while providing better performance and user experience.
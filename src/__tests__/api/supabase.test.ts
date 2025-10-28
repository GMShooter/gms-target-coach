import { supabase } from '../../utils/supabase';
import { apiTestUtils, mockApiResponses, testHelpers } from '../../utils/test-utils';

// Mock Supabase client
jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      // Create base response based on table
      const baseResponse = table === 'shots' ? mockApiResponses.supabaseShot : mockApiResponses.supabaseSession;
      
      return {
        select: jest.fn(() => ({
          eq: jest.fn((field, value) => {
            return {
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({
                  data: [mockApiResponses.supabaseSession],
                  error: null
                }))
              })),
              then: (resolve: any) => resolve({
                data: table === 'shots' && field === 'session_id'
                  ? [mockApiResponses.supabaseShot]
                  : [mockApiResponses.supabaseSession],
                error: null
              })
            };
          }),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: [mockApiResponses.supabaseSession],
              error: null
            }))
          })),
          limit: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        })),
        insert: jest.fn((data) => ({
          select: jest.fn(() => {
            // Check if this is a shot insert
            if (data.frame_id !== undefined) {
              return Promise.resolve({
                data: mockApiResponses.supabaseShot,
                error: null
              });
            }
            // Default to session
            return Promise.resolve({
              data: mockApiResponses.supabaseSession,
              error: null
            });
          })
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => Promise.resolve({
              data: mockApiResponses.supabaseSession,
              error: null
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({
            data: null,
            error: null
          }))
        }))
      };
    }),
    auth: {
      signInWithPassword: jest.fn(() => Promise.resolve({
        data: { user: mockApiResponses.supabaseUser, session: {} },
        error: null
      })),
      signInWithOAuth: jest.fn(() => Promise.resolve({
        data: { user: mockApiResponses.supabaseUser, session: {} },
        error: null
      })),
      signOut: jest.fn(() => Promise.resolve({
        error: null
      })),
      getUser: jest.fn(() => Promise.resolve({
        data: { user: mockApiResponses.supabaseUser },
        error: null
      }))
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ 
          data: { path: 'test-path' }, 
          error: null 
        })),
        getPublicUrl: jest.fn(() => ({ 
          data: { publicUrl: 'https://example.com/test.jpg' } 
        }))
      }))
    }
  }
}));

describe('Supabase API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Connection Test', () => {
    it('should test Supabase connection successfully', async () => {
      // Act
      const result = await apiTestUtils.testSupabaseConnection();
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
    
    it('should handle connection test failure', async () => {
      // Arrange
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Connection failed' } 
            })
          })
        })
      };
      
      // Temporarily replace the mock
      const originalFrom = supabase.from;
      supabase.from = mockSupabase.from;
      
      // Act
      const result = await apiTestUtils.testSupabaseConnection();
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Restore original mock
      supabase.from = originalFrom;
    });
  });
  
  describe('Session Management', () => {
    it('should create a new session', async () => {
      // Arrange
      const sessionData = {
        user_id: 'test-user-123',
        status: 'active',
        fps: 1,
        preset: 1,
        distance: '10m'
      };
      
      // Act
      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select();
      
      // Assert
      expect(error).toBeNull();
      expect(data).toEqual(mockApiResponses.supabaseSession);
    });
    
    it('should update a session', async () => {
      // Arrange
      const sessionId = 'test-session-123';
      const updateData = {
        status: 'completed',
        frames_count: 10,
        shots_detected: 5
      };
      
      // Act
      const { data, error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select();
      
      // Assert
      expect(error).toBeNull();
      expect(data).toEqual(mockApiResponses.supabaseSession);
    });
    
    it('should retrieve a session by ID', async () => {
      // Arrange
      const sessionId = 'test-session-123';
      
      // Act
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId);
      
      // Assert
      expect(error).toBeNull();
      expect(data).toEqual([mockApiResponses.supabaseSession]);
    });
    
    it('should retrieve sessions with ordering', async () => {
      // Arrange
      const userId = 'test-user-123';
      
      // Act
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // Assert
      expect(error).toBeNull();
      expect(data).toEqual([mockApiResponses.supabaseSession]);
    });
  });
  
  describe('Shot Management', () => {
    it('should create a new shot record', async () => {
      // Arrange
      const shotData = {
        session_id: 'test-session-123',
        frame_id: 123,
        x: 100,
        y: 100,
        confidence: 0.95,
        class: 'bullseye'
      };
      
      // Act
      const { data, error } = await supabase
        .from('shots')
        .insert(shotData)
        .select();
      
      // Assert
      expect(error).toBeNull();
      expect(data).toEqual(mockApiResponses.supabaseShot);
    });
    
    it('should retrieve shots for a session', async () => {
      // Arrange
      const sessionId = 'test-session-123';
      
      // Act
      const { data, error } = await supabase
        .from('shots')
        .select('*')
        .eq('session_id', sessionId);
      
      // Assert
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });
  
  describe('Authentication', () => {
    it('should sign in with email and password', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      // Act
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      
      // Assert
      expect(error).toBeNull();
      expect(data.user).toEqual(mockApiResponses.supabaseUser);
      expect(data.session).toBeDefined();
    });
    
    it('should sign in with Google OAuth', async () => {
      // Arrange
      const provider = 'google';
      
      // Act
      const result = await supabase.auth.signInWithOAuth({ provider });
      
      // Assert
      expect(result.error).toBeNull();
      // Note: OAuth sign-in typically redirects, so we can't test the user data directly
      // In a real implementation, this would be handled by the OAuth callback
    });
    
    it('should sign out', async () => {
      // Act
      const { error } = await supabase.auth.signOut();
      
      // Assert
      expect(error).toBeNull();
    });
    
    it('should get current user', async () => {
      // Act
      const { data, error } = await supabase.auth.getUser();
      
      // Assert
      expect(error).toBeNull();
      expect(data.user).toEqual(mockApiResponses.supabaseUser);
    });
  });
  
  describe('File Storage', () => {
    it('should upload a file', async () => {
      // Arrange
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const path = 'sessions/test-session-123/test.jpg';
      
      // Act
      const { data, error } = await supabase.storage
        .from('frames')
        .upload(path, file);
      
      // Assert
      expect(error).toBeNull();
      expect(data?.path).toBe('test-path');
    });
    
    it('should get public URL for a file', async () => {
      // Arrange
      const path = 'sessions/test-session-123/test.jpg';
      
      // Act
      const { data } = supabase.storage
        .from('frames')
        .getPublicUrl(path);
      
      // Assert
      expect(data.publicUrl).toBe('https://example.com/test.jpg');
    });
  });
});
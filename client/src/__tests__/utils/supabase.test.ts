import { supabase, createSession, endSession, startSession, analyzeFrame } from '../../utils/supabase';

// Mock the supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    functions: {
      invoke: jest.fn()
    }
  }))
}));

describe('Supabase Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('supabase client', () => {
    it('creates supabase client with environment variables', () => {
      expect(supabase).toBeDefined();
    });

    it('throws error when environment variables are missing', () => {
      // Save original env vars
      const originalUrl = process.env.REACT_APP_SUPABASE_URL;
      const originalKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

      // Temporarily remove env vars
      delete process.env.REACT_APP_SUPABASE_URL;
      delete process.env.REACT_APP_SUPABASE_ANON_KEY;

      // Test should throw error when module is reloaded without env vars
      expect(() => {
        require('../../utils/supabase');
      }).toThrow('Missing Supabase environment variables');

      // Restore env vars
      process.env.REACT_APP_SUPABASE_URL = originalUrl;
      process.env.REACT_APP_SUPABASE_ANON_KEY = originalKey;
    });
  });

  describe('createSession', () => {
    it('creates a session successfully', async () => {
      const mockSessionId = 'session-123';
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: { id: mockSessionId }, 
            error: null 
          })
        })
      });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
      supabase.from = mockFrom;

      const result = await createSession('user-123', 'video');
      
      expect(mockFrom).toHaveBeenCalledWith('analysis_sessions');
      expect(mockInsert).toHaveBeenCalledWith([{ 
        user_id: 'user-123', 
        status: 'processing', 
        session_type: 'video' 
      }]);
      expect(result).toBe(mockSessionId);
    });

    it('throws error when user ID is missing', async () => {
      await expect(createSession('', 'video')).rejects.toThrow('User ID is required to create a session.');
      await expect(createSession(' ', 'video')).rejects.toThrow('User ID is required to create a session.');
    });

    it('handles database error', async () => {
      const mockError = new Error('Database error');
      const mockSingle = jest.fn().mockResolvedValue({ 
        data: null, 
        error: mockError 
      });
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ single: mockSingle })
      });
      const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert });
      supabase.from = mockFrom;

      await expect(createSession('user-123', 'video')).rejects.toThrow('Database error');
    });
  });

  describe('endSession', () => {
    it('ends a session successfully', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({ data: {}, error: null });
      supabase.functions.invoke = mockInvoke;

      await endSession('session-123');
      
      expect(mockInvoke).toHaveBeenCalledWith('end-session', {
        body: { session_id: 'session-123' }
      });
    });

    it('throws error when session ID is missing', async () => {
      await expect(endSession('')).rejects.toThrow('Session ID is required to end a session.');
      await expect(endSession(' ')).rejects.toThrow('Session ID is required to end a session.');
    });

    it('handles function error', async () => {
      const mockError = new Error('Function error');
      const mockInvoke = jest.fn().mockResolvedValue({ data: null, error: mockError });
      supabase.functions.invoke = mockInvoke;

      await expect(endSession('session-123')).rejects.toThrow('Function error');
    });
  });

  describe('startSession', () => {
    it('starts a session successfully', async () => {
      const mockData = { sessionId: 'session-123' };
      const mockInvoke = jest.fn().mockResolvedValue({ data: mockData, error: null });
      supabase.functions.invoke = mockInvoke;

      const result = await startSession('user-123', false);
      
      expect(mockInvoke).toHaveBeenCalledWith('start-session', {
        body: { userId: 'user-123', drillMode: false }
      });
      expect(result).toBe(mockData);
    });

    it('starts a session with drill mode', async () => {
      const mockData = { sessionId: 'session-123' };
      const mockInvoke = jest.fn().mockResolvedValue({ data: mockData, error: null });
      supabase.functions.invoke = mockInvoke;

      const result = await startSession('user-123', true);
      
      expect(mockInvoke).toHaveBeenCalledWith('start-session', {
        body: { userId: 'user-123', drillMode: true }
      });
      expect(result).toBe(mockData);
    });

    it('throws error when user ID is missing', async () => {
      await expect(startSession('', false)).rejects.toThrow('User ID is required to start a session.');
      await expect(startSession(' ', false)).rejects.toThrow('User ID is required to start a session.');
    });

    it('handles function error', async () => {
      const mockError = new Error('Function error');
      const mockInvoke = jest.fn().mockResolvedValue({ data: null, error: mockError });
      supabase.functions.invoke = mockInvoke;

      await expect(startSession('user-123', false)).rejects.toThrow('Function error');
    });
  });

  describe('analyzeFrame', () => {
    it('analyzes a frame successfully', async () => {
      const mockData = { predictions: [] };
      const mockInvoke = jest.fn().mockResolvedValue({ data: mockData, error: null });
      supabase.functions.invoke = mockInvoke;

      const frameBase64 = 'data:image/jpeg;base64,test';
      const result = await analyzeFrame(frameBase64);
      
      expect(mockInvoke).toHaveBeenCalledWith('analyze-frame', {
        body: { frameBase64 }
      });
      expect(result).toBe(mockData);
    });

    it('handles function error', async () => {
      const mockError = new Error('Analysis error');
      const mockInvoke = jest.fn().mockResolvedValue({ data: null, error: mockError });
      supabase.functions.invoke = mockInvoke;

      const frameBase64 = 'data:image/jpeg;base64,test';
      await expect(analyzeFrame(frameBase64)).rejects.toThrow('Analysis error');
    });
  });
});
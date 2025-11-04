import { HardwareAuth } from '../../services/HardwareAuth';
import { hardwareAuth } from '../../services/HardwareAuth';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  key: jest.fn(),
  length: 0,
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock crypto for secure token generation
const mockCrypto = {
  getRandomValues: jest.fn().mockImplementation((array) => {
    const mockArray = new Uint8Array(array.length);
    for (let i = 0; i < array.length; i++) {
      mockArray[i] = Math.floor(Math.random() * 256);
    }
    return mockArray;
  }),
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock atob and btoa for base64 encoding/decoding
global.atob = jest.fn((str) => {
  // Simple mock for testing
  return Buffer.from(str, 'base64').toString('binary');
});

global.btoa = jest.fn((str) => {
  // Simple mock for testing
  return Buffer.from(str).toString('base64');
});

// Mock jwtDecode
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn((token) => {
    if (token === 'valid-token') {
      return {
        deviceId: 'test-device-1',
        userId: 'user-123',
        permissions: ['read', 'write'],
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000)
      };
    }
    if (token === 'expired-token') {
      return {
        deviceId: 'test-device-1',
        userId: 'user-123',
        permissions: ['read', 'write'],
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200
      };
    }
    if (token === 'invalid-token') {
      throw new Error('Invalid token');
    }
    // For simple base64 encoded tokens
    try {
      return JSON.parse(Buffer.from(token, 'base64').toString('binary'));
    } catch {
      throw new Error('Invalid token format');
    }
  })
}));

// Mock encryptApiKey
jest.mock('../../lib/utils', () => ({
  encryptApiKey: jest.fn().mockResolvedValue({
    cipher: 'encrypted-api-key',
    iv: 'test-iv'
  })
}));

describe('HardwareAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    // Reset singleton instance
    (HardwareAuth as any).instance = null;
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = HardwareAuth.getInstance();
      const instance2 = HardwareAuth.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create only one instance', () => {
      const instance1 = HardwareAuth.getInstance();
      const instance2 = HardwareAuth.getInstance();
      const instance3 = HardwareAuth.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('generateApiKey', () => {
    it('should generate a secure token and store credentials', () => {
      const deviceId = 'test-device-1';
      const userId = 'user-123';
      const permissions = ['read', 'write'];
      
      const apiKey = hardwareAuth.generateApiKey(deviceId, userId, permissions);
      
      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBeGreaterThan(0);
      
      // Check that credentials were stored
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `hw_auth_${deviceId}:${userId}`,
        expect.stringContaining('"apiKeyEnc"')
      );
    });

    it('should use default permissions if none provided', () => {
      const deviceId = 'test-device-1';
      const userId = 'user-123';
      
      const apiKey = hardwareAuth.generateApiKey(deviceId, userId);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `hw_auth_${deviceId}:${userId}`,
        expect.stringContaining('"permissions":["read","write"]')
      );
    });

    it('should generate unique tokens each time', () => {
      const deviceId = 'test-device-1';
      const userId = 'user-123';
      
      const apiKey1 = hardwareAuth.generateApiKey(deviceId, userId);
      const apiKey2 = hardwareAuth.generateApiKey(deviceId, userId);
      
      expect(apiKey1).not.toBe(apiKey2);
    });
  });

  describe('authenticateWithDevice', () => {
    beforeEach(() => {
      // Mock stored credentials
      const credentials = {
        deviceId: 'test-device-1',
        apiKey: 'test-api-key',
        userId: 'user-123',
        permissions: ['read', 'write'],
        createdAt: new Date().toISOString()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(credentials));
    });

    it('should authenticate with valid credentials', async () => {
      const deviceId = 'test-device-1';
      const apiKey = 'test-api-key';
      const userId = 'user-123';
      
      const token = await hardwareAuth.authenticateWithDevice(deviceId, apiKey, userId);
      
      expect(token).toBeDefined();
      expect(token.token).toBeDefined();
      expect(token.deviceId).toBe(deviceId);
      expect(token.userId).toBe(userId);
      expect(token.permissions).toEqual(['read', 'write']);
      expect(token.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error for invalid API key', async () => {
      const deviceId = 'test-device-1';
      const apiKey = 'invalid-api-key';
      const userId = 'user-123';
      
      await expect(hardwareAuth.authenticateWithDevice(deviceId, apiKey, userId))
        .rejects.toThrow('Invalid API key');
    });

    it('should throw error for expired API key', async () => {
      const deviceId = 'test-device-1';
      const apiKey = 'test-api-key';
      const userId = 'user-123';
      
      // Mock expired credentials
      const expiredCredentials = {
        deviceId: 'test-device-1',
        apiKey: 'test-api-key',
        userId: 'user-123',
        permissions: ['read', 'write'],
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredCredentials));
      
      await expect(hardwareAuth.authenticateWithDevice(deviceId, apiKey, userId))
        .rejects.toThrow('API key has expired');
    });

    it('should load credentials from localStorage if not in memory', async () => {
      const deviceId = 'test-device-1';
      const apiKey = 'test-api-key';
      const userId = 'user-123';
      
      // Mock credentials not in memory but in localStorage
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        deviceId: 'test-device-1',
        apiKey: 'test-api-key',
        userId: 'user-123',
        permissions: ['read', 'write'],
        createdAt: new Date().toISOString()
      }));
      
      const token = await hardwareAuth.authenticateWithDevice(deviceId, apiKey, userId);
      
      expect(token).toBeDefined();
    });

    it('should handle invalid localStorage data gracefully', async () => {
      const deviceId = 'test-device-1';
      const apiKey = 'test-api-key';
      const userId = 'user-123';
      
      // Mock invalid localStorage data
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      await expect(hardwareAuth.authenticateWithDevice(deviceId, apiKey, userId))
        .rejects.toThrow('Invalid API key');
      
      // Should remove invalid data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hw_auth_test-device-1:user-123');
    });
  });

  describe('initiateAuthChallenge', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          challenge: 'test-challenge-123'
        })
      });
    });

    it('should initiate authentication challenge', async () => {
      const deviceUrl = 'http://test-device.local';
      const deviceId = 'test-device-1';
      
      const challenge = await hardwareAuth.initiateAuthChallenge(deviceUrl, deviceId);
      
      expect(challenge).toBeDefined();
      expect(challenge.deviceId).toBe(deviceId);
      expect(challenge.challenge).toBe('test-challenge-123');
      expect(challenge.expiresAt).toBeInstanceOf(Date);
      expect(global.fetch).toHaveBeenCalledWith(
        `${deviceUrl}/auth/challenge`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'GMShooter-Client/1.0'
          }),
          body: expect.stringContaining(deviceId)
        })
      );
    });

    it('should handle failed challenge initiation', async () => {
      const deviceUrl = 'http://test-device.local';
      const deviceId = 'test-device-1';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Device not found'
      });
      
      await expect(hardwareAuth.initiateAuthChallenge(deviceUrl, deviceId))
        .rejects.toThrow('Failed to initiate auth challenge: Device not found');
    });

    it('should handle API error response', async () => {
      const deviceUrl = 'http://test-device.local';
      const deviceId = 'test-device-1';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Device busy'
        })
      });
      
      await expect(hardwareAuth.initiateAuthChallenge(deviceUrl, deviceId))
        .rejects.toThrow('Authentication challenge failed: Device busy');
    });
  });

  describe('completeAuthChallenge', () => {
    beforeEach(() => {
      // Mock existing challenge
      const challenge = {
        deviceId: 'test-device-1',
        challenge: 'test-challenge-123',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      };
      
      // Set the challenge in the instance
      const instance = HardwareAuth.getInstance();
      (instance as any).challenges.set('test-device-1', challenge);
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          token: 'valid-token',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
      });
    });

    it('should complete authentication challenge with valid response', async () => {
      const deviceUrl = 'http://test-device.local';
      const deviceId = 'test-device-1';
      const signedChallenge = 'signed-challenge';
      const userId = 'user-123';
      
      const token = await hardwareAuth.completeAuthChallenge(deviceUrl, deviceId, signedChallenge, userId);
      
      expect(token).toBeDefined();
      expect(token.token).toBe('valid-token');
      expect(token.deviceId).toBe(deviceId);
      expect(token.userId).toBe(userId);
      expect(token.permissions).toEqual(['read', 'write']);
      expect(global.fetch).toHaveBeenCalledWith(
        `${deviceUrl}/auth/verify`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(signedChallenge)
        })
      );
    });

    it('should throw error for no active challenge', async () => {
      const deviceUrl = 'http://test-device.local';
      const deviceId = 'test-device-1';
      const signedChallenge = 'signed-challenge';
      const userId = 'user-123';
      
      await expect(hardwareAuth.completeAuthChallenge(deviceUrl, deviceId, signedChallenge, userId))
        .rejects.toThrow('No active challenge found for device');
    });

    it('should throw error for expired challenge', async () => {
      const deviceUrl = 'http://test-device.local';
      const deviceId = 'test-device-1';
      const signedChallenge = 'signed-challenge';
      const userId = 'user-123';
      
      // Mock expired challenge
      const expiredChallenge = {
        deviceId: 'test-device-1',
        challenge: 'test-challenge-123',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      };
      
      const instance = HardwareAuth.getInstance();
      (instance as any).challenges.set('test-device-1', expiredChallenge);
      
      await expect(hardwareAuth.completeAuthChallenge(deviceUrl, deviceId, signedChallenge, userId))
        .rejects.toThrow('Authentication challenge has expired');
    });

    it('should handle failed verification response', async () => {
      const deviceUrl = 'http://test-device.local';
      const deviceId = 'test-device-1';
      const signedChallenge = 'signed-challenge';
      const userId = 'user-123';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Invalid signature'
        })
      });
      
      await expect(hardwareAuth.completeAuthChallenge(deviceUrl, deviceId, signedChallenge, userId))
        .rejects.toThrow('Authentication verification failed: Invalid signature');
    });
  });

  describe('getToken', () => {
    it('should return valid token if exists and not expired', () => {
      const deviceId = 'test-device-1';
      const token = {
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        deviceId: 'test-device-1',
        userId: 'user-123',
        permissions: ['read', 'write']
      };
      
      const instance = HardwareAuth.getInstance();
      (instance as any).tokens.set(deviceId, token);
      
      const result = hardwareAuth.getToken(deviceId);
      
      expect(result).toBe(token);
    });

    it('should return null if no token exists', () => {
      const deviceId = 'test-device-1';
      
      const result = hardwareAuth.getToken(deviceId);
      
      expect(result).toBeNull();
    });

    it('should return null and remove expired token', () => {
      const deviceId = 'test-device-1';
      const expiredToken = {
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        deviceId: 'test-device-1',
        userId: 'user-123',
        permissions: ['read', 'write']
      };
      
      const instance = HardwareAuth.getInstance();
      (instance as any).tokens.set(deviceId, expiredToken);
      
      const result = hardwareAuth.getToken(deviceId);
      
      expect(result).toBeNull();
      // Check that expired token was removed
      expect((instance as any).tokens.has(deviceId)).toBe(false);
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      // Mock stored credentials
      const credentials = {
        deviceId: 'test-device-1',
        apiKey: 'test-api-key',
        userId: 'user-123',
        permissions: ['read', 'write'],
        createdAt: new Date().toISOString()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(credentials));
    });

    it('should refresh token for device', async () => {
      const deviceId = 'test-device-1';
      const userId = 'user-123';
      
      const token = await hardwareAuth.refreshToken(deviceId, userId);
      
      expect(token).toBeDefined();
      expect(token.deviceId).toBe(deviceId);
      expect(token.userId).toBe(userId);
      expect(token.permissions).toEqual(['read', 'write']);
      expect(token.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error if no credentials found', async () => {
      const deviceId = 'test-device-1';
      const userId = 'user-123';
      
      localStorageMock.getItem.mockReturnValue(null);
      
      await expect(hardwareAuth.refreshToken(deviceId, userId))
        .rejects.toThrow('No credentials found for device');
    });
  });

  describe('revokeAccess', () => {
    beforeEach(() => {
      // Mock stored data
      const credentials = {
        deviceId: 'test-device-1',
        apiKey: 'test-api-key',
        userId: 'user-123'
      };
      const token = {
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        deviceId: 'test-device-1',
        userId: 'user-123',
        permissions: ['read', 'write']
      };
      
      const instance = HardwareAuth.getInstance();
      (instance as any).credentials.set('test-device-1:user-123', credentials);
      (instance as any).tokens.set('test-device-1', token);
      (instance as any).challenges.set('test-device-1', {} as any);
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(credentials));
    });

    it('should revoke all access for device', () => {
      const deviceId = 'test-device-1';
      const userId = 'user-123';
      
      hardwareAuth.revokeAccess(deviceId, userId);
      
      const instance = HardwareAuth.getInstance();
      expect((instance as any).credentials.has(`${deviceId}:${userId}`)).toBe(false);
      expect((instance as any).tokens.has(deviceId)).toBe(false);
      expect((instance as any).challenges.has(deviceId)).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hw_auth_test-device-1:user-123');
    });
  });

  describe('getAuthenticatedDevices', () => {
    beforeEach(() => {
      const instance = HardwareAuth.getInstance();
      // Mock multiple credentials for different users
      (instance as any).credentials.set('device-1:user-123', {
        deviceId: 'device-1',
        apiKey: 'key-1',
        userId: 'user-123',
        permissions: ['read']
      });
      (instance as any).credentials.set('device-2:user-123', {
        deviceId: 'device-2',
        apiKey: 'key-2',
        userId: 'user-123',
        permissions: ['read', 'write']
      });
      (instance as any).credentials.set('device-1:user-456', {
        deviceId: 'device-1',
        apiKey: 'key-3',
        userId: 'user-456',
        permissions: ['read']
      });
    });

    it('should return all devices for user', () => {
      const devices = hardwareAuth.getAuthenticatedDevices('user-123');
      
      expect(devices).toHaveLength(2);
      expect(devices.map(d => d.deviceId)).toEqual(['device-1', 'device-2']);
      expect(devices.every(d => d.userId === 'user-123')).toBe(true);
    });

    it('should return empty array for user with no devices', () => {
      const devices = hardwareAuth.getAuthenticatedDevices('user-789');
      
      expect(devices).toHaveLength(0);
    });
  });

  describe('validateToken', () => {
    it('should validate JWT token successfully', () => {
      const result = hardwareAuth.validateToken('valid-token');
      
      expect(result).toBe(true);
    });

    it('should validate expired JWT token', () => {
      const result = hardwareAuth.validateToken('expired-token');
      
      expect(result).toBe(false);
    });

    it('should validate simple base64 encoded token', () => {
      const token = btoa(JSON.stringify({
        deviceId: 'test-device-1',
        userId: 'user-123',
        permissions: ['read', 'write'],
        exp: Math.floor(Date.now() / 1000) + 3600
      }));
      
      const result = hardwareAuth.validateToken(token);
      
      expect(result).toBe(true);
    });

    it('should return false for invalid token', () => {
      const result = hardwareAuth.validateToken('invalid-token');
      
      expect(result).toBe(false);
    });

    it('should handle malformed token gracefully', () => {
      const result = hardwareAuth.validateToken('not-a-valid-token');
      
      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove expired tokens and challenges', () => {
      const instance = HardwareAuth.getInstance();
      
      // Mock expired data
      const expiredToken = {
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        deviceId: 'test-device-1',
        userId: 'user-123',
        permissions: ['read', 'write']
      };
      
      const validToken = {
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        deviceId: 'test-device-2',
        userId: 'user-123',
        permissions: ['read', 'write']
      };
      
      const expiredChallenge = {
        deviceId: 'test-device-3',
        challenge: 'expired-challenge',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() - 5 * 60 * 1000)
      };
      
      const validChallenge = {
        deviceId: 'test-device-4',
        challenge: 'valid-challenge',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };
      
      (instance as any).tokens.set('test-device-1', expiredToken);
      (instance as any).tokens.set('test-device-2', validToken);
      (instance as any).challenges.set('test-device-3', expiredChallenge);
      (instance as any).challenges.set('test-device-4', validChallenge);
      
      hardwareAuth.cleanup();
      
      expect((instance as any).tokens.has('test-device-1')).toBe(false);
      expect((instance as any).tokens.has('test-device-2')).toBe(true);
      expect((instance as any).challenges.has('test-device-3')).toBe(false);
      expect((instance as any).challenges.has('test-device-4')).toBe(true);
    });
  });

  describe('loadStoredCredentials', () => {
    beforeEach(() => {
      localStorageMock.clear();
      localStorageMock.length = 3;
      
      // Mock multiple localStorage items
      localStorageMock.key.mockImplementation((index) => {
        const keys = ['hw_auth_device-1:user-123', 'hw_auth_device-2:user-456', 'other-key'];
        return keys[index] || null;
      });
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'hw_auth_device-1:user-123') {
          return JSON.stringify({
            deviceId: 'device-1',
            apiKey: 'key-1',
            userId: 'user-123',
            permissions: ['read']
          });
        }
        if (key === 'hw_auth_device-2:user-456') {
          return JSON.stringify({
            deviceId: 'device-2',
            apiKey: 'key-2',
            userId: 'user-456',
            permissions: ['read', 'write']
          });
        }
        return null;
      });
    });

    it('should load all credentials for user', () => {
      hardwareAuth.loadStoredCredentials('user-123');
      
      expect(localStorageMock.key).toHaveBeenCalledTimes(3);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('hw_auth_device-1:user-123');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('hw_auth_device-2:user-456');
      
      const instance = HardwareAuth.getInstance();
      expect((instance as any).credentials.get('device-1:user-123')).toBeDefined();
      expect((instance as any).credentials.get('device-2:user-456')).toBeDefined();
    });

    it('should handle invalid stored data', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'hw_auth_invalid:user-123') {
          return 'invalid-json';
        }
        return null;
      });
      
      hardwareAuth.loadStoredCredentials('user-123');
      
      // Should remove invalid data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hw_auth_invalid:user-123');
      
      const instance = HardwareAuth.getInstance();
      expect((instance as any).credentials.has('invalid:user-123')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent operations safely', async () => {
      const deviceId = 'test-device-1';
      const userId = 'user-123';
      
      // Start multiple operations concurrently
      const promise1 = hardwareAuth.authenticateWithDevice(deviceId, 'key-1', userId);
      const promise2 = hardwareAuth.authenticateWithDevice(deviceId, 'key-2', userId);
      const promise3 = hardwareAuth.refreshToken(deviceId, userId);
      
      // All should resolve or reject independently
      const results = await Promise.allSettled([promise1, promise2, promise3]);
      
      expect(results).toHaveLength(3);
      // At least one should fail (invalid key)
      expect(results.some(r => r.status === 'rejected')).toBe(true);
    });

    it('should handle device ID with special characters', () => {
      const deviceId = 'device-with-special-chars_123';
      const userId = 'user-123';
      
      const apiKey = hardwareAuth.generateApiKey(deviceId, userId);
      
      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      
      // Check storage key format
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `hw_auth_${deviceId}:${userId}`,
        expect.any(String)
      );
    });

    it('should handle empty permissions array', () => {
      const deviceId = 'test-device-1';
      const userId = 'user-123';
      
      const token = await hardwareAuth.authenticateWithDevice(deviceId, 'test-api-key', userId);
      
      expect(token.permissions).toEqual([]);
    });
  });
});
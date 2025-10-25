/**
 * HardwareAuth Service Tests
 */

import { hardwareAuth } from '../../services/HardwareAuth';

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
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock crypto.getRandomValues
const mockCrypto = {
  getRandomValues: jest.fn().mockImplementation((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  })
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto
});

describe('HardwareAuth', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('generateApiKey', () => {
    it('should generate a unique API key for device', () => {
      const deviceId = 'test-device-1';
      const userId = 'user-123';
      const permissions = ['read', 'write'];

      const apiKey = hardwareAuth.generateApiKey(deviceId, userId, permissions);

      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBeGreaterThan(20); // Should be a reasonably long key
    });

    it('should store credentials in localStorage', () => {
      const deviceId = 'test-device-2';
      const userId = 'user-456';
      const permissions = ['read'];

      hardwareAuth.generateApiKey(deviceId, userId, permissions);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `hw_auth_${deviceId}:${userId}`,
        expect.stringContaining('deviceId')
      );
    });

    it('should use default permissions if none provided', () => {
      const deviceId = 'test-device-3';
      const userId = 'user-789';

      hardwareAuth.generateApiKey(deviceId, userId);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `hw_auth_${deviceId}:${userId}`,
        expect.stringContaining('"permissions":["read","write"]')
      );
    });
  });

  describe('authenticateWithDevice', () => {
    it('should authenticate with valid API key', async () => {
      const deviceId = 'test-device-4';
      const userId = 'user-abc';
      const apiKey = hardwareAuth.generateApiKey(deviceId, userId);

      const token = await hardwareAuth.authenticateWithDevice(deviceId, apiKey, userId);

      expect(token).toBeDefined();
      expect(token.deviceId).toBe(deviceId);
      expect(token.userId).toBe(userId);
      expect(token.permissions).toEqual(['read', 'write']);
      expect(token.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error with invalid API key', async () => {
      const deviceId = 'test-device-5';
      const userId = 'user-def';
      const invalidApiKey = 'invalid-key';

      await expect(hardwareAuth.authenticateWithDevice(deviceId, invalidApiKey, userId))
        .rejects.toThrow('Invalid API key');
    });

    it('should throw error with expired API key', async () => {
      const deviceId = 'test-device-6';
      const userId = 'user-ghi';
      
      // Create an expired credential by manipulating localStorage directly
      const expiredCredential = {
        deviceId,
        apiKey: 'expired-key',
        userId,
        permissions: ['read'],
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000)
      };
      
      localStorageMock.setItem(
        `hw_auth_${deviceId}:${userId}`,
        JSON.stringify(expiredCredential)
      );

      await expect(hardwareAuth.authenticateWithDevice(deviceId, 'expired-key', userId))
        .rejects.toThrow('API key has expired');
    });
  });

  describe('token management', () => {
    it('should store and retrieve valid tokens', async () => {
      const deviceId = 'test-device-7';
      const userId = 'user-jkl';
      const apiKey = hardwareAuth.generateApiKey(deviceId, userId);

      await hardwareAuth.authenticateWithDevice(deviceId, apiKey, userId);

      const token = hardwareAuth.getToken(deviceId);
      expect(token).toBeDefined();
      expect(token!.deviceId).toBe(deviceId);
    });

    it('should return null for non-existent tokens', () => {
      const token = hardwareAuth.getToken('non-existent-device');
      expect(token).toBeNull();
    });

    it('should refresh expired tokens', async () => {
      const deviceId = 'test-device-8';
      const userId = 'user-mno';
      const apiKey = hardwareAuth.generateApiKey(deviceId, userId);

      const originalToken = await hardwareAuth.authenticateWithDevice(deviceId, apiKey, userId);
      
      // Manually expire the token
      if (originalToken) {
        originalToken.expiresAt = new Date(Date.now() - 1000);
      }

      const refreshedToken = await hardwareAuth.refreshToken(deviceId, userId);
      
      expect(refreshedToken).toBeDefined();
      expect(refreshedToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('revokeAccess', () => {
    it('should revoke access and remove credentials', () => {
      const deviceId = 'test-device-9';
      const userId = 'user-pqr';
      const apiKey = hardwareAuth.generateApiKey(deviceId, userId);

      // Verify credential was stored during generation
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `hw_auth_${deviceId}:${userId}`,
        expect.any(String)
      );

      hardwareAuth.revokeAccess(deviceId, userId);

      // Verify credential is removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`hw_auth_${deviceId}:${userId}`);
      
      // Verify token is also removed
      const token = hardwareAuth.getToken(deviceId);
      expect(token).toBeNull();
    });
  });

  describe('getAuthenticatedDevices', () => {
    it('should return devices for specific user', () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';
      const deviceId1 = 'device-1';
      const deviceId2 = 'device-2';
      const deviceId3 = 'device-3';

      // Create credentials for different users
      hardwareAuth.generateApiKey(deviceId1, userId1);
      hardwareAuth.generateApiKey(deviceId2, userId1);
      hardwareAuth.generateApiKey(deviceId3, userId2);

      const user1Devices = hardwareAuth.getAuthenticatedDevices(userId1);
      const user2Devices = hardwareAuth.getAuthenticatedDevices(userId2);

      expect(user1Devices).toHaveLength(2);
      expect(user2Devices).toHaveLength(1);
      expect(user1Devices.map(d => d.deviceId)).toEqual([deviceId1, deviceId2]);
      expect(user2Devices.map(d => d.deviceId)).toEqual([deviceId3]);
    });
  });

  describe('validateToken', () => {
    it('should validate properly formatted tokens', () => {
      // Create a valid token payload
      const payload = {
        deviceId: 'test-device',
        userId: 'test-user',
        permissions: ['read', 'write'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
      };
      
      const validToken = btoa(JSON.stringify(payload));
      
      expect(hardwareAuth.validateToken(validToken)).toBe(true);
    });

    it('should reject expired tokens', () => {
      // Create an expired token payload
      const payload = {
        deviceId: 'test-device',
        userId: 'test-user',
        permissions: ['read', 'write'],
        iat: Math.floor(Date.now() / 1000) - 7200, // Issued 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };
      
      const expiredToken = btoa(JSON.stringify(payload));
      
      expect(hardwareAuth.validateToken(expiredToken)).toBe(false);
    });

    it('should reject invalid tokens', () => {
      const invalidToken = 'invalid-token-format';
      
      expect(hardwareAuth.validateToken(invalidToken)).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove expired tokens and challenges', async () => {
      const deviceId1 = 'device-1';
      const deviceId2 = 'device-2';
      const userId = 'test-user';

      // Create tokens and challenges
      const apiKey1 = hardwareAuth.generateApiKey(deviceId1, userId);
      const apiKey2 = hardwareAuth.generateApiKey(deviceId2, userId);
      
      await hardwareAuth.authenticateWithDevice(deviceId1, apiKey1, userId);
      await hardwareAuth.authenticateWithDevice(deviceId2, apiKey2, userId);

      // Verify tokens exist
      expect(hardwareAuth.getToken(deviceId1)).toBeDefined();
      expect(hardwareAuth.getToken(deviceId2)).toBeDefined();

      // Manually expire one token
      const token1 = hardwareAuth.getToken(deviceId1);
      if (token1) {
        token1.expiresAt = new Date(Date.now() - 1000);
      }

      // Run cleanup
      hardwareAuth.cleanup();

      // Verify expired token is removed, valid token remains
      expect(hardwareAuth.getToken(deviceId1)).toBeNull();
      expect(hardwareAuth.getToken(deviceId2)).toBeDefined();
    });
  });
});
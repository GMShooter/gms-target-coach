/**
 * Hardware Authentication Service
 *
 * This service handles secure authentication with Raspberry Pi devices using JWT tokens
 * and API key management for hardware communication.
 */

import { jwtDecode } from 'jwt-decode';

export interface HardwareAuthToken {
  token: string;
  expiresAt: Date;
  deviceId: string;
  userId: string;
  permissions: string[];
}

export interface HardwareCredentials {
  deviceId: string;
  apiKey: string;
  userId: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  // Below are only present when loaded from storage
  apiKeyEnc?: string;
  apiKeyIV?: string;
}

export interface PiAuthChallenge {
  deviceId: string;
  challenge: string;
  timestamp: Date;
  expiresAt: Date;
}

export interface PiAuthResponse {
  success: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
}

export class HardwareAuth {
  private static instance: HardwareAuth;
  private tokens: Map<string, HardwareAuthToken> = new Map();
  private credentials: Map<string, HardwareCredentials> = new Map();
  private challenges: Map<string, PiAuthChallenge> = new Map();
  private readonly TOKEN_EXPIRY_MINUTES = 60; // 1 hour
  private readonly CHALLENGE_EXPIRY_MINUTES = 5; // 5 minutes

  private constructor() {}

  public static getInstance(): HardwareAuth {
    if (!HardwareAuth.instance) {
      HardwareAuth.instance = new HardwareAuth();
    }
    return HardwareAuth.instance;
  }

  /**
   * Generate a new API key for a device
   */
  public generateApiKey(deviceId: string, userId: string, permissions: string[] = ['read', 'write']): string {
    const apiKey = this.generateSecureToken();
    const credentials: HardwareCredentials = {
      deviceId,
      apiKey,
      userId,
      permissions,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.credentials.set(`${deviceId}:${userId}`, credentials);
    this.storeCredentials(credentials); // The method is now async; ensure to await it in production code.

    return apiKey;
  }

  /**
   * Authenticate with a Pi device using API key
   */
  public async authenticateWithDevice(
    deviceId: string,
    apiKey: string,
    userId: string
  ): Promise<HardwareAuthToken> {
    const credentialKey = `${deviceId}:${userId}`;
    
    // First check if we have credentials stored in memory
    let credentials = this.credentials.get(credentialKey);
    
    // If not in memory, try to load from localStorage
    if (!credentials) {
      const storedData = localStorage.getItem(`hw_auth_${credentialKey}`);
      if (storedData) {
        try {
          const parsedCredentials = JSON.parse(storedData);
          credentials = parsedCredentials;
          this.credentials.set(credentialKey, parsedCredentials);
        } catch (error) {
          // Invalid stored data, remove it
          localStorage.removeItem(`hw_auth_${credentialKey}`);
        }
      }
    }

    if (!credentials || credentials.apiKey !== apiKey) {
      throw new Error('Invalid API key');
    }

    // Check if API key has expired (24 hours)
    const now = new Date();
    const keyAge = now.getTime() - new Date(credentials.createdAt).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (keyAge > maxAge) {
      this.credentials.delete(credentialKey);
      localStorage.removeItem(`hw_auth_${credentialKey}`);
      throw new Error('API key has expired');
    }

    // Generate JWT token for device communication
    const token = await this.generateDeviceToken(deviceId, userId, credentials.permissions);
    
    // Update last used timestamp
    credentials.lastUsed = now;
    this.storeCredentials(credentials);

    return token;
  }

  /**
   * Initiate authentication challenge with Pi device
   */
  public async initiateAuthChallenge(deviceUrl: string, deviceId: string): Promise<PiAuthChallenge> {
    try {
      const response = await fetch(`${deviceUrl}/auth/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GMShooter-Client/1.0'
        },
        body: JSON.stringify({
          deviceId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate auth challenge: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Authentication challenge failed');
      }

      const challenge: PiAuthChallenge = {
        deviceId,
        challenge: data.challenge,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + this.CHALLENGE_EXPIRY_MINUTES * 60 * 1000)
      };

      this.challenges.set(deviceId, challenge);
      return challenge;

    } catch (error) {
      throw new Error(`Failed to initiate auth challenge: ${error}`);
    }
  }

  /**
   * Complete authentication challenge with Pi device
   */
  public async completeAuthChallenge(
    deviceUrl: string,
    deviceId: string,
    signedChallenge: string,
    userId: string
  ): Promise<HardwareAuthToken> {
    try {
      const challenge = this.challenges.get(deviceId);
      if (!challenge) {
        throw new Error('No active challenge found for device');
      }

      if (new Date() > challenge.expiresAt) {
        this.challenges.delete(deviceId);
        throw new Error('Authentication challenge has expired');
      }

      const response = await fetch(`${deviceUrl}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GMShooter-Client/1.0'
        },
        body: JSON.stringify({
          deviceId,
          challenge: challenge.challenge,
          signedChallenge,
          userId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to complete auth challenge: ${response.statusText}`);
      }

      const data: PiAuthResponse = await response.json();
      
      if (!data.success || !data.token) {
        throw new Error(data.error || 'Authentication verification failed');
      }

      // Parse and store the received token
      const token = this.parseDeviceToken(data.token, deviceId, userId);
      this.tokens.set(deviceId, token);
      this.challenges.delete(deviceId);

      return token;

    } catch (error) {
      throw new Error(`Failed to complete auth challenge: ${error}`);
    }
  }

  /**
   * Get valid token for device
   */
  public getToken(deviceId: string): HardwareAuthToken | null {
    const token = this.tokens.get(deviceId);
    
    if (!token) {
      return null;
    }

    // Check if token is still valid
    if (new Date() > token.expiresAt) {
      this.tokens.delete(deviceId);
      return null;
    }

    return token;
  }

  /**
   * Refresh token for device
   */
  public async refreshToken(deviceId: string, userId: string): Promise<HardwareAuthToken> {
    const credentialKey = `${deviceId}:${userId}`;
    const credentials = this.credentials.get(credentialKey);

    if (!credentials) {
      throw new Error('No credentials found for device');
    }

    // Generate new token
    const token = await this.generateDeviceToken(deviceId, userId, credentials.permissions);
    this.tokens.set(deviceId, token);

    return token;
  }

  /**
   * Revoke access to device
   */
  public revokeAccess(deviceId: string, userId: string): void {
    const credentialKey = `${deviceId}:${userId}`;
    this.credentials.delete(credentialKey);
    this.tokens.delete(deviceId);
    this.challenges.delete(deviceId);
    
    // Remove from localStorage
    localStorage.removeItem(`hw_auth_${credentialKey}`);
  }

  /**
   * Get all authenticated devices for user
   */
  public getAuthenticatedDevices(userId: string): HardwareCredentials[] {
    const devices: HardwareCredentials[] = [];
    
    this.credentials.forEach((credentials, key) => {
      if (key.endsWith(`:${userId}`)) {
        devices.push(credentials);
      }
    });

    return devices;
  }

  /**
   * Validate token format and expiration
   */
  public validateToken(token: string): boolean {
    try {
      // First try to decode as JWT
      const decoded = jwtDecode(token) as any;
      const now = Math.floor(Date.now() / 1000);
      
      return decoded.exp ? decoded.exp > now : false;
    } catch (error) {
      try {
        // Fallback for simple base64 encoded tokens
        const payload = JSON.parse(atob(token));
        const now = Math.floor(Date.now() / 1000);
        
        return payload.exp ? payload.exp > now : false;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  /**
   * Generate JWT token for device communication
   */
  private async generateDeviceToken(
    deviceId: string, 
    userId: string, 
    permissions: string[]
  ): Promise<HardwareAuthToken> {
    const payload = {
      deviceId,
      userId,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (this.TOKEN_EXPIRY_MINUTES * 60)
    };

    // In production, this should use a proper JWT library with secret key
    // For now, we'll create a simple token format
    const token = btoa(JSON.stringify(payload));
    
    const authToken: HardwareAuthToken = {
      token,
      expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000),
      deviceId,
      userId,
      permissions
    };

    this.tokens.set(deviceId, authToken);
    return authToken;
  }

  /**
   * Parse device token from response
   */
  private parseDeviceToken(token: string, deviceId: string, userId: string): HardwareAuthToken {
    try {
      const decoded = jwtDecode(token) as any;
      
      return {
        token,
        expiresAt: new Date((decoded.exp || 0) * 1000),
        deviceId,
        userId,
        permissions: decoded.permissions || []
      };
    } catch (error) {
      // Fallback for simple token format
      const payload = JSON.parse(atob(token));
      
      return {
        token,
        expiresAt: new Date(payload.exp * 1000),
        deviceId,
        userId,
        permissions: payload.permissions || []
      };
    }
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Store credentials securely
   */
  private async storeCredentials(credentials: HardwareCredentials): Promise<void> {
    const key = `${credentials.deviceId}:${credentials.userId}`;
    // Encrypt the apiKey before storing
    const { cipher, iv } = await encryptApiKey(credentials.apiKey);
    // Store all fields EXCEPT the plain apiKey, and include the encrypted value/iv instead
    const safeCredentials = {
      ...credentials,
      apiKey: undefined,        // Do not store plaintext
      apiKeyEnc: cipher,
      apiKeyIV: iv,
    };
    localStorage.setItem(`hw_auth_${key}`, JSON.stringify(safeCredentials));
  }

  /**
   * Load stored credentials
   */
  public loadStoredCredentials(userId: string): void {
    const prefix = `hw_auth_`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix) && key.endsWith(`:${userId}`)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const credentials: HardwareCredentials = JSON.parse(data);
            this.credentials.set(key.replace(prefix, ''), credentials);
          }
        } catch (error) {
          console.error('Failed to load stored credentials:', error);
          localStorage.removeItem(key);
        }
      }
    }
  }

  /**
   * Cleanup expired tokens and challenges
   */
  public cleanup(): void {
    const now = new Date();

    // Clean up expired tokens
    this.tokens.forEach((token, deviceId) => {
      if (now > token.expiresAt) {
        this.tokens.delete(deviceId);
      }
    });

    // Clean up expired challenges
    this.challenges.forEach((challenge, deviceId) => {
      if (now > challenge.expiresAt) {
        this.challenges.delete(deviceId);
      }
    });
  }
}

// Export singleton instance
export const hardwareAuth = HardwareAuth.getInstance();
export default hardwareAuth;
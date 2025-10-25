import { useState, useCallback, useEffect, useRef } from 'react';
import { SessionData, ShotData, FrameData } from '../services/HardwareAPI';

export interface SessionPersistenceOptions {
  enableAutoSave?: boolean;
  autoSaveInterval?: number;
  maxStoredSessions?: number;
  enableCompression?: boolean;
  storageKey?: string;
}

export interface StoredSession {
  id: string;
  sessionData: SessionData;
  shots: ShotData[];
  frames: FrameData[];
  lastSaved: Date;
  isRecoverable: boolean;
  metadata: {
    version: string;
    appVersion: string;
    deviceInfo?: string;
    browserInfo?: string;
  };
}

export interface RecoveryResult {
  success: boolean;
  recoveredSessions: StoredSession[];
  errors: string[];
  warnings: string[];
}

export const useSessionPersistence = (options: SessionPersistenceOptions = {}) => {
  const {
    enableAutoSave = true,
    autoSaveInterval = 30000, // 30 seconds
    maxStoredSessions = 10,
    enableCompression = true,
    storageKey = 'gmshooter_sessions'
  } = options;

  const [storedSessions, setStoredSessions] = useState<StoredSession[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryResult | null>(null);
  
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionRef = useRef<{
    sessionData: SessionData | null;
    shots: ShotData[];
    frames: FrameData[];
  }>({
    sessionData: null,
    shots: [],
    frames: []
  });

  // Initialize persistence on mount
  useEffect(() => {
    loadStoredSessions();
    
    // Set up auto-save if enabled
    if (enableAutoSave) {
      autoSaveIntervalRef.current = setInterval(() => {
        autoSave();
      }, autoSaveInterval);
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [enableAutoSave, autoSaveInterval]);

  // Load stored sessions from localStorage
  const loadStoredSessions = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        setStoredSessions([]);
        return;
      }

      const parsed = JSON.parse(stored);
      const sessions: StoredSession[] = Array.isArray(parsed) ? parsed : [parsed];
      
      // Validate and filter sessions
      const validSessions = sessions.filter(session => {
        if (!session.id || !session.sessionData || !session.lastSaved) {
          return false;
        }
        
        // Check if session is not too old (30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (new Date(session.lastSaved) < thirtyDaysAgo) {
          return false;
        }
        
        return true;
      });

      // Sort by last saved date (newest first)
      validSessions.sort((a, b) => 
        new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()
      );

      // Limit to maxStoredSessions
      const limitedSessions = validSessions.slice(0, maxStoredSessions);
      
      setStoredSessions(limitedSessions);
      
      // Clean up old sessions in storage
      if (validSessions.length > maxStoredSessions) {
        saveToStorage(limitedSessions);
      }
    } catch (error) {
      console.error('Failed to load stored sessions:', error);
      setStoredSessions([]);
    }
  }, [storageKey, maxStoredSessions]);

  // Save sessions to localStorage
  const saveToStorage = useCallback((sessions: StoredSession[]) => {
    try {
      const dataToStore = enableCompression 
        ? compressData(sessions)
        : sessions;
      
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
      setLastSaveTime(new Date());
    } catch (error) {
      console.error('Failed to save sessions to storage:', error);
      
      // Try to free up space and retry
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        try {
          // Remove oldest sessions and retry
          const reducedSessions = sessions.slice(0, Math.max(1, sessions.length - 1));
          localStorage.setItem(storageKey, JSON.stringify(reducedSessions));
          setLastSaveTime(new Date());
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
        }
      }
    }
  }, [storageKey, enableCompression]);

  // Compress data for storage
  const compressData = useCallback((data: any): string => {
    try {
      // Simple compression - in production, use proper compression library
      return JSON.stringify(data).replace(/([a-zA-Z0-9])\1+/g, '$1');
    } catch (error) {
      console.warn('Compression failed, using original data:', error);
      return JSON.stringify(data);
    }
  }, []);

  // Decompress data from storage
  const decompressData = useCallback((compressed: string): any => {
    try {
      // Simple decompression - in production, use proper decompression library
      return JSON.parse(compressed);
    } catch (error) {
      console.warn('Decompression failed, treating as plain JSON:', error);
      return JSON.parse(compressed);
    }
  }, []);

  // Auto-save current session
  const autoSave = useCallback(() => {
    const { sessionData, shots, frames } = currentSessionRef.current;
    
    if (!sessionData) {
      return;
    }

    const storedSession: StoredSession = {
      id: sessionData.sessionId,
      sessionData,
      shots: [...shots],
      frames: [...frames],
      lastSaved: new Date(),
      isRecoverable: sessionData.status !== 'completed',
      metadata: {
        version: '1.0.0',
        appVersion: process.env.REACT_APP_VERSION || '2.0.0',
        deviceInfo: navigator.userAgent,
        browserInfo: `${navigator.platform} - ${navigator.language}`
      }
    };

    // Update or add session
    setStoredSessions(prev => {
      const existingIndex = prev.findIndex(s => s.id === storedSession.id);
      let updatedSessions;
      
      if (existingIndex >= 0) {
        updatedSessions = [...prev];
        updatedSessions[existingIndex] = storedSession;
      } else {
        updatedSessions = [storedSession, ...prev];
      }
      
      // Limit to maxStoredSessions
      const limitedSessions = updatedSessions.slice(0, maxStoredSessions);
      
      // Save to storage
      saveToStorage(limitedSessions);
      
      return limitedSessions;
    });
  }, [maxStoredSessions, saveToStorage]);

  // Update current session data
  const updateCurrentSession = useCallback((
    sessionData: SessionData | null,
    shots: ShotData[] = [],
    frames: FrameData[] = []
  ) => {
    currentSessionRef.current = { sessionData, shots, frames };
    
    // Trigger auto-save if enabled
    if (enableAutoSave && sessionData) {
      autoSave();
    }
  }, [enableAutoSave, autoSave]);

  // Save session manually
  const saveSession = useCallback((
    sessionData: SessionData,
    shots: ShotData[] = [],
    frames: FrameData[] = []
  ) => {
    setIsSaving(true);
    
    try {
      const storedSession: StoredSession = {
        id: sessionData.sessionId,
        sessionData,
        shots: [...shots],
        frames: [...frames],
        lastSaved: new Date(),
        isRecoverable: sessionData.status !== 'completed',
        metadata: {
          version: '1.0.0',
          appVersion: process.env.REACT_APP_VERSION || '2.0.0',
          deviceInfo: navigator.userAgent,
          browserInfo: `${navigator.platform} - ${navigator.language}`
        }
      };

      setStoredSessions(prev => {
        const existingIndex = prev.findIndex(s => s.id === storedSession.id);
        let updatedSessions;
        
        if (existingIndex >= 0) {
          updatedSessions = [...prev];
          updatedSessions[existingIndex] = storedSession;
        } else {
          updatedSessions = [storedSession, ...prev];
        }
        
        // Limit to maxStoredSessions
        const limitedSessions = updatedSessions.slice(0, maxStoredSessions);
        
        // Save to storage
        saveToStorage(limitedSessions);
        
        return limitedSessions;
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    } finally {
      setIsSaving(false);
    }
  }, [maxStoredSessions, saveToStorage]);

  // Delete stored session
  const deleteStoredSession = useCallback((sessionId: string) => {
    setStoredSessions(prev => {
      const updatedSessions = prev.filter(s => s.id !== sessionId);
      saveToStorage(updatedSessions);
      return updatedSessions;
    });
  }, [saveToStorage]);

  // Clear all stored sessions
  const clearAllSessions = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setStoredSessions([]);
      setLastSaveTime(null);
    } catch (error) {
      console.error('Failed to clear stored sessions:', error);
    }
  }, [storageKey]);

  // Recover session from storage
  const recoverSession = useCallback((sessionId: string): SessionData | null => {
    const session = storedSessions.find(s => s.id === sessionId);
    if (!session || !session.isRecoverable) {
      return null;
    }

    try {
      // Validate session data
      if (!session.sessionData || !session.sessionData.sessionId) {
        console.error('Invalid session data for recovery:', session);
        return null;
      }

      // Update current session reference
      currentSessionRef.current = {
        sessionData: session.sessionData,
        shots: session.shots || [],
        frames: session.frames || []
      };

      return session.sessionData;
    } catch (error) {
      console.error('Failed to recover session:', error);
      return null;
    }
  }, [storedSessions]);

  // Get recoverable sessions
  const getRecoverableSessions = useCallback((): StoredSession[] => {
    return storedSessions.filter(s => s.isRecoverable);
  }, [storedSessions]);

  // Export sessions to file
  const exportSessions = useCallback(() => {
    try {
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        sessions: storedSessions
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gmshooter_sessions_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export sessions:', error);
    }
  }, [storedSessions]);

  // Import sessions from file
  const importSessions = useCallback((file: File): Promise<RecoveryResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedData = JSON.parse(content);
          
          // Validate import data
          if (!importedData.sessions || !Array.isArray(importedData.sessions)) {
            resolve({
              success: false,
              recoveredSessions: [],
              errors: ['Invalid file format'],
              warnings: []
            });
            return;
          }

          // Validate each session
          const validSessions: StoredSession[] = [];
          const errors: string[] = [];
          const warnings: string[] = [];

          importedData.sessions.forEach((session: any, index: number) => {
            if (!session.id || !session.sessionData) {
              errors.push(`Session ${index + 1}: Missing required fields`);
              return;
            }

            // Add import metadata
            const enhancedSession: StoredSession = {
              ...session,
              lastSaved: new Date(session.lastSaved || Date.now()),
              metadata: {
                ...session.metadata,
                imported: true,
                importDate: new Date().toISOString()
              }
            };

            validSessions.push(enhancedSession);
          });

          // Merge with existing sessions
          const mergedSessions = [...validSessions, ...storedSessions]
            .sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime())
            .slice(0, maxStoredSessions);

          // Save merged sessions
          saveToStorage(mergedSessions);
          setStoredSessions(mergedSessions);

          resolve({
            success: true,
            recoveredSessions: validSessions,
            errors,
            warnings: warnings.length > 0 ? warnings : []
          });
        } catch (error) {
          resolve({
            success: false,
            recoveredSessions: [],
            errors: [`Failed to parse file: ${error}`],
            warnings: []
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          recoveredSessions: [],
          errors: ['Failed to read file'],
          warnings: []
        });
      };

      reader.readAsText(file);
    });
  }, [storedSessions, maxStoredSessions, saveToStorage]);

  // Get storage statistics
  const getStorageStats = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      const size = stored ? new Blob([stored]).size : 0;
      
      return {
        totalSessions: storedSessions.length,
        recoverableSessions: storedSessions.filter(s => s.isRecoverable).length,
        storageSize: size,
        storageSizeFormatted: formatBytes(size),
        lastSaveTime,
        isAutoSaveEnabled: enableAutoSave,
        autoSaveInterval
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalSessions: 0,
        recoverableSessions: 0,
        storageSize: 0,
        storageSizeFormatted: '0 B',
        lastSaveTime: null,
        isAutoSaveEnabled: enableAutoSave,
        autoSaveInterval
      };
    }
  }, [storedSessions, lastSaveTime, enableAutoSave, autoSaveInterval, storageKey]);

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    storedSessions,
    isSaving,
    lastSaveTime,
    recoveryStatus,
    currentSession: currentSessionRef.current.sessionData,
    
    // Actions
    saveSession,
    updateCurrentSession,
    deleteStoredSession,
    clearAllSessions,
    recoverSession,
    getRecoverableSessions,
    exportSessions,
    importSessions,
    
    // Utilities
    getStorageStats,
    loadStoredSessions,
    autoSave
  };
};
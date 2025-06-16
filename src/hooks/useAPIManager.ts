
import { useState, useCallback } from 'react';

interface APIState {
  lastGeminiRequest: number;
  geminiRequestCount: number;
}

const GEMINI_RATE_LIMIT = 10; // requests per minute
const COOLDOWN_WINDOW = 60 * 1000; // 60 seconds

export const useAPIManager = () => {
  const [apiState, setApiState] = useState<APIState>({
    lastGeminiRequest: 0,
    geminiRequestCount: 0
  });

  const getModelChoice = useCallback((): { model: 'gemini' | 'gemma'; reason: string } => {
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - apiState.lastGeminiRequest;
    
    // Reset window if enough time has passed
    if (timeSinceLastRequest > COOLDOWN_WINDOW) {
      setApiState(prev => ({
        ...prev,
        geminiRequestCount: 0
      }));
      
      return {
        model: 'gemini',
        reason: 'Using Gemini 2.5 Flash Preview'
      };
    }
    
    // Check if under rate limit
    if (apiState.geminiRequestCount < GEMINI_RATE_LIMIT) {
      return {
        model: 'gemini',
        reason: `Using Gemini 2.5 Flash (${apiState.geminiRequestCount + 1}/${GEMINI_RATE_LIMIT})`
      };
    }
    
    // Use fallback
    return {
      model: 'gemma',
      reason: 'Gemini rate limit reached - using Gemma 3 27B fallback'
    };
  }, [apiState]);

  const recordGeminiRequest = useCallback(() => {
    setApiState(prev => ({
      lastGeminiRequest: Date.now(),
      geminiRequestCount: prev.geminiRequestCount + 1
    }));
  }, []);

  const getRemainingRequests = useCallback(() => {
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - apiState.lastGeminiRequest;
    
    if (timeSinceLastRequest > COOLDOWN_WINDOW) {
      return GEMINI_RATE_LIMIT;
    }
    
    return Math.max(0, GEMINI_RATE_LIMIT - apiState.geminiRequestCount);
  }, [apiState]);

  const getTimeUntilReset = useCallback(() => {
    const currentTime = Date.now();
    const timeUntilReset = COOLDOWN_WINDOW - (currentTime - apiState.lastGeminiRequest);
    
    return Math.max(0, Math.ceil(timeUntilReset / 1000));
  }, [apiState]);

  return {
    getModelChoice,
    recordGeminiRequest,
    getRemainingRequests,
    getTimeUntilReset,
    isInCooldown: apiState.geminiRequestCount >= GEMINI_RATE_LIMIT
  };
};


import { useState, useCallback } from 'react';

interface APIState {
  lastGeminiRequestTimestamp: number;
  geminiRequestCountInWindow: number;
  isInCooldown: boolean;
}

const GEMINI_RATE_LIMIT = 10; // requests per minute
const COOLDOWN_WINDOW = 60 * 1000; // 60 seconds in milliseconds

export const useAPIOrchestration = () => {
  const [apiState, setApiState] = useState<APIState>({
    lastGeminiRequestTimestamp: 0,
    geminiRequestCountInWindow: 0,
    isInCooldown: false
  });

  const determineModelChoice = useCallback((): { model: 'gemini' | 'gemma'; reason: string } => {
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - apiState.lastGeminiRequestTimestamp;
    
    // Reset window if enough time has passed
    if (timeSinceLastRequest > COOLDOWN_WINDOW) {
      setApiState(prev => ({
        ...prev,
        geminiRequestCountInWindow: 0,
        isInCooldown: false
      }));
      
      return {
        model: 'gemini',
        reason: 'Rate limit window reset - using premium Gemini 2.5 Flash'
      };
    }
    
    // Check if under rate limit
    if (apiState.geminiRequestCountInWindow < GEMINI_RATE_LIMIT) {
      return {
        model: 'gemini',
        reason: `Using Gemini 2.5 Flash (${apiState.geminiRequestCountInWindow + 1}/${GEMINI_RATE_LIMIT} requests)`
      };
    }
    
    // Use fallback
    return {
      model: 'gemma',
      reason: 'Gemini rate limit reached - using Gemma 3 fallback for instant analysis'
    };
  }, [apiState]);

  const recordGeminiRequest = useCallback(() => {
    setApiState(prev => ({
      lastGeminiRequestTimestamp: Date.now(),
      geminiRequestCountInWindow: prev.geminiRequestCountInWindow + 1,
      isInCooldown: prev.geminiRequestCountInWindow + 1 >= GEMINI_RATE_LIMIT
    }));
  }, []);

  const getRemainingRequests = useCallback(() => {
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - apiState.lastGeminiRequestTimestamp;
    
    if (timeSinceLastRequest > COOLDOWN_WINDOW) {
      return GEMINI_RATE_LIMIT;
    }
    
    return Math.max(0, GEMINI_RATE_LIMIT - apiState.geminiRequestCountInWindow);
  }, [apiState]);

  const getTimeUntilReset = useCallback(() => {
    if (!apiState.isInCooldown) return 0;
    
    const currentTime = Date.now();
    const timeUntilReset = COOLDOWN_WINDOW - (currentTime - apiState.lastGeminiRequestTimestamp);
    
    return Math.max(0, Math.ceil(timeUntilReset / 1000));
  }, [apiState]);

  return {
    determineModelChoice,
    recordGeminiRequest,
    getRemainingRequests,
    getTimeUntilReset,
    isInCooldown: apiState.isInCooldown
  };
};

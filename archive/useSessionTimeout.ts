import { useState, useEffect, useCallback, useRef } from 'react';

import { SessionData } from '../services/HardwareAPI';

interface SessionTimeoutOptions {
  maxSessionDuration?: number; // Maximum session duration in minutes (default: 60)
  warningThreshold?: number; // Warning threshold in minutes before timeout (default: 10)
  autoExtendOnActivity?: boolean; // Auto-extend session on user activity (default: true)
  activityResetTime?: number; // Time in minutes to reset activity timer (default: 5)
}

interface SessionTimeoutState {
  timeRemaining: number; // Time remaining in seconds
  isWarning: boolean; // Whether warning threshold has been reached
  isExpired: boolean; // Whether session has expired
  lastActivity: Date; // Last user activity timestamp
  isPaused: boolean; // Whether timeout is paused
}

export const useSessionTimeout = (
  session: SessionData | null,
  options: SessionTimeoutOptions = {}
) => {
  const {
    maxSessionDuration = 60, // 60 minutes default
    warningThreshold = 10, // 10 minutes warning
    autoExtendOnActivity = true,
    activityResetTime = 5 // 5 minutes activity reset
  } = options;

  const [timeoutState, setTimeoutState] = useState<SessionTimeoutState>({
    timeRemaining: maxSessionDuration * 60, // Convert to seconds
    isWarning: false,
    isExpired: false,
    lastActivity: new Date(),
    isPaused: false
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeoutCallback = useRef<((session: SessionData) => void) | null>(null);
  const onWarningCallback = useRef<((timeRemaining: number) => void) | null>(null);
  const onExtendCallback = useRef<((newEndTime: Date) => void) | null>(null);

  // Calculate session end time
  const getSessionEndTime = useCallback(() => {
    if (!session) return null;
    const startTime = new Date(session.startTime);
    return new Date(startTime.getTime() + maxSessionDuration * 60 * 1000);
  }, [session, maxSessionDuration]);

  // Update timeout state
  const updateTimeoutState = useCallback(() => {
    if (!session || timeoutState.isPaused) return;

    const endTime = getSessionEndTime();
    if (!endTime) return;

    const now = new Date();
    const timeRemaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
    const isWarning = timeRemaining > 0 && timeRemaining <= warningThreshold * 60;
    const isExpired = timeRemaining === 0;

    setTimeoutState(prev => {
      const newState = {
        ...prev,
        timeRemaining,
        isWarning,
        isExpired
      };

      // Trigger callbacks
      if (isExpired && onTimeoutCallback.current) {
        onTimeoutCallback.current(session);
      } else if (isWarning && !prev.isWarning && onWarningCallback.current) {
        onWarningCallback.current(timeRemaining);
      }

      return newState;
    });
  }, [session, getSessionEndTime, warningThreshold, timeoutState.isPaused]);

  // Start timeout monitoring
  const startTimeout = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setTimeoutState(prev => ({
      ...prev,
      isPaused: false,
      lastActivity: new Date()
    }));

    intervalRef.current = setInterval(updateTimeoutState, 1000); // Update every second
  }, [updateTimeoutState]);

  // Pause timeout monitoring
  const pauseTimeout = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setTimeoutState(prev => ({
      ...prev,
      isPaused: true
    }));
  }, []);

  // Resume timeout monitoring
  const resumeTimeout = useCallback(() => {
    if (!timeoutState.isPaused) return;
    startTimeout();
  }, [timeoutState.isPaused, startTimeout]);

  // Extend session
  const extendSession = useCallback((additionalMinutes: number = 10) => {
    if (!session) return;

    const newEndTime = new Date(Date.now() + additionalMinutes * 60 * 1000);
    
    if (onExtendCallback.current) {
      onExtendCallback.current(newEndTime);
    }

    // Reset timeout state with new duration
    setTimeoutState(prev => ({
      ...prev,
      timeRemaining: additionalMinutes * 60,
      isWarning: false,
      isExpired: false,
      lastActivity: new Date()
    }));
  }, [session]);

  // Reset activity timer
  const resetActivityTimer = useCallback(() => {
    if (!autoExtendOnActivity || !session) return;

    const now = new Date();
    const timeSinceLastActivity = (now.getTime() - timeoutState.lastActivity.getTime()) / (1000 * 60);

    // Only reset if enough time has passed since last activity
    if (timeSinceLastActivity >= activityResetTime) {
      extendSession(maxSessionDuration);
    }
  }, [autoExtendOnActivity, session, timeoutState.lastActivity, activityResetTime, extendSession, maxSessionDuration]);

  // Set timeout callback
  const onTimeout = useCallback((callback: (session: SessionData) => void) => {
    onTimeoutCallback.current = callback;
  }, []);

  // Set warning callback
  const onWarning = useCallback((callback: (timeRemaining: number) => void) => {
    onWarningCallback.current = callback;
  }, []);

  // Set extend callback
  const onExtend = useCallback((callback: (newEndTime: Date) => void) => {
    onExtendCallback.current = callback;
  }, []);

  // Format time remaining
  const formatTimeRemaining = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, []);

  // Start monitoring when session changes
  useEffect(() => {
    if (session) {
      startTimeout();
    } else {
      pauseTimeout();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session, startTimeout, pauseTimeout]);

  // Auto-extend on activity
  useEffect(() => {
    const handleUserActivity = () => {
      resetActivityTimer();
    };

    // Listen for user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [resetActivityTimer]);

  return {
    ...timeoutState,
    startTimeout,
    pauseTimeout,
    resumeTimeout,
    extendSession,
    resetActivityTimer,
    onTimeout,
    onWarning,
    onExtend,
    formatTimeRemaining: formatTimeRemaining(timeoutState.timeRemaining),
    sessionEndTime: getSessionEndTime()
  };
};
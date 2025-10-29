import { useCallback, useRef } from 'react';

interface SoundEffect {
  play: () => void;
  stop: () => void;
}

export const useSoundEffects = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playShotSound = useCallback((): SoundEffect => {
    const context = initAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Create a realistic gunshot sound
    oscillator.frequency.setValueAtTime(150, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.1);
    
    return {
      play: () => {},
      stop: () => oscillator.stop()
    };
  }, [initAudioContext]);

  const playHitSound = useCallback((score: number): SoundEffect => {
    const context = initAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Pitch based on score (higher score = higher pitch)
    const frequency = 200 + (score * 10);
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    
    gainNode.gain.setValueAtTime(0.2, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);
    
    return {
      play: () => {},
      stop: () => oscillator.stop()
    };
  }, [initAudioContext]);

  const playBullseyeSound = useCallback((): SoundEffect => {
    const context = initAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Special bullseye sound
    oscillator.frequency.setValueAtTime(800, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1600, context.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.4, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.5);
    
    return {
      play: () => {},
      stop: () => oscillator.stop()
    };
  }, [initAudioContext]);

  const playAnalysisCompleteSound = useCallback((): SoundEffect => {
    const context = initAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Success sound
    oscillator.frequency.setValueAtTime(400, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);
    
    return {
      play: () => {},
      stop: () => oscillator.stop()
    };
  }, [initAudioContext]);

  return {
    playShotSound,
    playHitSound,
    playBullseyeSound,
    playAnalysisCompleteSound
  };
};
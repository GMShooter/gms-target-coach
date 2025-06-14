
import React, { useState, useCallback } from 'react';
import { Timer, Play, Square } from 'lucide-react';

interface DrillModeProps {
  onDrillStart: () => void;
  onDrillStop: () => void;
  isRecording: boolean;
}

export const DrillMode: React.FC<DrillModeProps> = ({ 
  onDrillStart, 
  onDrillStop, 
  isRecording 
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showGoSignal, setShowGoSignal] = useState(false);
  const [isDrillActive, setIsDrillActive] = useState(false);

  const playBeepSound = useCallback(() => {
    // Create a beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // 800 Hz beep
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }, []);

  const startDrill = useCallback(async () => {
    setIsDrillActive(true);
    
    // Random delay between 1.5 and 4 seconds
    const delay = Math.random() * 2.5 + 1.5;
    setCountdown(Math.ceil(delay));
    
    // Countdown display
    let timeLeft = delay;
    const countdownInterval = setInterval(() => {
      timeLeft -= 0.1;
      setCountdown(Math.ceil(timeLeft));
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        setCountdown(null);
        
        // Show GO signal
        setShowGoSignal(true);
        playBeepSound();
        
        // Start recording
        onDrillStart();
        
        // Hide GO signal after 1 second
        setTimeout(() => {
          setShowGoSignal(false);
        }, 1000);
      }
    }, 100);
    
  }, [onDrillStart, playBeepSound]);

  const stopDrill = useCallback(() => {
    setIsDrillActive(false);
    setCountdown(null);
    setShowGoSignal(false);
    onDrillStop();
  }, [onDrillStop]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* GO Signal Overlay */}
      {showGoSignal && (
        <div className="fixed inset-0 bg-green-500 z-50 flex items-center justify-center animate-pulse">
          <div className="text-white text-8xl font-bold">GO!</div>
        </div>
      )}
      
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-red-400/10 rounded-lg flex items-center justify-center">
            <Timer className="w-8 h-8 text-red-400" />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold mb-2">Drill Mode</h3>
            <p className="text-slate-400 mb-6">
              Professional timing analysis with randomized start signal
            </p>
          </div>

          {countdown !== null && (
            <div className="text-6xl font-bold text-yellow-400 animate-pulse">
              {countdown}
            </div>
          )}

          {!isDrillActive && !isRecording && (
            <button
              onClick={startDrill}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg transition-colors text-lg font-semibold"
            >
              <Play className="w-5 h-5" />
              Start Drill
            </button>
          )}

          {(isDrillActive || isRecording) && (
            <button
              onClick={stopDrill}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg transition-colors text-lg font-semibold"
            >
              <Square className="w-5 h-5" />
              Stop Drill
            </button>
          )}
        </div>
        
        <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Timer className="w-4 h-4 text-red-400" />
            How It Works
          </h4>
          <ul className="space-y-2 text-sm text-slate-400 text-left">
            <li>• Press "Start Drill" to begin the timing sequence</li>
            <li>• Wait for the random delay (1.5-4 seconds)</li>
            <li>• When you see "GO!" and hear the beep, start shooting</li>
            <li>• The system will measure your time to first shot and split times</li>
            <li>• Perfect for practicing draw speed and reaction time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

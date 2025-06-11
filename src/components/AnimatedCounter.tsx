
import React, { useState, useEffect } from 'react';

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  end, 
  duration = 1000, 
  suffix = '', 
  decimals = 0 
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = 0;
    const increment = end / (duration / 16); // 60fps
    
    const timer = setInterval(() => {
      setCurrent(prev => {
        const next = prev + increment;
        if (next >= end) {
          clearInterval(timer);
          return end;
        }
        return next;
      });
    }, 16);

    return () => clearInterval(timer);
  }, [end, duration]);

  const displayValue = decimals > 0 ? current.toFixed(decimals) : Math.floor(current);

  return <span>{displayValue}{suffix}</span>;
};

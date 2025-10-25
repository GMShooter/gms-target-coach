// Re-export all MagicUI utilities and components
export { cn } from '../utils';

// Pattern utilities for animations
export const patterns = {
  // Grid pattern
  grid: {
    background: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  // Animated gradient patterns
  gradient: {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600',
    secondary: 'bg-gradient-to-r from-green-400 to-blue-500',
    accent: 'bg-gradient-to-r from-purple-500 to-pink-500',
    warm: 'bg-gradient-to-r from-orange-400 to-red-500',
    cool: 'bg-gradient-to-r from-cyan-400 to-blue-500',
  },
  // Animation patterns
  animation: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    slideDown: 'animate-slide-down',
    slideLeft: 'animate-slide-left',
    slideRight: 'animate-slide-right',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    spin: 'animate-spin',
    ping: 'animate-ping',
  },
  // Glow effects
  glow: {
    subtle: 'shadow-lg shadow-blue-500/20',
    medium: 'shadow-xl shadow-purple-500/30',
    strong: 'shadow-2xl shadow-pink-500/40',
    neon: 'shadow-2xl shadow-cyan-400/50',
  },
  // Shimmer effects
  shimmer: {
    subtle: 'bg-gradient-to-r from-transparent via-white/10 to-transparent',
    medium: 'bg-gradient-to-r from-transparent via-white/20 to-transparent',
    strong: 'bg-gradient-to-r from-transparent via-white/30 to-transparent',
  },
  // Text gradient effects
  textGradient: {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent',
    secondary: 'bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent',
    tertiary: 'bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent',
    quaternary: 'bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent',
  }
};

// Animation keyframes (to be added to CSS)
export const keyframes = {
  fadeIn: `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  slideUp: `
    @keyframes slide-up {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  slideDown: `
    @keyframes slide-down {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  slideLeft: `
    @keyframes slide-left {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `,
  slideRight: `
    @keyframes slide-right {
      from { transform: translateX(-20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
  glow: `
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
      50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.8); }
    }
  `
};

// Utility functions for dynamic styling
export const getPattern = (type: keyof typeof patterns, variant: string) => {
  const patternSet = patterns[type];
  return patternSet[variant as keyof typeof patternSet] || '';
};

export const getAnimation = (animation: keyof typeof patterns.animation) => {
  return patterns.animation[animation];
};

export const getGlow = (intensity: keyof typeof patterns.glow) => {
  return patterns.glow[intensity];
};

export const getShimmer = (intensity: keyof typeof patterns.shimmer) => {
  return patterns.shimmer[intensity];
};
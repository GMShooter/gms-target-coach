import React from 'react'
import { cn } from './utils'

// Export cn for components that need it
export { cn }

// MagicUI utility functions for enhanced UI components

export interface MagicUIProps {
  className?: string
  children?: React.ReactNode
}

export const magicVariants = {
  // Button variants
  button: {
    primary: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200',
    secondary: 'bg-gray-700 text-white font-medium py-2 px-4 rounded-lg shadow hover:bg-gray-600 transition-all duration-200',
    outline: 'border-2 border-purple-500 text-purple-400 font-medium py-2 px-4 rounded-lg hover:bg-purple-500 hover:text-white transition-all duration-200',
    ghost: 'text-purple-400 font-medium py-2 px-4 rounded-lg hover:bg-purple-500 hover:text-white transition-all duration-200'
  },
  // Card variants
  card: {
    default: 'bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6',
    elevated: 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl shadow-2xl p-6'
  },
  // Input variants
  input: {
    default: 'bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200',
    glass: 'bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200'
  }
}

export const getMagicClass = (variant: string, type: keyof typeof magicVariants, additionalClasses = '') => {
  const baseClasses = magicVariants[type]?.[variant as keyof typeof magicVariants[typeof type]] || ''
  return cn(baseClasses, additionalClasses)
}

// Animation utilities
export const animations = {
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  scaleIn: 'animate-scale-in',
  shimmer: 'animate-shimmer',
  float: 'animate-float',
  pulseGlow: 'animate-pulse-glow',
  gradientX: 'animate-gradient-x',
  gradientY: 'animate-gradient-y',
  gradientXY: 'animate-gradient-xy',
  meteor: 'animate-meteor',
  bounceGentle: 'animate-bounce-gentle',
  rotateSlow: 'animate-rotate-slow'
}

// Gradient utilities
export const gradients = {
  primary: 'bg-gradient-to-r from-blue-500 to-purple-600',
  secondary: 'bg-gradient-to-r from-gray-600 to-gray-700',
  success: 'bg-gradient-to-r from-green-500 to-emerald-600',
  warning: 'bg-gradient-to-r from-yellow-500 to-orange-600',
  error: 'bg-gradient-to-r from-red-500 to-pink-600',
  rainbow: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500',
  sunset: 'bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600',
  ocean: 'bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-600'
}

// Shadow utilities
export const shadows = {
  soft: 'shadow-lg',
  medium: 'shadow-xl',
  strong: 'shadow-2xl',
  glow: 'shadow-2xl shadow-purple-500/50',
  inner: 'inner-shadow-lg'
}

// Glass morphism effect
export const glass = {
  light: 'bg-white/10 backdrop-blur-md border border-white/20',
  medium: 'bg-white/20 backdrop-blur-lg border border-white/30',
  heavy: 'bg-white/30 backdrop-blur-xl border border-white/40'
}

// Pattern utilities
export const patterns = {
  dots: 'bg-dot-grid',
  grid: 'bg-grid',
  zigzag: 'bg-zigzag',
  waves: 'bg-waves'
}

// Transition utilities
export const transitions = {
  smooth: 'transition-all duration-300 ease-in-out',
  fast: 'transition-all duration-150 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out',
  bounce: 'transition-all duration-300 ease-bounce'
}

// Hover effects
export const hoverEffects = {
  lift: 'hover:transform hover:-translate-y-1',
  scale: 'hover:transform hover:scale-105',
  glow: 'hover:shadow-lg hover:shadow-purple-500/50',
  rotate: 'hover:transform hover:rotate-3'
}

// Text gradient utilities
export const textGradient = {
  primary: 'bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent',
  secondary: 'bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent',
  rainbow: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent',
  sunset: 'bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent',
  cosmic: 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent',
  ocean: 'bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-600 bg-clip-text text-transparent',
  unset: 'text-transparent'
}

// Magic Dock Component
export const defaultDockItems = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'analysis', label: 'Analysis', icon: '📊' },
  { id: 'reports', label: 'Reports', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default {
  magicVariants,
  getMagicClass,
  animations,
  gradients,
  shadows,
  glass,
  patterns,
  transitions,
  hoverEffects,
  textGradient,
  defaultDockItems,
}
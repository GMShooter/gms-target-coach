// Core MagicUI Components
export { MagicButton } from "./magic-button"
export type { MagicButtonProps } from "./magic-button"

export { MagicCard } from "./magic-card"
export type { MagicCardProps } from "./magic-card"

export { TextGradient } from "./text-gradient"
export type { TextGradientProps } from "./text-gradient"

export { default as MagicDock, defaultDockItems } from "./magic-dock"

// Re-export utilities from magicui index
export {
  patterns
} from "../../lib/magicui"

// Re-export cn from utils
export { cn } from "../../lib/utils"

// Additional utilities for backward compatibility
export const animations = {
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  slideLeft: 'animate-slide-left',
  slideRight: 'animate-slide-right',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin',
  ping: 'animate-ping',
}

export const gradients = {
  primary: 'bg-gradient-to-r from-blue-600 to-purple-600',
  secondary: 'bg-gradient-to-r from-green-400 to-blue-500',
  accent: 'bg-gradient-to-r from-purple-500 to-pink-500',
  warm: 'bg-gradient-to-r from-orange-400 to-red-500',
  cool: 'bg-gradient-to-r from-cyan-400 to-blue-500',
}

export const glass = {
  subtle: 'bg-white/10 backdrop-blur-sm border border-white/20',
  medium: 'bg-white/20 backdrop-blur-md border border-white/30',
  strong: 'bg-white/30 backdrop-blur-lg border border-white/40',
}

export const shadows = {
  subtle: 'shadow-lg shadow-blue-500/20',
  medium: 'shadow-xl shadow-purple-500/30',
  strong: 'shadow-2xl shadow-pink-500/40',
  neon: 'shadow-2xl shadow-cyan-400/50',
}

export const transitions = {
  smooth: 'transition-all duration-300 ease-in-out',
  fast: 'transition-all duration-150 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out',
}

export const hoverEffects = {
  lift: 'hover:-translate-y-1 hover:shadow-lg',
  scale: 'hover:scale-105',
  glow: 'hover:shadow-xl hover:shadow-blue-500/30',
}

export const textGradient = {
  primary: 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent',
  secondary: 'bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent',
  accent: 'bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent',
}

// Additional pattern for grid background
export const grid = {
  subtle: 'bg-grid-white/5',
  medium: 'bg-grid-white/10',
  strong: 'bg-grid-white/20',
}
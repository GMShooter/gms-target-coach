import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Animation utilities
export const animations = {
  fadeIn: "animate-fade-in",
  slideUp: "animate-slide-up",
  slideDown: "animate-slide-down",
  scaleIn: "animate-scale-in",
  shimmer: "animate-shimmer",
  float: "animate-float",
  pulseGlow: "animate-pulse-glow",
  gradientX: "animate-gradient-x",
  gradientY: "animate-gradient-y",
  gradientXY: "animate-gradient-xy",
  meteor: "animate-meteor",
  bounceGentle: "animate-bounce-gentle",
  rotateSlow: "animate-rotate-slow",
}

// Gradient utilities
export const gradients = {
  primary: "bg-gradient-to-r from-blue-600 to-purple-600",
  secondary: "bg-gradient-to-r from-purple-600 to-pink-600",
  success: "bg-gradient-to-r from-green-500 to-emerald-600",
  warning: "bg-gradient-to-r from-yellow-500 to-orange-500",
  error: "bg-gradient-to-r from-red-500 to-pink-500",
  dark: "bg-gradient-to-r from-gray-900 to-black",
  light: "bg-gradient-to-r from-gray-100 to-white",
}

// Common patterns
export const patterns = {
  grid: "bg-grid-white/[0.02] dark:bg-grid-black/[0.2]",
  dots: "bg-dot-thick-[#1a1a1a] dark:bg-dot-thick-[#ffffff]",
  shimmer: "before:absolute before:inset-0 before:h-full before:w-full before:translate-x-full before:skew-x-12 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer",
}

// Glass morphism effect
export const glass = {
  light: "bg-white/80 backdrop-blur-md border border-white/20",
  dark: "bg-black/40 backdrop-blur-md border border-white/10",
}

// Shadow utilities
export const shadows = {
  glow: "shadow-lg shadow-blue-500/20 dark:shadow-blue-500/10",
  glowLg: "shadow-xl shadow-blue-500/25 dark:shadow-blue-500/15",
  glowXl: "shadow-2xl shadow-blue-500/30 dark:shadow-blue-500/20",
  card: "shadow-sm hover:shadow-md transition-shadow duration-200",
  cardLg: "shadow-lg hover:shadow-xl transition-shadow duration-200",
}

// Transition utilities
export const transitions = {
  default: "transition-all duration-200 ease-in-out",
  slow: "transition-all duration-300 ease-in-out",
  fast: "transition-all duration-150 ease-in-out",
  bounce: "transition-all duration-200 ease-bounce",
}

// Hover effects
export const hoverEffects = {
  lift: "hover:-translate-y-1",
  scale: "hover:scale-105",
  glow: "hover:shadow-lg hover:shadow-blue-500/25",
  brightness: "hover:brightness-110",
}

// Text gradient
export const textGradient = {
  primary: "bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent",
  secondary: "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent",
  success: "bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent",
  warning: "bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent",
  error: "bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent",
}
// Core MagicUI Components
export { MagicButton } from "./magic-button"
export type { MagicButtonProps } from "./magic-button"

export { MagicCard } from "./magic-card"
export type { MagicCardProps } from "./magic-card"

export { TextGradient } from "./text-gradient"
export type { TextGradientProps } from "./text-gradient"

export { default as MagicDock, defaultDockItems } from "./magic-dock"

// Re-export utilities
export { 
  cn, 
  animations, 
  gradients, 
  patterns, 
  glass, 
  shadows, 
  transitions, 
  hoverEffects, 
  textGradient 
} from "@/lib/magicui"
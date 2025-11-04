import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "../../lib/utils"

interface GMShootLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  variant?: "default" | "white" | "gradient"
  className?: string
  showText?: boolean
  animated?: boolean
}

const GMShootLogo = ({ 
  size = "md", 
  variant = "default", 
  className, 
  showText = true,
  animated = false 
}: GMShootLogoProps) => {
  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-20 w-20"
  }

  const textClasses = {
    xs: "text-base",
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl"
  }

  const logoVariants = {
    default: "text-blue-500",
    white: "text-white",
    gradient: "bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent"
  }

  const LogoIcon = () => (
    <svg
      viewBox="0 0 100 100"
      className={cn("w-full h-full", logoVariants[variant])}
      fill="currentColor"
    >
      {/* GMShoot Target Logo */}
      <circle cx="50" cy="50" r="45" fill="none" strokeWidth="2" />
      <circle cx="50" cy="50" r="35" fill="none" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="25" fill="none" strokeWidth="1" />
      <circle cx="50" cy="50" r="15" fill="none" strokeWidth="0.5" />
      
      {/* Crosshairs */}
      <line x1="50" y1="10" x2="50" y2="90" strokeWidth="1" />
      <line x1="10" y1="50" x2="90" y2="50" strokeWidth="1" />
      
      {/* Center dot */}
      <circle cx="50" cy="50" r="2" fill="currentColor" />
      
      {/* GM letters */}
      <text x="50" y="50" fontSize="12" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
        GM
      </text>
    </svg>
  )

  const logoContent = (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {animated ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <LogoIcon />
          </motion.div>
        ) : (
          <LogoIcon />
        )}
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
      </div>
      
      {showText && (
        <motion.span
          className={cn(
            "font-bold tracking-tight",
            textClasses[size],
            logoVariants[variant]
          )}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          GMShoot
        </motion.span>
      )}
    </div>
  )

  if (animated) {
    return (
      <motion.div
        className={cn("inline-block", className)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        whileHover={{ scale: 1.05 }}
      >
        {logoContent}
      </motion.div>
    )
  }

  return (
    <div className={cn("inline-block", className)}>
      {logoContent}
    </div>
  )
}

export { GMShootLogo }
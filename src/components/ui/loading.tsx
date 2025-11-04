import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "../../lib/utils"

interface LoadingProps {
  size?: "sm" | "md" | "lg"
  variant?: "spinner" | "dots" | "pulse"
  className?: string
  text?: string
}

const LoadingSpinner = ({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  }

  return (
    <motion.div
      className={cn(
        "rounded-full border-2 border-blue-500 border-t-transparent",
        sizeClasses[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  )
}

const LoadingDots = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 bg-blue-500 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 1, 0.3]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.2
          }}
        />
      ))}
    </div>
  )
}

const LoadingPulse = ({ className }: { className?: string }) => {
  return (
    <motion.div
      className={cn("w-8 h-8 bg-blue-500 rounded-full", className)}
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  )
}

export const Loading = ({ size = "md", variant = "spinner", className, text }: LoadingProps) => {
  const renderLoader = () => {
    switch (variant) {
      case "dots":
        return <LoadingDots className={className} />
      case "pulse":
        return <LoadingPulse className={className} />
      default:
        return <LoadingSpinner size={size} className={className} />
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {renderLoader()}
      {text && (
        <motion.p
          className="text-sm text-slate-400 text-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

export { LoadingSpinner, LoadingDots, LoadingPulse }
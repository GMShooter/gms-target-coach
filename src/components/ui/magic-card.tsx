import React, { useCallback, useEffect } from "react"
import { motion, useMotionTemplate, useMotionValue } from "framer-motion"

export interface MagicCardProps {
  children?: React.ReactNode
  className?: string
  variant?: 'glass' | 'glow' | 'default'
  size?: 'sm' | 'md' | 'lg'
  gradientSize?: number
  gradientColor?: string
  gradientOpacity?: number
  gradientFrom?: string
  gradientTo?: string
  hover?: 'lift' | 'glow' | 'default'
}

export function MagicCard({
  children,
  className,
  variant,
  size,
  gradientSize = 200,
  gradientColor = "#262626",
  gradientOpacity = 0.8,
  gradientFrom = "#9E7AFF",
  gradientTo = "#FE8BBB",
  hover,
}: MagicCardProps) {
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)
  const reset = useCallback(() => {
    mouseX.set(-gradientSize)
    mouseY.set(-gradientSize)
  }, [gradientSize, mouseX, mouseY])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    },
    [mouseX, mouseY]
  )

  useEffect(() => {
    reset()
  }, [reset])

  useEffect(() => {
    const handleGlobalPointerOut = (e: PointerEvent) => {
      if (!e.relatedTarget) {
        reset()
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        reset()
      }
    }

    window.addEventListener("pointerout", handleGlobalPointerOut)
    window.addEventListener("blur", reset)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("pointerout", handleGlobalPointerOut)
      window.removeEventListener("blur", reset)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [reset])

  const getCardClasses = () => {
    const classes = [
      "group relative rounded-[inherit]",
    ]
    
    if (variant === "glass") {
      classes.push("bg-slate-900/20 backdrop-blur-sm border border-slate-700/30")
    }
    if (variant === "glow") {
      classes.push("shadow-lg shadow-primary/25")
    }
    if (size === "sm") {
      classes.push("p-2")
    }
    if (size === "md") {
      classes.push("p-4")
    }
    if (size === "lg") {
      classes.push("p-6")
    }
    if (hover === "lift") {
      classes.push("hover:-translate-y-1 hover:shadow-lg transition-all duration-300")
    }
    if (hover === "glow") {
      classes.push("hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300")
    }
    if (className) {
      classes.push(className)
    }
    
    return classes.join(" ")
  }

  return (
    <div
      className={getCardClasses()}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerEnter={reset}
    >
      <motion.div
        className="bg-slate-700/50 pointer-events-none absolute inset-0 rounded-[inherit] duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
          radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
          ${gradientFrom},
          ${gradientTo},
          rgba(51, 65, 85, 0.5) 100%
          )
          `,
        }}
      />
      <div className="bg-slate-900/50 absolute inset-px rounded-[inherit]" />
      <motion.div
        className="pointer-events-none absolute inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
            `,
          opacity: gradientOpacity,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}

import React, { forwardRef } from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/magicui"

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-border bg-card",
        outline: "border-2 border-border bg-background",
        ghost: "border-transparent bg-transparent shadow-none",
        gradient: "border-transparent bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950",
        glass: "border-white/10 bg-white/5 backdrop-blur-md",
        neon: "border-blue-500/50 bg-blue-950/50 shadow-lg shadow-blue-500/25",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        xl: "p-10",
      },
      hover: {
        none: "",
        lift: "hover:shadow-lg hover:-translate-y-1 transition-all duration-200",
        glow: "hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-200",
        scale: "hover:scale-105 transition-transform duration-200",
        border: "hover:border-blue-500 transition-colors duration-200",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      hover: "none",
    },
  },
)

export interface MagicCardProps
  extends HTMLMotionProps<"div">,
    VariantProps<typeof cardVariants> {
  children?: React.ReactNode
  shimmer?: boolean
  gradientBorder?: boolean
}

const MagicCard = forwardRef<HTMLDivElement, MagicCardProps>(
  ({ className, variant, size, hover, shimmer = false, gradientBorder = false, children, ...props }, ref) => {
    return (
      <motion.div
        className={cn(cardVariants({ variant, size, hover, className }))}
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={hover === "lift" ? { y: -4 } : hover === "scale" ? { scale: 1.02 } : undefined}
        {...props}
      >
        {gradientBorder && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-[1px]">
            <div className="h-full w-full rounded-lg bg-background" />
          </div>
        )}
        
        {shimmer && (
          <div className="absolute inset-0 -z-10 overflow-hidden rounded-lg">
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        )}
        
        <div className={cn("relative z-10", gradientBorder && "p-6")}>
          {children}
        </div>
      </motion.div>
    )
  },
)
MagicCard.displayName = "MagicCard"

export { MagicCard, cardVariants }
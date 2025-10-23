import React, { forwardRef } from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/magicui"

const textGradientVariants = cva(
  "bg-clip-text text-transparent",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 to-purple-600",
        success: "bg-gradient-to-r from-green-500 to-emerald-600",
        warning: "bg-gradient-to-r from-yellow-500 to-orange-500",
        error: "bg-gradient-to-r from-red-500 to-pink-500",
        rainbow: "bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500",
        sunset: "bg-gradient-to-r from-orange-500 to-pink-500",
        ocean: "bg-gradient-to-r from-blue-500 to-teal-500",
        forest: "bg-gradient-to-r from-green-500 to-lime-500",
        fire: "bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500",
        cosmic: "bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500",
        dark: "bg-gradient-to-r from-gray-700 to-gray-900",
        light: "bg-gradient-to-r from-gray-100 to-gray-300",
      },
      size: {
        xs: "text-xs",
        sm: "text-sm",
        base: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        "2xl": "text-2xl",
        "3xl": "text-3xl",
        "4xl": "text-4xl",
        "5xl": "text-5xl",
        "6xl": "text-6xl",
        "7xl": "text-7xl",
        "8xl": "text-8xl",
        "9xl": "text-9xl",
      },
      weight: {
        thin: "font-thin",
        light: "font-light",
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold",
        extrabold: "font-extrabold",
        black: "font-black",
      },
      animation: {
        none: "",
        shimmer: "animate-shimmer bg-[length:200%_100%]",
        float: "animate-float",
        pulse: "animate-pulse",
        bounce: "animate-bounce",
        spin: "animate-spin",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "base",
      weight: "medium",
      animation: "none",
    },
  },
)

export interface TextGradientProps
  extends HTMLMotionProps<"span">,
    VariantProps<typeof textGradientVariants> {
  children?: React.ReactNode
}

const TextGradient = forwardRef<HTMLSpanElement, TextGradientProps>(
  ({ className, variant, size, weight, animation, children, ...props }, ref) => {
    return (
      <motion.span
        className={cn(textGradientVariants({ variant, size, weight, animation, className }))}
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        {...props}
      >
        {children}
      </motion.span>
    )
  },
)
TextGradient.displayName = "TextGradient"

export { TextGradient, textGradientVariants }
import React, { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { textGradient as textGradients } from "@/lib/magicui"

export interface TextGradientProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof textGradients
  size?: string
  weight?: string
  animation?: string
}

const TextGradient = forwardRef<HTMLSpanElement, TextGradientProps>(
  ({ className, variant = 'primary', size, weight, animation, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          textGradients[variant] || textGradients.primary,
          size,
          weight,
          animation && `animate-${animation}`,
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  },
)
TextGradient.displayName = "TextGradient"

export { TextGradient }
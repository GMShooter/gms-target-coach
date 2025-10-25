import React, { forwardRef } from "react"
import { cn } from "../../lib/utils"
import { patterns } from "../../lib/magicui/index"

export interface TextGradientProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof patterns.textGradient
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
          patterns.textGradient[variant] || patterns.textGradient.primary,
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
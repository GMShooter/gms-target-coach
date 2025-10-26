import React, { forwardRef } from "react"

import { cn } from "../../lib/utils"
import { patterns } from "../../lib/magicui/index"

export interface TextGradientProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'ocean' | 'cosmic' | 'sunset'
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
          variant === 'ocean' ? 'bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent' :
          variant === 'cosmic' ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent' :
          variant === 'sunset' ? 'bg-gradient-to-r from-orange-400 to-pink-600 bg-clip-text text-transparent' :
          patterns.textGradient[variant as keyof typeof patterns.textGradient] || patterns.textGradient.primary,
          size,
          weight,
          animation && (animation === 'float' ? 'animate-bounce' : `animate-${animation}`),
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
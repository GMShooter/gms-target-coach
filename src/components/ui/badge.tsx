import * as React from "react"
import { motion } from "framer-motion"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border border-transparent font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:shadow-lg",
        success: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md hover:shadow-lg",
        warning: "bg-gradient-to-r from-yellow-600 to-yellow-700 text-white shadow-md hover:shadow-lg",
        destructive: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md hover:shadow-lg",
        outline: "border-2 border-blue-500 bg-transparent text-blue-500 hover:bg-blue-500 hover:text-white",
        secondary: "bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md hover:shadow-lg",
        gmshoot: "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md hover:shadow-lg border border-orange-400",
      },
      size: {
        default: "rounded-lg px-3 py-1 text-sm",
        sm: "rounded-md px-2 py-0.5 text-xs",
        lg: "rounded-lg px-4 py-1.5 text-base",
        xs: "rounded-sm px-1.5 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean
  dot?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, pulse = false, dot = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        animate={pulse ? { scale: [1, 1.05, 1] } : undefined}
        transition={{ duration: 2, repeat: pulse ? Infinity : 0 }}
        {...Object.fromEntries(
          Object.entries(props).filter(([key]) =>
            !['onDrag', 'onAnimationStart', 'onAnimationComplete'].includes(key)
          )
        )}
      >
        {dot && (
          <span className="w-2 h-2 rounded-full bg-current mr-2" />
        )}
        {children}
      </motion.div>
    )
  }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
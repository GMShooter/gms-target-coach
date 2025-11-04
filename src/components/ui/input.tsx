import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  loading?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, loading = false, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)

    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
          
          <motion.input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border",
              icon && "pl-10",
              error && "border-red-500 focus:ring-red-500",
              props.disabled && "disabled:cursor-not-allowed disabled:opacity-50",
              isFocused && "focus-visible:outline-none focus-visible:ring-2",
              className
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            whileFocus={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            {...Object.fromEntries(
              Object.entries(props).filter(([key]) =>
                !['onDrag', 'onAnimationStart', 'onAnimationComplete'].includes(key)
              )
            )}
          />
          
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <motion.div
                className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          )}
        </div>
        
        {error && (
          <motion.p
            className="mt-2 text-sm text-red-400 flex items-center gap-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm9-2a1 1 0 00-2 0v-4a1 1 0 00-2 0v4z" clipRule="evenodd" />
            </svg>
            {error}
          </motion.p>
        )}
        
        {/* Focus indicator */}
        {isFocused && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-blue-500 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
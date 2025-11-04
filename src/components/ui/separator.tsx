import * as React from "react"

import { cn } from "../../lib/utils"

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <div
      ref={ref}
      role="separator"
      {...({ orientation } as any)}
      aria-orientation={orientation}
      aria-hidden={decorative ? "true" : undefined}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      data-orientation={orientation}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }
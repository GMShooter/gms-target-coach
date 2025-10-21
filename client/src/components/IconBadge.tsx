import { LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const backgroundVariants = cva(
  "rounded-full flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "bg-sky-100",
        success: "bg-emerald-100",
        warning: "bg-amber-100",
        error: "bg-red-100",
        info: "bg-blue-100",
      },
      size: {
        default: "p-2",
        sm: "p-1",
        lg: "p-3",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    }
  }
);

const iconVariants = cva(
  "",
  {
    variants: {
      variant: {
        default: "text-sky-700",
        success: "text-emerald-700",
        warning: "text-amber-700",
        error: "text-red-700",
        info: "text-blue-700",
      },
      size: {
        default: "h-8 w-8",
        sm: "h-4 w-4",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    }
  }
);

type BackgroundVariantsProps = VariantProps<typeof backgroundVariants>;
type IconVariantsProps = VariantProps<typeof iconVariants>;

interface IconBadgeProps extends BackgroundVariantsProps, IconVariantsProps {
  icon: LucideIcon;
  label?: string;
};

export const IconBadge = ({
  icon: Icon,
  variant,
  size,
  label,
}: IconBadgeProps) => {
  return (
    <div className={cn(backgroundVariants({ variant, size }))} title={label}>
      <Icon className={cn(iconVariants({ variant, size }))} />
    </div>
  );
};
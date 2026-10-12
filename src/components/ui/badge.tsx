import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium tracking-tight transition-colors focus:outline-none focus:ring-1 focus:ring-slate-950",
  {
    variants: {
      variant: {
        default: "border border-transparent bg-slate-900 text-slate-50",
        secondary: "border border-transparent bg-slate-100 text-slate-900",
        destructive: "border border-transparent bg-red-100 text-red-800",
        outline: "border border-slate-200 text-slate-700 bg-white",
        success: "border border-emerald-200 bg-emerald-50 text-emerald-800",
        warning: "border border-amber-200 bg-amber-50 text-amber-800",
        info: "border border-blue-200 bg-blue-50 text-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

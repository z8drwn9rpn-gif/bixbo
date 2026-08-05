import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-6 items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-none transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm",

        secondary: "border-transparent bg-secondary text-secondary-foreground",

        destructive: "border-transparent bg-destructive text-destructive-foreground shadow-sm",

        outline: "border-border bg-background text-foreground",

        success: "border-transparent bg-emerald-600 text-white shadow-sm dark:bg-emerald-500",

        warning: "border-transparent bg-amber-500 text-black shadow-sm dark:text-black",

        info: "border-transparent bg-sky-600 text-white shadow-sm dark:bg-sky-500",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

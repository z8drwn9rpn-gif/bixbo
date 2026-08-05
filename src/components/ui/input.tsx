import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground shadow-sm transition-[border-color,box-shadow,background-color] duration-150",
          "placeholder:text-muted-foreground",
          "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
          "md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };

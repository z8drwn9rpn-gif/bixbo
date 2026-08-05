import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base text-foreground shadow-sm transition-[border-color,box-shadow,background-color] duration-150",
          "placeholder:text-muted-foreground",
          "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
          "resize-y md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };

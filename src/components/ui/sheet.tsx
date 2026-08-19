"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "@/components/icons/BixboExtraIcons";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, style, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    style={{ ...style, backdropFilter: "none", WebkitBackdropFilter: "none" }}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-2xl border-border/80 transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 rounded-t-3xl border-t pb-[max(1.5rem,env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>, VariantProps<typeof sheetVariants) {
  overlayClassName?: string;
}

function cameFromBixboIconKeyboard(originalEvent: Event) {
  const path = typeof originalEvent.composedPath === "function" ? originalEvent.composedPath() : [];
  if (path.some((node) => node instanceof Element && node.closest("[data-bixbo-icon-keyboard]"))) return true;
  return originalEvent.target instanceof Element && Boolean(originalEvent.target.closest("[data-bixbo-icon-keyboard]"));
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  (
    {
      side = "right",
      className,
      children,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      overlayClassName,
      ...props
    },
    ref,
  ) => {
    /*
     * Full-screen log sheets must never derive their box geometry from
     * VisualViewport. iOS changes visualViewport.height/offsetTop repeatedly
     * while the keyboard, prediction row and caret are moving. Feeding those
     * values back into top/height makes the complete dialog jump and repaints
     * every frame while the user types.
     *
     * LogSheetRoot still carries the old viewport-variable classes for backwards
     * compatibility. Normalize them here into one stable inset shell. The visual
     * viewport may pan over this shell, but the shell itself never moves/resizes.
     */
    const viewportDrivenLog =
      typeof className === "string" && className.includes("--bixbo-viewport-height");
    const insetFullScreenLog =
      typeof className === "string" && className.includes("!inset-0") && className.includes("!h-[100svh]");
    const fullScreenLog = viewportDrivenLog || insetFullScreenLog;

    let resolvedClassName = className;
    if (viewportDrivenLog && typeof resolvedClassName === "string") {
      resolvedClassName = resolvedClassName
        .replace("!bottom-auto", "!bottom-0")
        .replace("!top-[var(--bixbo-viewport-offset,0px)]", "!top-0")
        .replace("!h-[var(--bixbo-viewport-height,100svh)]", "!h-auto")
        .replace("!max-h-[var(--bixbo-viewport-height,100svh)]", "!max-h-none");
    } else if (insetFullScreenLog && typeof resolvedClassName === "string") {
      resolvedClassName = resolvedClassName
        .replace("!h-[100svh]", "!h-auto")
        .replace("!max-h-[100svh]", "!max-h-none");
    }

    const stableFullScreenOverlay = fullScreenLog
      ? "!bg-transparent !transition-none data-[state=open]:!animate-none data-[state=closed]:!animate-none"
      : undefined;

    return (
      <SheetPortal>
        <SheetOverlay className={cn(stableFullScreenOverlay, overlayClassName)} />
        <SheetPrimitive.Content
          ref={ref}
          data-bixbo-fullscreen-log={fullScreenLog ? "true" : undefined}
          className={cn(sheetVariants({ side }), resolvedClassName)}
          {...props}
          onPointerDownOutside={(event) => {
            if (cameFromBixboIconKeyboard(event.detail.originalEvent)) {
              event.preventDefault();
              return;
            }
            onPointerDownOutside?.(event);
          }}
          onFocusOutside={(event) => {
            if (cameFromBixboIconKeyboard(event.detail.originalEvent)) {
              event.preventDefault();
              return;
            }
            onFocusOutside?.(event);
          }}
          onInteractOutside={(event) => {
            if (cameFromBixboIconKeyboard(event.detail.originalEvent)) {
              event.preventDefault();
              return;
            }
            onInteractOutside?.(event);
          }}
        >
          <SheetPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 opacity-80 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
            <X size={18} />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
          {children}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)}
    style={{ ...style, backdropFilter: "none", WebkitBackdropFilter: "none" }}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};

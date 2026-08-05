import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-3", className)} {...props} />
));

RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "aspect-square h-5 w-5 shrink-0 cursor-pointer rounded-full border border-primary/60 bg-background text-primary shadow-sm",
      "transition-[border-color,box-shadow,transform,background-color] duration-150",
      "hover:border-primary",
      "active:scale-95",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-primary",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator
      className={cn(
        "flex items-center justify-center",
        "data-[state=checked]:animate-in data-[state=checked]:zoom-in-75",
      )}
    >
      <Circle className="h-3 w-3 fill-primary stroke-none" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));

RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };

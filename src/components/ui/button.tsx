import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 
          "bg-[hsl(var(--btn-primary))] text-white hover:bg-[hsl(var(--btn-primary-hover))] hover:shadow-[0px_2px_6px_hsl(var(--btn-primary-shadow)/0.2)]",
        destructive: 
          "bg-[hsl(var(--btn-danger))] text-[hsl(var(--btn-danger-text))] hover:bg-[hsl(var(--btn-danger-hover))] hover:text-[hsl(var(--btn-danger-hover-text))]",
        outline: 
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: 
          "bg-[hsl(var(--btn-secondary))] text-[hsl(var(--btn-secondary-text))] border border-[hsl(var(--btn-secondary-border))] font-medium hover:bg-[hsl(var(--btn-secondary-hover))] hover:text-[hsl(var(--btn-secondary-hover-text))]",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground",
        link: 
          "text-[hsl(var(--btn-link))] underline-offset-4 hover:underline hover:text-[hsl(var(--btn-link-hover))] text-sm font-normal px-1 py-0.5",
      },
      size: {
        default: "h-11 px-5 py-3.5 text-base",
        sm: "h-9 rounded-lg px-3 text-sm",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

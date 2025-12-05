import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] active:transition-transform active:duration-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 
          "bg-[#F31260] text-white rounded-xl hover:bg-[#DA0C5E] shadow-[0_2px_8px_rgba(243,18,96,0.12)] hover:shadow-[0_4px_12px_rgba(243,18,96,0.2)] [&_svg]:text-white",
        destructive: 
          "bg-[hsl(var(--btn-danger))] text-[hsl(var(--btn-danger-text))] rounded-xl hover:bg-[hsl(var(--btn-danger-hover))] hover:text-[hsl(var(--btn-danger-hover-text))]",
        outline: 
          "border border-[#CBD5E1] bg-white text-[#0F172A] rounded-[10px] hover:bg-[#E2E8F0] hover:border-[#94A3B8]",
        secondary: 
          "bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] rounded-[10px] hover:bg-[#E2E8F0]",
        ghost: 
          "text-[#64748B] bg-transparent hover:text-[#334155] hover:underline underline-offset-4",
        link: 
          "text-[hsl(var(--btn-link))] underline-offset-4 hover:underline hover:text-[hsl(var(--btn-link-hover))] text-sm font-medium px-1 py-0.5",
      },
      size: {
        default: "h-11 px-[18px] py-3 text-sm",
        sm: "h-9 px-4 py-2.5 text-sm",
        lg: "h-12 px-6 py-3 text-base",
        icon: "h-10 w-10 rounded-lg",
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

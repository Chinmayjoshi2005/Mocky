import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "clay-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/80 text-sm font-bold shadow-[6px_6px_14px_rgba(136,148,174,0.32),-4px_-4px_10px_rgba(255,255,255,0.9)] transition-all duration-200 hover:-translate-y-px hover:shadow-[8px_8px_16px_rgba(136,148,174,0.38),-5px_-5px_12px_rgba(255,255,255,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none active:translate-y-0 active:shadow-[inset_3px_3px_7px_rgba(136,148,174,0.28)]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-electric-blue text-navy-900 hover:bg-cyan-300",
        destructive: "border-transparent bg-rose-400 text-white hover:bg-rose-500",
        outline: "border-white/80 bg-white/65 hover:border-white hover:bg-blue-100/80 hover:text-navy-900",
        secondary: "border-white/80 bg-lilac-100 text-navy-900 hover:bg-lilac-200",
        ghost: "border-transparent bg-transparent shadow-none hover:bg-white/50 hover:text-navy-900 hover:shadow-sm",
        link: "text-electric-blue underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
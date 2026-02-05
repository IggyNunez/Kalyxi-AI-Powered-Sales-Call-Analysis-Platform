"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "gradient";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
  glow?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading = false, glow = false, children, disabled, ...props }, ref) => {
    const baseStyles = cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
      "transition-all duration-200 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "active:scale-[0.98]"
    );

    const variants = {
      default: cn(
        "bg-primary text-primary-foreground shadow-md",
        "hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5",
        glow && "shadow-glow hover:shadow-glow-lg"
      ),
      gradient: cn(
        "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-md",
        "hover:from-purple-500 hover:via-indigo-500 hover:to-purple-600",
        "hover:shadow-lg hover:-translate-y-0.5",
        "relative overflow-hidden",
        glow && "shadow-glow hover:shadow-glow-lg"
      ),
      destructive: cn(
        "bg-red-600 text-white shadow-sm",
        "hover:bg-red-700 hover:shadow-md hover:-translate-y-0.5"
      ),
      outline: cn(
        "border-2 border-input bg-background shadow-sm",
        "hover:bg-accent hover:text-accent-foreground hover:border-primary/50",
        "hover:-translate-y-0.5"
      ),
      secondary: cn(
        "bg-secondary text-secondary-foreground shadow-sm",
        "hover:bg-secondary/80 hover:shadow-md hover:-translate-y-0.5"
      ),
      ghost: cn(
        "hover:bg-accent hover:text-accent-foreground",
        "hover:scale-105"
      ),
      link: cn(
        "text-primary underline-offset-4",
        "hover:underline hover:text-primary/80"
      ),
    };

    const sizes = {
      default: "h-10 px-5 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-12 rounded-lg px-8 text-base",
      icon: "h-10 w-10",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
        {variant === "gradient" && (
          <span className="absolute inset-0 overflow-hidden rounded-lg">
            <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </span>
        )}
        <span className={cn(loading && "opacity-0", "relative")}>{children}</span>
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
          </span>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };

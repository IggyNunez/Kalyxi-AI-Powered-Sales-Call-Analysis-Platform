"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "gradient";
  size?: "default" | "sm" | "lg";
  dot?: boolean;
  pulse?: boolean;
}

function Badge({
  className,
  variant = "default",
  size = "default",
  dot = false,
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground shadow-sm",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-red-500/10 text-red-600 dark:text-red-400",
    outline: "border-border text-foreground bg-transparent",
    success: "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-500",
    info: "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
    gradient: "border-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm",
  };

  const sizes = {
    sm: "px-1.5 py-0.5 text-[10px]",
    default: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        "transition-all duration-200",
        "hover:brightness-110",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-emerald-500",
            variant === "warning" && "bg-amber-500",
            variant === "destructive" && "bg-red-500",
            variant === "info" && "bg-blue-500",
            variant === "default" && "bg-white",
            variant === "secondary" && "bg-gray-500",
            variant === "gradient" && "bg-white",
            variant === "outline" && "bg-current",
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge };

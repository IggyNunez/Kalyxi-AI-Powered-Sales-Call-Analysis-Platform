"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg" | "xl";
  variant?: "default" | "primary" | "white";
}

function Spinner({ className, size = "default", variant = "default", ...props }: SpinnerProps) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    default: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
    xl: "h-12 w-12 border-4",
  };

  const variants = {
    default: "border-muted-foreground/30 border-t-muted-foreground",
    primary: "border-primary/30 border-t-primary",
    white: "border-white/30 border-t-white",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

// Loading overlay with spinner
function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <Spinner size="lg" variant="primary" />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

// Page loading state
function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="text-center">
        <Spinner size="xl" variant="primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export { Spinner, LoadingOverlay, PageLoader };

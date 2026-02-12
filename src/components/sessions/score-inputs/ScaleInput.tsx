"use client";

import { cn } from "@/lib/utils";
import { ScaleCriteriaConfig } from "@/types/database";

interface ScaleInputProps {
  value: number | null;
  onChange: (value: number) => void;
  config: ScaleCriteriaConfig;
  disabled?: boolean;
}

export default function ScaleInput({
  value,
  onChange,
  config,
  disabled,
}: ScaleInputProps) {
  const min = config.min ?? 1;
  const max = config.max ?? 5;
  const step = config.step ?? 1;
  const labels = config.labels || {};

  // Generate scale options
  const options: number[] = [];
  for (let i = min; i <= max; i += step) {
    options.push(i);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option;
          const label = labels[option.toString()];

          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option)}
              className={cn(
                // Mobile-optimized: 48px minimum touch target, larger on mobile
                "flex flex-col items-center justify-center min-w-[48px] min-h-[48px] sm:min-h-[44px]",
                "px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 transition-all",
                "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                // Active state feedback for touch
                "active:scale-95 touch-manipulation",
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-muted hover:bg-muted/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-lg sm:text-xl font-semibold">{option}</span>
              {label && (
                <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scale reference */}
      {Object.keys(labels).length > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{labels[min.toString()] || `${min} (Low)`}</span>
          <span>{labels[max.toString()] || `${max} (High)`}</span>
        </div>
      )}
    </div>
  );
}

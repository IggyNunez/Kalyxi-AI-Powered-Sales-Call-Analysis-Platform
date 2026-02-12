"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { PercentageCriteriaConfig } from "@/types/database";

interface PercentageInputProps {
  value: number | null;
  onChange: (value: number) => void;
  config: PercentageCriteriaConfig;
  disabled?: boolean;
}

export default function PercentageInput({
  value,
  onChange,
  config,
  disabled,
}: PercentageInputProps) {
  // Percentage is always 0-100
  const min = 0;
  const max = 100;
  const step = 1;
  const thresholds = config.thresholds || [];

  const displayValue = value ?? 0;

  const getColorClass = (val: number) => {
    // Use thresholds if defined, otherwise use defaults
    if (thresholds.length > 0) {
      const sorted = [...thresholds].sort((a, b) => b.value - a.value);
      for (const t of sorted) {
        if (val >= t.value) {
          return t.color.startsWith("text-") ? t.color : `text-${t.color}-600`;
        }
      }
      return "text-red-600";
    }
    if (val >= 80) return "text-emerald-600";
    if (val >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getBgColorClass = (val: number) => {
    if (thresholds.length > 0) {
      const sorted = [...thresholds].sort((a, b) => b.value - a.value);
      for (const t of sorted) {
        if (val >= t.value) {
          return t.color.startsWith("bg-") ? t.color : `bg-${t.color}-500`;
        }
      }
      return "bg-red-500";
    }
    if (val >= 80) return "bg-emerald-500";
    if (val >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4">
      {/* Slider */}
      <div className="space-y-2">
        <Slider
          value={[displayValue]}
          onValueChange={(values: number[]) => onChange(values[0])}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="w-full"
        />

        {/* Scale markers */}
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{min}%</span>
          <span>{Math.round((max - min) / 2 + min)}%</span>
          <span>{max}%</span>
        </div>
      </div>

      {/* Value display with input - mobile optimized */}
      <div className="flex items-center justify-center gap-2">
        <div className="relative">
          <Input
            type="number"
            value={displayValue}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= min && v <= max) {
                onChange(v);
              }
            }}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn(
              // Mobile-optimized: larger touch target and text
              "w-28 sm:w-24 h-12 sm:h-10 text-center text-xl sm:text-lg font-semibold pr-8 sm:pr-6",
              "touch-manipulation",
              getColorClass(displayValue)
            )}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
            %
          </span>
        </div>
      </div>

      {/* Visual indicator */}
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            getBgColorClass(displayValue)
          )}
          style={{ width: `${displayValue}%` }}
        />
      </div>
    </div>
  );
}

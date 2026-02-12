"use client";

import { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarsCriteriaConfig } from "@/types/database";

interface StarsInputProps {
  value: number | null;
  onChange: (value: number) => void;
  config: StarsCriteriaConfig;
  disabled?: boolean;
}

export default function StarsInput({
  value,
  onChange,
  config,
  disabled,
}: StarsInputProps) {
  const maxStars = config.max_stars ?? 5;
  const allowHalf = config.allow_half ?? false;
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;
  const step = allowHalf ? 0.5 : 1;

  const getStarValue = (index: number, isHalf: boolean) => {
    return index + (isHalf ? 0.5 : 1);
  };

  const handleClick = (starValue: number) => {
    if (!disabled) {
      // If clicking the same value, unset it
      if (value === starValue) {
        onChange(0);
      } else {
        onChange(starValue);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = allowHalf && x < rect.width / 2;
    setHoverValue(getStarValue(index, isHalf));
  };

  const renderStar = (index: number) => {
    const starNumber = index + 1;
    const isFilled = displayValue !== null && displayValue >= starNumber;
    const isHalfFilled =
      displayValue !== null &&
      displayValue >= starNumber - 0.5 &&
      displayValue < starNumber;

    return (
      <button
        key={index}
        type="button"
        disabled={disabled}
        className={cn(
          // Mobile-optimized: larger touch target with padding
          "relative p-1.5 sm:p-1 transition-transform touch-manipulation",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded",
          !disabled && "hover:scale-110 active:scale-95",
          disabled && "cursor-not-allowed"
        )}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const isHalf = allowHalf && x < rect.width / 2;
          handleClick(getStarValue(index, isHalf));
        }}
        onMouseMove={(e) => handleMouseMove(e, index)}
        onMouseLeave={() => setHoverValue(null)}
      >
        {isHalfFilled ? (
          <div className="relative">
            {/* Mobile: 40px stars, Desktop: 32px stars */}
            <Star className="h-10 w-10 sm:h-8 sm:w-8 text-muted stroke-muted-foreground/30" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-10 w-10 sm:h-8 sm:w-8 fill-amber-400 text-amber-400" />
            </div>
          </div>
        ) : (
          <Star
            className={cn(
              // Mobile: 40px stars, Desktop: 32px stars
              "h-10 w-10 sm:h-8 sm:w-8 transition-colors",
              isFilled
                ? "fill-amber-400 text-amber-400"
                : "text-muted stroke-muted-foreground/30"
            )}
          />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: maxStars }).map((_, index) => renderStar(index))}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {value !== null ? `${value} / ${maxStars} stars` : "Not rated"}
        </span>
        {allowHalf && (
          <span className="text-xs">Half stars enabled</span>
        )}
      </div>
    </div>
  );
}

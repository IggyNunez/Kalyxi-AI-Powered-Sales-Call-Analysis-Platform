"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MultiSelectCriteriaConfig } from "@/types/database";

interface MultiSelectInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  config: MultiSelectCriteriaConfig;
  disabled?: boolean;
}

export default function MultiSelectInput({
  value = [],
  onChange,
  config,
  disabled,
}: MultiSelectInputProps) {
  const options = config.options || [];
  // MultiSelectCriteriaConfig doesn't have min/max selections, allow all
  const maxSelections = options.length;

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      if (value.length < maxSelections) {
        onChange([...value, optionValue]);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Selection info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {value.length} selected
        </span>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const isDisabled = disabled || (!isSelected && value.length >= maxSelections);

          return (
            <button
              key={option.value}
              type="button"
              disabled={isDisabled}
              onClick={() => toggleOption(option.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted hover:bg-muted/50",
                isDisabled && !isSelected && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSelected && <Check className="h-4 w-4" />}
              <span className="font-medium">{option.label}</span>
              {option.score !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({option.score})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {options.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No options configured
        </p>
      )}
    </div>
  );
}

"use client";

import { Check, Square, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChecklistCriteriaConfig } from "@/types/database";

interface ChecklistInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  config: ChecklistCriteriaConfig;
  disabled?: boolean;
}

export default function ChecklistInput({
  value = [],
  onChange,
  config,
  disabled,
}: ChecklistInputProps) {
  const items = config.items || [];

  const toggleItem = (itemId: string) => {
    if (value.includes(itemId)) {
      onChange(value.filter((id) => id !== itemId));
    } else {
      onChange([...value, itemId]);
    }
  };

  const completedCount = value.length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-muted-foreground min-w-[40px] text-right">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item) => {
          const isChecked = value.includes(item.id);

          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => toggleItem(item.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isChecked
                  ? "border-primary/50 bg-primary/5"
                  : "border-muted",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="mt-0.5">
                {isChecked ? (
                  <CheckSquare className="h-5 w-5 text-primary" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-medium",
                    isChecked && "text-primary"
                  )}
                >
                  {item.label}
                </p>
              </div>
              {item.points !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {item.points} pts
                </span>
              )}
            </button>
          );
        })}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No checklist items configured
        </p>
      )}
    </div>
  );
}

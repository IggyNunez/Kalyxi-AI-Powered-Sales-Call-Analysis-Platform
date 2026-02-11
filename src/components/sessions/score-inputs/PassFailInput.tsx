"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PassFailCriteriaConfig } from "@/types/database";

interface PassFailInputProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  config: PassFailCriteriaConfig;
  disabled?: boolean;
}

export default function PassFailInput({
  value,
  onChange,
  config,
  disabled,
}: PassFailInputProps) {
  const passLabel = config.pass_label ?? "Pass";
  const failLabel = config.fail_label ?? "Fail";

  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all",
          "hover:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          value === true
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
            : "border-muted hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Check className="h-5 w-5" />
        <span className="font-medium">{passLabel}</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all",
          "hover:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          value === false
            ? "border-red-500 bg-red-500/10 text-red-600"
            : "border-muted hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <X className="h-5 w-5" />
        <span className="font-medium">{failLabel}</span>
      </button>
    </div>
  );
}

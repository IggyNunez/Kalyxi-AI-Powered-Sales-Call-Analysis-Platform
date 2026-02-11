"use client";

import { Textarea } from "@/components/ui/textarea";
import { TextCriteriaConfig } from "@/types/database";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  config: TextCriteriaConfig;
  disabled?: boolean;
}

export default function TextInput({
  value = "",
  onChange,
  config,
  disabled,
}: TextInputProps) {
  const maxLength = config.max_length ?? 1000;
  const placeholder = config.placeholder ?? "Enter your response...";
  const minLength = config.min_length ?? 0;

  const charCount = value.length;
  const isOverLimit = charCount > maxLength;
  const isBelowMin = charCount < minLength && charCount > 0;

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className={isOverLimit ? "border-red-500 focus-visible:ring-red-500" : ""}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          {minLength > 0 && (
            <span className={isBelowMin ? "text-amber-500" : ""}>
              Min {minLength} characters
            </span>
          )}
        </div>
        <span className={isOverLimit ? "text-red-500" : ""}>
          {charCount} / {maxLength}
        </span>
      </div>
    </div>
  );
}

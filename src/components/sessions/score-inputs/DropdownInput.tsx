"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DropdownCriteriaConfig } from "@/types/database";

interface DropdownInputProps {
  value: string | null;
  onChange: (value: string) => void;
  config: DropdownCriteriaConfig;
  disabled?: boolean;
}

export default function DropdownInput({
  value,
  onChange,
  config,
  disabled,
}: DropdownInputProps) {
  const options = config.options || [];

  return (
    <Select
      value={value || ""}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center justify-between gap-4">
              <span>{option.label}</span>
              {option.score !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({option.score} pts)
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

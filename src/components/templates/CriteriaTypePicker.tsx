"use client";

import {
  SlidersHorizontal,
  ToggleLeft,
  CheckSquare,
  ChevronDown,
  Tags,
  Star,
  Gauge,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CriteriaType } from "@/types/database";

interface CriteriaTypeOption {
  type: CriteriaType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const criteriaTypes: CriteriaTypeOption[] = [
  {
    type: "scale",
    label: "Scale",
    description: "1-10 number slider",
    icon: SlidersHorizontal,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    type: "pass_fail",
    label: "Pass/Fail",
    description: "Binary yes/no",
    icon: ToggleLeft,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    type: "checklist",
    label: "Checklist",
    description: "Multiple checkboxes",
    icon: CheckSquare,
    color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  },
  {
    type: "dropdown",
    label: "Dropdown",
    description: "Single select menu",
    icon: ChevronDown,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    type: "multi_select",
    label: "Multi-Select",
    description: "Multiple tags",
    icon: Tags,
    color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  },
  {
    type: "rating_stars",
    label: "Star Rating",
    description: "1-5 stars",
    icon: Star,
    color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  },
  {
    type: "percentage",
    label: "Percentage",
    description: "0-100% gauge",
    icon: Gauge,
    color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
  },
  {
    type: "text",
    label: "Text",
    description: "Free-form notes",
    icon: FileText,
    color: "text-gray-500 bg-gray-500/10 border-gray-500/20",
  },
];

interface CriteriaTypePickerProps {
  onSelect: (type: CriteriaType) => void;
}

export function CriteriaTypePicker({ onSelect }: CriteriaTypePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {criteriaTypes.map((ct) => {
        const Icon = ct.icon;
        return (
          <button
            key={ct.type}
            type="button"
            onClick={() => onSelect(ct.type)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200",
              "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
              ct.color
            )}
          >
            <Icon className="h-6 w-6" />
            <div>
              <p className="text-sm font-semibold">{ct.label}</p>
              <p className="text-[10px] opacity-70">{ct.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

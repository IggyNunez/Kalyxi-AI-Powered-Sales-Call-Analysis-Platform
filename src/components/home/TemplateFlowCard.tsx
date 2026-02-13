"use client";

import Link from "next/link";
import {
  Phone,
  UserPlus,
  ClipboardCheck,
  GraduationCap,
  Shapes,
  MoreVertical,
  Play,
  Pause,
  BarChart3,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TemplateUseCase, TemplateStatus, ScoringMethod } from "@/types/database";

interface TemplateFlowCardProps {
  id: string;
  name: string;
  description?: string | null;
  useCase: TemplateUseCase;
  scoringMethod: ScoringMethod;
  status: TemplateStatus;
  isDefault: boolean;
  criteriaCount: number;
  assignmentCount: number;
  avgScore?: number | null;
  onToggleActive?: (id: string, active: boolean) => void;
}

const useCaseConfig: Record<TemplateUseCase, { label: string; icon: typeof Phone; color: string }> = {
  sales_call: { label: "Sales Call", icon: Phone, color: "text-blue-500 bg-blue-500/10" },
  onboarding: { label: "Onboarding", icon: UserPlus, color: "text-emerald-500 bg-emerald-500/10" },
  qa_review: { label: "QA Review", icon: ClipboardCheck, color: "text-amber-500 bg-amber-500/10" },
  training: { label: "Training", icon: GraduationCap, color: "text-purple-500 bg-purple-500/10" },
  custom: { label: "Custom", icon: Shapes, color: "text-gray-500 bg-gray-500/10" },
};

const scoringLabels: Record<ScoringMethod, string> = {
  weighted: "Weighted",
  simple_average: "Average",
  pass_fail: "Pass/Fail",
  points: "Points",
  custom_formula: "Custom",
};

export function TemplateFlowCard({
  id,
  name,
  useCase,
  scoringMethod,
  status,
  isDefault,
  criteriaCount,
  assignmentCount,
  avgScore,
  onToggleActive,
}: TemplateFlowCardProps) {
  const uc = useCaseConfig[useCase] || useCaseConfig.custom;
  const UseCaseIcon = uc.icon;
  const isActive = status === "active";

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20",
        isActive && "border-primary/10"
      )}
    >
      {/* Header: icon + name + menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", uc.color)}>
            <UseCaseIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" size="sm">{uc.label}</Badge>
              {isDefault && <Badge variant="outline" size="sm">Default</Badge>}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/templates/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/templates/${id}/results`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Results
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <span>{criteriaCount} criteria</span>
        <span className="text-border">|</span>
        <span>{scoringLabels[scoringMethod]}</span>
        <span className="text-border">|</span>
        <span>
          {assignmentCount > 0
            ? `${assignmentCount} assigned`
            : "Unassigned"}
        </span>
      </div>

      {/* Footer: avg score + toggle */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        {avgScore != null && avgScore > 0 ? (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "text-lg font-bold",
                avgScore >= 80 ? "text-emerald-600" : avgScore >= 60 ? "text-amber-600" : "text-red-500"
              )}
            >
              {avgScore}%
            </div>
            <span className="text-xs text-muted-foreground">avg score</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No scores yet</span>
        )}

        <Button
          variant={isActive ? "outline" : "default"}
          size="sm"
          className="gap-1.5"
          onClick={() => onToggleActive?.(id, !isActive)}
        >
          {isActive ? (
            <>
              <Pause className="h-3.5 w-3.5" />
              Active
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Turn On
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

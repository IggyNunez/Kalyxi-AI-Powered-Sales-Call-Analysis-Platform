"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateFlowCard } from "./TemplateFlowCard";
import type { TemplateUseCase, TemplateStatus, ScoringMethod } from "@/types/database";

export interface TemplateCardData {
  id: string;
  name: string;
  description?: string | null;
  use_case: TemplateUseCase;
  scoring_method: ScoringMethod;
  status: TemplateStatus;
  is_default: boolean;
  criteriaCount: number;
  assignmentCount: number;
  avgScore?: number | null;
}

interface TemplateFlowGridProps {
  templates: TemplateCardData[];
  isAdmin: boolean;
  onToggleActive?: (id: string, active: boolean) => void;
}

const useCaseOrder: TemplateUseCase[] = [
  "sales_call",
  "onboarding",
  "qa_review",
  "training",
  "custom",
];

const useCaseLabels: Record<TemplateUseCase, string> = {
  sales_call: "Sales Call",
  onboarding: "Onboarding",
  qa_review: "QA Review",
  training: "Training",
  custom: "Custom",
};

export function TemplateFlowGrid({ templates, isAdmin, onToggleActive }: TemplateFlowGridProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Plus className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">No templates yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Create your first scoring template to start grading sales calls with AI.
        </p>
        {isAdmin && (
          <Link href="/dashboard/templates/new" className="mt-4">
            <Button variant="gradient" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </Link>
        )}
      </div>
    );
  }

  // Group templates by use_case, maintaining order
  const grouped = new Map<TemplateUseCase, TemplateCardData[]>();
  for (const uc of useCaseOrder) {
    const items = templates.filter((t) => t.use_case === uc);
    if (items.length > 0) {
      grouped.set(uc, items);
    }
  }

  // If all templates are in one category, show flat grid
  if (grouped.size <= 1) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <TemplateFlowCard
            key={t.id}
            id={t.id}
            name={t.name}
            description={t.description}
            useCase={t.use_case}
            scoringMethod={t.scoring_method}
            status={t.status}
            isDefault={t.is_default}
            criteriaCount={t.criteriaCount}
            assignmentCount={t.assignmentCount}
            avgScore={t.avgScore}
            onToggleActive={onToggleActive}
          />
        ))}
      </div>
    );
  }

  // Multiple categories: show grouped sections
  return (
    <div className="space-y-8">
      {Array.from(grouped.entries()).map(([useCase, items]) => (
        <div key={useCase}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {useCaseLabels[useCase]}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <TemplateFlowCard
                key={t.id}
                id={t.id}
                name={t.name}
                description={t.description}
                useCase={t.use_case}
                scoringMethod={t.scoring_method}
                status={t.status}
                isDefault={t.is_default}
                criteriaCount={t.criteriaCount}
                assignmentCount={t.assignmentCount}
                avgScore={t.avgScore}
                onToggleActive={onToggleActive}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import {
  Check,
  Target,
  Users,
  Scale,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";

const scoringLabels: Record<string, string> = {
  weighted: "Weighted",
  simple_average: "Average",
  pass_fail: "Pass/Fail",
  points: "Points",
  custom_formula: "Custom",
};

const useCaseLabels: Record<string, string> = {
  sales_call: "Sales Call",
  onboarding: "Onboarding",
  qa_review: "QA Review",
  training: "Training",
  custom: "Custom",
};

interface StepActivateProps {
  assignMode: "everyone" | "specific";
  selectedUserCount: number;
}

export function StepActivate({ assignMode, selectedUserCount }: StepActivateProps) {
  const { template, groups, criteria, validationErrors, getTotalWeight } = useTemplateBuilderStore();

  const totalWeight = getTotalWeight();
  const weightOk = template.scoring_method !== "weighted" || Math.abs(totalWeight - 100) <= 0.01;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h3 className="text-base font-semibold mb-1">Review & Activate</h3>
        <p className="text-sm text-muted-foreground">
          Confirm your template setup before going live.
        </p>
      </div>

      {/* Summary card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-lg">{template.name || "Untitled Template"}</h4>
              {template.description && (
                <p className="text-sm text-muted-foreground">{template.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{criteria.length}</p>
              <p className="text-xs text-muted-foreground">Criteria</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{groups.length}</p>
              <p className="text-xs text-muted-foreground">Sections</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">
                  {scoringLabels[template.scoring_method] || template.scoring_method}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Scoring</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">
                  {assignMode === "everyone" ? "All" : selectedUserCount}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Assigned</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">{useCaseLabels[template.use_case] || template.use_case}</Badge>
            <Badge variant="secondary">Pass: {template.pass_threshold}%</Badge>
            {template.is_default && <Badge variant="outline">Default</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Validation warnings */}
      {(validationErrors.length > 0 || !weightOk) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-600 mb-1">Heads up</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {!weightOk && (
                  <li>Criteria weights total {totalWeight.toFixed(1)}% (should be 100%)</li>
                )}
                {validationErrors.map((error, i) => (
                  <li key={i}>{error.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2">
        {[
          { label: "Template name set", ok: template.name.trim().length > 0 },
          { label: "At least one criterion", ok: criteria.length > 0 },
          { label: "Weights balanced", ok: weightOk },
          { label: "Assignment configured", ok: assignMode === "everyone" || selectedUserCount > 0 },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full",
                item.ok ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              <Check className="h-3 w-3" />
            </div>
            <span className={cn("text-sm", item.ok ? "text-foreground" : "text-muted-foreground")}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

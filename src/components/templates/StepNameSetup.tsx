"use client";

import {
  Phone,
  UserPlus,
  ClipboardCheck,
  GraduationCap,
  Shapes,
  Scale,
  BarChart3,
  ToggleLeft,
  Hash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import type { TemplateUseCase, ScoringMethod } from "@/types/database";

const useCases: { value: TemplateUseCase; label: string; icon: typeof Phone; desc: string }[] = [
  { value: "sales_call", label: "Sales Call", icon: Phone, desc: "Grade sales conversations" },
  { value: "onboarding", label: "Onboarding", icon: UserPlus, desc: "New hire call reviews" },
  { value: "qa_review", label: "QA Review", icon: ClipboardCheck, desc: "Quality assurance" },
  { value: "training", label: "Training", icon: GraduationCap, desc: "Coaching sessions" },
  { value: "custom", label: "Custom", icon: Shapes, desc: "Any call type" },
];

const scoringMethods: { value: ScoringMethod; label: string; icon: typeof Scale; desc: string }[] = [
  { value: "weighted", label: "Weighted", icon: Scale, desc: "Weight criteria by importance" },
  { value: "simple_average", label: "Average", icon: BarChart3, desc: "Equal weight for all" },
  { value: "pass_fail", label: "Pass/Fail", icon: ToggleLeft, desc: "Binary pass or fail" },
  { value: "points", label: "Points", icon: Hash, desc: "Accumulate points" },
];

export function StepNameSetup() {
  const { template, updateTemplate } = useTemplateBuilderStore();

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="template-name" className="text-base font-semibold">
          Template Name
        </Label>
        <Input
          id="template-name"
          value={template.name}
          onChange={(e) => updateTemplate({ name: e.target.value })}
          placeholder="e.g., Sales Call Scorecard"
          className="text-lg h-12"
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="template-desc" className="text-base font-semibold">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="template-desc"
          value={template.description}
          onChange={(e) => updateTemplate({ description: e.target.value })}
          placeholder="What calls will this template grade?"
          rows={2}
        />
      </div>

      {/* Use Case */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Use Case</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {useCases.map((uc) => {
            const Icon = uc.icon;
            const isSelected = template.use_case === uc.value;
            return (
              <button
                key={uc.value}
                type="button"
                onClick={() => updateTemplate({ use_case: uc.value })}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                  {uc.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scoring Method */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Scoring Method</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scoringMethods.map((sm) => {
            const Icon = sm.icon;
            const isSelected = template.scoring_method === sm.value;
            return (
              <button
                key={sm.value}
                type="button"
                onClick={() => updateTemplate({ scoring_method: sm.value })}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                  <p className={cn("text-xs font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                    {sm.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sm.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pass Threshold */}
      <div className="space-y-2">
        <Label htmlFor="pass-threshold" className="text-base font-semibold">
          Pass Threshold
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="pass-threshold"
            type="number"
            min={0}
            max={100}
            value={template.pass_threshold}
            onChange={(e) => updateTemplate({ pass_threshold: parseFloat(e.target.value) || 0 })}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">% minimum score to pass</span>
        </div>
      </div>
    </div>
  );
}

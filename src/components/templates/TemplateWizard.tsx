"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Save, Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { WizardStepIndicator } from "./WizardStepIndicator";
import { StepNameSetup } from "./StepNameSetup";
import { StepCriteria } from "./StepCriteria";
import { StepAssign } from "./StepAssign";
import { StepActivate } from "./StepActivate";

const STEPS = [
  { label: "Setup", description: "Name & scoring" },
  { label: "Criteria", description: "Add grading criteria" },
  { label: "Assign", description: "Choose team" },
  { label: "Activate", description: "Review & go live" },
];

interface TemplateWizardProps {
  isNew: boolean;
}

export default function TemplateWizard({ isNew }: TemplateWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [assignMode, setAssignMode] = useState<"everyone" | "specific">("everyone");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const {
    template,
    groups,
    criteria,
    isSaving,
    validate,
    clearValidationErrors,
    setIsSaving,
    markClean,
    updateTemplate,
  } = useTemplateBuilderStore();

  const canNext = useCallback(() => {
    switch (currentStep) {
      case 0:
        return template.name.trim().length > 0;
      case 1:
        return criteria.length > 0;
      case 2:
        return assignMode === "everyone" || selectedUserIds.length > 0;
      default:
        return true;
    }
  }, [currentStep, template.name, criteria.length, assignMode, selectedUserIds.length]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push("/dashboard/templates");
    }
  };

  const saveTemplate = async (): Promise<string | null> => {
    clearValidationErrors();
    if (!validate()) return null;

    setIsSaving(true);

    try {
      const templateData = {
        name: template.name,
        description: template.description,
        scoring_method: template.scoring_method,
        use_case: template.use_case,
        pass_threshold: template.pass_threshold,
        max_total_score: template.max_total_score,
        settings: template.settings,
        status: template.status,
        is_default: assignMode === "everyone",
      };

      let templateId = template.id;

      if (isNew || !templateId) {
        const response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templateData),
        });
        if (!response.ok) throw new Error("Failed to create template");
        const { data } = await response.json();
        templateId = data.id;
      } else {
        const response = await fetch(`/api/templates/${templateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templateData),
        });
        if (!response.ok) throw new Error("Failed to update template");
      }

      // Save groups and build a mapping from temp IDs to real IDs
      const groupIdMap = new Map<string, string>();
      for (const group of groups) {
        const groupData = {
          name: group.name,
          description: group.description,
          sort_order: group.sort_order,
          weight: group.weight,
          is_required: group.is_required,
          is_collapsed_by_default: group.is_collapsed_by_default,
        };

        if (group.isNew) {
          const res = await fetch(`/api/templates/${templateId}/groups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(groupData),
          });
          if (!res.ok) throw new Error(`Failed to create group: ${group.name}`);
          const { data: savedGroup } = await res.json();
          groupIdMap.set(group.id, savedGroup.id);
        } else {
          await fetch(`/api/templates/${templateId}/groups/${group.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(groupData),
          });
          groupIdMap.set(group.id, group.id);
        }
      }

      // Save criteria
      for (const criterion of criteria) {
        // Resolve group_id: map temp IDs to real server IDs
        const resolvedGroupId = criterion.group_id
          ? groupIdMap.get(criterion.group_id) || criterion.group_id
          : null;

        const criterionData = {
          group_id: resolvedGroupId,
          name: criterion.name,
          description: criterion.description,
          criteria_type: criterion.criteria_type,
          config: criterion.config,
          weight: criterion.weight,
          max_score: criterion.max_score,
          sort_order: criterion.sort_order,
          is_required: criterion.is_required,
          is_auto_fail: criterion.is_auto_fail,
          auto_fail_threshold: criterion.auto_fail_threshold,
          scoring_guide: criterion.scoring_guide,
          keywords: criterion.keywords,
        };

        if (criterion.isNew) {
          const res = await fetch(`/api/templates/${templateId}/criteria`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(criterionData),
          });
          if (!res.ok) throw new Error(`Failed to create criterion: ${criterion.name}`);
        } else {
          await fetch(`/api/templates/${templateId}/criteria/${criterion.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(criterionData),
          });
        }
      }

      markClean();
      return templateId!;
    } catch (error) {
      console.error("Error saving template:", error);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const createAssignments = async (templateId: string) => {
    if (assignMode === "everyone") {
      // Setting is_default=true on the template handles org-wide assignment
      return;
    }

    // Create individual assignments
    for (const userId of selectedUserIds) {
      try {
        await fetch("/api/template-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_id: templateId,
            user_id: userId,
          }),
        });
      } catch {
        // continue even if one assignment fails
      }
    }
  };

  const handleSaveDraft = async () => {
    updateTemplate({ status: "draft" });
    const templateId = await saveTemplate();
    if (templateId) {
      await createAssignments(templateId);
      router.push("/dashboard/templates");
    }
  };

  const handleActivate = async () => {
    const templateId = await saveTemplate();
    if (!templateId) return;

    await createAssignments(templateId);

    // Publish the template
    try {
      const response = await fetch(`/api/templates/${templateId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          change_summary: "Published from wizard",
          set_as_default: assignMode === "everyone",
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        console.error("Publish failed:", error);
      }
    } catch (error) {
      console.error("Error publishing template:", error);
    }

    router.push("/dashboard");
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">
            {isNew ? "Create Template" : "Edit Template"}
          </h1>
        </div>
        <WizardStepIndicator steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {currentStep === 0 && <StepNameSetup />}
        {currentStep === 1 && <StepCriteria />}
        {currentStep === 2 && (
          <StepAssign
            assignMode={assignMode}
            selectedUserIds={selectedUserIds}
            onAssignModeChange={setAssignMode}
            onSelectedUsersChange={setSelectedUserIds}
          />
        )}
        {currentStep === 3 && (
          <StepActivate
            assignMode={assignMode}
            selectedUserCount={selectedUserIds.length}
          />
        )}
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? "Cancel" : "Back"}
        </Button>

        <div className="flex items-center gap-3">
          {currentStep === STEPS.length - 1 ? (
            <>
              <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save as Draft
              </Button>
              <Button
                variant="gradient"
                onClick={handleActivate}
                disabled={isSaving || !canNext()}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Turn On
              </Button>
            </>
          ) : (
            <Button onClick={handleNext} disabled={!canNext()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

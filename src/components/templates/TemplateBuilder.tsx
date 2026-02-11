"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ClipboardList,
  Save,
  Undo2,
  Redo2,
  Plus,
  Settings,
  Target,
  AlertTriangle,
  Check,
  ArrowLeft,
  Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import type { ScoringMethod, TemplateUseCase } from "@/types/database";
import CriteriaGroup from "./CriteriaGroup";
import CriterionCard from "./CriterionCard";

interface TemplateBuilderProps {
  isNew: boolean;
}

export default function TemplateBuilder({ isNew }: TemplateBuilderProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("criteria");
  const [showSettings, setShowSettings] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"group" | "criteria" | null>(null);

  const {
    template,
    groups,
    criteria,
    isDirty,
    isSaving,
    validationErrors,
    expandedGroupIds,
    updateTemplate,
    updateSettings,
    addGroup,
    reorderGroups,
    addCriteria,
    reorderCriteria,
    moveCriteria,
    validate,
    clearValidationErrors,
    setIsSaving,
    markClean,
    undo,
    redo,
    getTotalWeight,
    getGroupCriteria,
    getUngroupedCriteria,
    history,
    historyIndex,
  } = useTemplateBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const totalWeight = getTotalWeight();
  const weightError = template.scoring_method === "weighted" && Math.abs(totalWeight - 100) > 0.01;
  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);
  const ungroupedCriteria = getUngroupedCriteria();

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;

    if (id.startsWith("group-")) {
      setActiveId(id.replace("group-", ""));
      setActiveType("group");
    } else {
      setActiveId(id);
      setActiveType("criteria");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle group reordering
    if (activeId.startsWith("group-") && overId.startsWith("group-")) {
      const activeIndex = sortedGroups.findIndex(
        (g) => `group-${g.id}` === activeId
      );
      const overIndex = sortedGroups.findIndex(
        (g) => `group-${g.id}` === overId
      );
      if (activeIndex !== -1 && overIndex !== -1) {
        reorderGroups(activeIndex, overIndex);
      }
    }
  };

  const handleSave = async () => {
    clearValidationErrors();

    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      // Prepare data
      const templateData = {
        name: template.name,
        description: template.description,
        scoring_method: template.scoring_method,
        use_case: template.use_case,
        pass_threshold: template.pass_threshold,
        max_total_score: template.max_total_score,
        settings: template.settings,
        status: template.status,
        is_default: template.is_default,
      };

      let templateId = template.id;

      // Create or update template
      if (isNew) {
        const response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templateData),
        });

        if (!response.ok) {
          throw new Error("Failed to create template");
        }

        const { data } = await response.json();
        templateId = data.id;
      } else {
        const response = await fetch(`/api/templates/${templateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templateData),
        });

        if (!response.ok) {
          throw new Error("Failed to update template");
        }
      }

      // Save groups
      for (const group of groups) {
        if (group.isNew) {
          // Create new group
          const response = await fetch(`/api/templates/${templateId}/groups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: group.name,
              description: group.description,
              sort_order: group.sort_order,
              weight: group.weight,
              is_required: group.is_required,
              is_collapsed_by_default: group.is_collapsed_by_default,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to create group: ${group.name}`);
          }
        } else {
          // Update existing group
          await fetch(`/api/templates/${templateId}/groups/${group.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: group.name,
              description: group.description,
              sort_order: group.sort_order,
              weight: group.weight,
              is_required: group.is_required,
              is_collapsed_by_default: group.is_collapsed_by_default,
            }),
          });
        }
      }

      // Save criteria
      for (const criterion of criteria) {
        if (criterion.isNew) {
          // Create new criterion
          const response = await fetch(`/api/templates/${templateId}/criteria`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              group_id: criterion.group_id,
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
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to create criterion: ${criterion.name}`);
          }
        } else {
          // Update existing criterion
          await fetch(`/api/templates/${templateId}/criteria/${criterion.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              group_id: criterion.group_id,
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
            }),
          });
        }
      }

      markClean();

      if (isNew) {
        router.push(`/dashboard/templates/${templateId}/edit`);
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Failed to save template. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!template.id) {
      alert("Please save the template first");
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${template.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          change_summary: "Published from builder",
          set_as_default: false,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        alert(error || "Failed to publish template");
        return;
      }

      router.push("/dashboard/templates");
    } catch (error) {
      console.error("Error publishing template:", error);
      alert("Failed to publish template");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/templates")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              {isNew ? "New Template" : "Edit Template"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isDirty && (
                <span className="text-amber-500">Unsaved changes</span>
              )}
              {!isDirty && template.id && (
                <span className="text-emerald-500">All changes saved</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Template Settings</SheetTitle>
                <SheetDescription>
                  Configure advanced template settings
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Scoring Behavior</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow N/A</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow marking criteria as not applicable
                      </p>
                    </div>
                    <Switch
                      checked={template.settings.allow_na}
                      onCheckedChange={(checked) =>
                        updateSettings({ allow_na: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-calculate scores</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically calculate total score as criteria are scored
                      </p>
                    </div>
                    <Switch
                      checked={template.settings.auto_calculate}
                      onCheckedChange={(checked) =>
                        updateSettings({ auto_calculate: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow partial submission</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow completing sessions without scoring all required criteria
                      </p>
                    </div>
                    <Switch
                      checked={template.settings.allow_partial_submission}
                      onCheckedChange={(checked) =>
                        updateSettings({ allow_partial_submission: checked })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Comments</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require comments below threshold</Label>
                      <p className="text-xs text-muted-foreground">
                        Require comment when score is below threshold
                      </p>
                    </div>
                    <Switch
                      checked={template.settings.require_comments_below_threshold}
                      onCheckedChange={(checked) =>
                        updateSettings({ require_comments_below_threshold: checked })
                      }
                    />
                  </div>
                  {template.settings.require_comments_below_threshold && (
                    <div>
                      <Label>Comments threshold (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={template.settings.comments_threshold}
                        onChange={(e) =>
                          updateSettings({
                            comments_threshold: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Visibility</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show weights to agents</Label>
                      <p className="text-xs text-muted-foreground">
                        Let agents see the weight of each criterion
                      </p>
                    </div>
                    <Switch
                      checked={template.settings.show_weights_to_agents}
                      onCheckedChange={(checked) =>
                        updateSettings({ show_weights_to_agents: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>

          {!isNew && template.status === "draft" && (
            <Button
              variant="gradient"
              onClick={handlePublish}
              disabled={isSaving || weightError || criteria.length === 0}
              className="gap-2"
            >
              <Rocket className="h-4 w-4" />
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="mb-6 border-red-500/50 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-500 mb-1">
                  Please fix the following errors:
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={template.name}
                    onChange={(e) => updateTemplate({ name: e.target.value })}
                    placeholder="Enter template name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="use_case">Use Case</Label>
                  <Select
                    value={template.use_case}
                    onValueChange={(value) =>
                      updateTemplate({ use_case: value as TemplateUseCase })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_call">Sales Call</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="qa_review">QA Review</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={template.description}
                  onChange={(e) => updateTemplate({ description: e.target.value })}
                  placeholder="Describe what this template is used for..."
                  rows={2}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="scoring_method">Scoring Method</Label>
                  <Select
                    value={template.scoring_method}
                    onValueChange={(value) =>
                      updateTemplate({ scoring_method: value as ScoringMethod })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weighted">Weighted</SelectItem>
                      <SelectItem value="simple_average">Simple Average</SelectItem>
                      <SelectItem value="pass_fail">Pass/Fail</SelectItem>
                      <SelectItem value="points">Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass_threshold">Pass Threshold (%)</Label>
                  <Input
                    id="pass_threshold"
                    type="number"
                    min={0}
                    max={100}
                    value={template.pass_threshold}
                    onChange={(e) =>
                      updateTemplate({ pass_threshold: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_score">Max Total Score</Label>
                  <Input
                    id="max_score"
                    type="number"
                    min={1}
                    value={template.max_total_score}
                    onChange={(e) =>
                      updateTemplate({ max_total_score: parseFloat(e.target.value) || 100 })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Criteria Builder */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Scoring Criteria</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addGroup()}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Group
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addCriteria(null)}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Criterion
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedGroups.map((g) => `group-${g.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {/* Groups */}
                    {sortedGroups.map((group) => (
                      <CriteriaGroup
                        key={group.id}
                        group={group}
                        criteria={getGroupCriteria(group.id)}
                        isExpanded={expandedGroupIds.has(group.id)}
                      />
                    ))}

                    {/* Ungrouped Criteria */}
                    {ungroupedCriteria.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Ungrouped Criteria
                        </h4>
                        {ungroupedCriteria.map((criterion) => (
                          <CriterionCard key={criterion.id} criterion={criterion} />
                        ))}
                      </div>
                    )}

                    {/* Empty State */}
                    {groups.length === 0 && criteria.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="font-medium mb-2">No criteria yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add groups to organize your criteria, or add individual criteria
                        </p>
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => addGroup()}
                            className="gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Add Group
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => addCriteria(null)}
                            className="gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Add Criterion
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Weight Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Weight Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Weight</span>
                  <Badge
                    variant={weightError ? "destructive" : "secondary"}
                    className="font-mono"
                  >
                    {totalWeight.toFixed(1)}%
                  </Badge>
                </div>
                <Progress
                  value={Math.min(totalWeight, 100)}
                  className={cn(
                    "h-2",
                    weightError && "bg-red-500/20"
                  )}
                />
                {weightError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {totalWeight < 100
                      ? `Missing ${(100 - totalWeight).toFixed(1)}%`
                      : `Exceeds by ${(totalWeight - 100).toFixed(1)}%`}
                  </p>
                )}
                {!weightError && totalWeight === 100 && (
                  <p className="text-xs text-emerald-500 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Weights are balanced
                  </p>
                )}

                {/* Weight breakdown by criteria */}
                <div className="pt-4 border-t space-y-2">
                  {criteria
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 5)
                    .map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1">{c.name}</span>
                        <span className="text-muted-foreground ml-2">{c.weight}%</span>
                      </div>
                    ))}
                  {criteria.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{criteria.length - 5} more criteria
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Groups</span>
                <span className="font-medium">{groups.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Criteria</span>
                <span className="font-medium">{criteria.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Required</span>
                <span className="font-medium">
                  {criteria.filter((c) => c.is_required).length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Auto-fail</span>
                <span className="font-medium">
                  {criteria.filter((c) => c.is_auto_fail).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

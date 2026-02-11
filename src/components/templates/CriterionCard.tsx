"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Copy,
  Trash2,
  AlertTriangle,
  Scale,
  CheckSquare,
  ToggleLeft,
  List,
  ListChecks,
  Star,
  Percent,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  useTemplateBuilderStore,
  DraftCriteria,
} from "@/stores/template-builder-store";
import { CriteriaType } from "@/types/database";

interface CriterionCardProps {
  criterion: DraftCriteria;
}

const criteriaTypeIcons: Record<CriteriaType, React.ReactNode> = {
  scale: <Scale className="h-4 w-4" />,
  pass_fail: <ToggleLeft className="h-4 w-4" />,
  checklist: <ListChecks className="h-4 w-4" />,
  text: <FileText className="h-4 w-4" />,
  dropdown: <List className="h-4 w-4" />,
  multi_select: <CheckSquare className="h-4 w-4" />,
  rating_stars: <Star className="h-4 w-4" />,
  percentage: <Percent className="h-4 w-4" />,
};

const criteriaTypeLabels: Record<CriteriaType, string> = {
  scale: "Scale",
  pass_fail: "Pass/Fail",
  checklist: "Checklist",
  text: "Text",
  dropdown: "Dropdown",
  multi_select: "Multi-Select",
  rating_stars: "Star Rating",
  percentage: "Percentage",
};

export default function CriterionCard({ criterion }: CriterionCardProps) {
  const {
    updateCriteria,
    deleteCriteria,
    duplicateCriteria,
    groups,
  } = useTemplateBuilderStore();

  const [isExpanded, setIsExpanded] = useState(criterion.isExpanded ?? false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: criterion.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleUpdate = (updates: Partial<DraftCriteria>) => {
    updateCriteria(criterion.id, updates);
  };

  const handleConfigUpdate = (configUpdates: Record<string, unknown>) => {
    updateCriteria(criterion.id, {
      config: { ...criterion.config, ...configUpdates },
    });
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-200 group",
        isDragging && "opacity-50 shadow-lg",
        criterion.is_auto_fail && "border-red-500/30"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-3 flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab p-1 -ml-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2 text-muted-foreground">
            {criteriaTypeIcons[criterion.criteria_type]}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{criterion.name || "Unnamed Criterion"}</p>
          </div>

          <div className="flex items-center gap-2">
            {criterion.is_required && (
              <Badge variant="outline" className="text-xs">
                Required
              </Badge>
            )}
            {criterion.is_auto_fail && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                Auto-fail
              </Badge>
            )}
            <Badge variant="secondary" className="font-mono text-xs">
              {criterion.weight}%
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => duplicateCriteria(criterion.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => deleteCriteria(criterion.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={criterion.name}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                  placeholder="Enter criterion name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={criterion.criteria_type}
                  onValueChange={(value) =>
                    handleUpdate({ criteria_type: value as CriteriaType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(criteriaTypeLabels).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {criteriaTypeIcons[type as CriteriaType]}
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={criterion.description}
                onChange={(e) => handleUpdate({ description: e.target.value })}
                placeholder="Describe what this criterion measures..."
                rows={2}
              />
            </div>

            {/* Scoring */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Weight (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={criterion.weight}
                  onChange={(e) =>
                    handleUpdate({ weight: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Score</Label>
                <Input
                  type="number"
                  min={1}
                  value={criterion.max_score}
                  onChange={(e) =>
                    handleUpdate({ max_score: parseFloat(e.target.value) || 100 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select
                  value={criterion.group_id || "ungrouped"}
                  onValueChange={(value) =>
                    handleUpdate({ group_id: value === "ungrouped" ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ungrouped">Ungrouped</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type-specific config */}
            {renderTypeConfig(criterion, handleConfigUpdate)}

            {/* Scoring Guide */}
            <div className="space-y-2">
              <Label>Scoring Guide</Label>
              <Textarea
                value={criterion.scoring_guide}
                onChange={(e) => handleUpdate({ scoring_guide: e.target.value })}
                placeholder="Instructions for how to score this criterion..."
                rows={2}
              />
            </div>

            {/* Options */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id={`required-${criterion.id}`}
                  checked={criterion.is_required}
                  onCheckedChange={(checked) => handleUpdate({ is_required: checked })}
                />
                <Label htmlFor={`required-${criterion.id}`}>Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id={`auto-fail-${criterion.id}`}
                  checked={criterion.is_auto_fail}
                  onCheckedChange={(checked) => handleUpdate({ is_auto_fail: checked })}
                />
                <Label htmlFor={`auto-fail-${criterion.id}`}>Auto-fail</Label>
              </div>
            </div>

            {criterion.is_auto_fail && (
              <div className="space-y-2">
                <Label>Auto-fail Threshold (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={criterion.auto_fail_threshold ?? ""}
                  onChange={(e) =>
                    handleUpdate({
                      auto_fail_threshold: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  placeholder="Score below this triggers auto-fail"
                />
                <p className="text-xs text-muted-foreground">
                  If score falls below this threshold, the entire session fails
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Render type-specific configuration
function renderTypeConfig(
  criterion: DraftCriteria,
  onConfigUpdate: (updates: Record<string, unknown>) => void
) {
  const config = criterion.config as Record<string, unknown>;

  switch (criterion.criteria_type) {
    case "scale":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Min Value</Label>
            <Input
              type="number"
              value={(config.min as number) ?? 1}
              onChange={(e) => onConfigUpdate({ min: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Value</Label>
            <Input
              type="number"
              value={(config.max as number) ?? 5}
              onChange={(e) => onConfigUpdate({ max: parseInt(e.target.value) || 5 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Step</Label>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={(config.step as number) ?? 1}
              onChange={(e) => onConfigUpdate({ step: parseFloat(e.target.value) || 1 })}
            />
          </div>
        </div>
      );

    case "pass_fail":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Pass Label</Label>
            <Input
              value={(config.pass_label as string) ?? "Pass"}
              onChange={(e) => onConfigUpdate({ pass_label: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Fail Label</Label>
            <Input
              value={(config.fail_label as string) ?? "Fail"}
              onChange={(e) => onConfigUpdate({ fail_label: e.target.value })}
            />
          </div>
        </div>
      );

    case "rating_stars":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Max Stars</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={(config.max_stars as number) ?? 5}
              onChange={(e) => onConfigUpdate({ max_stars: parseInt(e.target.value) || 5 })}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch
              checked={(config.allow_half as boolean) ?? false}
              onCheckedChange={(checked) => onConfigUpdate({ allow_half: checked })}
            />
            <Label>Allow half stars</Label>
          </div>
        </div>
      );

    case "text":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Max Length</Label>
            <Input
              type="number"
              min={1}
              value={(config.max_length as number) ?? 1000}
              onChange={(e) => onConfigUpdate({ max_length: parseInt(e.target.value) || 1000 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={(config.placeholder as string) ?? ""}
              onChange={(e) => onConfigUpdate({ placeholder: e.target.value })}
            />
          </div>
        </div>
      );

    case "checklist":
    case "dropdown":
    case "multi_select":
      // These require more complex option management - simplified for now
      return (
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Options configuration will be available in the full editor.
          </p>
        </div>
      );

    case "percentage":
      return null; // No additional config needed

    default:
      return null;
  }
}

"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  DraftGroup,
  DraftCriteria,
} from "@/stores/template-builder-store";
import CriterionCard from "./CriterionCard";

interface CriteriaGroupProps {
  group: DraftGroup;
  criteria: DraftCriteria[];
  isExpanded: boolean;
}

export default function CriteriaGroup({
  group,
  criteria,
  isExpanded,
}: CriteriaGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);

  const {
    updateGroup,
    deleteGroup,
    toggleGroupExpanded,
    addCriteria,
    reorderCriteria,
  } = useTemplateBuilderStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `group-${group.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  const handleSaveName = () => {
    if (editName.trim()) {
      updateGroup(group.id, { name: editName.trim() });
    } else {
      setEditName(group.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditName(group.name);
      setIsEditing(false);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-200",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={() => toggleGroupExpanded(group.id)}>
        <CardHeader className="p-4">
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab p-1 -ml-2 hover:bg-muted rounded"
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

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="h-7 text-sm font-semibold"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h4
                    className="font-semibold cursor-pointer hover:text-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    {group.name}
                  </h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {criteria.length} {criteria.length === 1 ? "criterion" : "criteria"}
                {group.weight > 0 && ` • ${group.weight}% group weight`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {totalWeight}%
              </Badge>

              {!group.is_required && (
                <Badge variant="secondary" className="text-xs">
                  Optional
                </Badge>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => addCriteria(group.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Criterion
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deleteGroup(group.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <SortableContext
              items={criteria.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 ml-6">
                {criteria.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      No criteria in this group
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCriteria(group.id)}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add Criterion
                    </Button>
                  </div>
                ) : (
                  criteria.map((criterion) => (
                    <CriterionCard key={criterion.id} criterion={criterion} />
                  ))
                )}
              </div>
            </SortableContext>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

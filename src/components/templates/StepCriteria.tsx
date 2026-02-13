"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
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
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { CriteriaTypePicker } from "./CriteriaTypePicker";
import CriteriaGroup from "./CriteriaGroup";
import CriterionCard from "./CriterionCard";
import type { CriteriaType } from "@/types/database";

export function StepCriteria() {
  const {
    groups,
    criteria,
    expandedGroupIds,
    addGroup,
    addCriteria,
    reorderGroups,
    getGroupCriteria,
    getUngroupedCriteria,
  } = useTemplateBuilderStore();

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);
  const ungroupedCriteria = getUngroupedCriteria();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    if (activeIdStr.startsWith("group-") && overIdStr.startsWith("group-")) {
      const activeIndex = sortedGroups.findIndex((g) => `group-${g.id}` === activeIdStr);
      const overIndex = sortedGroups.findIndex((g) => `group-${g.id}` === overIdStr);
      if (activeIndex !== -1 && overIndex !== -1) {
        reorderGroups(activeIndex, overIndex);
      }
    }
  };

  const handleAddCriteria = (type: CriteriaType) => {
    addCriteria(null, type);
    setShowTypePicker(false);
  };

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => addGroup()} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Section
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTypePicker(!showTypePicker)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Criterion
        </Button>
      </div>

      {/* Type picker */}
      {showTypePicker && (
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-medium mb-3">Choose a criteria type:</p>
          <CriteriaTypePicker onSelect={handleAddCriteria} />
        </div>
      )}

      {/* Criteria list */}
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
            {sortedGroups.map((group) => (
              <CriteriaGroup
                key={group.id}
                group={group}
                criteria={getGroupCriteria(group.id)}
                isExpanded={expandedGroupIds.has(group.id)}
              />
            ))}

            {ungroupedCriteria.length > 0 && (
              <div className="space-y-2">
                {sortedGroups.length > 0 && (
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Ungrouped Criteria
                  </h4>
                )}
                {ungroupedCriteria.map((criterion) => (
                  <CriterionCard key={criterion.id} criterion={criterion} />
                ))}
              </div>
            )}

            {groups.length === 0 && criteria.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <Target className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="font-medium mb-1">No criteria yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add criteria to define how calls will be scored
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowTypePicker(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Criterion
                </Button>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

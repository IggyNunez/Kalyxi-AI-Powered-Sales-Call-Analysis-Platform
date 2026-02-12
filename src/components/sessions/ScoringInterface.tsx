"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  HelpCircle,
  X,
} from "lucide-react";
import { useScoringState } from "@/hooks/use-scoring-state";
import { ScoringProgressHeader } from "./scoring-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Session,
  Template,
  Criteria,
  CriteriaGroup,
  Score,
  ScoreValue,
  CriteriaConfig,
  ScaleCriteriaConfig,
  PassFailCriteriaConfig,
  ChecklistCriteriaConfig,
  DropdownCriteriaConfig,
  MultiSelectCriteriaConfig,
  StarsCriteriaConfig,
  PercentageCriteriaConfig,
  TextCriteriaConfig,
  ScaleScoreValue,
  PassFailScoreValue,
  ChecklistScoreValue,
  DropdownScoreValue,
  MultiSelectScoreValue,
  StarsScoreValue,
  PercentageScoreValue,
  TextScoreValue,
} from "@/types/database";
import {
  ScaleInput,
  PassFailInput,
  ChecklistInput,
  DropdownInput,
  MultiSelectInput,
  StarsInput,
  PercentageInput,
  TextInput,
} from "./score-inputs";

interface ScoringInterfaceProps {
  session: Session;
  template: Template;
  criteria: Criteria[];
  groups: CriteriaGroup[];
  initialScores: Score[];
  onScoreChange: (criteriaId: string, value: ScoreValue, isNa?: boolean, comment?: string) => Promise<void>;
  onComplete: () => Promise<void>;
  disabled?: boolean;
}

interface LocalScore {
  value: ScoreValue | null;
  is_na: boolean;
  comment: string;
  isSaving: boolean;
  lastSaved: Date | null;
}

export default function ScoringInterface({
  session,
  template,
  criteria,
  groups,
  initialScores,
  onScoreChange,
  onComplete,
  disabled = false,
}: ScoringInterfaceProps) {
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const [localScores, setLocalScores] = useState<Map<string, LocalScore>>(new Map());
  const [isCompleting, setIsCompleting] = useState(false);

  // Refs for scroll-to functionality and intersection observer
  const progressHeaderRef = useRef<HTMLDivElement>(null);
  const criteriaRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scoring state for real-time progress tracking
  const scoringState = useScoringState({
    template,
    criteria,
    localScores,
  });

  // Scroll to a specific criteria card
  const scrollToCriteria = useCallback((criteriaId: string) => {
    const element = criteriaRefs.current.get(criteriaId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Briefly highlight the element
      element.classList.add("ring-2", "ring-primary", "ring-offset-2");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
      }, 2000);
    }
  }, []);

  // Initialize local scores from initial scores
  useEffect(() => {
    const scores = new Map<string, LocalScore>();
    initialScores.forEach((score) => {
      scores.set(score.criteria_id, {
        value: score.value as ScoreValue,
        is_na: score.is_na || false,
        comment: score.comment || "",
        isSaving: false,
        lastSaved: score.scored_at ? new Date(score.scored_at) : null,
      });
    });
    setLocalScores(scores);

    // Expand all groups by default
    const allGroupIds = new Set(groups.map((g) => g.id));
    setExpandedGroups(allGroupIds);
  }, [initialScores, groups]);

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Toggle criterion expansion
  const toggleCriterion = (criteriaId: string) => {
    setExpandedCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(criteriaId)) {
        next.delete(criteriaId);
      } else {
        next.add(criteriaId);
      }
      return next;
    });
  };

  // Toggle comments visibility
  const toggleComments = (criteriaId: string) => {
    setShowComments((prev) => {
      const next = new Set(prev);
      if (next.has(criteriaId)) {
        next.delete(criteriaId);
      } else {
        next.add(criteriaId);
      }
      return next;
    });
  };

  // Handle score change with debounced save
  const handleScoreChange = useCallback(
    async (criteriaId: string, value: ScoreValue, isNa = false) => {
      const current = localScores.get(criteriaId) || {
        value: null,
        is_na: false,
        comment: "",
        isSaving: false,
        lastSaved: null,
      };

      // Update local state immediately
      setLocalScores((prev) => {
        const next = new Map(prev);
        next.set(criteriaId, {
          ...current,
          value: isNa ? null : value,
          is_na: isNa,
          isSaving: true,
        });
        return next;
      });

      try {
        await onScoreChange(criteriaId, value, isNa, current.comment);

        // Mark as saved
        setLocalScores((prev) => {
          const next = new Map(prev);
          const c = next.get(criteriaId);
          if (c) {
            next.set(criteriaId, {
              ...c,
              isSaving: false,
              lastSaved: new Date(),
            });
          }
          return next;
        });
      } catch (error) {
        console.error("Error saving score:", error);
        // Revert on error
        setLocalScores((prev) => {
          const next = new Map(prev);
          next.set(criteriaId, { ...current, isSaving: false });
          return next;
        });
      }
    },
    [localScores, onScoreChange]
  );

  // Handle comment change
  const handleCommentChange = useCallback(
    async (criteriaId: string, comment: string) => {
      const current = localScores.get(criteriaId);
      if (!current) return;

      setLocalScores((prev) => {
        const next = new Map(prev);
        next.set(criteriaId, { ...current, comment, isSaving: true });
        return next;
      });

      try {
        // When updating just a comment, use the existing value or a placeholder (won't be saved if N/A)
        const valueToSave = current.value || ({ value: 0 } as ScaleScoreValue);
        await onScoreChange(criteriaId, valueToSave, current.is_na, comment);

        setLocalScores((prev) => {
          const next = new Map(prev);
          const c = next.get(criteriaId);
          if (c) {
            next.set(criteriaId, { ...c, isSaving: false, lastSaved: new Date() });
          }
          return next;
        });
      } catch (error) {
        console.error("Error saving comment:", error);
      }
    },
    [localScores, onScoreChange]
  );

  // Handle N/A toggle
  const handleNaToggle = (criteriaId: string, isNa: boolean) => {
    // Use a placeholder value - it will be set to null when isNa is true
    handleScoreChange(criteriaId, { value: 0 } as ScaleScoreValue, isNa);
  };

  // Handle complete
  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
    } catch (error) {
      console.error("Error completing session:", error);
      alert("Failed to complete session. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  // Get grouped criteria
  const groupedCriteria = groups.map((group) => ({
    group,
    criteria: criteria
      .filter((c) => c.group_id === group.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));

  const ungroupedCriteria = criteria
    .filter((c) => !c.group_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Check if all required are scored
  const requiredCriteria = criteria.filter((c) => c.is_required);
  const allRequiredScored = requiredCriteria.every((c) => {
    const score = localScores.get(c.id);
    return score && (score.value !== null || score.is_na);
  });

  // Render score input based on criteria type
  const renderScoreInput = (criterion: Criteria) => {
    const localScore = localScores.get(criterion.id);
    const isNa = localScore?.is_na || false;
    const value = localScore?.value;
    const config = criterion.config as CriteriaConfig;

    if (isNa) {
      return (
        <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
          Marked as N/A
        </div>
      );
    }

    const commonProps = {
      disabled: disabled || isNa,
    };

    switch (criterion.criteria_type) {
      case "scale":
        return (
          <ScaleInput
            value={(value as ScaleScoreValue)?.value ?? null}
            onChange={(v) => handleScoreChange(criterion.id, { value: v } as ScaleScoreValue)}
            config={config as ScaleCriteriaConfig}
            {...commonProps}
          />
        );

      case "pass_fail":
        return (
          <PassFailInput
            value={(value as PassFailScoreValue)?.passed ?? null}
            onChange={(v) => handleScoreChange(criterion.id, { passed: v } as PassFailScoreValue)}
            config={config as PassFailCriteriaConfig}
            {...commonProps}
          />
        );

      case "checklist": {
        const checklistConfig = config as ChecklistCriteriaConfig;
        const allItemIds = checklistConfig.items?.map(i => i.id) || [];
        return (
          <ChecklistInput
            value={(value as ChecklistScoreValue)?.checked ?? []}
            onChange={(checked) => {
              const unchecked = allItemIds.filter(id => !checked.includes(id));
              handleScoreChange(criterion.id, { checked, unchecked } as ChecklistScoreValue);
            }}
            config={checklistConfig}
            {...commonProps}
          />
        );
      }

      case "dropdown":
        return (
          <DropdownInput
            value={(value as DropdownScoreValue)?.selected ?? null}
            onChange={(v) => handleScoreChange(criterion.id, { selected: v } as DropdownScoreValue)}
            config={config as DropdownCriteriaConfig}
            {...commonProps}
          />
        );

      case "multi_select":
        return (
          <MultiSelectInput
            value={(value as MultiSelectScoreValue)?.selected ?? []}
            onChange={(v) => handleScoreChange(criterion.id, { selected: v } as MultiSelectScoreValue)}
            config={config as MultiSelectCriteriaConfig}
            {...commonProps}
          />
        );

      case "rating_stars":
        return (
          <StarsInput
            value={(value as StarsScoreValue)?.stars ?? null}
            onChange={(v) => handleScoreChange(criterion.id, { stars: v } as StarsScoreValue)}
            config={config as StarsCriteriaConfig}
            {...commonProps}
          />
        );

      case "percentage":
        return (
          <PercentageInput
            value={(value as PercentageScoreValue)?.value ?? null}
            onChange={(v) => handleScoreChange(criterion.id, { value: v } as PercentageScoreValue)}
            config={config as PercentageCriteriaConfig}
            {...commonProps}
          />
        );

      case "text":
        return (
          <TextInput
            value={(value as TextScoreValue)?.response ?? ""}
            onChange={(v) => handleScoreChange(criterion.id, { response: v } as TextScoreValue)}
            config={config as TextCriteriaConfig}
            {...commonProps}
          />
        );

      default:
        return (
          <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
            Unknown criteria type: {criterion.criteria_type}
          </div>
        );
    }
  };

  // Render a single criterion card
  const renderCriterion = (criterion: Criteria) => {
    const localScore = localScores.get(criterion.id);
    const isScored = localScore && (localScore.value !== null || localScore.is_na);
    const isSaving = localScore?.isSaving || false;
    const showComment = showComments.has(criterion.id);
    const isExpanded = expandedCriteria.has(criterion.id);

    const settings = template.settings as { allow_na?: boolean };
    const allowNa = settings?.allow_na !== false;

    // Check if this criteria has triggered auto-fail
    const isAutoFailTriggered = scoringState.autoFailCriteriaIds.includes(criterion.id);
    // Check if this is an unscored required criteria
    const isUnscoredRequired = scoringState.unscoredRequiredIds.includes(criterion.id);

    return (
      <Card
        key={criterion.id}
        ref={(el) => {
          if (el) {
            criteriaRefs.current.set(criterion.id, el);
          }
        }}
        className={cn(
          "transition-all duration-300",
          // Auto-fail triggered - red pulsing border
          isAutoFailTriggered && "border-red-500 ring-2 ring-red-500/30 animate-pulse",
          // Auto-fail capable but not triggered
          criterion.is_auto_fail && !isAutoFailTriggered && "border-red-500/30",
          // Unscored required - amber left border
          isUnscoredRequired && "border-l-4 border-l-amber-500"
        )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium">{criterion.name}</h4>
                {criterion.is_required && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      isUnscoredRequired && "border-amber-500 text-amber-600 animate-pulse"
                    )}
                  >
                    Required
                  </Badge>
                )}
                {criterion.is_auto_fail && (
                  <Badge
                    variant="destructive"
                    className={cn(
                      "text-xs gap-1",
                      isAutoFailTriggered && "animate-pulse"
                    )}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {isAutoFailTriggered ? "Auto-fail Triggered!" : "Auto-fail"}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs font-mono">
                  {criterion.weight}%
                </Badge>
              </div>
              {criterion.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {criterion.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isSaving && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {isScored && !isSaving && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
            </div>
          </div>

          {/* Scoring guide */}
          {criterion.scoring_guide && (
            <Collapsible open={isExpanded} onOpenChange={() => toggleCriterion(criterion.id)}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="h-3 w-3" />
                  Scoring Guide
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-muted/30 rounded-lg text-sm">
                  {criterion.scoring_guide}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Score Input */}
          {renderScoreInput(criterion)}

          {/* N/A Toggle and Comment */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4">
              {allowNa && (
                <div className="flex items-center gap-2">
                  <Switch
                    id={`na-${criterion.id}`}
                    checked={localScore?.is_na || false}
                    onCheckedChange={(checked) => handleNaToggle(criterion.id, checked)}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`na-${criterion.id}`}
                    className="text-sm cursor-pointer"
                  >
                    N/A
                  </Label>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleComments(criterion.id)}
              className={cn(
                "gap-1",
                localScore?.comment && "text-primary"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              {localScore?.comment ? "Edit Comment" : "Add Comment"}
            </Button>
          </div>

          {/* Comment Input */}
          {showComment && (
            <div className="space-y-2">
              <Textarea
                value={localScore?.comment || ""}
                onChange={(e) => handleCommentChange(criterion.id, e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                disabled={disabled}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Progress Header with sticky behavior */}
        <div ref={progressHeaderRef}>
          <ScoringProgressHeader
            totalCriteria={scoringState.totalCriteria}
            scoredCriteria={scoringState.scoredCriteria}
            requiredCriteria={scoringState.requiredCriteria}
            scoredRequired={scoringState.scoredRequired}
            projectedScore={scoringState.projectedScore}
            isPassing={scoringState.isPassing}
            passThreshold={scoringState.passThreshold}
            autoFailTriggered={scoringState.autoFailTriggered}
            autoFailCriteriaIds={scoringState.autoFailCriteriaIds}
            autoFailCriteriaNames={scoringState.autoFailCriteriaNames}
            nextUnscoredId={scoringState.nextUnscoredId}
            nextUnscoredRequiredId={scoringState.nextUnscoredRequiredId}
            onScrollToCriteria={scrollToCriteria}
            observeRef={progressHeaderRef}
          />
        </div>

        {/* Grouped Criteria */}
        {groupedCriteria.map(({ group, criteria: groupCriteria }) => (
          <Collapsible
            key={group.id}
            open={expandedGroups.has(group.id)}
            onOpenChange={() => toggleGroup(group.id)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedGroups.has(group.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <div>
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.is_required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                      <Badge variant="secondary" className="font-mono text-xs">
                        {group.weight}%
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {groupCriteria.filter((c) => {
                          const s = localScores.get(c.id);
                          return s && (s.value !== null || s.is_na);
                        }).length}
                        /{groupCriteria.length}
                      </span>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {groupCriteria.map((criterion) => renderCriterion(criterion))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}

        {/* Ungrouped Criteria */}
        {ungroupedCriteria.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Additional Criteria
            </h3>
            {ungroupedCriteria.map((criterion) => renderCriterion(criterion))}
          </div>
        )}

        {/* Complete Button with Score Preview */}
        {!disabled && (
          <div className="sticky bottom-4 flex justify-end">
            <Card className="inline-flex items-center gap-4 p-4 shadow-lg">
              {/* Score Preview */}
              {scoringState.projectedScore && scoringState.scoredCriteria > 0 && (
                <div className="flex items-center gap-2 pr-4 border-r">
                  <span className={cn(
                    "text-2xl font-bold",
                    scoringState.autoFailTriggered
                      ? "text-red-500"
                      : scoringState.isPassing
                      ? "text-emerald-500"
                      : "text-amber-500"
                  )}>
                    {Math.round(scoringState.projectedScore.percentage_score)}%
                  </span>
                  <span className={cn(
                    "text-sm font-medium",
                    scoringState.autoFailTriggered
                      ? "text-red-500"
                      : scoringState.isPassing
                      ? "text-emerald-500"
                      : "text-amber-500"
                  )}>
                    {scoringState.autoFailTriggered
                      ? "Fail"
                      : scoringState.isPassing
                      ? "Pass"
                      : "Below Threshold"}
                  </span>
                </div>
              )}

              {/* Warning messages */}
              {scoringState.autoFailTriggered && (
                <span className="text-sm text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Auto-fail triggered
                </span>
              )}
              {!scoringState.allRequiredScored && !scoringState.autoFailTriggered && (
                <span className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {scoringState.scoredRequired}/{scoringState.requiredCriteria} required
                </span>
              )}

              <Button
                variant="gradient"
                size="lg"
                onClick={handleComplete}
                disabled={isCompleting || !scoringState.canComplete}
              >
                {isCompleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Complete Scoring
              </Button>
            </Card>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  GripVertical,
  Trash2,
  Save,
  ArrowLeft,
  Star,
  Archive,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  Target,
  Info,
  Edit2,
  Copy,
  Eye,
  MoreVertical,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ScorecardCriterion, Scorecard } from "@/types/database";
import Link from "next/link";

// Generate unique ID
const generateId = () => `criterion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Default criterion template
const createDefaultCriterion = (order: number): ScorecardCriterion => ({
  id: generateId(),
  name: "",
  description: "",
  weight: 0,
  max_score: 10,
  scoring_guide: "",
  keywords: [],
  order,
});

// Preset criteria for quick start
const PRESET_CRITERIA: ScorecardCriterion[] = [
  {
    id: "opening",
    name: "Opening & Introduction",
    description: "How well did the caller open the conversation and introduce themselves?",
    weight: 15,
    max_score: 10,
    scoring_guide: "1-3: Poor greeting, no introduction. 4-6: Basic greeting, minimal rapport. 7-10: Excellent greeting, strong rapport building.",
    keywords: ["hello", "introduction", "greeting", "rapport"],
    order: 1,
  },
  {
    id: "discovery",
    name: "Discovery & Needs Analysis",
    description: "How effectively did the caller uncover customer needs and pain points?",
    weight: 25,
    max_score: 10,
    scoring_guide: "1-3: No discovery questions. 4-6: Basic questions asked. 7-10: Deep discovery, understood needs.",
    keywords: ["needs", "pain points", "challenges", "goals", "questions"],
    order: 2,
  },
  {
    id: "presentation",
    name: "Product Presentation",
    description: "How well did the caller present the solution and its benefits?",
    weight: 20,
    max_score: 10,
    scoring_guide: "1-3: No clear presentation. 4-6: Basic features mentioned. 7-10: Tailored presentation with clear value.",
    keywords: ["benefits", "features", "value", "solution", "demo"],
    order: 3,
  },
  {
    id: "objection_handling",
    name: "Objection Handling",
    description: "How effectively did the caller address concerns and objections?",
    weight: 20,
    max_score: 10,
    scoring_guide: "1-3: Ignored or argued. 4-6: Acknowledged but weak response. 7-10: Skillfully addressed all concerns.",
    keywords: ["concern", "objection", "price", "competitor", "hesitation"],
    order: 4,
  },
  {
    id: "closing",
    name: "Closing & Next Steps",
    description: "How well did the caller close and establish next steps?",
    weight: 20,
    max_score: 10,
    scoring_guide: "1-3: No close attempt. 4-6: Weak close, unclear next steps. 7-10: Strong close, clear action items.",
    keywords: ["next steps", "follow-up", "meeting", "demo", "close"],
    order: 5,
  },
];

// Sortable Criterion Component
function SortableCriterion({
  criterion,
  index,
  onUpdate,
  onDelete,
  isExpanded,
  onToggleExpand,
  error,
}: {
  criterion: ScorecardCriterion;
  index: number;
  onUpdate: (criterion: ScorecardCriterion) => void;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  error?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: criterion.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [keywordInput, setKeywordInput] = useState("");

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !criterion.keywords?.includes(keywordInput.trim())) {
      onUpdate({
        ...criterion,
        keywords: [...(criterion.keywords || []), keywordInput.trim()],
      });
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    onUpdate({
      ...criterion,
      keywords: criterion.keywords?.filter((k) => k !== keyword) || [],
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-card transition-all duration-200",
        isDragging && "opacity-50 shadow-2xl scale-[1.02] z-50",
        error && "border-red-500/50 bg-red-50/30",
        !error && "hover:border-primary/30"
      )}
    >
      {/* Collapsed Header */}
      <div
        className={cn(
          "flex items-center gap-3 p-4 cursor-pointer",
          isExpanded && "border-b"
        )}
        onClick={onToggleExpand}
      >
        <button
          type="button"
          className="cursor-grab touch-none focus:outline-none"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">
              {criterion.name || <span className="text-muted-foreground italic">Untitled Criterion</span>}
            </h4>
            {error && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{error}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {!isExpanded && criterion.description && (
            <p className="text-sm text-muted-foreground truncate">{criterion.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "font-mono",
              criterion.weight >= 25
                ? "bg-primary/20 text-primary border-primary/30"
                : criterion.weight >= 15
                  ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                  : criterion.weight > 0
                    ? "bg-muted text-muted-foreground"
                    : "bg-red-100 text-red-600 border-red-200"
            )}
          >
            {criterion.weight}%
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 animate-fade-in">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`name-${criterion.id}`}>Criterion Name *</Label>
              <Input
                id={`name-${criterion.id}`}
                value={criterion.name}
                onChange={(e) => onUpdate({ ...criterion, name: e.target.value })}
                placeholder="e.g., Opening & Introduction"
                className={cn(!criterion.name && "border-red-300")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`weight-${criterion.id}`}>Weight % *</Label>
                <Input
                  id={`weight-${criterion.id}`}
                  type="number"
                  min={1}
                  max={100}
                  value={criterion.weight || ""}
                  onChange={(e) => onUpdate({ ...criterion, weight: parseInt(e.target.value) || 0 })}
                  placeholder="20"
                  className={cn(criterion.weight === 0 && "border-red-300")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`max-score-${criterion.id}`}>Max Score</Label>
                <Input
                  id={`max-score-${criterion.id}`}
                  type="number"
                  min={1}
                  max={100}
                  value={criterion.max_score}
                  onChange={(e) => onUpdate({ ...criterion, max_score: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`description-${criterion.id}`}>Description</Label>
            <Textarea
              id={`description-${criterion.id}`}
              value={criterion.description}
              onChange={(e) => onUpdate({ ...criterion, description: e.target.value })}
              placeholder="Describe what this criterion evaluates..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`scoring-guide-${criterion.id}`}>Scoring Guide</Label>
            <Textarea
              id={`scoring-guide-${criterion.id}`}
              value={criterion.scoring_guide}
              onChange={(e) => onUpdate({ ...criterion, scoring_guide: e.target.value })}
              placeholder="e.g., 1-3: Poor, 4-6: Average, 7-10: Excellent..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Keywords (AI Detection)</Label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Add keyword..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddKeyword}>
                Add
              </Button>
            </div>
            {criterion.keywords && criterion.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {criterion.keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="cursor-pointer hover:bg-red-100 hover:text-red-700"
                    onClick={() => handleRemoveKeyword(keyword)}
                  >
                    {keyword} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScorecardBuilderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);

  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editingScorecard, setEditingScorecard] = useState<Scorecard | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<ScorecardCriterion[]>([]);
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [scorecardToDelete, setScorecardToDelete] = useState<Scorecard | null>(null);
  const [showPresetDialog, setShowPresetDialog] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch scorecards
  const fetchScorecards = useCallback(async () => {
    try {
      const res = await fetch("/api/scorecards?pageSize=100");
      if (res.ok) {
        const data = await res.json();
        setScorecards(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching scorecards:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScorecards();
  }, [fetchScorecards]);

  // Calculate total weight
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  const weightStatus = totalWeight === 100 ? "valid" : totalWeight > 100 ? "over" : "under";

  // Validate criteria
  const validateCriteria = (): boolean => {
    const errors: Record<string, string> = {};
    let hasError = false;

    if (!name.trim()) {
      setGlobalError("Scorecard name is required");
      hasError = true;
    }

    if (criteria.length === 0) {
      setGlobalError("At least one criterion is required");
      hasError = true;
    }

    criteria.forEach((c) => {
      if (!c.name.trim()) {
        errors[c.id] = "Criterion name is required";
        hasError = true;
      }
      if (c.weight <= 0) {
        errors[c.id] = "Weight must be greater than 0";
        hasError = true;
      }
    });

    if (totalWeight !== 100) {
      setGlobalError(`Total weight must equal 100% (currently ${totalWeight}%)`);
      hasError = true;
    }

    setValidationErrors(errors);
    return !hasError;
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCriteria((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order values
        return newItems.map((item, idx) => ({ ...item, order: idx + 1 }));
      });
    }
  };

  // Add new criterion
  const handleAddCriterion = () => {
    const newCriterion = createDefaultCriterion(criteria.length + 1);
    setCriteria([...criteria, newCriterion]);
    setExpandedCriteria(new Set([...expandedCriteria, newCriterion.id]));
  };

  // Update criterion
  const handleUpdateCriterion = (updated: ScorecardCriterion) => {
    setCriteria(criteria.map((c) => (c.id === updated.id ? updated : c)));
    if (validationErrors[updated.id]) {
      const newErrors = { ...validationErrors };
      delete newErrors[updated.id];
      setValidationErrors(newErrors);
    }
  };

  // Delete criterion
  const handleDeleteCriterion = (id: string) => {
    setCriteria(criteria.filter((c) => c.id !== id).map((c, idx) => ({ ...c, order: idx + 1 })));
    const newExpanded = new Set(expandedCriteria);
    newExpanded.delete(id);
    setExpandedCriteria(newExpanded);
  };

  // Load preset criteria
  const handleLoadPreset = () => {
    setCriteria(PRESET_CRITERIA.map((c) => ({ ...c, id: generateId() })));
    setExpandedCriteria(new Set());
    setShowPresetDialog(false);
    setGlobalError("");
  };

  // Start creating new scorecard
  const handleNewScorecard = () => {
    setEditingScorecard(null);
    setName("");
    setDescription("");
    setCriteria([]);
    setExpandedCriteria(new Set());
    setValidationErrors({});
    setGlobalError("");
    setIsEditing(true);
  };

  // Start editing scorecard
  const handleEditScorecard = (scorecard: Scorecard) => {
    setEditingScorecard(scorecard);
    setName(scorecard.name);
    setDescription(scorecard.description || "");
    setCriteria((scorecard.criteria as ScorecardCriterion[]) || []);
    setExpandedCriteria(new Set());
    setValidationErrors({});
    setGlobalError("");
    setIsEditing(true);
  };

  // Duplicate scorecard
  const handleDuplicateScorecard = async (scorecard: Scorecard) => {
    setEditingScorecard(null);
    setName(`${scorecard.name} (Copy)`);
    setDescription(scorecard.description || "");
    setCriteria(
      ((scorecard.criteria as ScorecardCriterion[]) || []).map((c) => ({
        ...c,
        id: generateId(),
      }))
    );
    setExpandedCriteria(new Set());
    setValidationErrors({});
    setGlobalError("");
    setIsEditing(true);
  };

  // Save scorecard
  const handleSave = async (status: "draft" | "active" = "draft") => {
    setGlobalError("");
    setSuccessMessage("");

    if (!validateCriteria()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        criteria,
        total_weight: totalWeight,
        status,
        is_default: status === "active",
      };

      let res;
      if (editingScorecard) {
        res = await fetch(`/api/scorecards/${editingScorecard.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/scorecards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save scorecard");
      }

      setSuccessMessage(
        status === "active"
          ? "Scorecard published and set as active!"
          : editingScorecard
            ? "Scorecard updated successfully!"
            : "Scorecard saved as draft!"
      );

      await fetchScorecards();

      // Close editor after short delay
      setTimeout(() => {
        setIsEditing(false);
        setSuccessMessage("");
      }, 1500);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save scorecard");
    } finally {
      setSaving(false);
    }
  };

  // Set scorecard as active
  const handleSetActive = async (scorecard: Scorecard) => {
    try {
      const res = await fetch(`/api/scorecards/${scorecard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active", is_default: true }),
      });

      if (!res.ok) {
        throw new Error("Failed to activate scorecard");
      }

      await fetchScorecards();
    } catch (err) {
      console.error("Error activating scorecard:", err);
    }
  };

  // Archive scorecard
  const handleArchive = async (scorecard: Scorecard) => {
    try {
      const res = await fetch(`/api/scorecards/${scorecard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });

      if (!res.ok) {
        throw new Error("Failed to archive scorecard");
      }

      await fetchScorecards();
    } catch (err) {
      console.error("Error archiving scorecard:", err);
    }
  };

  // Delete scorecard
  const handleDelete = async () => {
    if (!scorecardToDelete) return;

    try {
      const res = await fetch(`/api/scorecards/${scorecardToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete scorecard");
      }

      await fetchScorecards();
      setShowDeleteDialog(false);
      setScorecardToDelete(null);
    } catch (err) {
      console.error("Error deleting scorecard:", err);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setEditingScorecard(null);
    setValidationErrors({});
    setGlobalError("");
    setSuccessMessage("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Editor View
  if (isEditing) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button variant="ghost" onClick={handleCancel} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </Button>
            <Button
              variant="gradient"
              onClick={() => handleSave("active")}
              disabled={saving || weightStatus !== "valid"}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Publish & Activate
            </Button>
          </div>
        </div>

        {/* Messages */}
        {globalError && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{globalError}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Scorecard Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {editingScorecard ? "Edit Scorecard" : "New Scorecard"}
            </CardTitle>
            <CardDescription>
              Define how sales calls will be evaluated by the AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scorecard-name">Scorecard Name *</Label>
                <Input
                  id="scorecard-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (globalError) setGlobalError("");
                  }}
                  placeholder="e.g., Sales Discovery Call Scorecard"
                />
              </div>
              <div className="space-y-2">
                <Label>Weight Status</Label>
                <div className="flex items-center gap-3">
                  <Progress
                    value={Math.min(totalWeight, 100)}
                    className={cn(
                      "flex-1",
                      weightStatus === "valid" && "[&>div]:bg-green-500",
                      weightStatus === "over" && "[&>div]:bg-red-500",
                      weightStatus === "under" && "[&>div]:bg-amber-500"
                    )}
                  />
                  <Badge
                    className={cn(
                      "font-mono min-w-[60px] justify-center",
                      weightStatus === "valid" && "bg-green-100 text-green-700",
                      weightStatus === "over" && "bg-red-100 text-red-700",
                      weightStatus === "under" && "bg-amber-100 text-amber-700"
                    )}
                  >
                    {totalWeight}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {weightStatus === "valid" && "Weights are perfectly balanced!"}
                  {weightStatus === "over" && `Reduce weights by ${totalWeight - 100}%`}
                  {weightStatus === "under" && `Add ${100 - totalWeight}% more weight`}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scorecard-description">Description</Label>
              <Textarea
                id="scorecard-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when this scorecard should be used..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Criteria Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Grading Criteria
            </h3>
            <div className="flex items-center gap-2">
              {criteria.length === 0 && (
                <Button variant="outline" onClick={() => setShowPresetDialog(true)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Load Preset
                </Button>
              )}
              <Button onClick={handleAddCriterion} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Criterion
              </Button>
            </div>
          </div>

          {criteria.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Criteria Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add grading criteria to define how calls will be scored
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => setShowPresetDialog(true)} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Load Preset Template
                  </Button>
                  <Button onClick={handleAddCriterion} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Custom Criterion
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={criteria.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {criteria.map((criterion, index) => (
                    <SortableCriterion
                      key={criterion.id}
                      criterion={criterion}
                      index={index}
                      onUpdate={handleUpdateCriterion}
                      onDelete={() => handleDeleteCriterion(criterion.id)}
                      isExpanded={expandedCriteria.has(criterion.id)}
                      onToggleExpand={() => {
                        const newExpanded = new Set(expandedCriteria);
                        if (newExpanded.has(criterion.id)) {
                          newExpanded.delete(criterion.id);
                        } else {
                          newExpanded.add(criterion.id);
                        }
                        setExpandedCriteria(newExpanded);
                      }}
                      error={validationErrors[criterion.id]}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {criteria.length > 0 && (
            <Button variant="outline" onClick={handleAddCriterion} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Another Criterion
            </Button>
          )}
        </div>

        {/* Preset Dialog */}
        <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Load Preset Template</DialogTitle>
              <DialogDescription>
                Start with a proven sales call scorecard template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This will load 5 standard sales criteria:
              </p>
              <ul className="space-y-2 text-sm">
                {PRESET_CRITERIA.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span>{c.name}</span>
                    <Badge variant="secondary">{c.weight}%</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPresetDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleLoadPreset}>Load Preset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List View
  const activeScorecards = scorecards.filter((s) => s.status === "active");
  const draftScorecards = scorecards.filter((s) => s.status === "draft");
  const archivedScorecards = scorecards.filter((s) => s.status === "archived");

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Scorecard Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage custom grading criteria for call analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/scorecard">
            <Button variant="outline" className="gap-2">
              <Eye className="h-4 w-4" />
              View Active
            </Button>
          </Link>
          <Button variant="gradient" onClick={handleNewScorecard} className="gap-2">
            <Plus className="h-4 w-4" />
            New Scorecard
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {scorecards.length === 0 && (
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Scorecards Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first scorecard to define how calls are evaluated
            </p>
            <Button variant="gradient" onClick={handleNewScorecard} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Scorecard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scorecards List */}
      {scorecards.length > 0 && (
        <div className="space-y-8">
          {/* Active Scorecards */}
          {activeScorecards.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Active ({activeScorecards.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {activeScorecards.map((scorecard) => (
                  <ScorecardListCard
                    key={scorecard.id}
                    scorecard={scorecard}
                    onEdit={() => handleEditScorecard(scorecard)}
                    onDuplicate={() => handleDuplicateScorecard(scorecard)}
                    onArchive={() => handleArchive(scorecard)}
                    onDelete={() => {
                      setScorecardToDelete(scorecard);
                      setShowDeleteDialog(true);
                    }}
                    isActive
                  />
                ))}
              </div>
            </div>
          )}

          {/* Draft Scorecards */}
          {draftScorecards.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-500" />
                Drafts ({draftScorecards.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {draftScorecards.map((scorecard) => (
                  <ScorecardListCard
                    key={scorecard.id}
                    scorecard={scorecard}
                    onEdit={() => handleEditScorecard(scorecard)}
                    onDuplicate={() => handleDuplicateScorecard(scorecard)}
                    onSetActive={() => handleSetActive(scorecard)}
                    onDelete={() => {
                      setScorecardToDelete(scorecard);
                      setShowDeleteDialog(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Archived Scorecards */}
          {archivedScorecards.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                <Archive className="h-5 w-5" />
                Archived ({archivedScorecards.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {archivedScorecards.map((scorecard) => (
                  <ScorecardListCard
                    key={scorecard.id}
                    scorecard={scorecard}
                    onEdit={() => handleEditScorecard(scorecard)}
                    onDuplicate={() => handleDuplicateScorecard(scorecard)}
                    onSetActive={() => handleSetActive(scorecard)}
                    onDelete={() => {
                      setScorecardToDelete(scorecard);
                      setShowDeleteDialog(true);
                    }}
                    isArchived
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scorecard</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{scorecardToDelete?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Scorecard List Card Component
function ScorecardListCard({
  scorecard,
  onEdit,
  onDuplicate,
  onSetActive,
  onArchive,
  onDelete,
  isActive,
  isArchived,
}: {
  scorecard: Scorecard;
  onEdit: () => void;
  onDuplicate: () => void;
  onSetActive?: () => void;
  onArchive?: () => void;
  onDelete: () => void;
  isActive?: boolean;
  isArchived?: boolean;
}) {
  const criteria = (scorecard.criteria as ScorecardCriterion[]) || [];

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isActive && "border-primary/50 bg-primary/5",
        isArchived && "opacity-60"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{scorecard.name}</h3>
              {scorecard.is_default && (
                <Badge variant="gradient" className="gap-1 flex-shrink-0">
                  <Star className="h-3 w-3" />
                  Default
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={cn(
                  "flex-shrink-0",
                  scorecard.status === "active" && "bg-green-100 text-green-700",
                  scorecard.status === "draft" && "bg-blue-100 text-blue-700",
                  scorecard.status === "archived" && "bg-gray-100 text-gray-600"
                )}
              >
                {scorecard.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {scorecard.description || `${criteria.length} grading criteria`}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                {criteria.length} criteria
              </span>
              <span>v{scorecard.version}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              {onSetActive && !isActive && (
                <DropdownMenuItem onClick={onSetActive}>
                  <Rocket className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              )}
              {onArchive && !isArchived && (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

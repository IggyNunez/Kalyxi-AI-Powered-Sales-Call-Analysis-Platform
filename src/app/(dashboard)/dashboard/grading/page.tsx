"use client";

import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Star,
  Loader2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GradingCriterion {
  id: string;
  name: string;
  description: string;
  type: "score" | "text" | "checklist" | "boolean" | "percentage";
  weight: number;
  isRequired: boolean;
  order: number;
  options?: string[];
  minValue?: number;
  maxValue?: number;
}

interface GradingTemplate {
  id: string;
  name: string;
  description?: string;
  criteria_json: GradingCriterion[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export default function GradingPage() {
  const [templates, setTemplates] = useState<GradingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GradingTemplate | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    criteria: [] as GradingCriterion[],
  });

  const defaultCriteria: GradingCriterion[] = [
    {
      id: "opening",
      name: "Opening & Introduction",
      description: "How well did the caller introduce themselves and set the agenda?",
      type: "score",
      weight: 15,
      isRequired: true,
      order: 1,
      minValue: 1,
      maxValue: 10,
    },
    {
      id: "discovery",
      name: "Discovery Questions",
      description: "Quality and relevance of discovery questions asked",
      type: "score",
      weight: 20,
      isRequired: true,
      order: 2,
      minValue: 1,
      maxValue: 10,
    },
    {
      id: "value_prop",
      name: "Value Proposition",
      description: "How effectively was the value proposition communicated?",
      type: "score",
      weight: 20,
      isRequired: true,
      order: 3,
      minValue: 1,
      maxValue: 10,
    },
    {
      id: "objection_handling",
      name: "Objection Handling",
      description: "Quality of responses to customer objections",
      type: "score",
      weight: 20,
      isRequired: true,
      order: 4,
      minValue: 1,
      maxValue: 10,
    },
    {
      id: "closing",
      name: "Closing & Next Steps",
      description: "Effectiveness of closing and securing next steps",
      type: "score",
      weight: 15,
      isRequired: true,
      order: 5,
      minValue: 1,
      maxValue: 10,
    },
    {
      id: "professionalism",
      name: "Professionalism",
      description: "Overall professionalism and communication skills",
      type: "score",
      weight: 10,
      isRequired: true,
      order: 6,
      minValue: 1,
      maxValue: 10,
    },
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/grading-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    if (!formData.name.trim()) {
      setError("Template name is required");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/grading-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          criteria_json: formData.criteria.length > 0 ? formData.criteria : defaultCriteria,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create template");
      }

      await fetchTemplates();
      setShowCreateDialog(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      const res = await fetch(`/api/grading-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });

      if (res.ok) {
        await fetchTemplates();
      }
    } catch (err) {
      console.error("Error setting default template:", err);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/grading-templates/${selectedTemplate.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete template");
      }

      await fetchTemplates();
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    } catch (err) {
      console.error("Error deleting template:", err);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", criteria: [] });
    setError("");
  };

  const openDeleteDialog = (template: GradingTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      score: "Score (1-10)",
      text: "Text",
      checklist: "Checklist",
      boolean: "Yes/No",
      percentage: "Percentage",
    };
    return labels[type] || type;
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grading Templates</h1>
          <p className="text-gray-500">Configure how calls are evaluated by AI</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowCreateDialog(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardCheck className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium">No grading templates</h3>
            <p className="mt-1 text-gray-500">Create your first template to start grading calls</p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="cursor-pointer" onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.is_default && (
                          <Badge className="bg-indigo-100 text-indigo-700">
                            <Star className="mr-1 h-3 w-3" />
                            Default
                          </Badge>
                        )}
                        {!template.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <CardDescription>
                        {template.description || `${template.criteria_json?.length || 0} grading criteria`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedTemplate === template.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!template.is_default && (
                          <DropdownMenuItem onClick={() => handleSetDefault(template.id)}>
                            <Star className="mr-2 h-4 w-4" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(template)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              {expandedTemplate === template.id && (
                <CardContent className="border-t">
                  <div className="mt-4 space-y-3">
                    <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Grading Criteria</h4>
                    <div className="divide-y rounded-lg border">
                      {(template.criteria_json || []).map((criterion, index) => (
                        <div key={criterion.id || index} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-gray-300" />
                            <div>
                              <p className="font-medium">{criterion.name}</p>
                              <p className="text-sm text-gray-500">{criterion.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <Badge variant="outline">{getTypeLabel(criterion.type)}</Badge>
                            <span className="text-gray-500">Weight: {criterion.weight}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      Total Weight: {(template.criteria_json || []).reduce((sum, c) => sum + (c.weight || 0), 0)}%
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Grading Template</DialogTitle>
            <DialogDescription>
              Define criteria for AI to evaluate sales calls
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTemplate}>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Standard Sales Call Grading"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  placeholder="Describe what this template is used for..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="rounded-lg border bg-gray-50 p-4">
                <h4 className="font-medium">Default Criteria</h4>
                <p className="text-sm text-gray-500 mt-1">
                  This template will include 6 standard sales call criteria. You can customize them after creation.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  {defaultCriteria.map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      {c.name} ({c.weight}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedTemplate?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

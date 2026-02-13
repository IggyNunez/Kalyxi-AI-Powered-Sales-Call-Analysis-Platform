"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  Star,
  Settings2,
  Target,
  Award,
  Users,
  BarChart3,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { Template, TemplateStatus, TemplateUseCase } from "@/types/database";

const useCaseLabels: Record<TemplateUseCase, string> = {
  sales_call: "Sales Call",
  onboarding: "Onboarding",
  qa_review: "QA Review",
  training: "Training",
  custom: "Custom",
};

const useCaseIcons: Record<TemplateUseCase, React.ReactNode> = {
  sales_call: <Target className="h-4 w-4" />,
  onboarding: <Users className="h-4 w-4" />,
  qa_review: <ClipboardList className="h-4 w-4" />,
  training: <Award className="h-4 w-4" />,
  custom: <Settings2 className="h-4 w-4" />,
};

const statusColors: Record<TemplateStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  archived: "bg-amber-500/20 text-amber-600 border-amber-500/30",
};

type Tab = "all" | "active" | "draft" | "archived";

function TemplateCard({
  template,
  onDuplicate,
  onActivate,
  onArchive,
  onRestore,
  onDelete,
}: {
  template: Template;
  onDuplicate: (id: string) => void;
  onActivate: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { isAdmin } = useAuth();

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {useCaseIcons[template.use_case]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{template.name}</h3>
                {template.is_default && (
                  <Star className="h-3.5 w-3.5 flex-shrink-0 text-amber-500 fill-amber-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {useCaseLabels[template.use_case]}
              </p>
            </div>
          </div>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/templates/${template.id}/edit`}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/templates/${template.id}/results`}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Results
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {template.status === "draft" && (
                  <DropdownMenuItem onClick={() => onActivate(template.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate
                  </DropdownMenuItem>
                )}
                {template.status === "archived" && (
                  <DropdownMenuItem onClick={() => onRestore(template.id)}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                )}
                {template.status !== "archived" && (
                  <DropdownMenuItem onClick={() => onArchive(template.id)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(template.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {template.description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn(statusColors[template.status], "text-xs")}>
              {template.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {template.scoring_method.replace("_", " ")}
            </span>
          </div>
          <Link href={`/dashboard/templates/${template.id}/results`}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
              <BarChart3 className="h-3 w-3" />
              Results
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const { isAdmin } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("status", activeTab);

      const response = await fetch(`/api/templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTemplates();
  }, [activeTab]);

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}/duplicate`, { method: "POST" });
      if (response.ok) fetchTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (response.ok) fetchTemplates();
    } catch (error) {
      console.error("Error activating template:", error);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (response.ok) fetchTemplates();
    } catch (error) {
      console.error("Error archiving template:", error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (response.ok) fetchTemplates();
    } catch (error) {
      console.error("Error restoring template:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const response = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (response.ok) fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const tabs: { value: Tab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Drafts" },
    { value: "archived", label: "Archived" },
  ];

  if (loading && templates.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your scoring templates
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/templates/new">
            <Button variant="gradient" className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </Link>
        )}
      </div>

      {/* Tab filters */}
      <div className="flex items-center gap-1 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No templates found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {activeTab !== "all"
              ? `No ${activeTab} templates. Try a different filter.`
              : "Create your first scoring template to get started."}
          </p>
          {isAdmin && activeTab === "all" && (
            <Link href="/dashboard/templates/new">
              <Button variant="gradient" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDuplicate={handleDuplicate}
              onActivate={handleActivate}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

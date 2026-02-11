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
  Calendar,
  Filter,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Template, TemplateStatus, TemplateUseCase } from "@/types/database";

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

function TemplateCard({
  template,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  template: Template;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { isAdmin } = useAuth();

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {useCaseIcons[template.use_case]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{template.name}</h3>
                  {template.is_default && (
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {useCaseLabels[template.use_case]}
                </p>
              </div>
            </div>

            {template.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {template.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn(statusColors[template.status])}>
                {template.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                v{template.version}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {template.scoring_method.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
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
                <DropdownMenuItem onClick={() => onDuplicate(template.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {template.pass_threshold}% pass
            </span>
          </div>
          <Link href={`/dashboard/templates/${template.id}/edit`}>
            <Button variant="outline" size="sm">
              Open
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [useCaseFilter, setUseCaseFilter] = useState<string>("all");

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (useCaseFilter !== "all") params.set("use_case", useCaseFilter);
      if (search) params.set("search", search);

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
    fetchTemplates();
  }, [statusFilter, useCaseFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTemplates();
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}/duplicate`, {
        method: "POST",
      });
      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error duplicating template:", error);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error archiving template:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            Scoring Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage customizable scoring templates for your team
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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </form>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={useCaseFilter} onValueChange={setUseCaseFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Use Case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Use Cases</SelectItem>
                  <SelectItem value="sales_call">Sales Call</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="qa_review">QA Review</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
            <p className="text-muted-foreground mb-6">
              {search || statusFilter !== "all" || useCaseFilter !== "all"
                ? "No templates match your filters. Try adjusting your search."
                : "Create your first scoring template to get started."}
            </p>
            {isAdmin && (
              <Link href="/dashboard/templates/new">
                <Button variant="gradient" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

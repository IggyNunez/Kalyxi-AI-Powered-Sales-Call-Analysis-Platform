"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Shield,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit,
  Tag,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuth } from "@/components/providers/auth-provider";

interface KBDocument {
  id: string;
  title: string;
  content: string;
  doc_type: string;
  category: string | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const docTypeLabels: Record<string, string> = {
  guideline: "Guideline",
  playbook: "Playbook",
  product_info: "Product Info",
  policy: "Policy",
  faq: "FAQ",
  objection_handling: "Objection Handling",
  other: "Other",
};

const docTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  guideline: Shield,
  playbook: BookOpen,
  product_info: Lightbulb,
  policy: FileText,
  faq: HelpCircle,
  objection_handling: MessageSquare,
  other: FileText,
};

export function KnowledgeBaseTab() {
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editDoc, setEditDoc] = useState<KBDocument | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState("guideline");
  const [formCategory, setFormCategory] = useState("");
  const [formTags, setFormTags] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: "100" });
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("doc_type", typeFilter);

      const res = await fetch(`/api/knowledge-base?${params}`);
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchDocuments, 300);
    return () => clearTimeout(timer);
  }, [search, typeFilter]);

  const openCreate = () => {
    setFormTitle("");
    setFormContent("");
    setFormType("guideline");
    setFormCategory("");
    setFormTags("");
    setEditDoc(null);
    setShowCreate(true);
  };

  const openEdit = (doc: KBDocument) => {
    setFormTitle(doc.title);
    setFormContent(doc.content);
    setFormType(doc.doc_type);
    setFormCategory(doc.category || "");
    setFormTags(doc.tags.join(", "));
    setEditDoc(doc);
    setShowCreate(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title: formTitle,
        content: formContent,
        doc_type: formType,
        category: formCategory || undefined,
        tags: formTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const url = editDoc
        ? `/api/knowledge-base/${editDoc.id}`
        : "/api/knowledge-base";
      const method = editDoc ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCreate(false);
        fetchDocuments();
      }
    } catch (error) {
      console.error("Failed to save document:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      const res = await fetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
      if (res.ok) fetchDocuments();
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Company documents that the AI uses during call analysis
        </p>
        {isAdmin && (
          <Button onClick={openCreate} variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Document
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(docTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && documents.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : documents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((doc) => {
            const Icon = docTypeIcons[doc.doc_type] || FileText;
            return (
              <Card key={doc.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                    </div>
                    {isAdmin && (
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
                          <DropdownMenuItem onClick={() => openEdit(doc)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(doc.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
                    {doc.content}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">
                      {docTypeLabels[doc.doc_type] || doc.doc_type}
                    </Badge>
                    {doc.category && (
                      <Badge variant="outline">{doc.category}</Badge>
                    )}
                    {doc.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-medium">No documents found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? "Try adjusting your search"
                : "Add company guidelines, playbooks, and policies to help the AI analyze calls more effectively"}
            </p>
            {isAdmin && !search && (
              <Button onClick={openCreate} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Document
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editDoc ? "Edit Document" : "Add Document"}
            </DialogTitle>
            <DialogDescription>
              Documents are used by the AI as context when analyzing sales calls.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Sales Objection Handling Guide"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(docTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Category (optional)</label>
                <Input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g., Pricing, Competitor"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Enter the document content..."
                rows={10}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="e.g., pricing, objections, closing"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formTitle || !formContent}
            >
              {saving ? "Saving..." : editDoc ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

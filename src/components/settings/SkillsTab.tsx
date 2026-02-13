"use client";

import { useEffect, useState } from "react";
import {
  Target,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Filter,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/auth-provider";

interface Skill {
  id: string;
  name: string;
  description: string | null;
  category: string;
  parent_skill_id: string | null;
  is_active: boolean;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  communication: "Communication",
  sales_technique: "Sales Technique",
  product_knowledge: "Product Knowledge",
  objection_handling: "Objection Handling",
  closing: "Closing",
  discovery: "Discovery",
  rapport: "Rapport Building",
  presentation: "Presentation",
  general: "General",
};

const categoryColors: Record<string, string> = {
  communication: "bg-blue-500/20 text-blue-300",
  sales_technique: "bg-purple-500/20 text-purple-300",
  product_knowledge: "bg-green-500/20 text-green-300",
  objection_handling: "bg-orange-500/20 text-orange-300",
  closing: "bg-red-500/20 text-red-300",
  discovery: "bg-cyan-500/20 text-cyan-300",
  rapport: "bg-pink-500/20 text-pink-300",
  presentation: "bg-yellow-500/20 text-yellow-300",
  general: "bg-gray-500/20 text-gray-300",
};

export function SkillsTab() {
  const { isAdmin } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: "200" });
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const res = await fetch(`/api/skills?${params}`);
      if (res.ok) {
        const json = await res.json();
        setSkills(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch skills:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchSkills, 300);
    return () => clearTimeout(timer);
  }, [search, categoryFilter]);

  const openCreate = () => {
    setFormName("");
    setFormDescription("");
    setFormCategory("general");
    setEditSkill(null);
    setShowCreate(true);
  };

  const openEdit = (skill: Skill) => {
    setFormName(skill.name);
    setFormDescription(skill.description || "");
    setFormCategory(skill.category);
    setEditSkill(skill);
    setShowCreate(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: formName,
        description: formDescription || undefined,
        category: formCategory,
      };

      const url = editSkill ? `/api/skills/${editSkill.id}` : "/api/skills";
      const method = editSkill ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCreate(false);
        fetchSkills();
      }
    } catch (error) {
      console.error("Failed to save skill:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this skill?")) return;
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      if (res.ok) fetchSkills();
    } catch (error) {
      console.error("Failed to delete skill:", error);
    }
  };

  // Group skills by category
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const cat = skill.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define the skills tracked across your sales team
        </p>
        {isAdmin && (
          <Button onClick={openCreate} variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Skill
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && skills.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : Object.keys(grouped).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, categorySkills]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="h-4 w-4" />
                    {categoryLabels[category] || category}
                    <Badge variant="secondary" className="ml-2">
                      {categorySkills.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categorySkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="group flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Target className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{skill.name}</p>
                            {skill.description && (
                              <p className="text-sm text-muted-foreground">
                                {skill.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={categoryColors[category] || ""}>
                            {categoryLabels[category] || category}
                          </Badge>
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
                                <DropdownMenuItem onClick={() => openEdit(skill)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(skill.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 font-medium">No skills defined</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? "Try adjusting your search"
                : "Define the skills you want to track across your sales team"}
            </p>
            {isAdmin && !search && (
              <Button onClick={openCreate} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Skill
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editSkill ? "Edit Skill" : "Add Skill"}
            </DialogTitle>
            <DialogDescription>
              Skills are tracked per salesperson over time during AI analysis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Active Listening"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe what this skill measures..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName}>
              {saving ? "Saving..." : editSkill ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

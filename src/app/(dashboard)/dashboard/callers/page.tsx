"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Phone,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit,
  Trash2,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Caller {
  id: string;
  name: string;
  email?: string;
  team?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  total_calls?: number;
  avg_score?: number;
  score_trend?: number;
}

export default function CallersPage() {
  const [callers, setCallers] = useState<Caller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCaller, setSelectedCaller] = useState<Caller | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    team: "",
    department: "",
  });

  useEffect(() => {
    fetchCallers();
  }, []);

  const fetchCallers = async () => {
    try {
      const res = await fetch("/api/callers?include_stats=true");
      if (res.ok) {
        const data = await res.json();
        setCallers(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching callers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCaller = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    if (!formData.name.trim()) {
      setError("Name is required");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/callers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add caller");
      }

      await fetchCallers();
      setShowAddDialog(false);
      setFormData({ name: "", email: "", team: "", department: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add caller");
    } finally {
      setSaving(false);
    }
  };

  const handleEditCaller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaller) return;
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/callers/${selectedCaller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update caller");
      }

      await fetchCallers();
      setShowEditDialog(false);
      setSelectedCaller(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update caller");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCaller = async () => {
    if (!selectedCaller) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/callers/${selectedCaller.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete caller");
      }

      await fetchCallers();
      setShowDeleteDialog(false);
      setSelectedCaller(null);
    } catch (err) {
      console.error("Error deleting caller:", err);
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (caller: Caller) => {
    setSelectedCaller(caller);
    setFormData({
      name: caller.name,
      email: caller.email || "",
      team: caller.team || "",
      department: caller.department || "",
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (caller: Caller) => {
    setSelectedCaller(caller);
    setShowDeleteDialog(true);
  };

  const filteredCallers = callers.filter(
    (caller) =>
      caller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caller.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caller.team?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTrendIcon = (trend?: number) => {
    if (!trend || trend === 0) return <Minus className="h-4 w-4 text-gray-400" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text-gray-400";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Callers</h1>
          <p className="text-gray-500">Manage your sales team members</p>
        </div>
        <Button onClick={() => {
          setFormData({ name: "", email: "", team: "", department: "" });
          setError("");
          setShowAddDialog(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Caller
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Callers</CardTitle>
              <CardDescription>
                {callers.length} caller{callers.length !== 1 ? "s" : ""} in your organization
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search callers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredCallers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium">No callers found</h3>
              <p className="mt-1 text-gray-500">
                {searchQuery ? "Try a different search term" : "Add your first caller to get started"}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add First Caller
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Team</th>
                    <th className="pb-3 font-medium">Calls</th>
                    <th className="pb-3 font-medium">Avg Score</th>
                    <th className="pb-3 font-medium">Trend</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCallers.map((caller) => (
                    <tr key={caller.id} className="hover:bg-gray-50">
                      <td className="py-4">
                        <div>
                          <p className="font-medium">{caller.name}</p>
                          {caller.email && (
                            <p className="text-sm text-gray-500">{caller.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-gray-600">
                          {caller.team || "-"}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{caller.total_calls || 0}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`font-medium ${getScoreColor(caller.avg_score)}`}>
                          {caller.avg_score ? `${caller.avg_score.toFixed(1)}%` : "N/A"}
                        </span>
                      </td>
                      <td className="py-4">
                        {getTrendIcon(caller.score_trend)}
                      </td>
                      <td className="py-4">
                        <Badge variant={caller.is_active ? "default" : "secondary"}>
                          {caller.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(caller)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(caller)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Caller Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Caller</DialogTitle>
            <DialogDescription>
              Add a new sales team member to track their calls
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCaller}>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Name *</Label>
                <Input
                  id="add-name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-team">Team</Label>
                  <Input
                    id="add-team"
                    placeholder="Sales Team A"
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-department">Department</Label>
                  <Input
                    id="add-department"
                    placeholder="Sales"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Caller
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Caller Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Caller</DialogTitle>
            <DialogDescription>
              Update caller information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCaller}>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-team">Team</Label>
                  <Input
                    id="edit-team"
                    placeholder="Sales Team A"
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Input
                    id="edit-department"
                    placeholder="Sales"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Caller</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCaller?.name}? This will deactivate the caller but preserve their call history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCaller} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

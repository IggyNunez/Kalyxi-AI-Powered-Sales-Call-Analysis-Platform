"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Phone,
  Trash2,
  Edit2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import type { Caller, PaginatedResponse } from "@/types";

export default function TeamPage() {
  const { isAdmin } = useAuth();
  const [callers, setCallers] = useState<Caller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCaller, setEditingCaller] = useState<Caller | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    team: "",
    department: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchCallers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (!showInactive) params.set("active", "true");

      const response = await fetch(`/api/callers?${params}`);
      if (response.ok) {
        const data: PaginatedResponse<Caller> = await response.json();
        setCallers(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch callers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallers();
  }, [showInactive]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCallers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingCaller ? `/api/callers/${editingCaller.id}` : "/api/callers";
      const method = editingCaller ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setDialogOpen(false);
        setEditingCaller(null);
        setFormData({ name: "", email: "", team: "", department: "" });
        fetchCallers();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save caller");
      }
    } catch (error) {
      console.error("Failed to save caller:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (caller: Caller) => {
    setEditingCaller(caller);
    setFormData({
      name: caller.name,
      email: caller.email || "",
      team: caller.team || "",
      department: caller.department || "",
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (caller: Caller) => {
    try {
      const response = await fetch(`/api/callers/${caller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !caller.is_active }),
      });

      if (response.ok) {
        fetchCallers();
      }
    } catch (error) {
      console.error("Failed to toggle caller status:", error);
    }
  };

  const handleDelete = async (caller: Caller) => {
    if (!confirm(`Are you sure you want to deactivate ${caller.name}?`)) return;

    try {
      const response = await fetch(`/api/callers/${caller.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCallers();
      }
    } catch (error) {
      console.error("Failed to delete caller:", error);
    }
  };

  const openNewDialog = () => {
    setEditingCaller(null);
    setFormData({ name: "", email: "", team: "", department: "" });
    setDialogOpen(true);
  };

  if (loading && callers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-gray-500">Manage your callers and team members</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchCallers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Caller
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCaller ? "Edit Caller" : "Add New Caller"}</DialogTitle>
                  <DialogDescription>
                    {editingCaller
                      ? "Update the caller's information"
                      : "Add a new caller to track their call performance"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        required
                        minLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@company.com"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="team">Team</Label>
                        <Input
                          id="team"
                          value={formData.team}
                          onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                          placeholder="Sales Team A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="Sales"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : editingCaller ? "Update" : "Add Caller"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search callers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showInactive ? "default" : "outline"}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? "Hide" : "Show"} Inactive
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Callers
            <Badge variant="secondary" className="ml-2">
              {callers.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {callers.length > 0 ? (
            <div className="space-y-4">
              {callers.map((caller) => (
                <div
                  key={caller.id}
                  className={`flex items-center justify-between rounded-lg border p-4 ${
                    !caller.is_active ? "opacity-60 bg-gray-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={caller.user?.avatar_url} />
                      <AvatarFallback>
                        {caller.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{caller.name}</p>
                        {!caller.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {caller.email || "No email"}
                        {caller.team && <span className="text-gray-400"> • {caller.team}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {caller.department && (
                      <Badge variant="outline">{caller.department}</Badge>
                    )}
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(caller)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(caller)}>
                            {caller.is_active ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(caller)}
                            className="text-red-600"
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
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Phone className="h-12 w-12 text-gray-300" />
              <h3 className="mt-4 font-medium">No callers found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? "Try adjusting your search"
                  : isAdmin
                  ? "Add your first caller to track their performance"
                  : "No callers have been added yet"}
              </p>
              {isAdmin && !search && (
                <Button className="mt-4" onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Caller
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

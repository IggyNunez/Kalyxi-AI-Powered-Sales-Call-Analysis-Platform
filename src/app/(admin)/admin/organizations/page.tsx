"use client";

import { useEffect, useState } from "react";
import {
  Building,
  Plus,
  Search,
  Users,
  Phone,
  Calendar,
  MoreVertical,
  Shield,
  Trash2,
  Edit,
  Eye,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  _count?: {
    users: number;
    calls: number;
  };
}

export default function OrganizationsPage() {
  const { isSuperadmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editPlan, setEditPlan] = useState("");
  const [editName, setEditName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Redirect non-superadmins
    if (!authLoading && !isSuperadmin) {
      router.push("/dashboard");
      return;
    }

    async function fetchOrganizations() {
      try {
        const res = await fetch("/api/admin/organizations");
        if (res.ok) {
          const data = await res.json();
          setOrganizations(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isSuperadmin) {
      fetchOrganizations();
    }
  }, [isSuperadmin, authLoading, router]);

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return "gradient";
      case "professional":
        return "default";
      default:
        return "secondary";
    }
  };

  const handleViewDetails = (org: Organization) => {
    setSelectedOrg(org);
    setShowDetailsDialog(true);
  };

  const handleEdit = (org: Organization) => {
    setSelectedOrg(org);
    setEditName(org.name);
    setEditPlan(org.plan);
    setShowEditDialog(true);
  };

  const handleDelete = (org: Organization) => {
    setSelectedOrg(org);
    setShowDeleteDialog(true);
  };

  const confirmEdit = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, plan: editPlan }),
      });
      if (res.ok) {
        setOrganizations((orgs) =>
          orgs.map((o) =>
            o.id === selectedOrg.id ? { ...o, name: editName, plan: editPlan } : o
          )
        );
        setShowEditDialog(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update organization");
      }
    } catch (error) {
      alert("Failed to update organization");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setOrganizations((orgs) => orgs.filter((o) => o.id !== selectedOrg.id));
        setShowDeleteDialog(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete organization");
      }
    } catch (error) {
      alert("Failed to delete organization");
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || (!isSuperadmin && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building className="h-8 w-8 text-amber-500" />
            Organizations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all organizations on the platform
          </p>
        </div>
        <Button variant="gradient" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Organization
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{organizations.length}</p>
                <p className="text-sm text-muted-foreground">Total Organizations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {organizations.reduce((sum, org) => sum + (org._count?.users || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Phone className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {organizations.reduce((sum, org) => sum + (org._count?.calls || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Organizations List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrgs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Organizations Found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "No organizations match your search"
                : "Create your first organization to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrgs.map((org) => (
            <Card key={org.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{org.name}</h3>
                      <p className="text-sm text-muted-foreground">@{org.slug}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(org)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(org)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleDelete(org)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant={getPlanBadgeVariant(org.plan)} className="capitalize">
                    {org.plan}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{org._count?.users || 0} users</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{org._count?.calls || 0} calls</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created {new Date(org.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold">
                {selectedOrg?.name.charAt(0).toUpperCase()}
              </div>
              {selectedOrg?.name}
            </DialogTitle>
            <DialogDescription>Organization details</DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Slug</Label>
                  <p className="font-medium">@{selectedOrg.slug}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plan</Label>
                  <Badge variant={getPlanBadgeVariant(selectedOrg.plan)} className="capitalize mt-1">
                    {selectedOrg.plan}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Users</Label>
                  <p className="font-medium">{selectedOrg._count?.users || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Calls</Label>
                  <p className="font-medium">{selectedOrg._count?.calls || 0}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">
                    {new Date(selectedOrg.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Organization ID</Label>
                  <p className="font-mono text-xs bg-muted p-2 rounded mt-1">{selectedOrg.id}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Organization Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Organization name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan">Plan</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEdit} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedOrg?.name}</strong>? This action
              cannot be undone. All users, calls, and data associated with this organization
              will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

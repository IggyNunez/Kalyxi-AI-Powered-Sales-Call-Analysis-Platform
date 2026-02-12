"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  RefreshCw,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/use-user";
import { TeamAnalyticsTable } from "@/components/team/TeamAnalyticsTable";
import { UserDetailModal } from "@/components/team/UserDetailModal";
import type {
  TeamAnalyticsResponse,
  UserAnalytics,
  TeamAnalyticsFilters,
  SimplifiedRole,
} from "@/types/analytics";

export default function TeamAnalyticsPage() {
  const router = useRouter();
  const { user, role, isLoading: userLoading } = useUser();

  const [data, setData] = useState<TeamAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<TeamAnalyticsFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    role: "all",
    sortBy: "name",
    sortOrder: "asc",
    includeSuspended: false,
  });

  // Modal state
  const [selectedUser, setSelectedUser] = useState<UserAnalytics | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check authorization
  useEffect(() => {
    if (!userLoading && (!user || !["admin", "superadmin"].includes(role || ""))) {
      router.push("/dashboard");
    }
  }, [user, role, userLoading, router]);

  // Fetch data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(filters.page));
      params.set("pageSize", String(filters.pageSize));
      if (filters.search) params.set("search", filters.search);
      if (filters.role !== "all") params.set("role", filters.role as string);
      if (filters.sortBy) params.set("sortBy", filters.sortBy as string);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
      if (filters.includeSuspended) params.set("includeSuspended", "true");

      const response = await fetch(`/api/analytics/team?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch team analytics");
      }

      const result: TeamAnalyticsResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (user && ["admin", "superadmin"].includes(role || "")) {
      fetchData();
    }
  }, [user, role, fetchData]);

  // Handle filter changes
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleRoleFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      role: value as SimplifiedRole | "all",
      page: 1,
    }));
  };

  const handleSort = (field: keyof UserAnalytics) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Handle user selection
  const handleUserClick = (user: UserAnalytics) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  // Export to CSV
  const handleExport = () => {
    if (!data?.users) return;

    const headers = [
      "Name",
      "Email",
      "Role",
      "Sessions",
      "Avg Score",
      "Pass Rate",
      "Calls",
      "Status",
    ];

    const rows = data.users.map((u) => [
      u.name,
      u.email,
      u.role,
      u.totalSessions,
      u.averageScore?.toFixed(1) || "N/A",
      u.passRate?.toFixed(1) + "%" || "N/A",
      u.totalCalls,
      u.suspended ? "Suspended" : "Active",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  if (!user || !["admin", "superadmin"].includes(role || "")) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Analytics</h1>
          <p className="text-gray-400">
            View performance metrics and manage your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(false)}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Users"
            value={data.summary.totalUsers}
            icon={Users}
            description={`${data.summary.activeUsers} active`}
          />
          <SummaryCard
            title="Active Users"
            value={data.summary.activeUsers}
            icon={UserCheck}
            description={`${data.summary.suspendedUsers} suspended`}
            variant="success"
          />
          <SummaryCard
            title="Avg Team Score"
            value={data.summary.avgTeamScore?.toFixed(1) || "N/A"}
            icon={TrendingUp}
            description="Overall performance"
            variant={
              data.summary.avgTeamScore && data.summary.avgTeamScore >= 70
                ? "success"
                : "warning"
            }
          />
          <SummaryCard
            title="Pass Rate"
            value={
              data.summary.avgPassRate
                ? `${data.summary.avgPassRate.toFixed(0)}%`
                : "N/A"
            }
            icon={UserCheck}
            description={`${data.summary.completedSessions} completed sessions`}
            variant={
              data.summary.avgPassRate && data.summary.avgPassRate >= 70
                ? "success"
                : "warning"
            }
          />
        </div>
      )}

      {/* Filters */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filters.role as string} onValueChange={handleRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-800 bg-red-900/20">
          <CardContent className="pt-6">
            <p className="text-red-400">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fetchData()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {loading ? (
        <TableSkeleton />
      ) : data?.users ? (
        <TeamAnalyticsTable
          users={data.users}
          sortBy={filters.sortBy as keyof UserAnalytics}
          sortOrder={filters.sortOrder || "asc"}
          onSort={handleSort}
          onUserClick={handleUserClick}
          pagination={data.pagination}
          onPageChange={handlePageChange}
        />
      ) : null}

      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantColors = {
    default: "text-gray-400",
    success: "text-green-400",
    warning: "text-amber-400",
    danger: "text-red-400",
  };

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${variantColors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantColors[variant]}`}>
          {value}
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </CardContent>
    </Card>
  );
}

// Loading Skeletons
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-16" />
      <Skeleton className="h-96" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

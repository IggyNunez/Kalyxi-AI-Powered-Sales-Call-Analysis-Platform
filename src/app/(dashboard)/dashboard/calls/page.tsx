"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  Phone,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  User,
  Building,
  TrendingUp,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CallCard } from "@/components/calls/call-card";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { cn, formatDuration, formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Call, PaginatedResponse } from "@/types";

const statusFilters = [
  { value: "all", label: "All Calls" },
  { value: "analyzed", label: "Analyzed" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
];

type SortField = "date" | "score" | "duration" | "customer";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "table";

export default function CallsPage() {
  const { isAdmin } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchCalls = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (search) {
        params.set("search", search);
      }
      if (filter !== "all") {
        params.set("status", filter);
      }

      const response = await fetch(`/api/calls?${params}`);
      if (response.ok) {
        const data: PaginatedResponse<Call> = await response.json();
        setCalls(data.data || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch calls:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls(1);
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCalls(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRefresh = () => {
    fetchCalls(pagination.page);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4 text-primary" />
    ) : (
      <ArrowDown className="h-4 w-4 text-primary" />
    );
  };

  const sortedCalls = [...calls].sort((a, b) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    switch (sortField) {
      case "date":
        return multiplier * (new Date(a.call_timestamp || a.created_at).getTime() - new Date(b.call_timestamp || b.created_at).getTime());
      case "score":
        const scoreA = a.analyses?.[0]?.overall_score ?? -1;
        const scoreB = b.analyses?.[0]?.overall_score ?? -1;
        return multiplier * (scoreA - scoreB);
      case "duration":
        return multiplier * ((a.duration || 0) - (b.duration || 0));
      case "customer":
        const nameA = a.customer_name || a.customer_company || "";
        const nameB = b.customer_name || b.customer_company || "";
        return multiplier * nameA.localeCompare(nameB);
      default:
        return 0;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "analyzed": return "success";
      case "processing": return "warning";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  if (loading && calls.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Calls</h1>
          <p className="text-muted-foreground mt-1">
            {pagination.total} call{pagination.total !== 1 ? "s" : ""} in your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-xl"
            aria-label="Refresh calls"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {isAdmin && (
            <Link href="/dashboard/submit">
              <Button variant="gradient" className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Add Call</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search, Filters, and View Toggle */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by customer, company, or caller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-background"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewMode === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-10">
                  <ArrowUpDown className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleSort("date")} className="gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>Date</span>
                  {sortField === "date" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-auto flex-shrink-0" /> : <ArrowDown className="h-3 w-3 ml-auto flex-shrink-0" />)}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("score")} className="gap-2">
                  <TrendingUp className="h-4 w-4 flex-shrink-0" />
                  <span>Score</span>
                  {sortField === "score" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-auto flex-shrink-0" /> : <ArrowDown className="h-3 w-3 ml-auto flex-shrink-0" />)}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("duration")} className="gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>Duration</span>
                  {sortField === "duration" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-auto flex-shrink-0" /> : <ArrowDown className="h-3 w-3 ml-auto flex-shrink-0" />)}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("customer")} className="gap-2">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span>Customer</span>
                  {sortField === "customer" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-auto flex-shrink-0" /> : <ArrowDown className="h-3 w-3 ml-auto flex-shrink-0" />)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hidden">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {statusFilters.map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() => setFilter(status.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filter === status.value
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {status.value !== "all" && (
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    status.value === "analyzed" && "bg-emerald-500",
                    status.value === "pending" && "bg-gray-400",
                    status.value === "processing" && "bg-amber-500 animate-pulse",
                    status.value === "failed" && "bg-red-500"
                  )}
                />
              )}
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calls Display */}
      {sortedCalls.length > 0 ? (
        <>
          {viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedCalls.map((call, index) => (
                <div key={call.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                  <CallCard call={call} />
                </div>
              ))}
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        <button type="button" onClick={() => handleSort("customer")} className="flex items-center gap-2 hover:text-foreground transition-colors">
                          Call Details {getSortIcon("customer")}
                        </button>
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Caller</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        <button type="button" onClick={() => handleSort("date")} className="flex items-center gap-2 hover:text-foreground transition-colors">
                          Date {getSortIcon("date")}
                        </button>
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">
                        <button type="button" onClick={() => handleSort("duration")} className="flex items-center gap-2 hover:text-foreground transition-colors">
                          Duration {getSortIcon("duration")}
                        </button>
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        <button type="button" onClick={() => handleSort("score")} className="flex items-center gap-2 hover:text-foreground transition-colors">
                          Score {getSortIcon("score")}
                        </button>
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCalls.map((call, index) => {
                      const analysis = call.analyses?.[0];
                      const title = call.title || call.customer_name || call.customer_company || "Untitled Call";
                      const callDate = call.call_timestamp ? new Date(call.call_timestamp) : new Date(call.created_at);
                      return (
                        <tr key={call.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                          <td className="p-4">
                            <Link href={`/dashboard/calls/${call.id}`} className="block">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-indigo-500/10 flex items-center justify-center">
                                  <Phone className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate max-w-[200px] hover:text-primary transition-colors">{title}</p>
                                  {call.customer_company && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Building className="h-3 w-3" />
                                      {call.customer_company}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            {call.caller?.name ? (
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-xs font-medium text-white">
                                  {call.caller.name.charAt(0)}
                                </div>
                                <span className="text-sm">{call.caller.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(callDate)}</span>
                            </div>
                          </td>
                          <td className="p-4 hidden lg:table-cell">
                            {call.duration ? (
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{formatDuration(call.duration)}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            {analysis?.overall_score !== undefined ? (
                              <div
                                className={cn(
                                  "h-8 w-12 rounded-lg flex items-center justify-center font-semibold text-sm",
                                  analysis.overall_score >= 80 && "bg-emerald-500/10 text-emerald-600",
                                  analysis.overall_score >= 60 && analysis.overall_score < 80 && "bg-blue-500/10 text-blue-600",
                                  analysis.overall_score >= 40 && analysis.overall_score < 60 && "bg-amber-500/10 text-amber-600",
                                  analysis.overall_score < 40 && "bg-red-500/10 text-red-600"
                                )}
                              >
                                {analysis.overall_score}%
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge variant={getStatusColor(call.status) as "success" | "warning" | "destructive" | "secondary"} dot pulse={call.status === "processing"}>
                              {call.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/calls/${call.id}`} className="gap-2">
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <Download className="h-4 w-4" />
                                  Download Report
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} calls
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchCalls(pagination.page - 1)} disabled={pagination.page === 1 || loading} className="gap-1">
                  <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) pageNum = i + 1;
                    else if (pagination.page <= 3) pageNum = i + 1;
                    else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                    else pageNum = pagination.page - 2 + i;
                    return (
                      <Button key={pageNum} variant={pagination.page === pageNum ? "default" : "ghost"} size="sm" onClick={() => fetchCalls(pageNum)} disabled={loading} className={cn("w-9 h-9", pagination.page === pageNum && "shadow-md")}>
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <span className="sm:hidden text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchCalls(pagination.page + 1)} disabled={pagination.page === pagination.totalPages || loading} className="gap-1">
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="rounded-full bg-gradient-to-br from-primary/20 to-indigo-500/20 p-8">
              <Phone className="h-12 w-12 text-primary" />
            </div>
            {isAdmin && !search && filter === "all" && (
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Plus className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <h3 className="font-semibold text-xl">No calls found</h3>
          <p className="mt-2 text-muted-foreground max-w-md">
            {search || filter !== "all"
              ? "Try adjusting your search or filters to find what you're looking for"
              : isAdmin
                ? "Upload your first sales call to start getting AI-powered insights and coaching"
                : "No calls have been assigned to you yet. Check back soon!"}
          </p>
          {search || filter !== "all" ? (
            <Button variant="outline" className="mt-6 gap-2" onClick={() => { setSearch(""); setFilter("all"); }}>
              <X className="h-4 w-4 flex-shrink-0" />
              <span>Clear Filters</span>
            </Button>
          ) : (
            isAdmin && (
              <Link href="/dashboard/submit" className="mt-6">
                <Button variant="gradient" className="gap-2 shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span>Add Your First Call</span>
                </Button>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, Phone, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CallCard } from "@/components/calls/call-card";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { Call, PaginatedResponse } from "@/types";

const statusFilters = [
  { value: "all", label: "All", variant: "secondary" as const },
  { value: "analyzed", label: "Analyzed", variant: "success" as const },
  { value: "pending", label: "Pending", variant: "secondary" as const },
  { value: "processing", label: "Processing", variant: "warning" as const },
  { value: "failed", label: "Failed", variant: "destructive" as const },
];

export default function CallsPage() {
  const { isAdmin } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCalls(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRefresh = () => {
    fetchCalls(pagination.page);
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Calls</h1>
          <p className="text-muted-foreground mt-1">
            {pagination.total} total call{pagination.total !== 1 ? "s" : ""} in your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-xl"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {isAdmin && (
            <Link href="/dashboard/submit">
              <Button variant="gradient" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Call
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            type="search"
            placeholder="Search by customer name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="h-11"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {statusFilters.map((status) => (
            <Button
              key={status.value}
              variant={filter === status.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status.value)}
              className={cn(
                "rounded-full whitespace-nowrap transition-all",
                filter === status.value && "shadow-md"
              )}
            >
              {status.value !== "all" && (
                <span
                  className={cn(
                    "h-2 w-2 rounded-full mr-2",
                    status.value === "analyzed" && "bg-emerald-500",
                    status.value === "pending" && "bg-gray-400",
                    status.value === "processing" && "bg-amber-500 animate-pulse",
                    status.value === "failed" && "bg-red-500"
                  )}
                />
              )}
              {status.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Calls Grid */}
      {calls.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {calls.map((call, index) => (
              <div
                key={call.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CallCard call={call} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCalls(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? "default" : "ghost"}
                      size="sm"
                      onClick={() => fetchCalls(pageNum)}
                      disabled={loading}
                      className={cn(
                        "w-9 h-9",
                        pagination.page === pageNum && "shadow-md"
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCalls(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages || loading}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="rounded-full bg-muted/50 p-6 mb-4">
            <Phone className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="font-semibold text-lg">No calls found</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            {search || filter !== "all"
              ? "Try adjusting your search or filters to find what you're looking for"
              : isAdmin
              ? "Add your first sales call to start getting AI-powered insights"
              : "No calls have been assigned to you yet"}
          </p>
          {!search && filter === "all" && isAdmin && (
            <Link href="/dashboard/submit" className="mt-6">
              <Button variant="gradient" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Call
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

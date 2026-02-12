"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Plus,
  MoreHorizontal,
  Play,
  Eye,
  Calendar,
  User,
  UserCheck,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Target,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
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
import { Session, SessionStatus, Template } from "@/types/database";

interface SessionWithRelations extends Session {
  template?: Template;
  templates?: Template; // API returns templates, not template
  coach?: { id: string; name: string; avatar_url?: string };
  agent?: { id: string; name: string; avatar_url?: string };
}

const statusConfig: Record<
  SessionStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "bg-muted text-muted-foreground",
    icon: <Clock className="h-3 w-3" />,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-500/20 text-blue-600 border-blue-500/30",
    icon: <Play className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  reviewed: {
    label: "Reviewed",
    color: "bg-purple-500/20 text-purple-600 border-purple-500/30",
    icon: <Eye className="h-3 w-3" />,
  },
  disputed: {
    label: "Disputed",
    color: "bg-amber-500/20 text-amber-600 border-amber-500/30",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/20 text-red-600 border-red-500/30",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function SessionCard({
  session,
  onDelete,
}: {
  session: SessionWithRelations;
  onDelete: (id: string) => void;
}) {
  const { isAdmin, user } = useAuth();
  const isCoach = session.coach_id === user?.id;
  const canScore = isCoach || isAdmin;
  const status = statusConfig[session.status];

  const showScoreButton =
    canScore &&
    (session.status === "pending" || session.status === "in_progress");

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold truncate">
                  {session.template?.name || session.templates?.name || "Unknown Template"}
                </h3>
                {session.google_event_title && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {session.google_event_title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                {session.coach?.name || "Unassigned"}
              </span>
              <span className="text-muted-foreground/50">→</span>
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {session.agent?.name || "Unassigned"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn(status.color)}>
                {status.icon}
                <span className="ml-1">{status.label}</span>
              </Badge>
              {session.total_score !== null && session.total_score !== undefined && (
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono",
                    session.pass_status === "pass"
                      ? "text-emerald-600 border-emerald-500/30"
                      : session.pass_status === "fail"
                        ? "text-red-600 border-red-500/30"
                        : ""
                  )}
                >
                  {session.total_score.toFixed(1)}%
                </Badge>
              )}
              {session.has_auto_fail && (
                <Badge variant="destructive" className="text-xs">
                  Auto-Fail
                </Badge>
              )}
            </div>
          </div>

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
                <Link href={`/dashboard/sessions/${session.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Link>
              </DropdownMenuItem>
              {showScoreButton && (
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/sessions/${session.id}`}>
                    <Play className="h-4 w-4 mr-2" />
                    {session.status === "pending" ? "Start Scoring" : "Continue Scoring"}
                  </Link>
                </DropdownMenuItem>
              )}
              {isAdmin && session.status === "pending" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(session.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {session.google_event_start && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(session.google_event_start), "MMM d, yyyy")}
              </span>
            )}
            {session.started_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Started {format(new Date(session.started_at), "h:mm a")}
              </span>
            )}
          </div>
          <Link href={`/dashboard/sessions/${session.id}`}>
            <Button variant="outline" size="sm">
              {showScoreButton
                ? session.status === "pending"
                  ? "Start"
                  : "Continue"
                : "View"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SessionsPage() {
  const { isAdmin, user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithRelations[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSessions = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (templateFilter !== "all") params.set("template_id", templateFilter);
      params.set("include_template", "true");
      params.set("include_users", "true");

      const response = await fetch(`/api/sessions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.data);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, templateFilter]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates?status=active");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Fetch sessions on mount and when filters change
  useEffect(() => {
    fetchSessions(true);
  }, [fetchSessions]);

  // Auto-refresh every 30 seconds for dynamic updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions(false); // Silent refresh (no loading state)
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchSessions]);

  // Refresh when window regains focus (user comes back to tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchSessions(false);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchSessions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSessions(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSessions(false);
    setIsRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchSessions(false);
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  // Filter sessions by search term
  const filteredSessions = sessions.filter((session) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      session.template?.name?.toLowerCase().includes(searchLower) ||
      session.google_event_title?.toLowerCase().includes(searchLower) ||
      session.coach?.name?.toLowerCase().includes(searchLower) ||
      session.agent?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Group sessions by status for better visualization
  const pendingSessions = filteredSessions.filter(
    (s) => s.status === "pending" || s.status === "in_progress"
  );
  const completedSessions = filteredSessions.filter(
    (s) => s.status === "completed" || s.status === "reviewed"
  );

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />
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
            <ClipboardCheck className="h-8 w-8 text-primary" />
            Scoring Sessions
          </h1>
          <p className="text-muted-foreground mt-1">
            Score and review coaching sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh sessions"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Link href="/dashboard/sessions/new">
            <Button variant="gradient" className="gap-2">
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Play className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {sessions.filter((s) => s.status === "in_progress").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {sessions.filter((s) => s.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {sessions.filter((s) => s.status === "completed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">
                  {sessions.filter((s) => s.total_score !== null).length > 0
                    ? (
                        sessions
                          .filter((s) => s.total_score !== null)
                          .reduce((sum, s) => sum + (s.total_score || 0), 0) /
                        sessions.filter((s) => s.total_score !== null).length
                      ).toFixed(1) + "%"
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Sessions Found</h3>
            <p className="text-muted-foreground mb-6">
              {search || statusFilter !== "all" || templateFilter !== "all"
                ? "No sessions match your filters. Try adjusting your search."
                : "Create your first scoring session to get started."}
            </p>
            <Link href="/dashboard/sessions/new">
              <Button variant="gradient" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Session
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Sessions */}
          {pendingSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-500" />
                Active Sessions
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Completed Sessions
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Sessions */}
          {filteredSessions.filter(
            (s) =>
              !["pending", "in_progress", "completed", "reviewed"].includes(
                s.status
              )
          ).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Other Sessions</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSessions
                  .filter(
                    (s) =>
                      !["pending", "in_progress", "completed", "reviewed"].includes(
                        s.status
                      )
                  )
                  .map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onDelete={handleDelete}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

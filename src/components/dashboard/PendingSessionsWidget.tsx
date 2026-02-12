"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  ArrowRight,
  Play,
  RefreshCw,
  Clock,
  User,
  Target,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  template_id: string;
  agent_id: string | null;
  status: "pending" | "in_progress";
  created_at: string;
  template?: {
    id: string;
    name: string;
  };
  agent?: {
    id: string;
    name: string;
  };
}

interface PendingSessionsWidgetProps {
  maxItems?: number;
  className?: string;
}

export function PendingSessionsWidget({
  maxItems = 5,
  className,
}: PendingSessionsWidgetProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        status: "pending,in_progress",
        my_sessions: "true",
        pageSize: String(maxItems),
      });

      const response = await fetch(`/api/sessions?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const data = await response.json();
      setSessions(data.data || []);
    } catch (err) {
      console.error("Error fetching pending sessions:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Refresh every 2 minutes
    const interval = setInterval(fetchSessions, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [maxItems]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Pending Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Pending Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSessions}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Pending Sessions
          {sessions.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {sessions.length}
            </Badge>
          )}
        </CardTitle>
        <Link href="/dashboard/sessions">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View All
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-6">
            <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No pending sessions
            </p>
            <Link href="/dashboard/sessions/new">
              <Button variant="outline" size="sm" className="mt-3">
                Create Session
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/dashboard/sessions/${session.id}`}
                className="block"
              >
                <div className="group flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        session.status === "in_progress"
                          ? "bg-amber-500/10"
                          : "bg-blue-500/10"
                      )}
                    >
                      {session.status === "in_progress" ? (
                        <RefreshCw className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.template?.name || "Unknown Template"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {session.agent && (
                          <>
                            <User className="h-3 w-3" />
                            <span className="truncate">{session.agent.name}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>
                          {new Date(session.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={session.status === "in_progress" ? "default" : "outline"}
                      size="sm"
                      className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {session.status === "in_progress" ? (
                        <>
                          Continue
                          <Play className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          Start
                          <Play className="h-3 w-3" />
                        </>
                      )}
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

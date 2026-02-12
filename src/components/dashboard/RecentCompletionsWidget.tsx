"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Trophy,
  User,
  Calendar,
  XCircle,
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
  status: "completed" | "reviewed";
  percentage_score: number | null;
  pass_status: "pass" | "fail" | null;
  completed_at: string | null;
  template?: {
    id: string;
    name: string;
  };
  agent?: {
    id: string;
    name: string;
  };
}

interface RecentCompletionsWidgetProps {
  maxItems?: number;
  className?: string;
}

export function RecentCompletionsWidget({
  maxItems = 5,
  className,
}: RecentCompletionsWidgetProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setError(null);
        const params = new URLSearchParams({
          status: "completed,reviewed",
          pageSize: String(maxItems),
          sort: "completed_at",
          order: "desc",
        });

        const response = await fetch(`/api/sessions?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch sessions");
        }

        const data = await response.json();
        setSessions(data.data || []);
      } catch (err) {
        console.error("Error fetching recent completions:", err);
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [maxItems]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Recent Completions
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
            <Trophy className="h-4 w-4" />
            Recent Completions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Recent Completions
        </CardTitle>
        <Link href="/dashboard/sessions?status=completed">
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
              <Trophy className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No completed sessions yet
            </p>
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
                        session.pass_status === "pass"
                          ? "bg-emerald-500/10"
                          : "bg-red-500/10"
                      )}
                    >
                      {session.pass_status === "pass" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
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
                        {session.completed_at && (
                          <span>
                            {new Date(session.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {session.percentage_score !== null && (
                      <Badge
                        variant={
                          session.pass_status === "pass" ? "success" : "destructive"
                        }
                        className="font-mono"
                      >
                        {Math.round(session.percentage_score)}%
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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

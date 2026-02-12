"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Loader2,
  ArrowRight,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateSessionFromCallButton } from "./CreateSessionFromCallButton";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  template_id: string;
  agent_id: string;
  coach_id: string;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "reviewed";
  total_score: number | null;
  percentage_score: number | null;
  pass_status: "pending" | "pass" | "fail" | null;
  created_at: string;
  completed_at: string | null;
  template?: {
    id: string;
    name: string;
  };
  coach?: {
    id: string;
    name: string;
  };
}

interface LinkedSessionsPanelProps {
  callId: string;
  callerId?: string;
  callerName?: string;
}

export function LinkedSessionsPanel({
  callId,
  callerId,
  callerName,
}: LinkedSessionsPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setError(null);
        const response = await fetch(`/api/sessions?call_id=${callId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("LinkedSessionsPanel API error:", response.status, errorData);
          throw new Error(errorData.error || `Failed to fetch sessions (${response.status})`);
        }

        const data = await response.json();
        setSessions(data.data || []);
      } catch (err) {
        console.error("Error fetching linked sessions:", err);
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [callId]);

  const getStatusIcon = (status: Session["status"]) => {
    switch (status) {
      case "completed":
      case "reviewed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (session: Session) => {
    if (session.status === "completed" || session.status === "reviewed") {
      return (
        <Badge
          variant={session.pass_status === "pass" ? "success" : "destructive"}
          className="gap-1"
        >
          {session.percentage_score !== null
            ? `${Math.round(session.percentage_score)}%`
            : "—"}
          {session.pass_status === "pass" ? "Pass" : "Fail"}
        </Badge>
      );
    }

    const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      in_progress: "outline",
      cancelled: "destructive",
    };

    return (
      <Badge variant={statusVariant[session.status] || "secondary"}>
        {session.status.replace("_", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Coaching Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Coaching Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Coaching Sessions
          {sessions.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {sessions.length}
            </Badge>
          )}
        </CardTitle>
        <CreateSessionFromCallButton
          callId={callId}
          callerId={callerId}
          callerName={callerName}
          variant="ghost"
          size="sm"
        />
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No coaching sessions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a session to evaluate this call
              </p>
            </div>
            <CreateSessionFromCallButton
              callId={callId}
              callerId={callerId}
              callerName={callerName}
              variant="default"
              size="sm"
            />
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
                    {getStatusIcon(session.status)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.template?.name || "Unknown Template"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">
                          {session.coach?.name || "Unassigned"}
                        </span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(session.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(session)}
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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

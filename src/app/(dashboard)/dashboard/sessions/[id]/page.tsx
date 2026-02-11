"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  ClipboardCheck,
  Calendar,
  User,
  UserCheck,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Target,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import {
  Session,
  Template,
  Criteria,
  CriteriaGroup,
  Score,
  SessionStatus,
  ScoreValue,
} from "@/types/database";
import ScoringInterface from "@/components/sessions/ScoringInterface";
import ScoreSummary from "@/components/sessions/ScoreSummary";

interface SessionWithRelations extends Session {
  template?: Template;
  templates?: Template; // API returns templates, not template
  coach?: { id: string; name: string; avatar_url?: string };
  agent?: { id: string; name: string; avatar_url?: string };
  call?: { id: string; title?: string };
  calls?: { id: string; customer_name?: string };
}

const statusConfig: Record<
  SessionStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "bg-muted text-muted-foreground",
    icon: <Clock className="h-4 w-4" />,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-500/20 text-blue-600 border-blue-500/30",
    icon: <Play className="h-4 w-4" />,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  reviewed: {
    label: "Reviewed",
    color: "bg-purple-500/20 text-purple-600 border-purple-500/30",
    icon: <Eye className="h-4 w-4" />,
  },
  disputed: {
    label: "Disputed",
    color: "bg-amber-500/20 text-amber-600 border-amber-500/30",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/20 text-red-600 border-red-500/30",
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { user, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionWithRelations | null>(null);
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [groups, setGroups] = useState<CriteriaGroup[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}?include_template=true&include_users=true&include_scores=true`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError("Session not found");
        } else {
          setError("Failed to load session");
        }
        return;
      }

      const { data } = await response.json();
      setSession(data);

      // Extract criteria and groups from template snapshot
      const templateSnapshot = data.template_snapshot as {
        criteria?: Criteria[];
        groups?: CriteriaGroup[];
      };
      setCriteria(templateSnapshot?.criteria || []);
      setGroups(templateSnapshot?.groups || []);

      // Set scores
      setScores(data.scores || []);
    } catch (error) {
      console.error("Error fetching session:", error);
      setError("Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Handle score change
  const handleScoreChange = async (
    criteriaId: string,
    value: ScoreValue,
    isNa = false,
    comment?: string
  ) => {
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/scores/${criteriaId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value,
            is_na: isNa,
            comment,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save score");
      }

      const { data: savedScore } = await response.json();

      // Update local scores
      setScores((prev) => {
        const index = prev.findIndex((s) => s.criteria_id === criteriaId);
        if (index >= 0) {
          const next = [...prev];
          next[index] = savedScore;
          return next;
        }
        return [...prev, savedScore];
      });

      // Update session if status changed
      if (session?.status === "pending") {
        setSession((prev) =>
          prev ? { ...prev, status: "in_progress" } : null
        );
      }
    } catch (error) {
      console.error("Error saving score:", error);
      throw error;
    }
  };

  // Handle complete session
  const handleComplete = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: "POST",
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to complete session");
      }

      const { data } = await response.json();
      setSession((prev) => (prev ? { ...prev, ...data } : null));

      // Redirect to sessions list
      router.push("/dashboard/sessions");
    } catch (error) {
      console.error("Error completing session:", error);
      throw error;
    }
  };

  // Check permissions
  const isCoach = session?.coach_id === user?.id;
  const canScore =
    (isCoach || isAdmin) &&
    (session?.status === "pending" || session?.status === "in_progress");
  const isViewOnly = !canScore;

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-10 w-10 rounded bg-muted animate-pulse" />
          <div>
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="h-96 rounded-xl bg-muted animate-pulse" />
          </div>
          <div>
            <div className="h-64 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="animate-fade-in">
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {error || "Session not found"}
            </h2>
            <p className="text-muted-foreground mb-6">
              The session you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button onClick={() => router.push("/dashboard/sessions")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[session.status];
  const template = session.template || session.templates;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/sessions")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              {template?.name || "Scoring Session"}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Badge variant="secondary" className={cn(status.color)}>
                {status.icon}
                <span className="ml-1">{status.label}</span>
              </Badge>
              {session.google_event_title && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {session.google_event_title}
                </span>
              )}
            </div>
          </div>
        </div>

        {session.call_id && (
          <Link href={`/dashboard/calls/${session.call_id}`}>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View Call
            </Button>
          </Link>
        )}
      </div>

      {/* Session Info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coach</p>
                <p className="font-medium">
                  {session.coach?.name || "Unassigned"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agent</p>
                <p className="font-medium">
                  {session.agent?.name || "Unassigned"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">
                  {session.google_event_start
                    ? format(new Date(session.google_event_start), "MMM d, yyyy h:mm a")
                    : session.created_at
                      ? format(new Date(session.created_at), "MMM d, yyyy")
                      : "Not scheduled"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pass Threshold</p>
                <p className="font-medium">{template?.pass_threshold || 70}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scoring Interface */}
        <div className="lg:col-span-2">
          {isViewOnly && (
            <Card className="mb-4 bg-muted/50">
              <CardContent className="p-4 flex items-center gap-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">View Only</p>
                  <p className="text-sm text-muted-foreground">
                    {session.status === "completed" || session.status === "reviewed"
                      ? "This session has been completed."
                      : "You don't have permission to score this session."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <ScoringInterface
            session={session}
            template={template!}
            criteria={criteria}
            groups={groups}
            initialScores={scores}
            onScoreChange={handleScoreChange}
            onComplete={handleComplete}
            disabled={isViewOnly}
          />
        </div>

        {/* Score Summary Sidebar */}
        <div className="lg:sticky lg:top-4 self-start">
          <ScoreSummary
            session={session}
            template={template!}
            scores={scores}
            criteria={criteria}
            groups={groups}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TemplateInfo {
  id: string;
  name: string;
  use_case: string;
  scoring_method: string;
  status: string;
  pass_threshold: number;
}

interface SessionResult {
  id: string;
  status: string;
  percentage_score?: number | null;
  pass_status?: string | null;
  completed_at?: string | null;
  created_at: string;
  agent?: { id: string; name: string; email: string } | null;
  coach?: { id: string; name: string; email: string } | null;
}

interface LeaderEntry {
  agentId: string;
  agentName: string;
  avgScore: number;
  sessionCount: number;
}

export default function TemplateResultsPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<TemplateInfo | null>(null);
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tplRes, sessRes] = await Promise.all([
          fetch(`/api/templates/${templateId}`),
          fetch(`/api/sessions?template_id=${templateId}&pageSize=50&sortBy=created_at&sortOrder=desc`),
        ]);

        if (tplRes.ok) {
          const tplData = await tplRes.json();
          setTemplate(tplData.data);
        }

        if (sessRes.ok) {
          const sessData = await sessRes.json();
          setSessions(sessData.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch results:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [templateId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Template not found</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/templates")}>
          Back to Templates
        </Button>
      </div>
    );
  }

  // Compute stats
  const completedSessions = sessions.filter(
    (s) => s.status === "completed" || s.status === "reviewed"
  );
  const scores = completedSessions
    .map((s) => s.percentage_score)
    .filter((s): s is number => s != null && s > 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const passCount = completedSessions.filter((s) => s.pass_status === "pass").length;
  const passRate = completedSessions.length > 0 ? Math.round((passCount / completedSessions.length) * 100) : 0;

  // Leaderboard: aggregate by agent
  const agentScores = new Map<string, { name: string; scores: number[] }>();
  for (const s of completedSessions) {
    if (!s.agent || s.percentage_score == null) continue;
    const existing = agentScores.get(s.agent.id) || { name: s.agent.name, scores: [] };
    existing.scores.push(s.percentage_score);
    agentScores.set(s.agent.id, existing);
  }

  const leaderboard: LeaderEntry[] = Array.from(agentScores.entries())
    .map(([agentId, data]) => ({
      agentId,
      agentName: data.name,
      avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      sessionCount: data.scores.length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/templates")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{template.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={template.status === "active" ? "success" : "secondary"}>
              {template.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {completedSessions.length} completed sessions
            </span>
          </div>
        </div>
        <Link href={`/dashboard/templates/${templateId}/edit`}>
          <Button variant="outline" size="sm">Edit Template</Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-2 text-blue-500" />
            <p className={cn(
              "text-2xl font-bold",
              avgScore >= 80 ? "text-emerald-600" : avgScore >= 60 ? "text-amber-600" : "text-red-500"
            )}>
              {avgScore > 0 ? `${avgScore}%` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold">{passRate}%</p>
            <p className="text-xs text-muted-foreground">Pass Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{sessions.length}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{agentScores.size}</p>
            <p className="text-xs text-muted-foreground">People Scored</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leaderboard */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.agentId}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                          index === 0 && "bg-amber-500/20 text-amber-600",
                          index === 1 && "bg-gray-300/30 text-gray-600",
                          index === 2 && "bg-orange-500/20 text-orange-600",
                          index > 2 && "bg-muted text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{entry.agentName}</p>
                        <p className="text-xs text-muted-foreground">{entry.sessionCount} sessions</p>
                      </div>
                    </div>
                    <Badge
                      variant={entry.avgScore >= 80 ? "success" : entry.avgScore >= 60 ? "warning" : "destructive"}
                    >
                      {entry.avgScore}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No scores yet</p>
            )}
          </CardContent>
        </Card>

        {/* Sessions list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/dashboard/sessions/${session.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {session.agent?.name || "Unknown Agent"}
                        </p>
                        <Badge
                          variant={
                            session.status === "completed" || session.status === "reviewed"
                              ? "success"
                              : session.status === "in_progress"
                                ? "warning"
                                : "secondary"
                          }
                          size="sm"
                        >
                          {session.status}
                        </Badge>
                      </div>
                      {session.coach && (
                        <p className="text-xs text-muted-foreground">
                          Coached by {session.coach.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {session.percentage_score != null && (
                        <Badge
                          variant={
                            session.percentage_score >= 80
                              ? "success"
                              : session.percentage_score >= 60
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {Math.round(session.percentage_score)}%
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.completed_at || session.created_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sessions yet. This template needs to be assigned and used to generate results.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

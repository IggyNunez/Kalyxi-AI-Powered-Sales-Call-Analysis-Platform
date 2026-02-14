"use client";

import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { HeroSection } from "@/components/home/HeroSection";
import { ConnectionBanner } from "@/components/home/ConnectionBanner";
import { TemplateFlowGrid, type TemplateCardData } from "@/components/home/TemplateFlowGrid";
import { ResultsSummary } from "@/components/home/ResultsSummary";
import { NeedsReviewCard } from "@/components/home/NeedsReviewCard";
import type { DashboardStats } from "@/types";

interface RecentSession {
  id: string;
  templateName: string;
  agentName: string;
  score: number;
  date: string;
}

export default function DashboardPage() {
  const { isAdmin, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [templates, setTemplates] = useState<TemplateCardData[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, templatesRes, assignmentsRes, sessionsRes] = await Promise.all([
        fetch("/api/dashboard/stats?period=week"),
        fetch("/api/templates?sortBy=name&sortOrder=asc"),
        fetch("/api/template-assignments"),
        fetch("/api/sessions?status=completed,reviewed&pageSize=5&sortBy=completed_at&sortOrder=desc"),
      ]);

      // Stats
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      // Templates + assignment counts + criteria counts
      let templateData: TemplateCardData[] = [];
      if (templatesRes.ok) {
        const tpl = await templatesRes.json();
        const rawTemplates = tpl.data || [];

        // Build assignment counts
        const assignmentCounts: Record<string, number> = {};
        if (assignmentsRes.ok) {
          const asgn = await assignmentsRes.json();
          const assignments = asgn.data || [];
          for (const a of assignments) {
            if (a.is_active) {
              assignmentCounts[a.template_id] = (assignmentCounts[a.template_id] || 0) + 1;
            }
          }
        }

        // Fetch criteria counts per template
        const criteriaCounts: Record<string, number> = {};
        await Promise.all(
          rawTemplates.map(async (t: { id: string }) => {
            try {
              const res = await fetch(`/api/templates/${t.id}/criteria`);
              if (res.ok) {
                const data = await res.json();
                criteriaCounts[t.id] = (data.data || []).length;
              }
            } catch {
              // ignore
            }
          })
        );

        templateData = rawTemplates.map(
          (t: {
            id: string;
            name: string;
            description?: string | null;
            use_case: string;
            scoring_method: string;
            status: string;
            is_default: boolean;
          }) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            use_case: t.use_case,
            scoring_method: t.scoring_method,
            status: t.status,
            is_default: t.is_default,
            criteriaCount: criteriaCounts[t.id] || 0,
            assignmentCount: assignmentCounts[t.id] || 0,
            avgScore: null,
          })
        ) as TemplateCardData[];
      }
      setTemplates(templateData);

      // Recent sessions
      if (sessionsRes.ok) {
        const sess = await sessionsRes.json();
        const sessions = (sess.data || [])
          .filter((s: { percentage_score?: number | null }) => s.percentage_score != null)
          .slice(0, 5)
          .map(
            (s: {
              id: string;
              percentage_score?: number;
              completed_at?: string;
              created_at: string;
              templates?: { name: string } | null;
              agent?: { name: string } | null;
            }) => ({
              id: s.id,
              templateName: s.templates?.name || "Unknown Template",
              agentName: s.agent?.name || "Unknown",
              score: Math.round(s.percentage_score || 0),
              date: s.completed_at || s.created_at,
            })
          );
        setRecentSessions(sessions);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleActive = async (templateId: string, activate: boolean) => {
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: activate ? "active" : "draft" }),
      });
      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === templateId
              ? { ...t, status: activate ? "active" : "draft" }
              : t
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle template:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const showConnectionBanner = isAdmin && (stats?.connectedAccountsCount || 0) === 0;

  const topPerformer =
    stats?.recentScores && stats.recentScores.length > 0
      ? { name: stats.recentScores[0].callerName, score: stats.recentScores[0].score }
      : null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <HeroSection userName={profile?.name} isAdmin={isAdmin} />

      {/* Connection banner */}
      {showConnectionBanner && <ConnectionBanner />}

      {/* Needs Review */}
      <NeedsReviewCard />

      {/* Template Gallery */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {templates.some((t) => t.status === "active") ? "Your Templates" : "Templates"}
        </h2>
        <TemplateFlowGrid
          templates={templates}
          isAdmin={isAdmin}
          onToggleActive={handleToggleActive}
        />
      </div>

      {/* Results Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Results</h2>
        <ResultsSummary
          totalCalls={stats?.analyzedCalls || 0}
          averageScore={stats?.averageScore || 0}
          topPerformer={topPerformer}
          recentSessions={recentSessions}
        />
      </div>
    </div>
  );
}

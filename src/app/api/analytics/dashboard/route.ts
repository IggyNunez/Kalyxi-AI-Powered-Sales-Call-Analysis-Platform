/**
 * Analytics Dashboard API
 *
 * GET /api/analytics/dashboard - Get org-wide session analytics summary
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, errorResponse } from "@/lib/api-utils";

export async function GET(request: Request) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Period filter
    const period = searchParams.get("period") || "30d";
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get sessions with scores
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select(`
        id,
        status,
        total_score,
        pass_status,
        template_id,
        coach_id,
        agent_id,
        created_at,
        completed_at,
        google_event_start,
        templates (
          id,
          name
        )
      `)
      .eq("org_id", orgId!)
      .gte("created_at", startDate.toISOString());

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return errorResponse("Failed to fetch sessions", 500);
    }

    // Get templates for breakdown
    const { data: templates } = await supabase
      .from("templates")
      .select("id, name")
      .eq("org_id", orgId!)
      .eq("status", "active");

    // Get users for agent/coach info
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .eq("org_id", orgId!);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Calculate summary stats
    const totalSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter((s) => s.status === "completed" || s.status === "reviewed").length || 0;
    const pendingSessions = sessions?.filter((s) => s.status === "pending" || s.status === "in_progress").length || 0;

    const sessionsWithScores = sessions?.filter((s) => s.total_score !== null) || [];
    const averageScore = sessionsWithScores.length > 0
      ? Math.round(sessionsWithScores.reduce((sum, s) => sum + (s.total_score || 0), 0) / sessionsWithScores.length)
      : 0;

    const passingCount = sessions?.filter((s) => s.pass_status === true).length || 0;
    const passRate = completedSessions > 0
      ? Math.round((passingCount / completedSessions) * 100)
      : 0;

    // Score distribution
    const scoreRanges = [
      { range: "0-20", min: 0, max: 20, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];

    sessionsWithScores.forEach((s) => {
      const score = s.total_score || 0;
      const range = scoreRanges.find((r) => score >= r.min && score <= r.max);
      if (range) range.count++;
    });

    // Sessions by template
    const templateCounts: Record<string, { id: string; name: string; count: number; avgScore: number; scores: number[] }> = {};
    sessions?.forEach((s) => {
      const templates = s.templates as unknown as { id: string; name: string } | { id: string; name: string }[] | null;
      const template = Array.isArray(templates) ? templates[0] : templates;
      if (template) {
        if (!templateCounts[template.id]) {
          templateCounts[template.id] = {
            id: template.id,
            name: template.name,
            count: 0,
            avgScore: 0,
            scores: [],
          };
        }
        templateCounts[template.id].count++;
        if (s.total_score !== null) {
          templateCounts[template.id].scores.push(s.total_score);
        }
      }
    });

    const sessionsByTemplate = Object.values(templateCounts).map((t) => ({
      id: t.id,
      name: t.name,
      count: t.count,
      avgScore: t.scores.length > 0
        ? Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length)
        : 0,
    })).sort((a, b) => b.count - a.count);

    // Weekly trend
    const weeklyTrend = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekSessions = sessions?.filter((s) => {
        const created = new Date(s.created_at);
        return created >= weekStart && created < weekEnd;
      }) || [];

      const weekScores = weekSessions
        .filter((s) => s.total_score !== null)
        .map((s) => s.total_score || 0);

      weeklyTrend.push({
        week: `Week ${4 - i}`,
        sessions: weekSessions.length,
        completed: weekSessions.filter((s) => s.status === "completed" || s.status === "reviewed").length,
        avgScore: weekScores.length > 0
          ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length)
          : 0,
      });
    }

    // Sessions over time (daily)
    const sessionsOverTime: { date: string; count: number; avgScore: number }[] = [];
    const sessionsByDate = new Map<string, { count: number; scores: number[] }>();

    sessions?.forEach((session) => {
      const date = new Date(session.created_at).toISOString().split("T")[0];
      const existing = sessionsByDate.get(date) || { count: 0, scores: [] };
      existing.count++;
      if (session.total_score !== null) {
        existing.scores.push(session.total_score);
      }
      sessionsByDate.set(date, existing);
    });

    sessionsByDate.forEach((value, date) => {
      sessionsOverTime.push({
        date,
        count: value.count,
        avgScore: value.scores.length > 0
          ? Math.round(value.scores.reduce((a, b) => a + b, 0) / value.scores.length)
          : 0,
      });
    });

    sessionsOverTime.sort((a, b) => a.date.localeCompare(b.date));

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    sessions?.forEach((s) => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });

    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Top coaches by sessions
    const coachStats: Record<string, { id: string; name: string; sessions: number; avgScore: number; scores: number[] }> = {};
    sessions?.forEach((s) => {
      if (s.coach_id) {
        const profile = profileMap.get(s.coach_id);
        if (!coachStats[s.coach_id]) {
          coachStats[s.coach_id] = {
            id: s.coach_id,
            name: profile?.full_name || profile?.email || "Unknown",
            sessions: 0,
            avgScore: 0,
            scores: [],
          };
        }
        coachStats[s.coach_id].sessions++;
        if (s.total_score !== null) {
          coachStats[s.coach_id].scores.push(s.total_score);
        }
      }
    });

    const topCoaches = Object.values(coachStats)
      .map((c) => ({
        id: c.id,
        name: c.name,
        sessions: c.sessions,
        avgScore: c.scores.length > 0
          ? Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length)
          : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        totalSessions,
        completedSessions,
        pendingSessions,
        averageScore,
        passRate,
      },
      scoreDistribution: scoreRanges.map((r) => ({ range: r.range, count: r.count })),
      sessionsByTemplate,
      weeklyTrend,
      sessionsOverTime,
      statusBreakdown,
      topCoaches,
      templatesCount: templates?.length || 0,
      agentsCount: new Set(sessions?.map((s) => s.agent_id).filter(Boolean)).size,
    });
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    return errorResponse("Failed to fetch analytics", 500);
  }
}

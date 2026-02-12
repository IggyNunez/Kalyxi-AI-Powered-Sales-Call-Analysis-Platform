/**
 * Template Analytics API
 *
 * GET /api/analytics/template/[id] - Get usage analytics for a specific template
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, errorResponse } from "@/lib/api-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  const { id: templateId } = await params;

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

    // Get template info with groups and criteria
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select(`
        id,
        name,
        description,
        use_case,
        scoring_method,
        pass_threshold,
        status,
        criteria_groups (
          id,
          name,
          weight
        ),
        criteria (
          id,
          name,
          criteria_type,
          weight,
          group_id
        )
      `)
      .eq("id", templateId)
      .eq("org_id", orgId!)
      .single();

    if (templateError || !template) {
      return errorResponse("Template not found", 404);
    }

    // Get all sessions using this template
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select(`
        id,
        status,
        total_score,
        pass_status,
        agent_id,
        coach_id,
        created_at,
        completed_at,
        scores (
          id,
          criteria_id,
          criteria_group_id,
          normalized_score,
          weighted_score,
          is_auto_fail_triggered
        )
      `)
      .eq("org_id", orgId!)
      .eq("template_id", templateId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return errorResponse("Failed to fetch sessions", 500);
    }

    // Get user profiles for names
    const agentIds = [...new Set(sessions?.map((s) => s.agent_id).filter(Boolean) as string[])];
    const { data: profiles } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", agentIds.length > 0 ? agentIds : ["placeholder"]);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Calculate summary stats
    const totalSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter((s) => s.status === "completed" || s.status === "reviewed").length || 0;

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

    // Criteria breakdown
    const criteriaMap = new Map((template.criteria as Array<{
      id: string;
      name: string;
      criteria_type: string;
      weight: number;
      group_id: string | null;
    }>)?.map((c) => [c.id, c]) || []);

    const criteriaStats: Record<string, {
      id: string;
      name: string;
      type: string;
      weight: number;
      groupId: string | null;
      totalScore: number;
      count: number;
      autoFailCount: number;
    }> = {};

    // Initialize from template criteria
    criteriaMap.forEach((c, id) => {
      criteriaStats[id] = {
        id: c.id,
        name: c.name,
        type: c.criteria_type,
        weight: c.weight,
        groupId: c.group_id,
        totalScore: 0,
        count: 0,
        autoFailCount: 0,
      };
    });

    // Aggregate scores
    sessions?.forEach((s) => {
      const scores = s.scores as Array<{
        criteria_id: string;
        normalized_score: number | null;
        is_auto_fail_triggered: boolean | null;
      }> | null;

      scores?.forEach((score) => {
        if (criteriaStats[score.criteria_id] && score.normalized_score !== null) {
          criteriaStats[score.criteria_id].totalScore += score.normalized_score;
          criteriaStats[score.criteria_id].count++;
        }
        if (criteriaStats[score.criteria_id] && score.is_auto_fail_triggered) {
          criteriaStats[score.criteria_id].autoFailCount++;
        }
      });
    });

    const criteriaPerformance = Object.values(criteriaStats).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      weight: c.weight,
      groupId: c.groupId,
      avgScore: c.count > 0 ? Math.round(c.totalScore / c.count) : null,
      assessments: c.count,
      autoFailRate: c.count > 0
        ? Math.round((c.autoFailCount / c.count) * 100)
        : 0,
    }));

    // Group breakdown
    const groupMap = new Map((template.criteria_groups as Array<{
      id: string;
      name: string;
      weight: number;
    }>)?.map((g) => [g.id, g]) || []);

    const groupPerformance = Array.from(groupMap.values()).map((group) => {
      const groupCriteria = criteriaPerformance.filter((c) => c.groupId === group.id);
      const withScores = groupCriteria.filter((c) => c.avgScore !== null);
      const avgScore = withScores.length > 0
        ? Math.round(withScores.reduce((sum, c) => sum + (c.avgScore || 0), 0) / withScores.length)
        : null;

      return {
        id: group.id,
        name: group.name,
        weight: group.weight,
        criteriaCount: groupCriteria.length,
        avgScore,
      };
    });

    // Agent leaderboard for this template
    const agentStats: Record<string, {
      id: string;
      name: string;
      sessions: number;
      scores: number[];
      passing: number;
    }> = {};

    sessions?.forEach((s) => {
      if (s.agent_id) {
        if (!agentStats[s.agent_id]) {
          const profile = profileMap.get(s.agent_id);
          agentStats[s.agent_id] = {
            id: s.agent_id,
            name: profile?.name || profile?.email || "Unknown",
            sessions: 0,
            scores: [],
            passing: 0,
          };
        }
        agentStats[s.agent_id].sessions++;
        if (s.total_score !== null) {
          agentStats[s.agent_id].scores.push(s.total_score);
        }
        if (s.pass_status === true) {
          agentStats[s.agent_id].passing++;
        }
      }
    });

    const agentLeaderboard = Object.values(agentStats)
      .map((a) => ({
        id: a.id,
        name: a.name,
        sessions: a.sessions,
        avgScore: a.scores.length > 0
          ? Math.round(a.scores.reduce((sum, s) => sum + s, 0) / a.scores.length)
          : 0,
        passRate: a.sessions > 0
          ? Math.round((a.passing / a.sessions) * 100)
          : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);

    // Score trend over time
    const scoreTrend: { date: string; avgScore: number; sessions: number }[] = [];
    const dailyStats = new Map<string, { scores: number[]; count: number }>();

    sessions?.forEach((s) => {
      const date = new Date(s.created_at).toISOString().split("T")[0];
      const existing = dailyStats.get(date) || { scores: [], count: 0 };
      existing.count++;
      if (s.total_score !== null) {
        existing.scores.push(s.total_score);
      }
      dailyStats.set(date, existing);
    });

    dailyStats.forEach((stats, date) => {
      scoreTrend.push({
        date,
        sessions: stats.count,
        avgScore: stats.scores.length > 0
          ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
          : 0,
      });
    });

    scoreTrend.sort((a, b) => a.date.localeCompare(b.date));

    // Weekly usage
    const weeklyUsage = [];
    for (let i = 5; i >= 0; i--) {
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

      weeklyUsage.push({
        week: `Week ${6 - i}`,
        sessions: weekSessions.length,
        avgScore: weekScores.length > 0
          ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length)
          : null,
      });
    }

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        useCase: template.use_case,
        scoringMethod: template.scoring_method,
        passThreshold: template.pass_threshold,
        status: template.status,
        groupsCount: (template.criteria_groups as unknown[])?.length || 0,
        criteriaCount: (template.criteria as unknown[])?.length || 0,
      },
      summary: {
        totalSessions,
        completedSessions,
        averageScore,
        passRate,
        uniqueAgents: agentIds.length,
      },
      scoreDistribution: scoreRanges.map((r) => ({ range: r.range, count: r.count })),
      scoreTrend,
      weeklyUsage,
      groupPerformance,
      criteriaPerformance: criteriaPerformance.sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0)), // Lowest performing first
      agentLeaderboard,
    });
  } catch (error) {
    console.error("Error fetching template analytics:", error);
    return errorResponse("Failed to fetch template analytics", 500);
  }
}

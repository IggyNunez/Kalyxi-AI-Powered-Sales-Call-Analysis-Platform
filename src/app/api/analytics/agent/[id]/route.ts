/**
 * Agent Analytics API
 *
 * GET /api/analytics/agent/[id] - Get performance analytics for a specific agent
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

  const { id: agentId } = await params;

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

    // Get agent info
    const { data: agent, error: agentError } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, role")
      .eq("id", agentId)
      .eq("org_id", orgId!)
      .single();

    if (agentError || !agent) {
      return errorResponse("Agent not found", 404);
    }

    // Get sessions for this agent
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select(`
        id,
        status,
        total_score,
        pass_status,
        template_id,
        created_at,
        completed_at,
        templates (
          id,
          name
        ),
        scores (
          id,
          criteria_id,
          normalized_score,
          weighted_score,
          is_auto_fail_triggered,
          criteria (
            id,
            name,
            criteria_type
          )
        )
      `)
      .eq("org_id", orgId!)
      .eq("agent_id", agentId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (sessionsError) {
      console.error("Error fetching agent sessions:", sessionsError);
      return errorResponse("Failed to fetch sessions", 500);
    }

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

    // Score trend over time
    const scoreTrend: { date: string; score: number; sessionId: string }[] = [];
    sessionsWithScores.forEach((s) => {
      scoreTrend.push({
        date: new Date(s.created_at).toISOString().split("T")[0],
        score: s.total_score || 0,
        sessionId: s.id,
      });
    });
    scoreTrend.sort((a, b) => a.date.localeCompare(b.date));

    // Performance by template
    const templateStats: Record<string, { id: string; name: string; count: number; scores: number[] }> = {};
    sessions?.forEach((s) => {
      const templates = s.templates as unknown as { id: string; name: string } | { id: string; name: string }[] | null;
      const template = Array.isArray(templates) ? templates[0] : templates;
      if (template) {
        if (!templateStats[template.id]) {
          templateStats[template.id] = {
            id: template.id,
            name: template.name,
            count: 0,
            scores: [],
          };
        }
        templateStats[template.id].count++;
        if (s.total_score !== null) {
          templateStats[template.id].scores.push(s.total_score);
        }
      }
    });

    const performanceByTemplate = Object.values(templateStats).map((t) => ({
      id: t.id,
      name: t.name,
      sessions: t.count,
      avgScore: t.scores.length > 0
        ? Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length)
        : 0,
      minScore: t.scores.length > 0 ? Math.min(...t.scores) : 0,
      maxScore: t.scores.length > 0 ? Math.max(...t.scores) : 0,
    }));

    // Criteria performance (aggregated across all sessions)
    const criteriaStats: Record<string, {
      id: string;
      name: string;
      type: string;
      totalScore: number;
      count: number;
      autoFailCount: number;
    }> = {};

    sessions?.forEach((s) => {
      const scores = s.scores as unknown as Array<{
        criteria_id: string;
        normalized_score: number | null;
        is_auto_fail_triggered: boolean | null;
        criteria: { id: string; name: string; criteria_type: string } | { id: string; name: string; criteria_type: string }[] | null;
      }> | null;

      scores?.forEach((score) => {
        const criteriaData = Array.isArray(score.criteria) ? score.criteria[0] : score.criteria;
        if (criteriaData) {
          const criteriaId = criteriaData.id;
          if (!criteriaStats[criteriaId]) {
            criteriaStats[criteriaId] = {
              id: criteriaId,
              name: criteriaData.name,
              type: criteriaData.criteria_type,
              totalScore: 0,
              count: 0,
              autoFailCount: 0,
            };
          }
          if (score.normalized_score !== null) {
            criteriaStats[criteriaId].totalScore += score.normalized_score;
            criteriaStats[criteriaId].count++;
          }
          if (score.is_auto_fail_triggered) {
            criteriaStats[criteriaId].autoFailCount++;
          }
        }
      });
    });

    const criteriaPerformance = Object.values(criteriaStats)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        avgScore: c.count > 0 ? Math.round(c.totalScore / c.count) : 0,
        assessments: c.count,
        autoFailCount: c.autoFailCount,
      }))
      .sort((a, b) => b.assessments - a.assessments);

    // Weekly progress
    const weeklyProgress = [];
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

      weeklyProgress.push({
        week: `Week ${6 - i}`,
        sessions: weekSessions.length,
        avgScore: weekScores.length > 0
          ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length)
          : null,
        passingRate: weekSessions.length > 0
          ? Math.round((weekSessions.filter((s) => s.pass_status === true).length / weekSessions.length) * 100)
          : null,
      });
    }

    // Recent sessions (last 5)
    const recentSessions = sessions?.slice(0, 5).map((s) => {
      const templates = s.templates as unknown as { name: string } | { name: string }[] | null;
      const template = Array.isArray(templates) ? templates[0] : templates;
      return {
        id: s.id,
        templateName: template?.name || "Unknown",
        score: s.total_score,
        passed: s.pass_status,
        status: s.status,
        date: s.created_at,
      };
    });

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.full_name || agent.email,
        email: agent.email,
        role: agent.role,
      },
      summary: {
        totalSessions,
        completedSessions,
        averageScore,
        passRate,
        improvement: scoreTrend.length >= 2
          ? scoreTrend[scoreTrend.length - 1].score - scoreTrend[0].score
          : 0,
      },
      scoreTrend,
      weeklyProgress,
      performanceByTemplate,
      criteriaPerformance: criteriaPerformance.slice(0, 10), // Top 10 most assessed criteria
      recentSessions,
    });
  } catch (error) {
    console.error("Error fetching agent analytics:", error);
    return errorResponse("Failed to fetch agent analytics", 500);
  }
}

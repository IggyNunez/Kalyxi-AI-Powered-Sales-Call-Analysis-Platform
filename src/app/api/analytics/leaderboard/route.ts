/**
 * Leaderboard Analytics API
 *
 * GET /api/analytics/leaderboard - Get top performers across the organization
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
    const sortBy = searchParams.get("sort") || "avgScore"; // avgScore, sessions, passRate
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

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

    // Get all sessions with completed status
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select(`
        id,
        status,
        total_score,
        pass_status,
        agent_id,
        template_id,
        created_at
      `)
      .eq("org_id", orgId!)
      .gte("created_at", startDate.toISOString())
      .in("status", ["completed", "reviewed"]);

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return errorResponse("Failed to fetch sessions", 500);
    }

    // Get user profiles
    const { data: profiles } = await supabase
      .from("users")
      .select("id, name, email, avatar_url")
      .eq("org_id", orgId!);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Aggregate by agent
    const agentStats: Record<string, {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
      sessions: number;
      scores: number[];
      passing: number;
      recentScores: number[]; // Last 5 scores for trend
    }> = {};

    // Sort sessions by date for recent scores
    const sortedSessions = [...(sessions || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    sortedSessions.forEach((s) => {
      if (!s.agent_id) return;

      if (!agentStats[s.agent_id]) {
        const profile = profileMap.get(s.agent_id);
        agentStats[s.agent_id] = {
          id: s.agent_id,
          name: profile?.name || profile?.email?.split("@")[0] || "Unknown",
          email: profile?.email || "",
          avatarUrl: profile?.avatar_url || null,
          sessions: 0,
          scores: [],
          passing: 0,
          recentScores: [],
        };
      }

      agentStats[s.agent_id].sessions++;

      if (s.total_score !== null) {
        agentStats[s.agent_id].scores.push(s.total_score);
        if (agentStats[s.agent_id].recentScores.length < 5) {
          agentStats[s.agent_id].recentScores.push(s.total_score);
        }
      }

      if (s.pass_status === true) {
        agentStats[s.agent_id].passing++;
      }
    });

    // Calculate leaderboard
    let leaderboard = Object.values(agentStats)
      .filter((a) => a.sessions >= 1) // Minimum 1 session to be included
      .map((a) => {
        const avgScore = a.scores.length > 0
          ? Math.round(a.scores.reduce((sum, s) => sum + s, 0) / a.scores.length)
          : 0;

        const passRate = a.sessions > 0
          ? Math.round((a.passing / a.sessions) * 100)
          : 0;

        // Calculate trend (compare average of recent 5 vs overall)
        const recentAvg = a.recentScores.length > 0
          ? a.recentScores.reduce((sum, s) => sum + s, 0) / a.recentScores.length
          : avgScore;
        const trend = Math.round(recentAvg - avgScore);

        return {
          id: a.id,
          name: a.name,
          email: a.email,
          avatarUrl: a.avatarUrl,
          sessions: a.sessions,
          avgScore,
          passRate,
          trend,
          bestScore: a.scores.length > 0 ? Math.max(...a.scores) : 0,
          lowestScore: a.scores.length > 0 ? Math.min(...a.scores) : 0,
        };
      });

    // Sort by selected criteria
    switch (sortBy) {
      case "sessions":
        leaderboard.sort((a, b) => b.sessions - a.sessions);
        break;
      case "passRate":
        leaderboard.sort((a, b) => b.passRate - a.passRate);
        break;
      case "avgScore":
      default:
        leaderboard.sort((a, b) => b.avgScore - a.avgScore);
        break;
    }

    // Add rank
    const rankedLeaderboard = leaderboard.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    // Calculate org-wide stats for comparison
    const allScores = sessions
      ?.filter((s) => s.total_score !== null)
      .map((s) => s.total_score || 0) || [];

    const orgStats = {
      totalSessions: sessions?.length || 0,
      totalAgents: Object.keys(agentStats).length,
      avgScore: allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0,
      passRate: sessions && sessions.length > 0
        ? Math.round((sessions.filter((s) => s.pass_status === true).length / sessions.length) * 100)
        : 0,
    };

    // Top improvers (highest positive trend)
    const topImprovers = [...leaderboard]
      .filter((a) => a.trend > 0 && a.sessions >= 3)
      .sort((a, b) => b.trend - a.trend)
      .slice(0, 5)
      .map((entry, index) => ({
        rank: index + 1,
        id: entry.id,
        name: entry.name,
        trend: entry.trend,
        avgScore: entry.avgScore,
      }));

    // Most consistent (lowest variance)
    const consistencyStats = Object.values(agentStats)
      .filter((a) => a.scores.length >= 3)
      .map((a) => {
        const avg = a.scores.reduce((sum, s) => sum + s, 0) / a.scores.length;
        const variance = a.scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / a.scores.length;
        const stdDev = Math.sqrt(variance);

        return {
          id: a.id,
          name: a.name,
          stdDev: Math.round(stdDev * 10) / 10,
          avgScore: Math.round(avg),
        };
      })
      .sort((a, b) => a.stdDev - b.stdDev)
      .slice(0, 5)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));

    return NextResponse.json({
      period,
      sortBy,
      leaderboard: rankedLeaderboard,
      topImprovers,
      mostConsistent: consistencyStats,
      orgStats,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return errorResponse("Failed to fetch leaderboard", 500);
  }
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-utils";

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: Request) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Period filter
    const period = searchParams.get("period") || "week";
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case "day":
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "quarter":
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    // Build calls query - for non-admins, filter to their own calls
    let callsQuery = supabase
      .from("calls")
      .select("id, status, call_timestamp, auto_analysis_status, agent_id, analyses(overall_score, composite_score)")
      .eq("org_id", orgId!)
      .gte("call_timestamp", startDate.toISOString());

    if (role === "caller") {
      callsQuery = callsQuery.eq("agent_id", user!.id);
    }

    const { data: calls, error: callsError } = await callsQuery;

    if (callsError) {
      console.error("Error fetching calls:", callsError);
      return errorResponse("Failed to fetch stats", 500);
    }

    // Calculate call statistics
    const totalCalls = calls?.length || 0;
    const analyzedCalls = calls?.filter((c) => c.status === "analyzed").length || 0;
    const pendingAnalysis = calls?.filter((c) =>
      c.auto_analysis_status === "pending" || c.auto_analysis_status === "analyzing"
    ).length || 0;

    // Get scores from analyses (backward compat) and sessions
    const scores = calls
      ?.filter((c) => c.analyses && (c.analyses as unknown[]).length > 0)
      .map((c) => {
        const analysisArray = c.analyses as Array<{ overall_score: number; composite_score: number }>;
        return analysisArray[0]?.overall_score || 0;
      })
      .filter((s) => s > 0) || [];

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;

    // Calls by status
    const callsByStatus: Record<string, number> = {};
    calls?.forEach((c) => {
      callsByStatus[c.status] = (callsByStatus[c.status] || 0) + 1;
    });

    // Score distribution
    const scoreRanges = [
      { range: "81-100", min: 81, max: 100, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "0-20", min: 0, max: 20, count: 0 },
    ];

    scores.forEach((score) => {
      const range = scoreRanges.find((r) => score >= r.min && score <= r.max);
      if (range) range.count++;
    });

    // Calls over time
    const callsOverTime: { date: string; count: number; avgScore: number }[] = [];
    const callsByDate = new Map<string, { count: number; scores: number[] }>();

    calls?.forEach((c) => {
      const date = new Date(c.call_timestamp).toISOString().split("T")[0];
      const existing = callsByDate.get(date) || { count: 0, scores: [] };
      existing.count++;

      const analysisArray = c.analyses as Array<{ overall_score: number }> | null;
      if (analysisArray && analysisArray.length > 0 && analysisArray[0]?.overall_score) {
        existing.scores.push(analysisArray[0].overall_score);
      }

      callsByDate.set(date, existing);
    });

    callsByDate.forEach((value, date) => {
      callsOverTime.push({
        date,
        count: value.count,
        avgScore: value.scores.length > 0
          ? Math.round(value.scores.reduce((a, b) => a + b, 0) / value.scores.length)
          : 0,
      });
    });

    callsOverTime.sort((a, b) => a.date.localeCompare(b.date));

    // Session counts for coaching platform
    let sessionQuery = supabase
      .from("sessions")
      .select("status")
      .eq("org_id", orgId!);

    if (role === "caller") {
      sessionQuery = sessionQuery.eq("agent_id", user!.id);
    }

    const { data: sessionCounts } = await sessionQuery;

    let pendingSessionsCount = 0;
    let inProgressSessionsCount = 0;
    let completedSessionsCount = 0;

    if (sessionCounts) {
      sessionCounts.forEach((s) => {
        if (s.status === "pending") pendingSessionsCount++;
        else if (s.status === "in_progress") inProgressSessionsCount++;
        else if (s.status === "completed" || s.status === "reviewed") completedSessionsCount++;
      });
    }

    // Connected Google accounts count
    let connectedAccountsCount = 0;
    if (role !== "caller") {
      const { count } = await supabase
        .from("google_connections")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId!)
        .eq("status", "active");
      connectedAccountsCount = count || 0;
    }

    // Active salespeople count (users with calls in period)
    let activeSalespeopleCount = 0;
    if (role !== "caller") {
      const uniqueAgents = new Set(
        calls?.map((c) => c.agent_id).filter(Boolean) || []
      );
      activeSalespeopleCount = uniqueAgents.size;
    }

    // Top performers from sessions (modern system)
    let recentScores: Array<{
      callerId: string;
      callerName: string;
      score: number;
      date: string;
    }> = [];

    if (role !== "caller") {
      // Try sessions first (modern system)
      const { data: topSessions } = await supabase
        .from("sessions")
        .select(`
          id,
          percentage_score,
          completed_at,
          agent:users!sessions_agent_id_fkey(id, name)
        `)
        .eq("org_id", orgId!)
        .eq("status", "completed")
        .not("percentage_score", "is", null)
        .gte("completed_at", startDate.toISOString())
        .order("percentage_score", { ascending: false })
        .limit(10);

      if (topSessions && topSessions.length > 0) {
        // Aggregate by agent - pick best score per agent
        const agentBest = new Map<string, { name: string; score: number; date: string }>();
        for (const session of topSessions) {
          const agent = session.agent as unknown as { id: string; name: string } | null;
          if (!agent) continue;
          const existing = agentBest.get(agent.id);
          if (!existing || (session.percentage_score || 0) > existing.score) {
            agentBest.set(agent.id, {
              name: agent.name || "Unknown",
              score: Math.round(session.percentage_score || 0),
              date: session.completed_at || "",
            });
          }
        }
        recentScores = Array.from(agentBest.entries())
          .map(([id, data]) => ({
            callerId: id,
            callerName: data.name,
            score: data.score,
            date: data.date,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }

      // Fallback to legacy analyses if no sessions yet
      if (recentScores.length === 0) {
        const { data: topCalls } = await supabase
          .from("calls")
          .select(`
            id,
            call_timestamp,
            agent:users!calls_agent_id_fkey(id, name),
            analyses(overall_score)
          `)
          .eq("org_id", orgId!)
          .eq("status", "analyzed")
          .gte("call_timestamp", startDate.toISOString())
          .order("call_timestamp", { ascending: false })
          .limit(10);

        recentScores = (topCalls || [])
          .filter((c) => {
            const analysisArray = c.analyses as Array<{ overall_score: number }> | null;
            return analysisArray && analysisArray.length > 0;
          })
          .map((c) => {
            const agent = c.agent as unknown as { id: string; name: string } | null;
            const analysisArray = c.analyses as Array<{ overall_score: number }>;
            return {
              callerId: agent?.id || "",
              callerName: agent?.name || "Unknown",
              score: analysisArray[0]?.overall_score || 0,
              date: c.call_timestamp,
            };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }
    }

    return NextResponse.json({
      data: {
        totalCalls,
        analyzedCalls,
        averageScore,
        topScore,
        callsByStatus,
        scoreDistribution: scoreRanges.map((r) => ({
          range: r.range,
          count: r.count,
        })),
        callsOverTime,
        recentScores,
        period,
        // Pipeline status
        pendingAnalysis,
        connectedAccountsCount,
        activeSalespeopleCount,
        // Session counts
        pendingSessionsCount,
        inProgressSessionsCount,
        completedSessionsCount,
        totalActiveSessionsCount: pendingSessionsCount + inProgressSessionsCount,
      },
    });
  } catch (error) {
    console.error("Error in stats GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

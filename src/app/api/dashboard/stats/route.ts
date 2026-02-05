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

    // Base query filters
    let callsQuery = supabase
      .from("calls")
      .select("id, status, call_timestamp, analyses(overall_score, composite_score)")
      .eq("org_id", orgId!)
      .gte("call_timestamp", startDate.toISOString());

    // For callers, only show their own stats
    if (role === "caller") {
      const { data: callerData } = await supabase
        .from("callers")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!callerData) {
        return NextResponse.json({
          data: {
            totalCalls: 0,
            analyzedCalls: 0,
            averageScore: 0,
            topScore: 0,
            callsByStatus: {},
            recentScores: [],
            scoreDistribution: [],
            callsOverTime: [],
          },
        });
      }

      callsQuery = callsQuery.eq("caller_id", callerData.id);
    }

    const { data: calls, error: callsError } = await callsQuery;

    if (callsError) {
      console.error("Error fetching calls:", callsError);
      return errorResponse("Failed to fetch stats", 500);
    }

    // Calculate statistics
    const totalCalls = calls?.length || 0;
    const analyzedCalls = calls?.filter((c) => c.status === "analyzed").length || 0;

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
      { range: "0-20", min: 0, max: 20, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];

    scores.forEach((score) => {
      const range = scoreRanges.find((r) => score >= r.min && score <= r.max);
      if (range) range.count++;
    });

    // Calls over time (daily counts for the period)
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

    // Get recent high scores for leaderboard snippet
    let recentScores: Array<{
      callerId: string;
      callerName: string;
      score: number;
      date: string;
    }> = [];

    if (role !== "caller") {
      const { data: topCalls } = await supabase
        .from("calls")
        .select(`
          id,
          call_timestamp,
          caller:callers(id, name),
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
          // Handle both single object and array results from Supabase join
          const callerData = c.caller;
          const caller = Array.isArray(callerData)
            ? callerData[0] as { id: string; name: string } | undefined
            : callerData as { id: string; name: string } | null;
          const analysisArray = c.analyses as Array<{ overall_score: number }>;
          return {
            callerId: caller?.id || "",
            callerName: caller?.name || "Unknown",
            score: analysisArray[0]?.overall_score || 0,
            date: c.call_timestamp,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
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
      },
    });
  } catch (error) {
    console.error("Error in stats GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

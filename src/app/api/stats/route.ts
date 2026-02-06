import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, errorResponse } from "@/lib/api-utils";

export async function GET() {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();

    // Build base query conditions
    let callsQuery = supabase
      .from("calls")
      .select("id, status, duration, call_timestamp, caller_id", { count: "exact" })
      .eq("org_id", orgId!);

    // For callers role, only show their own stats
    if (role === "caller") {
      const { data: callerData } = await supabase
        .from("callers")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!callerData) {
        return NextResponse.json({
          totalCalls: 0,
          analyzedCalls: 0,
          averageScore: 0,
          totalDuration: 0,
          callsThisWeek: 0,
          callsLastWeek: 0,
          scoreImprovement: 0,
        });
      }

      callsQuery = callsQuery.eq("caller_id", callerData.id);
    }

    // Get all calls
    const { data: calls, count: totalCalls } = await callsQuery;

    // Get analyzed calls count
    const analyzedCalls = calls?.filter((c) => c.status === "analyzed").length || 0;

    // Calculate total duration
    const totalDuration = calls?.reduce((sum, c) => sum + (c.duration || 0), 0) || 0;

    // Time calculations
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get calls this week and last week
    const callsThisWeek =
      calls?.filter((c) => new Date(c.call_timestamp) >= oneWeekAgo).length || 0;

    const callsLastWeek =
      calls?.filter(
        (c) =>
          new Date(c.call_timestamp) >= twoWeeksAgo &&
          new Date(c.call_timestamp) < oneWeekAgo
      ).length || 0;

    // Get analyses for score calculations
    const callIds = calls?.map((c) => c.id) || [];

    let averageScore = 0;
    let scoreImprovement = 0;

    if (callIds.length > 0) {
      // Get all analyses for these calls
      const { data: analyses } = await supabase
        .from("analyses")
        .select("call_id, overall_score, created_at")
        .in("call_id", callIds);

      if (analyses && analyses.length > 0) {
        // Calculate average score
        const scores = analyses
          .filter((a) => a.overall_score !== null)
          .map((a) => a.overall_score as number);

        averageScore =
          scores.length > 0
            ? scores.reduce((sum, s) => sum + s, 0) / scores.length
            : 0;

        // Get call timestamps for analyses
        const callTimestampMap = new Map<string, Date>();
        calls?.forEach((c) => {
          callTimestampMap.set(c.id, new Date(c.call_timestamp));
        });

        // Calculate score improvement (recent vs older)
        const recentScores = analyses
          .filter((a) => {
            const timestamp = callTimestampMap.get(a.call_id);
            return timestamp && timestamp >= oneWeekAgo && a.overall_score !== null;
          })
          .map((a) => a.overall_score as number);

        const olderScores = analyses
          .filter((a) => {
            const timestamp = callTimestampMap.get(a.call_id);
            return timestamp && timestamp < oneWeekAgo && a.overall_score !== null;
          })
          .map((a) => a.overall_score as number);

        const recentAvg =
          recentScores.length > 0
            ? recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length
            : 0;

        const olderAvg =
          olderScores.length > 0
            ? olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length
            : 0;

        scoreImprovement = olderAvg > 0 ? recentAvg - olderAvg : 0;
      }
    }

    return NextResponse.json({
      totalCalls: totalCalls || 0,
      analyzedCalls,
      averageScore: Math.round(averageScore * 10) / 10,
      totalDuration,
      callsThisWeek,
      callsLastWeek,
      scoreImprovement: Math.round(scoreImprovement * 10) / 10,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return errorResponse("Failed to fetch stats", 500);
  }
}

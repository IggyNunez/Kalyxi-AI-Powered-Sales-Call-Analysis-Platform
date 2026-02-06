import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, errorResponse } from "@/lib/api-utils";
import { AnalysisResults } from "@/types/database";

export async function GET(request: Request) {
  const { user, orgId, role, response } = await requireAuth();
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

    // Build base query - get calls with analyses
    let query = supabase
      .from("calls")
      .select(`
        id,
        call_timestamp,
        caller_id,
        status,
        analyses (
          id,
          overall_score,
          composite_score,
          grading_results_json,
          created_at
        )
      `)
      .eq("org_id", orgId!)
      .gte("call_timestamp", startDate.toISOString());

    // For callers, only show their own calls
    if (role === "caller") {
      const { data: callerData } = await supabase
        .from("callers")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (callerData) {
        query = query.eq("caller_id", callerData.id);
      } else {
        // No caller profile, return empty analytics
        return NextResponse.json({
          scoreDistribution: [],
          weeklyTrend: [],
          sentimentBreakdown: [],
          topTopics: [],
          topObjections: [],
          callsOverTime: [],
          summary: { totalCalls: 0, analyzedCalls: 0, averageScore: 0 },
        });
      }
    }

    const { data: calls, error: callsError } = await query;

    if (callsError) {
      console.error("Error fetching analytics data:", callsError);
      return errorResponse("Failed to fetch analytics", 500);
    }

    // Process analyses from calls
    const analyses: Array<{
      overallScore: number;
      compositeScore: number;
      gradingResults: AnalysisResults;
      callTimestamp: Date;
    }> = [];

    calls?.forEach((call) => {
      const callAnalyses = call.analyses as Array<{
        overall_score: number;
        composite_score: number;
        grading_results_json: AnalysisResults;
      }> | null;

      if (callAnalyses && callAnalyses.length > 0) {
        const analysis = callAnalyses[0];
        analyses.push({
          overallScore: analysis.overall_score,
          compositeScore: analysis.composite_score,
          gradingResults: analysis.grading_results_json,
          callTimestamp: new Date(call.call_timestamp),
        });
      }
    });

    // Score distribution
    const scoreRanges = [
      { range: "0-20", min: 0, max: 20 },
      { range: "21-40", min: 21, max: 40 },
      { range: "41-60", min: 41, max: 60 },
      { range: "61-80", min: 61, max: 80 },
      { range: "81-100", min: 81, max: 100 },
    ];

    const scoreDistribution = scoreRanges.map(({ range, min, max }) => ({
      range,
      count: analyses.filter(
        (a) => a.overallScore >= min && a.overallScore <= max
      ).length,
    }));

    // Weekly trend (last 4 weeks)
    const weeklyTrend = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekAnalyses = analyses.filter(
        (a) => a.callTimestamp >= weekStart && a.callTimestamp < weekEnd
      );

      const avgScore =
        weekAnalyses.length > 0
          ? weekAnalyses.reduce((sum, a) => sum + a.overallScore, 0) /
            weekAnalyses.length
          : 0;

      weeklyTrend.push({
        week: `Week ${4 - i}`,
        calls: weekAnalyses.length,
        avgScore: Math.round(avgScore),
      });
    }

    // Sentiment breakdown from grading results
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    analyses.forEach((a) => {
      const sentiment = a.gradingResults?.sentiment?.overall;
      if (sentiment === "positive") sentimentCounts.positive++;
      else if (sentiment === "negative") sentimentCounts.negative++;
      else sentimentCounts.neutral++;
    });

    const sentimentBreakdown = [
      { name: "Positive", value: sentimentCounts.positive },
      { name: "Neutral", value: sentimentCounts.neutral },
      { name: "Negative", value: sentimentCounts.negative },
    ];

    // Top topics and objections from grading results
    const topicCounts: Record<string, number> = {};
    const objectionCounts: Record<string, number> = {};

    analyses.forEach((a) => {
      // Extract recommendations as topics
      const recommendations = a.gradingResults?.recommendations || [];
      recommendations.forEach((rec: string) => {
        topicCounts[rec] = (topicCounts[rec] || 0) + 1;
      });

      // Extract objections
      const objections = a.gradingResults?.objections || [];
      objections.forEach((obj: { objection: string }) => {
        if (obj.objection) {
          objectionCounts[obj.objection] = (objectionCounts[obj.objection] || 0) + 1;
        }
      });

      // Also count competitor mentions
      const competitors = a.gradingResults?.competitorMentions || [];
      competitors.forEach((comp: string) => {
        topicCounts[`Competitor: ${comp}`] = (topicCounts[`Competitor: ${comp}`] || 0) + 1;
      });
    });

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    const topObjections = Object.entries(objectionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([objection, count]) => ({ objection, count }));

    // Calls over time (daily)
    const callsOverTime: { date: string; count: number; avgScore: number }[] = [];
    const callsByDate = new Map<string, { count: number; scores: number[] }>();

    calls?.forEach((call) => {
      const date = new Date(call.call_timestamp).toISOString().split("T")[0];
      const existing = callsByDate.get(date) || { count: 0, scores: [] };
      existing.count++;

      const callAnalyses = call.analyses as Array<{ overall_score: number }> | null;
      if (callAnalyses && callAnalyses.length > 0 && callAnalyses[0]?.overall_score) {
        existing.scores.push(callAnalyses[0].overall_score);
      }

      callsByDate.set(date, existing);
    });

    callsByDate.forEach((value, date) => {
      callsOverTime.push({
        date,
        count: value.count,
        avgScore:
          value.scores.length > 0
            ? Math.round(value.scores.reduce((a, b) => a + b, 0) / value.scores.length)
            : 0,
      });
    });

    callsOverTime.sort((a, b) => a.date.localeCompare(b.date));

    // Summary stats
    const totalCalls = calls?.length || 0;
    const analyzedCalls = analyses.length;
    const averageScore =
      analyses.length > 0
        ? Math.round(
            analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length
          )
        : 0;

    return NextResponse.json({
      scoreDistribution,
      weeklyTrend,
      sentimentBreakdown,
      topTopics,
      topObjections,
      callsOverTime,
      summary: {
        totalCalls,
        analyzedCalls,
        averageScore,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return errorResponse("Failed to fetch analytics", 500);
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all analyses for the user
    const analyses = await db.analysis.findMany({
      where: {
        call: { userId },
      },
      include: {
        call: {
          select: {
            createdAt: true,
          },
        },
      },
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
        (a) => a.overallScore !== null && a.overallScore >= min && a.overallScore <= max
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
        (a) =>
          a.call.createdAt >= weekStart && a.call.createdAt < weekEnd
      );

      const avgScore =
        weekAnalyses.length > 0
          ? weekAnalyses.reduce((sum, a) => sum + (a.overallScore || 0), 0) /
            weekAnalyses.length
          : 0;

      weeklyTrend.push({
        week: `Week ${4 - i}`,
        calls: weekAnalyses.length,
        avgScore: Math.round(avgScore),
      });
    }

    // Sentiment breakdown
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    analyses.forEach((a) => {
      if (a.sentimentLabel === "positive") sentimentCounts.positive++;
      else if (a.sentimentLabel === "negative") sentimentCounts.negative++;
      else sentimentCounts.neutral++;
    });

    const sentimentBreakdown = [
      { name: "Positive", value: sentimentCounts.positive },
      { name: "Neutral", value: sentimentCounts.neutral },
      { name: "Negative", value: sentimentCounts.negative },
    ];

    // Top topics and objections
    const topicCounts: Record<string, number> = {};
    const objectionCounts: Record<string, number> = {};

    analyses.forEach((a) => {
      if (a.keyTopics) {
        try {
          const topics = JSON.parse(a.keyTopics);
          topics.forEach((topic: string) => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
        } catch {
          // Ignore parsing errors
        }
      }

      if (a.objections) {
        try {
          const objections = JSON.parse(a.objections);
          objections.forEach((objection: string) => {
            objectionCounts[objection] = (objectionCounts[objection] || 0) + 1;
          });
        } catch {
          // Ignore parsing errors
        }
      }
    });

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    const topObjections = Object.entries(objectionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([objection, count]) => ({ objection, count }));

    return NextResponse.json({
      scoreDistribution,
      weeklyTrend,
      sentimentBreakdown,
      topTopics,
      topObjections,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

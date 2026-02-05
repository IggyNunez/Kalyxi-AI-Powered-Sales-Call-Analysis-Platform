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

    // Get total calls
    const totalCalls = await db.call.count({
      where: { userId },
    });

    // Get analyzed calls
    const analyzedCalls = await db.call.count({
      where: {
        userId,
        status: "completed",
      },
    });

    // Get average score
    const analyses = await db.analysis.findMany({
      where: {
        call: { userId },
      },
      select: {
        overallScore: true,
      },
    });

    const averageScore =
      analyses.length > 0
        ? analyses.reduce((sum, a) => sum + (a.overallScore || 0), 0) / analyses.length
        : 0;

    // Get total duration
    const calls = await db.call.findMany({
      where: { userId },
      select: { duration: true },
    });

    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

    // Get calls this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const callsThisWeek = await db.call.count({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
    });

    // Get calls last week
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const callsLastWeek = await db.call.count({
      where: {
        userId,
        createdAt: {
          gte: twoWeeksAgo,
          lt: oneWeekAgo,
        },
      },
    });

    // Calculate score improvement (comparing recent vs older calls)
    const recentAnalyses = await db.analysis.findMany({
      where: {
        call: {
          userId,
          createdAt: { gte: oneWeekAgo },
        },
      },
      select: { overallScore: true },
    });

    const olderAnalyses = await db.analysis.findMany({
      where: {
        call: {
          userId,
          createdAt: { lt: oneWeekAgo },
        },
      },
      select: { overallScore: true },
    });

    const recentAvg =
      recentAnalyses.length > 0
        ? recentAnalyses.reduce((sum, a) => sum + (a.overallScore || 0), 0) /
          recentAnalyses.length
        : 0;

    const olderAvg =
      olderAnalyses.length > 0
        ? olderAnalyses.reduce((sum, a) => sum + (a.overallScore || 0), 0) /
          olderAnalyses.length
        : 0;

    const scoreImprovement = olderAvg > 0 ? recentAvg - olderAvg : 0;

    return NextResponse.json({
      totalCalls,
      analyzedCalls,
      averageScore,
      totalDuration,
      callsThisWeek,
      callsLastWeek,
      scoreImprovement,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

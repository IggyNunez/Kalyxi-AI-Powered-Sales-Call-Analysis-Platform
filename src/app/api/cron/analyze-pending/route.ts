/**
 * Cron Job: Analyze Pending Calls
 *
 * Processes calls that have been created by the auto-pipeline
 * but not yet analyzed (auto_analysis_status = 'pending').
 *
 * Runs separately from transcript sync to avoid blocking.
 * Should be called every 5 minutes.
 *
 * Configure in vercel.json:
 * { "crons": [{ "path": "/api/cron/analyze-pending", "schedule": "0/5 * * * *" }] }
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { analyzeCall } from "@/lib/auto-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max

function verifyCronRequest(request: Request): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (vercelCronHeader === "1") {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid cron authorization" },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    const supabase = await createAdminClient();

    // Get pending calls, oldest first
    const { data: pendingCalls, error } = await supabase
      .from("calls")
      .select("id, org_id, created_at")
      .eq("auto_analysis_status", "pending")
      .order("created_at", { ascending: true })
      .limit(10); // Process up to 10 per run

    if (error) {
      return NextResponse.json(
        { success: false, error: `Query failed: ${error.message}` },
        { status: 500 }
      );
    }

    if (!pendingCalls || pendingCalls.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending calls to analyze",
        stats: {
          processed: 0,
          durationMs: Date.now() - startTime,
        },
      });
    }

    const results: {
      callId: string;
      success: boolean;
      sessionId?: string;
      error?: string;
    }[] = [];

    let successCount = 0;
    let errorCount = 0;

    for (const call of pendingCalls) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > 270000) {
        console.warn("[AnalyzePending] Approaching timeout, stopping early");
        break;
      }

      try {
        const result = await analyzeCall(call.id);

        results.push({
          callId: call.id,
          success: result.success,
          sessionId: result.sessionId,
          error: result.error,
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[AnalyzePending] Error analyzing call ${call.id}:`, message);

        results.push({
          callId: call.id,
          success: false,
          error: message,
        });
        errorCount++;
      }
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: errorCount === 0,
      stats: {
        pending: pendingCalls.length,
        processed: results.length,
        succeeded: successCount,
        failed: errorCount,
        durationMs,
      },
      results,
    });
  } catch (error) {
    console.error("[AnalyzePending] Fatal error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Analysis cron failed",
        message: error instanceof Error ? error.message : "Unknown error",
        stats: { durationMs: Date.now() - startTime },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

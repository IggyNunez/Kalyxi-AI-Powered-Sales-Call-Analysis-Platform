/**
 * Cron Job: Sync Meet Transcripts
 *
 * Automatically syncs transcripts for all Google connections.
 * Should be called by Vercel Cron every 15-30 minutes.
 *
 * Configure in vercel.json:
 * { "crons": [{ "path": "/api/cron/sync-meet", "schedule": "0/15 * * * *" }] }
 */

import { NextResponse } from "next/server";
import { getAllGoogleConnections } from "@/lib/google/storage";
import { syncConnectionTranscripts } from "@/lib/google/sync-engine";

export const runtime = "nodejs";
export const maxDuration = 300; // Allow up to 5 minutes

/**
 * Verify the cron request is from Vercel.
 * Uses CRON_SECRET env var for authentication.
 */
function verifyCronRequest(request: Request): boolean {
  // In development, allow requests without auth
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // Check for Vercel cron authorization header
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Also check the x-vercel-cron header (set automatically by Vercel)
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (vercelCronHeader === "1") {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  // Verify the request is authorized
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid cron authorization" },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    // Get all connections, ordered by last_sync_at (oldest first)
    const connections = await getAllGoogleConnections();

    if (connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No connections to sync",
        stats: {
          connectionsProcessed: 0,
          durationMs: Date.now() - startTime,
        },
      });
    }

    const results: {
      connectionId: string;
      email: string;
      success: boolean;
      transcriptsSaved: number;
      errors: string[];
    }[] = [];

    let totalSaved = 0;
    let totalErrors = 0;

    // Process each connection
    // Using sequential processing to avoid rate limits
    for (const connection of connections) {
      try {
        const result = await syncConnectionTranscripts(connection, {
          windowHours: 24, // Look back 24 hours
          maxConferences: 20, // Limit per connection to avoid timeouts
        });

        results.push({
          connectionId: connection.id,
          email: connection.google_email,
          success: result.success,
          transcriptsSaved: result.transcriptsSaved,
          errors: result.errors,
        });

        totalSaved += result.transcriptsSaved;
        if (!result.success) totalErrors++;

        // Brief pause between connections to avoid rate limits
        if (connections.indexOf(connection) < connections.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[Cron Sync] Error syncing ${connection.google_email}:`, error);

        results.push({
          connectionId: connection.id,
          email: connection.google_email,
          success: false,
          transcriptsSaved: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        });

        totalErrors++;
      }

      // Check if we're approaching the timeout
      if (Date.now() - startTime > 280000) {
        // 4m 40s, leave buffer
        console.warn("[Cron Sync] Approaching timeout, stopping early");
        break;
      }
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: totalErrors === 0,
      stats: {
        connectionsProcessed: results.length,
        totalConnections: connections.length,
        transcriptsSaved: totalSaved,
        errors: totalErrors,
        durationMs,
      },
      results,
    });
  } catch (error) {
    console.error("[Cron Sync] Fatal error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Cron Sync Failed",
        message: error instanceof Error ? error.message : "Unknown error",
        stats: {
          durationMs: Date.now() - startTime,
        },
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}

/**
 * Manual Transcript Sync Route
 *
 * Allows users to manually trigger a transcript sync for their Google connections.
 * Can sync a specific connection or all connections.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUserTranscripts } from "@/lib/google/sync-engine";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for sync

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      connectionId,
      windowHours = 24,
      maxConferences = 50,
    } = body as {
      connectionId?: string;
      windowHours?: number;
      maxConferences?: number;
    };

    // Validate options
    if (windowHours < 1 || windowHours > 168) {
      return NextResponse.json(
        { error: "Bad Request", message: "windowHours must be between 1 and 168 (1 week)" },
        { status: 400 }
      );
    }

    if (maxConferences < 1 || maxConferences > 100) {
      return NextResponse.json(
        { error: "Bad Request", message: "maxConferences must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Sync transcripts
    const results = await syncUserTranscripts(user.id, {
      connectionId,
      windowHours,
      maxConferences,
    });

    // Calculate summary
    const totalConferences = results.reduce((sum, r) => sum + r.conferencesChecked, 0);
    const totalFetched = results.reduce((sum, r) => sum + r.transcriptsFetched, 0);
    const totalSaved = results.reduce((sum, r) => sum + r.transcriptsSaved, 0);
    const allErrors = results.flatMap((r) => r.errors);
    const newTranscripts = results.flatMap((r) => r.newTranscripts);
    const allSuccessful = results.every((r) => r.success);

    return NextResponse.json({
      success: allSuccessful,
      summary: {
        connectionsProcessed: results.length,
        conferencesChecked: totalConferences,
        transcriptsFetched: totalFetched,
        transcriptsSaved: totalSaved,
        newTranscripts,
      },
      results,
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error) {
    console.error("[Sync Now] Error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("Connection not found")) {
        return NextResponse.json(
          { error: "Not Found", message: "Connection not found" },
          { status: 404 }
        );
      }
      if (error.message.includes("does not belong to user")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Connection does not belong to you" },
          { status: 403 }
        );
      }
      if (error.message.includes("connectionId required")) {
        return NextResponse.json(
          { error: "Bad Request", message: "connectionId is required" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Sync Failed",
        message: error instanceof Error ? error.message : "Unknown error during sync",
      },
      { status: 500 }
    );
  }
}

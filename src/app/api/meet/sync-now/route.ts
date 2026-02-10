/**
 * Manual Transcript Sync Route
 *
 * Allows users to manually trigger a transcript sync for their Google connections.
 * Can sync a specific connection or all connections.
 */

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { syncUserTranscripts } from "@/lib/google/sync-engine";
import { validateAndSanitizeUUID, sanitizeUUID } from "@/lib/api-utils";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for sync

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error("[Sync Now] Auth error:", authError?.message || "No user");
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in" },
        { status: 401 }
      );
    }

    // Sanitize user ID
    const userId = sanitizeUUID(authUser.id);

    // Check if user has a profile in public.users (required for sync_logs foreign key)
    // Use admin client to bypass RLS policies
    const adminSupabase = createAdminClient();
    const { data: userProfile, error: profileError } = await adminSupabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[Sync Now] Error checking user profile:", profileError);
      return NextResponse.json(
        { error: "Server Error", message: "Failed to verify user profile" },
        { status: 500 }
      );
    }

    if (!userProfile) {
      console.error("[Sync Now] User profile not found for:", userId);
      return NextResponse.json(
        {
          error: "Profile Required",
          message: "Your user profile is not set up. Please refresh the page to complete setup.",
          code: "PROFILE_MISSING"
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      connectionId: rawConnectionId,
      windowHours = 24,
      maxConferences = 50,
    } = body as {
      connectionId?: string;
      windowHours?: number;
      maxConferences?: number;
    };

    // Validate and sanitize connectionId if provided
    let connectionId: string | undefined;
    if (rawConnectionId) {
      try {
        connectionId = validateAndSanitizeUUID(rawConnectionId, "connectionId");
      } catch (validationError) {
        console.error("[Sync Now] Invalid connectionId:", rawConnectionId);
        return NextResponse.json(
          { error: "Bad Request", message: validationError instanceof Error ? validationError.message : "Invalid connectionId" },
          { status: 400 }
        );
      }
    }

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

    // Log the sync attempt for debugging
    console.log("[Sync Now] Starting sync for user:", userId, "connection:", connectionId || "all");
    console.log("[Sync Now] User profile found:", userProfile.id);

    // Sync transcripts with detailed error logging
    let results;
    try {
      results = await syncUserTranscripts(userId, {
        connectionId,
        windowHours,
        maxConferences,
      });
      console.log("[Sync Now] Sync completed, results count:", results.length);
    } catch (syncError) {
      console.error("[Sync Now] syncUserTranscripts failed:", syncError);
      console.error("[Sync Now] Error stack:", syncError instanceof Error ? syncError.stack : "No stack");
      throw syncError;
    }

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

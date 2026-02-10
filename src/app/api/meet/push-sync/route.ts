/**
 * Push Sync Route (Chrome Extension)
 *
 * Receives push notifications from the Chrome extension when a meeting ends.
 * Uses extension API token for authentication instead of session.
 */

import { NextResponse } from "next/server";
import { validateExtensionToken } from "@/lib/google/storage";
import { syncMeetingByCode } from "@/lib/google/sync-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Extract the API token from the request.
 * Supports both Authorization header and query parameter.
 */
function extractToken(request: Request): string | null {
  // Check Authorization header first (preferred)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check query parameter as fallback
  const url = new URL(request.url);
  return url.searchParams.get("token");
}

export async function POST(request: Request) {
  try {
    // Extract and validate the extension token
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Missing API token. Include it in the Authorization header as 'Bearer <token>'",
        },
        { status: 401 }
      );
    }

    const userId = await validateExtensionToken(token);

    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Invalid or expired API token",
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { meetingCode } = body as { meetingCode?: string };

    if (!meetingCode) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "meetingCode is required",
        },
        { status: 400 }
      );
    }

    // Validate meeting code format
    const normalizedCode = meetingCode.trim().toLowerCase();
    const meetingCodeRegex = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

    if (!meetingCodeRegex.test(normalizedCode)) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: 'Invalid meeting code format. Expected format: "abc-defg-hij"',
        },
        { status: 400 }
      );
    }

    // Sync the meeting
    const results = await syncMeetingByCode(userId, normalizedCode);

    // Check if any transcripts were found
    const totalSaved = results.reduce((sum, r) => sum + r.transcriptsSaved, 0);
    const anySuccess = results.some((r) => r.success);
    const allErrors = results.flatMap((r) => r.errors);

    if (!anySuccess) {
      return NextResponse.json({
        success: false,
        message: "No transcripts found for this meeting",
        meetingCode: normalizedCode,
        errors: allErrors,
      });
    }

    return NextResponse.json({
      success: true,
      message: totalSaved > 0
        ? `Successfully synced ${totalSaved} transcript(s)`
        : "Meeting synced, no new transcripts found",
      meetingCode: normalizedCode,
      transcriptsSaved: totalSaved,
      results,
    });
  } catch (error) {
    console.error("[Push Sync] Error:", error);

    return NextResponse.json(
      {
        error: "Sync Failed",
        message: error instanceof Error ? error.message : "Unknown error during sync",
      },
      { status: 500 }
    );
  }
}

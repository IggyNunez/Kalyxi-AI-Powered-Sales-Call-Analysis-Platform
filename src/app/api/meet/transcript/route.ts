/**
 * Google Meet Transcript API Route
 *
 * POST /api/meet/transcript
 *
 * Fetches transcripts from Google Meet for a given meeting code.
 * Uses Google Workspace domain-wide delegation for authentication.
 *
 * Request Body:
 * {
 *   "meetingCode": "abc-defg-hij",    // Required: The meeting code
 *   "prefer": "docs" | "entries"       // Optional: Preferred source (default: "docs")
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "conferenceRecord": "conferenceRecords/xxx",
 *   "transcript": { name, state, docsDocumentId },
 *   "text": "...",
 *   "entriesCount": 42,
 *   "warnings": []
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  findBestTranscript,
  listTranscriptEntries,
  entriesToPlainText,
  MeetAPIError,
} from "@/lib/google/meet-client";
import {
  fetchTranscriptAsPlainText,
  DocsAPIError,
} from "@/lib/google/docs-client";
import { validateConfiguration, getGoogleAccessToken } from "@/lib/google/auth";
import type {
  TranscriptAPIResponse,
  TranscriptRequestBody,
} from "@/lib/google/types";

// Force Node.js runtime (not Edge) - required for google-auth-library
export const runtime = "nodejs";

// Disable static generation for this dynamic API route
export const dynamic = "force-dynamic";

/**
 * POST /api/meet/transcript
 *
 * Fetch transcript for a Google Meet meeting.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<TranscriptAPIResponse>> {
  // Validate configuration first
  const config = validateConfiguration();
  if (!config.valid) {
    return NextResponse.json(
      {
        ok: false,
        error: "Google Meet integration not configured",
        warnings: config.errors,
        suggestion:
          "Set GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_IMPERSONATE_USER environment variables.",
      },
      { status: 500 }
    );
  }

  // Parse request body
  let body: TranscriptRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON in request body",
        suggestion: 'Request body must be valid JSON with a "meetingCode" field.',
      },
      { status: 400 }
    );
  }

  // Validate meeting code
  const { meetingCode, prefer = "docs" } = body;

  if (!meetingCode) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing required field: meetingCode",
        suggestion:
          'Provide a meeting code in the format "abc-defg-hij" (3-4-3 letters).',
      },
      { status: 400 }
    );
  }

  if (typeof meetingCode !== "string") {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid meetingCode: must be a string",
        suggestion:
          'Provide a meeting code in the format "abc-defg-hij" (3-4-3 letters).',
      },
      { status: 400 }
    );
  }

  const warnings: string[] = [];

  try {
    // Get access token from service account
    const accessToken = await getGoogleAccessToken();

    // Find the best transcript for this meeting
    const result = await findBestTranscript(accessToken, meetingCode);

    // Handle case where no conference records found
    if (result.status === "not_found") {
      return NextResponse.json(
        {
          ok: false,
          error: "Meeting not found",
          suggestion: result.message,
          warnings,
        },
        { status: 404 }
      );
    }

    // Handle case where no transcripts found
    if (result.status === "no_transcripts") {
      return NextResponse.json(
        {
          ok: false,
          conferenceRecord: result.conferenceRecord?.name,
          error: "No transcripts available",
          suggestion: result.message,
          warnings,
        },
        { status: 404 }
      );
    }

    // Handle case where transcript is still processing
    if (result.status === "processing" && prefer === "docs") {
      // If user prefers docs but it's not ready, warn and try entries
      warnings.push(
        "Google Docs transcript not ready yet. Falling back to transcript entries."
      );
    }

    const transcript = result.transcript!;
    const conferenceRecord = result.conferenceRecord!;

    let text = "";
    let entriesCount = 0;

    // Try to get transcript text based on preference
    if (
      prefer === "docs" &&
      result.status === "ready" &&
      transcript.docsDestination?.document
    ) {
      // Preferred: Fetch from Google Docs (higher quality, formatted)
      try {
        const docsResult = await fetchTranscriptAsPlainText(
          accessToken,
          transcript.docsDestination.document
        );
        text = docsResult.text;

        // Estimate entry count from text (rough approximation)
        entriesCount = (text.match(/\n/g) || []).length;
      } catch (docsError) {
        // If Docs fetch fails, fall back to entries
        warnings.push(
          `Failed to fetch Google Docs transcript: ${docsError instanceof Error ? docsError.message : "Unknown error"}. Falling back to entries.`
        );

        const entries = await listTranscriptEntries(accessToken, transcript.name);
        text = entriesToPlainText(entries);
        entriesCount = entries.length;
      }
    } else {
      // Fallback or explicit preference: Fetch transcript entries directly
      try {
        const entries = await listTranscriptEntries(accessToken, transcript.name);
        text = entriesToPlainText(entries);
        entriesCount = entries.length;

        if (entries.length === 0) {
          warnings.push(
            "Transcript entries are empty. The meeting may still be processing."
          );
        }
      } catch (entriesError) {
        // If entries fetch fails, return what we have
        warnings.push(
          `Failed to fetch transcript entries: ${entriesError instanceof Error ? entriesError.message : "Unknown error"}`
        );
      }
    }

    // Build successful response
    const response: TranscriptAPIResponse = {
      ok: true,
      conferenceRecord: conferenceRecord.name,
      transcript: {
        name: transcript.name,
        state: transcript.state,
        docsDocumentId: transcript.docsDestination?.document,
      },
      text,
      entriesCount,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    // Handle specific API errors
    if (error instanceof MeetAPIError) {
      const status =
        error.statusCode === 429
          ? 429
          : error.statusCode === 403
            ? 403
            : error.statusCode === 404
              ? 404
              : 500;

      const response: TranscriptAPIResponse = {
        ok: false,
        error: error.message,
        suggestion: error.suggestion,
        retryAfter: error.retryAfter,
        warnings,
      };

      const headers: HeadersInit = {};
      if (error.retryAfter) {
        headers["Retry-After"] = error.retryAfter.toString();
      }

      return NextResponse.json(response, { status, headers });
    }

    if (error instanceof DocsAPIError) {
      const response: TranscriptAPIResponse = {
        ok: false,
        error: `Docs API Error: ${error.message}`,
        suggestion: error.suggestion,
        warnings,
      };

      return NextResponse.json(response, { status: error.statusCode });
    }

    // Handle unexpected errors
    console.error("[Meet Transcript API] Unexpected error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        suggestion:
          "Check the server logs for more details. This may be a configuration issue.",
        warnings,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/meet/transcript
 *
 * Health check / configuration status endpoint.
 */
export async function GET(): Promise<NextResponse> {
  const config = validateConfiguration();

  return NextResponse.json({
    status: config.valid ? "configured" : "not_configured",
    serviceAccountEmail: config.serviceAccountEmail || null,
    impersonateUser: config.impersonateUser
      ? config.impersonateUser.replace(/(.{3}).*(@.*)/, "$1***$2")
      : null,
    errors: config.errors.length > 0 ? config.errors : undefined,
    usage: {
      method: "POST",
      body: {
        meetingCode: "abc-defg-hij (required)",
        prefer: '"docs" | "entries" (optional, default: "docs")',
      },
    },
  });
}

/**
 * Meet Transcripts API Routes
 *
 * List and manage synced Google Meet transcripts.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listTranscripts, deleteTranscript } from "@/lib/google/storage";

/**
 * GET: List transcripts for the authenticated user.
 *
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - connectionId: string (optional, filter by connection)
 */
export async function GET(request: Request) {
  try {
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

    // Parse query params
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const connectionId = url.searchParams.get("connectionId") || undefined;

    const transcripts = await listTranscripts(user.id, {
      limit,
      offset,
      connectionId,
    });

    return NextResponse.json({
      success: true,
      transcripts,
      pagination: {
        limit,
        offset,
        count: transcripts.length,
        hasMore: transcripts.length === limit,
      },
    });
  } catch (error) {
    console.error("[Transcripts] List error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: error instanceof Error ? error.message : "Failed to list transcripts",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a transcript.
 *
 * Body:
 * - transcriptId: string (required)
 */
export async function DELETE(request: Request) {
  try {
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
    const { transcriptId } = body as { transcriptId?: string };

    if (!transcriptId) {
      return NextResponse.json(
        { error: "Bad Request", message: "transcriptId is required" },
        { status: 400 }
      );
    }

    const deleted = await deleteTranscript(user.id, transcriptId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Not Found", message: "Transcript not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transcript deleted successfully",
    });
  } catch (error) {
    console.error("[Transcripts] Delete error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: error instanceof Error ? error.message : "Failed to delete transcript",
      },
      { status: 500 }
    );
  }
}

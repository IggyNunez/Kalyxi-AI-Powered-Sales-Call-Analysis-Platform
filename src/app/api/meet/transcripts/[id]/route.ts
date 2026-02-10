/**
 * Single Transcript API Route
 *
 * Get a specific transcript by ID.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTranscriptById } from "@/lib/google/storage";

/**
 * GET: Get a transcript by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Bad Request", message: "Transcript ID is required" },
        { status: 400 }
      );
    }

    const transcript = await getTranscriptById(user.id, id);

    if (!transcript) {
      return NextResponse.json(
        { error: "Not Found", message: "Transcript not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      transcript,
    });
  } catch (error) {
    console.error("[Transcript] Get error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: error instanceof Error ? error.message : "Failed to get transcript",
      },
      { status: 500 }
    );
  }
}

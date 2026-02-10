/**
 * Google Connections API Routes
 *
 * List and manage Google OAuth connections for the authenticated user.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listUserGoogleConnections } from "@/lib/google/storage";

/**
 * GET: List all Google connections for the authenticated user.
 */
export async function GET() {
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

    const connections = await listUserGoogleConnections(user.id);

    return NextResponse.json({
      success: true,
      connections,
    });
  } catch (error) {
    console.error("[Google Connections] List error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: error instanceof Error ? error.message : "Failed to list connections",
      },
      { status: 500 }
    );
  }
}

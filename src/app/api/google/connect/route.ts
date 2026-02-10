/**
 * Google OAuth Connect Route
 *
 * Initiates the OAuth 2.0 authorization flow by redirecting to Google.
 * Requires authenticated session.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl } from "@/lib/google/oauth";

export async function GET(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in to connect Google" },
        { status: 401 }
      );
    }

    // Get optional redirect URL from query params
    const url = new URL(request.url);
    const redirectAfter = url.searchParams.get("redirect") || undefined;

    // Build the Google OAuth URL with CSRF-protected state
    const authUrl = buildGoogleAuthUrl(user.id, redirectAfter);

    // Redirect to Google's authorization endpoint
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[Google Connect] Error:", error);

    // If we can't redirect, return an error
    return NextResponse.json(
      {
        error: "OAuth Error",
        message: error instanceof Error ? error.message : "Failed to initiate Google OAuth",
      },
      { status: 500 }
    );
  }
}

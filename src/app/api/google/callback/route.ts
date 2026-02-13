/**
 * Google OAuth Callback Route
 *
 * Handles the OAuth 2.0 callback from Google after user authorization.
 * Verifies CSRF state, exchanges code for tokens, and stores the connection.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  verifySignedState,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
} from "@/lib/google/oauth";
import { createOrUpdateGoogleConnection } from "@/lib/google/storage";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Handle OAuth errors from Google
  if (error) {
    console.error("[Google Callback] OAuth error:", error, errorDescription);
    const redirectUrl = new URL("/dashboard/settings?tab=connections", url.origin);
    redirectUrl.searchParams.set("error", error);
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("[Google Callback] Missing code or state");
    const redirectUrl = new URL("/dashboard/settings?tab=connections", url.origin);
    redirectUrl.searchParams.set("error", "invalid_request");
    redirectUrl.searchParams.set("error_description", "Missing required parameters");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Verify CSRF state and extract payload
    const statePayload = verifySignedState(state);

    // Verify the user is authenticated and matches the state
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[Google Callback] User not authenticated");
      const redirectUrl = new URL("/login", url.origin);
      redirectUrl.searchParams.set("error", "session_expired");
      return NextResponse.redirect(redirectUrl);
    }

    if (user.id !== statePayload.userId) {
      console.error("[Google Callback] User ID mismatch");
      const redirectUrl = new URL("/dashboard/settings?tab=connections", url.origin);
      redirectUrl.searchParams.set("error", "invalid_state");
      redirectUrl.searchParams.set("error_description", "Session mismatch - please try again");
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Verify we got a refresh token (required for offline access)
    if (!tokens.refresh_token) {
      console.error("[Google Callback] No refresh token received");
      const redirectUrl = new URL("/dashboard/settings?tab=connections", url.origin);
      redirectUrl.searchParams.set("error", "no_refresh_token");
      redirectUrl.searchParams.set(
        "error_description",
        "Google did not provide a refresh token. Please try again or revoke access at myaccount.google.com and retry."
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Fetch user info from Google
    const googleUser = await fetchGoogleUserInfo(tokens.access_token);

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    // Save the connection (encrypted refresh token)
    const connection = await createOrUpdateGoogleConnection({
      userId: user.id,
      googleEmail: googleUser.email,
      googleUserId: googleUser.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry,
      scopes: tokens.scope.split(" "),
    });

    console.log("[Google Callback] Connection saved:", {
      connectionId: connection.id,
      email: connection.google_email,
    });

    // Redirect to success page or custom redirect
    const redirectAfter = statePayload.redirectUrl || "/dashboard/settings?tab=connections";
    const redirectUrl = new URL(redirectAfter, url.origin);
    redirectUrl.searchParams.set("success", "true");
    redirectUrl.searchParams.set("email", googleUser.email);

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("[Google Callback] Error processing callback:", err);

    const redirectUrl = new URL("/dashboard/settings?tab=connections", url.origin);

    if (err instanceof Error) {
      if (err.message.includes("Invalid state")) {
        redirectUrl.searchParams.set("error", "invalid_state");
        redirectUrl.searchParams.set(
          "error_description",
          "Security validation failed - please try again"
        );
      } else if (err.message.includes("State expired")) {
        redirectUrl.searchParams.set("error", "state_expired");
        redirectUrl.searchParams.set(
          "error_description",
          "Authorization request expired - please try again"
        );
      } else {
        redirectUrl.searchParams.set("error", "callback_error");
        redirectUrl.searchParams.set("error_description", err.message);
      }
    } else {
      redirectUrl.searchParams.set("error", "unknown_error");
      redirectUrl.searchParams.set("error_description", "An unexpected error occurred");
    }

    return NextResponse.redirect(redirectUrl);
  }
}

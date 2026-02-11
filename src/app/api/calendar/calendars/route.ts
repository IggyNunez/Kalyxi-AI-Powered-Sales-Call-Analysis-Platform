/**
 * List Calendars API
 *
 * GET /api/calendar/calendars - List all calendars for the authenticated user's Google account
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, errorResponse, successResponse } from "@/lib/api-utils";
import { getValidAccessToken } from "@/lib/google/tokens";
import { listCalendars } from "@/lib/google/calendar-client";

export async function GET() {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();

    // Get user's Google connection
    const { data: connection, error: connError } = await supabase
      .from("google_connections")
      .select("id, google_email")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (connError) {
      return errorResponse("Failed to fetch Google connection", 500);
    }

    if (!connection) {
      return errorResponse(
        "No Google account connected. Please connect your Google account first.",
        400
      );
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(connection.id);

    // List calendars from Google
    const calendars = await listCalendars(accessToken);

    // Return calendars with connection info
    return successResponse({
      google_email: connection.google_email,
      calendars: calendars.map((cal) => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description,
        timeZone: cal.timeZone,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        accessRole: cal.accessRole,
        primary: cal.primary || false,
      })),
    });
  } catch (error) {
    console.error("Error listing calendars:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to list calendars",
      500
    );
  }
}

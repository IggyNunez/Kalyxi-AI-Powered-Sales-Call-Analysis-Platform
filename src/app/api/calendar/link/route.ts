/**
 * Calendar Link API
 *
 * GET /api/calendar/link - List all calendar links for the organization
 * POST /api/calendar/link - Create a new calendar link
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  checkRole,
  errorResponse,
  successResponse,
  isValidUUID,
} from "@/lib/api-utils";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google/tokens";
import { getCalendar } from "@/lib/google/calendar-client";

// Validation schema for event filter
const eventFilterSchema = z.object({
  keywords: z.array(z.string()).optional(),
  minDurationMinutes: z.number().min(0).optional(),
  maxDurationMinutes: z.number().min(0).optional(),
  hasVideoConference: z.boolean().optional(),
  excludeAllDayEvents: z.boolean().optional(),
  attendeeEmails: z.array(z.string().email()).optional(),
}).optional();

// Validation schema for creating a calendar link
const createCalendarLinkSchema = z.object({
  template_id: z.string().uuid(),
  calendar_id: z.string().min(1),
  event_filter: eventFilterSchema,
  sync_enabled: z.boolean().default(true),
  auto_create_sessions: z.boolean().default(true),
  default_coach_id: z.string().uuid().optional().nullable(),
});

// GET - List all calendar links
export async function GET(request: Request) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const url = new URL(request.url);
    const templateId = url.searchParams.get("template_id");

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("google_calendar_links")
      .select(`
        *,
        templates (id, name),
        google_connections (id, google_email)
      `)
      .eq("org_id", orgId!);

    if (templateId) {
      query = query.eq("template_id", templateId);
    }

    const { data: links, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return errorResponse("Failed to fetch calendar links", 500);
    }

    return successResponse(links);
  } catch (error) {
    console.error("Error fetching calendar links:", error);
    return errorResponse("Failed to fetch calendar links", 500);
  }
}

// POST - Create a new calendar link
export async function POST(request: Request) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  // Require admin role
  const roleResponse = checkRole(role, ["admin", "superadmin", "manager"]);
  if (roleResponse) return roleResponse;

  try {
    const body = await request.json();
    const validationResult = createCalendarLinkSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { template_id, calendar_id, event_filter, sync_enabled, auto_create_sessions, default_coach_id } =
      validationResult.data;

    const supabase = await createClient();

    // Verify template exists and belongs to org
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, name")
      .eq("id", template_id)
      .eq("org_id", orgId!)
      .single();

    if (templateError || !template) {
      return errorResponse("Template not found", 404);
    }

    // Get user's Google connection
    const { data: connection, error: connError } = await supabase
      .from("google_connections")
      .select("id, google_email")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (connError || !connection) {
      return errorResponse(
        "No Google account connected. Please connect your Google account first.",
        400
      );
    }

    // Verify calendar exists
    const accessToken = await getValidAccessToken(connection.id);
    let calendarInfo;
    try {
      calendarInfo = await getCalendar(accessToken, calendar_id);
    } catch (error) {
      return errorResponse(
        "Calendar not found or not accessible. Please check the calendar ID.",
        400
      );
    }

    // Check if link already exists for this calendar + template
    const { data: existingLink } = await supabase
      .from("google_calendar_links")
      .select("id")
      .eq("org_id", orgId!)
      .eq("template_id", template_id)
      .eq("calendar_id", calendar_id)
      .maybeSingle();

    if (existingLink) {
      return errorResponse(
        "A calendar link already exists for this calendar and template combination.",
        400
      );
    }

    // Create the calendar link
    const { data: link, error: createError } = await supabase
      .from("google_calendar_links")
      .insert({
        org_id: orgId!,
        template_id,
        google_connection_id: connection.id,
        calendar_id,
        calendar_name: calendarInfo.summary,
        google_account_email: connection.google_email,
        event_filter: event_filter || null,
        sync_enabled,
        auto_create_sessions,
        default_coach_id: default_coach_id || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating calendar link:", createError);
      return errorResponse("Failed to create calendar link", 500);
    }

    return successResponse(link, 201);
  } catch (error) {
    console.error("Error creating calendar link:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create calendar link",
      500
    );
  }
}

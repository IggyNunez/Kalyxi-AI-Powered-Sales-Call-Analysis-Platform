/**
 * Calendar Events API
 *
 * GET /api/calendar/events/[linkId] - Get synced events for a calendar link
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  successResponse,
  isValidUUID,
  getPaginationParams,
} from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ linkId: string }>;
}

// GET /api/calendar/events/[linkId] - Get synced events
export async function GET(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const { linkId } = await params;

    if (!isValidUUID(linkId)) {
      return errorResponse("Invalid calendar link ID", 400);
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    // Date filters
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const hasSession = searchParams.get("has_session");

    // Verify calendar link exists and belongs to org
    const { data: link, error: linkError } = await supabase
      .from("google_calendar_links")
      .select("id, calendar_id, calendar_name, template_id")
      .eq("id", linkId)
      .eq("org_id", orgId!)
      .single();

    if (linkError || !link) {
      return errorResponse("Calendar link not found", 404);
    }

    // Fetch sessions created from this calendar link
    let query = supabase
      .from("sessions")
      .select(
        `
        id,
        status,
        google_event_id,
        google_event_title,
        google_event_start,
        google_event_end,
        created_at,
        total_score,
        percentage_score,
        pass_status,
        coach:coach_id (id, full_name, email),
        agent:agent_id (id, full_name, email)
      `,
        { count: "exact" }
      )
      .eq("org_id", orgId!)
      .eq("template_id", link.template_id)
      .not("google_event_id", "is", null);

    // Apply filters
    if (dateFrom) {
      query = query.gte("google_event_start", dateFrom);
    }

    if (dateTo) {
      query = query.lte("google_event_start", dateTo);
    }

    if (hasSession === "true") {
      query = query.not("status", "eq", "pending");
    } else if (hasSession === "false") {
      query = query.eq("status", "pending");
    }

    // Order by event start time
    query = query
      .order("google_event_start", { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: events, error, count } = await query;

    if (error) {
      console.error("Error fetching calendar events:", error);
      return errorResponse("Failed to fetch calendar events", 500);
    }

    return NextResponse.json({
      data: events,
      calendarLink: {
        id: link.id,
        calendar_id: link.calendar_id,
        calendar_name: link.calendar_name,
      },
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return errorResponse("Failed to fetch calendar events", 500);
  }
}

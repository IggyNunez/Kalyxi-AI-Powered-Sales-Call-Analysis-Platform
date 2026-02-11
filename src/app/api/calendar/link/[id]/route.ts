/**
 * Calendar Link [ID] API
 *
 * GET /api/calendar/link/[id] - Get a specific calendar link
 * PUT /api/calendar/link/[id] - Update a calendar link
 * DELETE /api/calendar/link/[id] - Delete a calendar link
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

// Validation schema for event filter
const eventFilterSchema = z.object({
  keywords: z.array(z.string()).optional(),
  minDurationMinutes: z.number().min(0).optional(),
  maxDurationMinutes: z.number().min(0).optional(),
  hasVideoConference: z.boolean().optional(),
  excludeAllDayEvents: z.boolean().optional(),
  attendeeEmails: z.array(z.string().email()).optional(),
}).optional();

// Validation schema for updating a calendar link
const updateCalendarLinkSchema = z.object({
  event_filter: eventFilterSchema,
  sync_enabled: z.boolean().optional(),
  auto_create_sessions: z.boolean().optional(),
  default_coach_id: z.string().uuid().optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a specific calendar link
export async function GET(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid calendar link ID", 400);
    }

    const supabase = await createClient();

    const { data: link, error } = await supabase
      .from("google_calendar_links")
      .select(`
        *,
        templates (id, name),
        google_connections (id, google_email)
      `)
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !link) {
      return errorResponse("Calendar link not found", 404);
    }

    return successResponse(link);
  } catch (error) {
    console.error("Error fetching calendar link:", error);
    return errorResponse("Failed to fetch calendar link", 500);
  }
}

// PUT - Update a calendar link
export async function PUT(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  // Require admin role
  const roleResponse = checkRole(role, ["admin", "superadmin", "manager"]);
  if (roleResponse) return roleResponse;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid calendar link ID", 400);
    }

    const body = await request.json();
    const validationResult = updateCalendarLinkSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const supabase = await createClient();

    // Verify link exists and belongs to org
    const { data: existingLink, error: fetchError } = await supabase
      .from("google_calendar_links")
      .select("id")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingLink) {
      return errorResponse("Calendar link not found", 404);
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validationResult.data.event_filter !== undefined) {
      updateData.event_filter = validationResult.data.event_filter;
    }
    if (validationResult.data.sync_enabled !== undefined) {
      updateData.sync_enabled = validationResult.data.sync_enabled;
    }
    if (validationResult.data.auto_create_sessions !== undefined) {
      updateData.auto_create_sessions = validationResult.data.auto_create_sessions;
    }
    if (validationResult.data.default_coach_id !== undefined) {
      updateData.default_coach_id = validationResult.data.default_coach_id;
    }

    // Update the link
    const { data: link, error: updateError } = await supabase
      .from("google_calendar_links")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating calendar link:", updateError);
      return errorResponse("Failed to update calendar link", 500);
    }

    return successResponse(link);
  } catch (error) {
    console.error("Error updating calendar link:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update calendar link",
      500
    );
  }
}

// DELETE - Delete a calendar link
export async function DELETE(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  // Require admin role
  const roleResponse = checkRole(role, ["admin", "superadmin", "manager"]);
  if (roleResponse) return roleResponse;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid calendar link ID", 400);
    }

    const supabase = await createClient();

    // Verify link exists and belongs to org
    const { data: existingLink, error: fetchError } = await supabase
      .from("google_calendar_links")
      .select("id")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingLink) {
      return errorResponse("Calendar link not found", 404);
    }

    // Delete the link
    const { error: deleteError } = await supabase
      .from("google_calendar_links")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting calendar link:", deleteError);
      return errorResponse("Failed to delete calendar link", 500);
    }

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Error deleting calendar link:", error);
    return errorResponse("Failed to delete calendar link", 500);
  }
}

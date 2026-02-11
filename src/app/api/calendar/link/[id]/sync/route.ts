/**
 * Calendar Link Sync API
 *
 * POST /api/calendar/link/[id]/sync - Trigger a manual sync for a calendar link
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
import { syncCalendarLink } from "@/lib/google/calendar-sync";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Trigger a sync
export async function POST(request: Request, { params }: RouteParams) {
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
      .select("id, sync_enabled")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingLink) {
      return errorResponse("Calendar link not found", 404);
    }

    // Parse request body for sync options
    let body: { windowHours?: number; forceFullSync?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    // Trigger sync
    const result = await syncCalendarLink(id, {
      windowHours: body.windowHours || 168, // Default 7 days
      forceFullSync: body.forceFullSync || false,
    });

    return successResponse({
      success: result.errors.length === 0,
      eventsChecked: result.eventsChecked,
      sessionsCreated: result.sessionsCreated,
      sessionsSkipped: result.sessionsSkipped,
      newSessionIds: result.newSessionIds,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Error syncing calendar link:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to sync calendar",
      500
    );
  }
}

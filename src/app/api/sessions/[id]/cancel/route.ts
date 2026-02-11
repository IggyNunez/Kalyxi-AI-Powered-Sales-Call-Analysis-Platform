/**
 * Session Cancel API
 *
 * POST /api/sessions/[id]/cancel - Cancel a scoring session
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  checkRole,
  errorResponse,
  successResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().max(1000).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/sessions/[id]/cancel - Cancel a session
export async function POST(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid session ID", 400);
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = cancelSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { reason } = validationResult.data;

    const supabase = await createClient();

    // Fetch session
    const { data: session, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !session) {
      return errorResponse("Session not found", 404);
    }

    // Check access - only coach or admin can cancel
    const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
    const isCoach = session.coach_id === user!.id;

    if (!isAdmin && !isCoach) {
      return errorResponse("Only the coach or admin can cancel a session", 403);
    }

    // Cannot cancel already completed or cancelled sessions
    if (session.status === "completed" || session.status === "reviewed") {
      return errorResponse("Cannot cancel a completed or reviewed session", 400);
    }

    if (session.status === "cancelled") {
      return errorResponse("Session is already cancelled", 400);
    }

    // Update session to cancelled status
    const { data: updatedSession, error } = await supabase
      .from("sessions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user!.id,
        cancellation_reason: reason,
      })
      .eq("id", id)
      .select(
        `
        *,
        templates:template_id (id, name, use_case, scoring_method),
        coach:coach_id (id, full_name, email),
        agent:agent_id (id, full_name, email)
      `
      )
      .single();

    if (error) {
      console.error("Error cancelling session:", error);
      return errorResponse("Failed to cancel session", 500);
    }

    // Session audit log
    await supabase.from("session_audit_log").insert({
      session_id: id,
      user_id: user!.id,
      action: "cancelled",
      details: {
        previous_status: session.status,
        reason: reason,
      },
    });

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "cancel",
      "session",
      id,
      { status: session.status },
      { status: "cancelled", cancelled_by: user!.id },
      request
    );

    return successResponse(updatedSession);
  } catch (error) {
    console.error("Error cancelling session:", error);
    return errorResponse("Failed to cancel session", 500);
  }
}

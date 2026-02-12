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
        templates (id, name, use_case, scoring_method)
      `
      )
      .single();

    if (error) {
      console.error("Error cancelling session:", error);
      return errorResponse("Failed to cancel session", 500);
    }

    // Fetch coach and agent user data separately
    const userIds = [updatedSession.coach_id, updatedSession.agent_id].filter(Boolean) as string[];
    let sessionWithUsers = { ...updatedSession, coach: null as { id: string; name: string; email: string } | null, agent: null as { id: string; name: string; email: string } | null };

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", userIds);

      if (users) {
        const userMap = new Map<string, { id: string; name: string; email: string }>();
        for (const u of users) {
          userMap.set(u.id, u);
        }
        sessionWithUsers.coach = updatedSession.coach_id ? userMap.get(updatedSession.coach_id) || null : null;
        sessionWithUsers.agent = updatedSession.agent_id ? userMap.get(updatedSession.agent_id) || null : null;
      }
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

    return successResponse(sessionWithUsers);
  } catch (error) {
    console.error("Error cancelling session:", error);
    return errorResponse("Failed to cancel session", 500);
  }
}

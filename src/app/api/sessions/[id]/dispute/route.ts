/**
 * Session Dispute API
 *
 * POST /api/sessions/[id]/dispute - Agent disputes a session score
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  successResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";

const disputeSchema = z.object({
  reason: z.string().min(10).max(2000),
  disputed_criteria_ids: z.array(z.string().uuid()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/sessions/[id]/dispute - Dispute a session
export async function POST(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid session ID", 400);
    }

    const body = await request.json();
    const validationResult = disputeSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { reason, disputed_criteria_ids } = validationResult.data;

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

    // Only the agent can dispute their own session
    if (session.agent_id !== user!.id) {
      // Allow admin to dispute on behalf of agent
      const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
      if (!isAdmin) {
        return errorResponse("Only the agent can dispute their session", 403);
      }
    }

    // Only completed or reviewed sessions can be disputed
    if (session.status !== "completed" && session.status !== "reviewed") {
      return errorResponse("Only completed or reviewed sessions can be disputed", 400);
    }

    // Update session to disputed status
    const { data: updatedSession, error } = await supabase
      .from("sessions")
      .update({
        status: "disputed",
        disputed_at: new Date().toISOString(),
        disputed_by: user!.id,
        dispute_reason: reason,
        disputed_criteria_ids: disputed_criteria_ids || [],
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
      console.error("Error disputing session:", error);
      return errorResponse("Failed to dispute session", 500);
    }

    // Fetch user data for coach and agent
    const userIds = [updatedSession.coach_id, updatedSession.agent_id].filter(Boolean) as string[];
    let sessionWithUsers = {
      ...updatedSession,
      coach: null as { id: string; name: string; email: string } | null,
      agent: null as { id: string; name: string; email: string } | null,
    };

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
      action: "disputed",
      details: {
        previous_status: session.status,
        reason: reason,
        disputed_criteria_ids: disputed_criteria_ids,
      },
    });

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "dispute",
      "session",
      id,
      { status: session.status },
      { status: "disputed", disputed_by: user!.id },
      request
    );

    return successResponse(sessionWithUsers);
  } catch (error) {
    console.error("Error disputing session:", error);
    return errorResponse("Failed to dispute session", 500);
  }
}

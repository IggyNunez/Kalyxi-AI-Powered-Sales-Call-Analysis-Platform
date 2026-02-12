import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  successResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/sessions/[id]/start - Start a scoring session
export async function POST(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid session ID", 400);
    }

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

    // Check access - only coach or admin can start
    const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
    const isCoach = session.coach_id === user!.id;

    if (!isAdmin && !isCoach) {
      return errorResponse("Only the coach or admin can start a session", 403);
    }

    // Check session status
    if (session.status === "in_progress") {
      return errorResponse("Session is already in progress", 400);
    }

    if (session.status === "completed") {
      return errorResponse("Cannot start a completed session", 400);
    }

    if (session.status === "cancelled") {
      return errorResponse("Cannot start a cancelled session", 400);
    }

    // Update session status
    const { data: updatedSession, error } = await supabase
      .from("sessions")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        templates (id, name, use_case, scoring_method, pass_threshold, settings),
        calls (id, customer_name, call_timestamp, raw_notes)
      `
      )
      .single();

    if (error) {
      console.error("Error starting session:", error);
      return errorResponse("Failed to start session", 500);
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
      action: "started",
      details: { previous_status: session.status },
    });

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "start",
      "session",
      id,
      { status: session.status },
      { status: "in_progress" },
      request
    );

    // Return session with template criteria for scoring interface
    const result: Record<string, unknown> = { ...sessionWithUsers };

    if (updatedSession.template_snapshot) {
      result.template_criteria =
        (updatedSession.template_snapshot as Record<string, unknown>).criteria || [];
      result.template_groups =
        (updatedSession.template_snapshot as Record<string, unknown>).groups || [];
    }

    return successResponse(result);
  } catch (error) {
    console.error("Error starting session:", error);
    return errorResponse("Failed to start session", 500);
  }
}

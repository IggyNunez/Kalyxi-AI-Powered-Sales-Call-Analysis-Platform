import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  requireRole,
  errorResponse,
  successResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";

// Validation schema for updating sessions
const updateSessionSchema = z.object({
  agent_id: z.string().uuid().optional().nullable(),
  coach_notes: z.string().max(5000).optional().nullable(),
  agent_notes: z.string().max(5000).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id] - Get single session with details
export async function GET(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid session ID", 400);
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const includeScores = searchParams.get("include_scores") === "true";
    const includeAuditLog = searchParams.get("include_audit_log") === "true";

    // Fetch session with relations (excluding user joins since FK points to auth.users)
    const { data: session, error } = await supabase
      .from("sessions")
      .select(
        `
        *,
        templates (id, name, use_case, scoring_method, pass_threshold, settings),
        calls (id, customer_name, customer_company, call_timestamp, raw_notes)
      `
      )
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !session) {
      return errorResponse("Session not found", 404);
    }

    // Check access for non-admin users
    if (role !== "admin" && role !== "superadmin" && role !== "manager") {
      if (session.coach_id !== user!.id && session.agent_id !== user!.id) {
        return errorResponse("Access denied", 403);
      }
    }

    // Fetch user data separately (coach, agent, reviewed_by)
    const userIds = [session.coach_id, session.agent_id, session.reviewed_by].filter(Boolean) as string[];
    let userMap = new Map<string, { id: string; name: string; email: string; avatar_url?: string }>();

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, email, avatar_url")
        .in("id", userIds);

      if (users) {
        for (const u of users) {
          userMap.set(u.id, u);
        }
      }
    }

    let result: Record<string, unknown> = {
      ...session,
      coach: session.coach_id ? userMap.get(session.coach_id) || null : null,
      agent: session.agent_id ? userMap.get(session.agent_id) || null : null,
      reviewed_by_user: session.reviewed_by ? userMap.get(session.reviewed_by) || null : null,
    };

    // Optionally include scores
    if (includeScores) {
      const { data: scores } = await supabase
        .from("scores")
        .select(
          `
          *,
          criteria:criteria_id (id, name, criteria_type, config, weight, max_score, is_auto_fail, auto_fail_threshold),
          criteria_groups:criteria_group_id (id, name)
        `
        )
        .eq("session_id", id)
        .order("scored_at", { ascending: true });

      result.scores = scores || [];
    }

    // Optionally include audit log
    if (includeAuditLog) {
      const { data: auditLog } = await supabase
        .from("session_audit_log")
        .select("*")
        .eq("session_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch user data for audit log entries
      if (auditLog && auditLog.length > 0) {
        const auditUserIds = [...new Set(auditLog.filter(l => l.user_id).map(l => l.user_id as string))];
        if (auditUserIds.length > 0) {
          const { data: auditUsers } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", auditUserIds);

          const auditUserMap = new Map<string, { id: string; name: string; email: string }>();
          if (auditUsers) {
            for (const u of auditUsers) {
              auditUserMap.set(u.id, u);
            }
          }

          result.audit_log = auditLog.map(log => ({
            ...log,
            user: log.user_id ? auditUserMap.get(log.user_id) || null : null,
          }));
        } else {
          result.audit_log = auditLog.map(log => ({ ...log, user: null }));
        }
      } else {
        result.audit_log = [];
      }
    }

    // Include criteria from template snapshot for scoring interface
    if (session.template_snapshot) {
      result.template_criteria =
        (session.template_snapshot as Record<string, unknown>).criteria || [];
      result.template_groups =
        (session.template_snapshot as Record<string, unknown>).groups || [];
    }

    return successResponse(result);
  } catch (error) {
    console.error("Error fetching session:", error);
    return errorResponse("Failed to fetch session", 500);
  }
}

// PUT /api/sessions/[id] - Update session
export async function PUT(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid session ID", 400);
    }

    const body = await request.json();
    const validationResult = updateSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const supabase = await createClient();

    // Fetch existing session
    const { data: existingSession, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingSession) {
      return errorResponse("Session not found", 404);
    }

    // Check access
    const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
    const isCoach = existingSession.coach_id === user!.id;
    const isAgent = existingSession.agent_id === user!.id;

    if (!isAdmin && !isCoach && !isAgent) {
      return errorResponse("Access denied", 403);
    }

    // Check if session can be modified
    if (existingSession.status === "completed" || existingSession.status === "cancelled") {
      if (!isAdmin) {
        return errorResponse("Cannot modify a completed or cancelled session", 400);
      }
    }

    const updates = validationResult.data;

    // Agents can only update agent_notes
    if (isAgent && !isCoach && !isAdmin) {
      const allowedUpdates: Record<string, unknown> = {};
      if (updates.agent_notes !== undefined) {
        allowedUpdates.agent_notes = updates.agent_notes;
      }
      if (Object.keys(allowedUpdates).length === 0) {
        return errorResponse("Agents can only update agent_notes", 403);
      }
      Object.assign(updates, allowedUpdates);
    }

    // Verify agent exists if changing
    if (updates.agent_id !== undefined && updates.agent_id !== null) {
      const { data: agent, error: agentError } = await supabase
        .from("users")
        .select("id")
        .eq("id", updates.agent_id)
        .eq("org_id", orgId!)
        .single();

      if (agentError || !agent) {
        return errorResponse("Agent not found", 404);
      }
    }

    const { data: session, error } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        templates (id, name, use_case, scoring_method),
        calls (id, customer_name, call_timestamp)
      `
      )
      .single();

    if (error) {
      console.error("Error updating session:", error);
      return errorResponse("Failed to update session", 500);
    }

    // Fetch user data for coach and agent
    const sessionUserIds = [session.coach_id, session.agent_id].filter(Boolean) as string[];
    let sessionWithUsers = { ...session, coach: null as { id: string; name: string; email: string } | null, agent: null as { id: string; name: string; email: string } | null };

    if (sessionUserIds.length > 0) {
      const { data: sessionUsers } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", sessionUserIds);

      if (sessionUsers) {
        const sessionUserMap = new Map<string, { id: string; name: string; email: string }>();
        for (const u of sessionUsers) {
          sessionUserMap.set(u.id, u);
        }
        sessionWithUsers.coach = session.coach_id ? sessionUserMap.get(session.coach_id) || null : null;
        sessionWithUsers.agent = session.agent_id ? sessionUserMap.get(session.agent_id) || null : null;
      }
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "update",
      "session",
      id,
      existingSession,
      updates,
      request
    );

    return successResponse(sessionWithUsers);
  } catch (error) {
    console.error("Error updating session:", error);
    return errorResponse("Failed to update session", 500);
  }
}

// DELETE /api/sessions/[id] - Delete/Cancel session
export async function DELETE(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid session ID", 400);
    }

    const supabase = await createClient();

    // Fetch existing session
    const { data: existingSession, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingSession) {
      return errorResponse("Session not found", 404);
    }

    // Check access - only admins or the coach can cancel
    const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
    const isCoach = existingSession.coach_id === user!.id;

    if (!isAdmin && !isCoach) {
      return errorResponse("Access denied", 403);
    }

    // Don't delete completed sessions, just cancel them
    if (existingSession.status === "completed") {
      return errorResponse(
        "Cannot delete a completed session. Use the archive endpoint instead.",
        400
      );
    }

    // For pending or in_progress sessions, cancel instead of delete
    const { data: session, error } = await supabase
      .from("sessions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
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
      details: { previous_status: existingSession.status },
    });

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "cancel",
      "session",
      id,
      { status: existingSession.status },
      { status: "cancelled" },
      request
    );

    return NextResponse.json({ message: "Session cancelled successfully", session });
  } catch (error) {
    console.error("Error cancelling session:", error);
    return errorResponse("Failed to cancel session", 500);
  }
}

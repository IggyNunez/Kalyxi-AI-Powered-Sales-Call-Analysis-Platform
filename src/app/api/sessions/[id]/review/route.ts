/**
 * Session Review API
 *
 * POST /api/sessions/[id]/review - Mark a session as reviewed by manager
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

const reviewSchema = z.object({
  reviewer_notes: z.string().max(5000).optional(),
  rating: z.number().min(1).max(5).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/sessions/[id]/review - Review a completed session
export async function POST(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  // Only admin/manager/superadmin can review
  const roleResponse = checkRole(role, ["admin", "superadmin", "manager"]);
  if (roleResponse) return roleResponse;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid session ID", 400);
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = reviewSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { reviewer_notes, rating } = validationResult.data;

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

    // Only completed sessions can be reviewed
    if (session.status !== "completed") {
      return errorResponse("Only completed sessions can be reviewed", 400);
    }

    // Update session to reviewed status
    const { data: updatedSession, error } = await supabase
      .from("sessions")
      .update({
        status: "reviewed",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user!.id,
        reviewer_notes: reviewer_notes !== undefined ? reviewer_notes : session.reviewer_notes,
        reviewer_rating: rating !== undefined ? rating : session.reviewer_rating,
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
      console.error("Error reviewing session:", error);
      return errorResponse("Failed to review session", 500);
    }

    // Fetch user data for coach, agent, and reviewer
    const userIds = [updatedSession.coach_id, updatedSession.agent_id, updatedSession.reviewed_by].filter(Boolean) as string[];
    let sessionWithUsers = {
      ...updatedSession,
      coach: null as { id: string; name: string; email: string } | null,
      agent: null as { id: string; name: string; email: string } | null,
      reviewer: null as { id: string; name: string; email: string } | null,
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
        sessionWithUsers.reviewer = updatedSession.reviewed_by ? userMap.get(updatedSession.reviewed_by) || null : null;
      }
    }

    // Session audit log
    await supabase.from("session_audit_log").insert({
      session_id: id,
      user_id: user!.id,
      action: "reviewed",
      details: {
        previous_status: session.status,
        reviewer_notes: reviewer_notes,
        rating: rating,
      },
    });

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "review",
      "session",
      id,
      { status: session.status },
      { status: "reviewed", reviewed_by: user!.id },
      request
    );

    return successResponse(sessionWithUsers);
  } catch (error) {
    console.error("Error reviewing session:", error);
    return errorResponse("Failed to review session", 500);
  }
}

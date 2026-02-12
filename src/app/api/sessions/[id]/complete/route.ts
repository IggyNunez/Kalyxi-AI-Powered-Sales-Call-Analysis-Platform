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
import {
  calculateSessionScore,
  ScoreInput,
} from "@/lib/scoring-engine";
import {
  Criteria,
  Template,
  ScoreValue,
} from "@/types/database";

const completeSchema = z.object({
  coach_notes: z.string().max(5000).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/sessions/[id]/complete - Complete a scoring session
export async function POST(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid session ID", 400);
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = completeSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { coach_notes } = validationResult.data;

    const supabase = await createClient();

    // Fetch session with template
    const { data: session, error: fetchError } = await supabase
      .from("sessions")
      .select(
        `
        *,
        templates!template_id (*)
      `
      )
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !session) {
      return errorResponse("Session not found", 404);
    }

    // Check access - only coach or admin can complete
    const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
    const isCoach = session.coach_id === user!.id;

    if (!isAdmin && !isCoach) {
      return errorResponse("Only the coach or admin can complete a session", 403);
    }

    // Check session status
    if (session.status === "completed") {
      return errorResponse("Session is already completed", 400);
    }

    if (session.status === "cancelled") {
      return errorResponse("Cannot complete a cancelled session", 400);
    }

    if (session.status === "pending") {
      return errorResponse("Cannot complete a session that hasn't been started", 400);
    }

    // Fetch all scores for this session
    const { data: scores, error: scoresError } = await supabase
      .from("scores")
      .select("*, criteria:criteria_id (*)")
      .eq("session_id", id);

    if (scoresError) {
      console.error("Error fetching scores:", scoresError);
      return errorResponse("Failed to fetch scores", 500);
    }

    // Fetch template criteria to check for required items
    const templateSnapshot = session.template_snapshot as Record<string, unknown>;
    const templateCriteria = (templateSnapshot?.criteria || []) as Criteria[];
    const template = session.templates as Template;

    // Check if all required criteria have been scored
    const requiredCriteria = templateCriteria.filter((c) => c.is_required);
    const scoredCriteriaIds = new Set(scores?.map((s) => s.criteria_id) || []);

    const missingRequired = requiredCriteria.filter(
      (c) => !scoredCriteriaIds.has(c.id)
    );

    // Check template settings for partial submission
    const settings = template?.settings as { allow_partial_submission?: boolean } | null;
    const allowPartial = settings?.allow_partial_submission ?? false;

    if (missingRequired.length > 0 && !allowPartial) {
      return errorResponse(
        `Missing scores for required criteria: ${missingRequired.map((c) => c.name).join(", ")}`,
        400
      );
    }

    // Calculate final scores
    const scoreInputs: ScoreInput[] = (scores || []).map((s) => ({
      criteria: s.criteria as Criteria,
      value: s.value as ScoreValue,
      isNa: s.is_na,
    }));

    const scoreResult = calculateSessionScore({
      template: template,
      criteria: templateCriteria,
      scores: scoreInputs,
    });

    // Update session with final scores
    const updateData: Record<string, unknown> = {
      status: "completed",
      completed_at: new Date().toISOString(),
      total_score: scoreResult.total_score,
      total_possible: scoreResult.total_possible,
      percentage_score: scoreResult.percentage_score,
      pass_status: scoreResult.pass_status,
      has_auto_fail: scoreResult.has_auto_fail,
      auto_fail_criteria_ids: scoreResult.auto_fail_criteria_ids,
    };

    if (coach_notes !== undefined) {
      updateData.coach_notes = coach_notes;
    }

    const { data: updatedSession, error } = await supabase
      .from("sessions")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Error completing session:", error);
      return errorResponse("Failed to complete session", 500);
    }

    // Session audit log
    await supabase.from("session_audit_log").insert({
      session_id: id,
      user_id: user!.id,
      action: "completed",
      details: {
        previous_status: session.status,
        total_score: scoreResult.total_score,
        percentage_score: scoreResult.percentage_score,
        pass_status: scoreResult.pass_status,
        has_auto_fail: scoreResult.has_auto_fail,
        criteria_scored: scores?.length || 0,
      },
    });

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "complete",
      "session",
      id,
      { status: session.status },
      {
        status: "completed",
        percentage_score: scoreResult.percentage_score,
        pass_status: scoreResult.pass_status,
      },
      request
    );

    return successResponse({
      ...updatedSession,
      score_result: scoreResult,
    });
  } catch (error) {
    console.error("Error completing session:", error);
    return errorResponse("Failed to complete session", 500);
  }
}

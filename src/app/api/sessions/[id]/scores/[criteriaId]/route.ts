import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  successResponse,
  isValidUUID,
} from "@/lib/api-utils";
import { z } from "zod";
import {
  calculateCriteriaScore,
  validateScoreValue,
} from "@/lib/scoring-engine";
import { Criteria, ScoreValue } from "@/types/database";

// Validation schema for score value
const scoreValueSchema = z.record(z.string(), z.unknown());

// Validation schema for single score update
const singleScoreSchema = z.object({
  value: scoreValueSchema,
  is_na: z.boolean().default(false),
  comment: z.string().max(2000).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string; criteriaId: string }>;
}

// PUT /api/sessions/[id]/scores/[criteriaId] - Update single score
export async function PUT(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id: sessionId, criteriaId } = await params;

    if (!isValidUUID(sessionId) || !isValidUUID(criteriaId)) {
      return errorResponse("Invalid ID", 400);
    }

    const body = await request.json();
    const validationResult = singleScoreSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { value, is_na, comment } = validationResult.data;

    const supabase = await createClient();

    // Verify session exists and is in scoring state
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status, coach_id, agent_id, template_snapshot")
      .eq("id", sessionId)
      .eq("org_id", orgId!)
      .single();

    if (sessionError || !session) {
      return errorResponse("Session not found", 404);
    }

    // Check access - only coach or admin can score
    const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
    const isCoach = session.coach_id === user!.id;

    if (!isAdmin && !isCoach) {
      return errorResponse("Only the coach or admin can score", 403);
    }

    // Check session status
    if (session.status !== "in_progress" && session.status !== "pending") {
      return errorResponse("Cannot score a completed or cancelled session", 400);
    }

    // Get criteria from template snapshot
    const templateSnapshot = session.template_snapshot as Record<string, unknown>;
    const templateCriteria = (templateSnapshot?.criteria || []) as Criteria[];
    const criteria = templateCriteria.find((c) => c.id === criteriaId);

    if (!criteria) {
      return errorResponse("Criterion not found in this session's template", 404);
    }

    // Validate score value against criteria type
    const scoreValue = value as unknown as ScoreValue;
    if (!is_na) {
      const validation = validateScoreValue(
        criteria.criteria_type,
        scoreValue,
        criteria.config
      );
      if (!validation.valid) {
        return errorResponse(`Invalid score: ${validation.error}`, 400);
      }
    }

    // Calculate score
    const scoreResult = calculateCriteriaScore({
      criteria,
      value: scoreValue,
      isNa: is_na,
    });

    // Upsert score
    const scoreData = {
      session_id: sessionId,
      criteria_id: criteriaId,
      criteria_group_id: criteria.group_id || null,
      value: value,
      is_na: is_na,
      comment: comment || null,
      raw_score: scoreResult.rawScore,
      normalized_score: scoreResult.normalizedScore,
      weighted_score: scoreResult.weightedScore,
      is_auto_fail_triggered: scoreResult.isAutoFailTriggered,
      criteria_snapshot: criteria.config,
      scored_by: user!.id,
      scored_at: new Date().toISOString(),
    };

    const { data: savedScore, error } = await supabase
      .from("scores")
      .upsert(scoreData, {
        onConflict: "session_id,criteria_id",
        ignoreDuplicates: false,
      })
      .select(
        `
        *,
        criteria:criteria_id (id, name, criteria_type, config, weight, max_score)
      `
      )
      .single();

    if (error) {
      console.error("Error saving score:", error);
      return errorResponse("Failed to save score", 500);
    }

    // Log score update to session audit log
    await supabase.from("session_audit_log").insert({
      session_id: sessionId,
      user_id: user!.id,
      action: "score_updated",
      details: {
        criteria_id: criteriaId,
        criteria_name: criteria.name,
        raw_score: scoreResult.rawScore,
        normalized_score: scoreResult.normalizedScore,
        is_na: is_na,
        is_auto_fail_triggered: scoreResult.isAutoFailTriggered,
      },
    });

    // If session was pending, start it
    if (session.status === "pending") {
      await supabase
        .from("sessions")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    }

    return successResponse(savedScore);
  } catch (error) {
    console.error("Error saving score:", error);
    return errorResponse("Failed to save score", 500);
  }
}

// DELETE /api/sessions/[id]/scores/[criteriaId] - Clear a score (mark as not scored)
export async function DELETE(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id: sessionId, criteriaId } = await params;

    if (!isValidUUID(sessionId) || !isValidUUID(criteriaId)) {
      return errorResponse("Invalid ID", 400);
    }

    const supabase = await createClient();

    // Verify session exists and is in scoring state
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status, coach_id, agent_id")
      .eq("id", sessionId)
      .eq("org_id", orgId!)
      .single();

    if (sessionError || !session) {
      return errorResponse("Session not found", 404);
    }

    // Check access - only coach or admin can delete scores
    const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
    const isCoach = session.coach_id === user!.id;

    if (!isAdmin && !isCoach) {
      return errorResponse("Only the coach or admin can delete scores", 403);
    }

    // Check session status
    if (session.status !== "in_progress" && session.status !== "pending") {
      return errorResponse("Cannot modify scores on a completed or cancelled session", 400);
    }

    // Delete score
    const { error } = await supabase
      .from("scores")
      .delete()
      .eq("session_id", sessionId)
      .eq("criteria_id", criteriaId);

    if (error) {
      console.error("Error deleting score:", error);
      return errorResponse("Failed to delete score", 500);
    }

    return NextResponse.json({ message: "Score cleared successfully" });
  } catch (error) {
    console.error("Error deleting score:", error);
    return errorResponse("Failed to delete score", 500);
  }
}

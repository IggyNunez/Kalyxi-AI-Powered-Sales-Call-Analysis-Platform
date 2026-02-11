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
import { Criteria, ScoreValue, CriteriaConfig } from "@/types/database";

// Validation schema for score value
const scoreValueSchema = z.record(z.string(), z.unknown());

// Validation schema for single score
const scoreSchema = z.object({
  criteria_id: z.string().uuid(),
  value: scoreValueSchema,
  is_na: z.boolean().default(false),
  comment: z.string().max(2000).optional().nullable(),
});

// Validation schema for batch upsert
const batchScoreSchema = z.object({
  scores: z.array(scoreSchema),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id]/scores - Get all scores for session
export async function GET(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id: sessionId } = await params;

    if (!isValidUUID(sessionId)) {
      return errorResponse("Invalid session ID", 400);
    }

    const supabase = await createClient();

    // Verify session exists and user has access
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, coach_id, agent_id")
      .eq("id", sessionId)
      .eq("org_id", orgId!)
      .single();

    if (sessionError || !session) {
      return errorResponse("Session not found", 404);
    }

    // Check access
    const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
    if (!isAdmin && session.coach_id !== user!.id && session.agent_id !== user!.id) {
      return errorResponse("Access denied", 403);
    }

    // Fetch scores with criteria details
    const { data: scores, error } = await supabase
      .from("scores")
      .select(
        `
        *,
        criteria:criteria_id (id, name, criteria_type, config, weight, max_score, group_id),
        criteria_groups:criteria_group_id (id, name)
      `
      )
      .eq("session_id", sessionId)
      .order("scored_at", { ascending: true });

    if (error) {
      console.error("Error fetching scores:", error);
      return errorResponse("Failed to fetch scores", 500);
    }

    return successResponse(scores);
  } catch (error) {
    console.error("Error fetching scores:", error);
    return errorResponse("Failed to fetch scores", 500);
  }
}

// PUT /api/sessions/[id]/scores - Batch upsert scores
export async function PUT(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id: sessionId } = await params;

    if (!isValidUUID(sessionId)) {
      return errorResponse("Invalid session ID", 400);
    }

    const body = await request.json();
    const validationResult = batchScoreSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { scores: scoreInputs } = validationResult.data;

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
    const criteriaMap = new Map(templateCriteria.map((c) => [c.id, c]));

    // Validate all scores
    const validatedScores: Array<{
      criteria_id: string;
      criteria_group_id: string | null;
      value: ScoreValue;
      is_na: boolean;
      comment: string | null;
      raw_score: number;
      normalized_score: number;
      weighted_score: number;
      is_auto_fail_triggered: boolean;
      criteria_snapshot: CriteriaConfig;
    }> = [];

    for (const scoreInput of scoreInputs) {
      const criteria = criteriaMap.get(scoreInput.criteria_id);
      if (!criteria) {
        return errorResponse(`Criterion not found: ${scoreInput.criteria_id}`, 400);
      }

      // Cast the value for proper typing
      const scoreValue = scoreInput.value as unknown as ScoreValue;

      // Validate score value against criteria type
      if (!scoreInput.is_na) {
        const validation = validateScoreValue(
          criteria.criteria_type,
          scoreValue,
          criteria.config
        );
        if (!validation.valid) {
          return errorResponse(
            `Invalid score for "${criteria.name}": ${validation.error}`,
            400
          );
        }
      }

      // Calculate score
      const scoreResult = calculateCriteriaScore({
        criteria,
        value: scoreValue,
        isNa: scoreInput.is_na,
      });

      validatedScores.push({
        criteria_id: scoreInput.criteria_id,
        criteria_group_id: criteria.group_id || null,
        value: scoreValue,
        is_na: scoreInput.is_na,
        comment: scoreInput.comment || null,
        raw_score: scoreResult.rawScore,
        normalized_score: scoreResult.normalizedScore,
        weighted_score: scoreResult.weightedScore,
        is_auto_fail_triggered: scoreResult.isAutoFailTriggered,
        criteria_snapshot: criteria.config,
      });
    }

    // Upsert scores
    const scoresToUpsert = validatedScores.map((score) => ({
      session_id: sessionId,
      criteria_id: score.criteria_id,
      criteria_group_id: score.criteria_group_id,
      value: score.value,
      is_na: score.is_na,
      comment: score.comment,
      raw_score: score.raw_score,
      normalized_score: score.normalized_score,
      weighted_score: score.weighted_score,
      is_auto_fail_triggered: score.is_auto_fail_triggered,
      criteria_snapshot: score.criteria_snapshot,
      scored_by: user!.id,
      scored_at: new Date().toISOString(),
    }));

    // Use upsert with conflict on session_id + criteria_id
    const { data: savedScores, error } = await supabase
      .from("scores")
      .upsert(scoresToUpsert, {
        onConflict: "session_id,criteria_id",
        ignoreDuplicates: false,
      })
      .select(
        `
        *,
        criteria:criteria_id (id, name, criteria_type, config, weight, max_score)
      `
      );

    if (error) {
      console.error("Error saving scores:", error);
      return errorResponse("Failed to save scores", 500);
    }

    // Log score updates to session audit log
    await supabase.from("session_audit_log").insert({
      session_id: sessionId,
      user_id: user!.id,
      action: "score_updated",
      details: {
        scores_updated: validatedScores.length,
        criteria_ids: validatedScores.map((s) => s.criteria_id),
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

    return successResponse(savedScores);
  } catch (error) {
    console.error("Error saving scores:", error);
    return errorResponse("Failed to save scores", 500);
  }
}

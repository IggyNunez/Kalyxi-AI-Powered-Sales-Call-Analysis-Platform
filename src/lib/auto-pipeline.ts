/**
 * Auto Pipeline
 *
 * Orchestrates the automatic flow:
 * Google Meet transcript saved -> Call record created -> AI analysis -> Session + Scores
 *
 * This module is called by the sync engine after a transcript is saved,
 * or by the analyze-pending cron for deferred processing.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type {
  Template,
  Criteria,
  CriteriaGroup,
  CriteriaConfig,
  ScoreValue,
} from "@/types/database";

// ============================================================================
// TYPES
// ============================================================================

export interface TranscriptData {
  id: string;
  userId: string;
  connectionId: string;
  meetingCode: string;
  conferenceRecordName: string;
  textContent: string;
  meetingStartTime?: string;
  meetingEndTime?: string;
  meetingSpaceName?: string;
  participants?: Record<string, unknown>;
}

export interface PipelineResult {
  success: boolean;
  callId?: string;
  sessionId?: string;
  error?: string;
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

/**
 * Process a newly saved transcript through the auto pipeline.
 * Creates a call record and marks it for analysis by the cron job.
 *
 * This function is intentionally lightweight - it creates the call record
 * and lets the analyze-pending cron handle the expensive AI analysis.
 */
export async function processNewTranscript(
  transcript: TranscriptData
): Promise<PipelineResult> {
  const supabase = await createAdminClient();

  try {
    // 1. Look up user's org
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, org_id, name, email")
      .eq("id", transcript.userId)
      .single();

    if (userError || !user?.org_id) {
      return { success: false, error: "User or org not found" };
    }

    // 2. Look up who this connection maps to (attribution)
    let agentId = user.id; // default: the user who connected
    if (transcript.connectionId) {
      const { data: connection } = await supabase
        .from("google_connections")
        .select("maps_to_user_id")
        .eq("id", transcript.connectionId)
        .single();

      if (connection?.maps_to_user_id) {
        agentId = connection.maps_to_user_id;
      }
    }

    // 3. Check if a call already exists for this transcript
    const { data: existingCall } = await supabase
      .from("calls")
      .select("id")
      .eq("meet_transcript_id", transcript.id)
      .single();

    if (existingCall) {
      return { success: true, callId: existingCall.id };
    }

    // 4. Calculate duration from meeting times
    let duration: number | null = null;
    if (transcript.meetingStartTime && transcript.meetingEndTime) {
      const start = new Date(transcript.meetingStartTime).getTime();
      const end = new Date(transcript.meetingEndTime).getTime();
      duration = Math.round((end - start) / 1000); // seconds
    }

    // 5. Create call record
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert({
        org_id: user.org_id,
        agent_id: agentId,
        source: "google_meet",
        status: "pending",
        raw_notes: transcript.textContent,
        meet_code: transcript.meetingCode,
        conference_record_name: transcript.conferenceRecordName,
        meet_transcript_id: transcript.id,
        auto_analysis_status: "pending",
        duration,
        call_timestamp: transcript.meetingStartTime || new Date().toISOString(),
        metadata: {
          meeting_space: transcript.meetingSpaceName,
          participants: transcript.participants,
          source: "auto_pipeline",
        },
      })
      .select("id")
      .single();

    if (callError) {
      console.error("[AutoPipeline] Failed to create call:", callError);
      return { success: false, error: `Failed to create call: ${callError.message}` };
    }

    console.log("[AutoPipeline] Call created:", call.id, "for transcript:", transcript.id);

    return {
      success: true,
      callId: call.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[AutoPipeline] Error:", message);
    return { success: false, error: message };
  }
}

/**
 * Run AI analysis on a pending call.
 * Called by the analyze-pending cron job.
 */
export async function analyzeCall(callId: string): Promise<PipelineResult> {
  const supabase = await createAdminClient();

  try {
    // 1. Fetch call with transcript
    const { data: call, error: callError } = await supabase
      .from("calls")
      .select("*, meet_transcripts:meet_transcript_id(text_content)")
      .eq("id", callId)
      .single();

    if (callError || !call) {
      return { success: false, error: "Call not found" };
    }

    // Mark as analyzing
    await supabase
      .from("calls")
      .update({ auto_analysis_status: "analyzing", status: "processing" })
      .eq("id", callId);

    // 2. Get transcript text
    const transcriptText = call.raw_notes || (call.meet_transcripts as { text_content: string } | null)?.text_content;

    if (!transcriptText || transcriptText.trim().length < 50) {
      await supabase
        .from("calls")
        .update({ auto_analysis_status: "skipped", status: "analyzed" })
        .eq("id", callId);
      return { success: true, callId };
    }

    // 3. Find the right template for this user/org
    const template = await findTemplateForCall(supabase, call.org_id, call.agent_id);

    if (!template) {
      await supabase
        .from("calls")
        .update({ auto_analysis_status: "skipped", status: "analyzed" })
        .eq("id", callId);
      return { success: true, callId };
    }

    // 4. Fetch template criteria
    const { data: criteria } = await supabase
      .from("criteria")
      .select("*")
      .eq("template_id", template.id)
      .order("sort_order");

    const { data: groups } = await supabase
      .from("criteria_groups")
      .select("*")
      .eq("template_id", template.id)
      .order("sort_order");

    if (!criteria || criteria.length === 0) {
      await supabase
        .from("calls")
        .update({ auto_analysis_status: "skipped", status: "analyzed" })
        .eq("id", callId);
      return { success: true, callId };
    }

    // 5. Build template snapshot for session
    const templateSnapshot = {
      id: template.id,
      name: template.name,
      scoring_method: template.scoring_method,
      pass_threshold: template.pass_threshold,
      settings: template.settings,
      version: template.version,
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        criteria_type: c.criteria_type,
        config: c.config,
        weight: c.weight,
        max_score: c.max_score,
        is_required: c.is_required,
        is_auto_fail: c.is_auto_fail,
        auto_fail_threshold: c.auto_fail_threshold,
        scoring_guide: c.scoring_guide,
        keywords: c.keywords,
        group_id: c.group_id,
        sort_order: c.sort_order,
      })),
      groups: (groups || []).map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        weight: g.weight,
        sort_order: g.sort_order,
      })),
    };

    // 6. Create session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        org_id: call.org_id,
        template_id: template.id,
        call_id: callId,
        agent_id: call.agent_id,
        status: "in_progress",
        template_version: template.version,
        template_snapshot: templateSnapshot,
        started_at: new Date().toISOString(),
        metadata: { source: "auto_pipeline", meet_code: call.meet_code },
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("[AutoPipeline] Failed to create session:", sessionError);
      await supabase
        .from("calls")
        .update({ auto_analysis_status: "failed" })
        .eq("id", callId);
      return { success: false, error: `Failed to create session: ${sessionError.message}` };
    }

    // 7. Build KB context
    let kbContext: string | undefined;
    const { data: kbDocs } = await supabase
      .from("knowledge_base_documents")
      .select("title, content, doc_type")
      .eq("org_id", call.org_id)
      .eq("is_active", true)
      .limit(10);

    if (kbDocs && kbDocs.length > 0) {
      kbContext = kbDocs
        .map((doc) => `### ${doc.title} (${doc.doc_type})\n${doc.content}`)
        .join("\n\n---\n\n");
    }

    // 8. Run AI analysis
    const { analyzeWithTemplate } = await import("@/lib/ai-engine");
    const aiResult = await analyzeWithTemplate(
      transcriptText,
      template,
      criteria as Criteria[],
      (groups || []) as CriteriaGroup[],
      kbContext
    );

    if (!aiResult.success || !aiResult.scores) {
      await supabase
        .from("calls")
        .update({ auto_analysis_status: "failed", status: "failed" })
        .eq("id", callId);
      await supabase
        .from("sessions")
        .update({ status: "cancelled" })
        .eq("id", session.id);
      return { success: false, error: aiResult.error || "AI analysis failed" };
    }

    // 9. Insert scores
    const scoreRecords = aiResult.scores.map((score) => ({
      session_id: session.id,
      criteria_id: score.criteriaId,
      criteria_group_id: score.groupId || null,
      value: score.value,
      raw_score: score.rawScore,
      normalized_score: score.normalizedScore,
      weighted_score: score.weightedScore,
      is_na: false,
      is_auto_fail_triggered: score.isAutoFailTriggered || false,
      comment: score.comment || null,
      scored_by: "ai",
      scored_at: new Date().toISOString(),
      criteria_snapshot: criteria.find((c) => c.id === score.criteriaId) || null,
    }));

    const { error: scoresError } = await supabase
      .from("scores")
      .insert(scoreRecords);

    if (scoresError) {
      console.error("[AutoPipeline] Failed to insert scores:", scoresError);
    }

    // 10. Calculate final session score
    const { calculateSessionScore, calculateCriteriaScore } = await import("@/lib/scoring-engine");
    const scoreInputs = aiResult.scores.map((score) => {
      const matchingCriteria = criteria.find((c) => c.id === score.criteriaId);
      return {
        criteria: matchingCriteria as Criteria,
        value: score.value as ScoreValue,
        isNa: false,
      };
    }).filter((s) => s.criteria);

    const sessionResult = calculateSessionScore({
      template: template as Template,
      criteria: criteria as Criteria[],
      scores: scoreInputs,
    });

    // 11. Update session with final scores
    await supabase
      .from("sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_score: sessionResult.total_score,
        total_possible: sessionResult.total_possible,
        percentage_score: sessionResult.percentage_score,
        pass_status: sessionResult.pass_status,
        has_auto_fail: sessionResult.has_auto_fail,
        auto_fail_criteria_ids: sessionResult.auto_fail_criteria_ids,
      })
      .eq("id", session.id);

    // 12. Update call status
    await supabase
      .from("calls")
      .update({
        auto_analysis_status: "completed",
        auto_session_id: session.id,
        status: "analyzed",
      })
      .eq("id", callId);

    // 13. Store analysis record for backward compatibility
    if (aiResult.analysis) {
      await supabase.from("analyses").insert({
        call_id: callId,
        ai_model: aiResult.model || "gpt-4o",
        grading_results_json: aiResult.analysis,
        overall_score: sessionResult.percentage_score,
        composite_score: sessionResult.percentage_score,
        processing_time_ms: aiResult.processingTimeMs || 0,
        token_usage: aiResult.tokenUsage || {},
      });
    }

    console.log(
      "[AutoPipeline] Analysis complete for call:", callId,
      "session:", session.id,
      "score:", sessionResult.percentage_score
    );

    return {
      success: true,
      callId,
      sessionId: session.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[AutoPipeline] Analysis error:", message);

    await supabase
      .from("calls")
      .update({ auto_analysis_status: "failed", status: "failed" })
      .eq("id", callId);

    return { success: false, error: message };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Find the appropriate template for a call based on:
 * 1. Template assignment for the agent
 * 2. Org default template
 * 3. Any active template in the org
 */
async function findTemplateForCall(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  orgId: string,
  agentId?: string | null
): Promise<Template | null> {
  // 1. Check for user-specific template assignment
  if (agentId) {
    const { data: assignment } = await supabase
      .from("template_assignments")
      .select("template:templates(*)")
      .eq("user_id", agentId)
      .eq("org_id", orgId)
      .eq("is_active", true)
      .lte("effective_date", new Date().toISOString().split("T")[0])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (assignment?.template) {
      const tmpl = assignment.template as unknown as Template;
      if (tmpl.status === "active") {
        return tmpl;
      }
    }
  }

  // 2. Try org default template
  const { data: defaultTemplate } = await supabase
    .from("templates")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
    .eq("is_default", true)
    .single();

  if (defaultTemplate) {
    return defaultTemplate as unknown as Template;
  }

  // 3. Fallback: any active template in the org
  const { data: anyTemplate } = await supabase
    .from("templates")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (anyTemplate as unknown as Template) || null;
}

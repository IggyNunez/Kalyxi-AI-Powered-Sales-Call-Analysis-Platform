import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  successResponse,
  isValidUUID,
} from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/sessions/[id]/analysis - Get AI analysis + transcript for a session
export async function GET(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid session ID", 400);
    }

    const supabase = await createClient();

    // Fetch session to get call_id and verify access
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, call_id, coach_id, agent_id, org_id")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (sessionError || !session) {
      return errorResponse("Session not found", 404);
    }

    // Check access for non-admin users
    if (role !== "admin" && role !== "superadmin" && role !== "manager") {
      if (session.coach_id !== user!.id && session.agent_id !== user!.id) {
        return errorResponse("Access denied", 403);
      }
    }

    // If no linked call, return empty analysis
    if (!session.call_id) {
      return successResponse({
        analysis: null,
        transcript: null,
        meetingInfo: null,
      });
    }

    // Fetch call data and analysis in parallel
    const [callResult, analysisResult] = await Promise.all([
      supabase
        .from("calls")
        .select(
          "id, raw_notes, meet_transcript_id, meet_code, duration, call_timestamp, customer_name, customer_company, conference_record_name"
        )
        .eq("id", session.call_id)
        .single(),
      supabase
        .from("analyses")
        .select(
          "id, grading_results_json, overall_score, ai_model, processing_time_ms, token_usage, created_at"
        )
        .eq("call_id", session.call_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const call = callResult.data;
    const analysis = analysisResult.data;

    // Build transcript text - prefer meet_transcripts if available
    let transcript: string | null = null;
    let meetingInfo: Record<string, unknown> | null = null;

    if (call?.meet_transcript_id) {
      const { data: meetTranscript } = await supabase
        .from("meet_transcripts")
        .select(
          "text_content, participants, meeting_start_time, meeting_end_time, meeting_code, meeting_space_name, text_source, entries_count"
        )
        .eq("id", call.meet_transcript_id)
        .single();

      if (meetTranscript) {
        transcript = meetTranscript.text_content;
        meetingInfo = {
          meetingCode: meetTranscript.meeting_code || call.meet_code,
          startTime: meetTranscript.meeting_start_time,
          endTime: meetTranscript.meeting_end_time,
          duration: call.duration,
          participants: meetTranscript.participants,
          spaceName: meetTranscript.meeting_space_name,
          textSource: meetTranscript.text_source,
          entriesCount: meetTranscript.entries_count,
        };
      }
    }

    // Fall back to call raw_notes if no meet transcript
    if (!transcript && call?.raw_notes) {
      transcript = call.raw_notes;
      meetingInfo = {
        meetingCode: call.meet_code,
        duration: call.duration,
        startTime: call.call_timestamp,
        customerName: call.customer_name,
        customerCompany: call.customer_company,
      };
    }

    return successResponse({
      analysis: analysis?.grading_results_json || null,
      transcript,
      meetingInfo,
      analysisMetadata: analysis
        ? {
            model: analysis.ai_model,
            overallScore: analysis.overall_score,
            processingTimeMs: analysis.processing_time_ms,
            tokenUsage: analysis.token_usage,
            analyzedAt: analysis.created_at,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching session analysis:", error);
    return errorResponse("Failed to fetch analysis", 500);
  }
}

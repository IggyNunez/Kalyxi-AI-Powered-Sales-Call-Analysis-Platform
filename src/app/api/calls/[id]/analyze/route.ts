import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  requireAdmin,
  errorResponse,
  createAuditLog,
  isValidUUID,
} from "@/lib/api-utils";
import { analyzeCall } from "@/lib/ai-engine";

// POST /api/calls/[id]/analyze - Trigger analysis for a call
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid call ID", 400);
  }

  try {
    const supabase = await createClient();

    // Get call
    const { data: call, error: callError } = await supabase
      .from("calls")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (callError || !call) {
      return errorResponse("Call not found", 404);
    }

    if (!call.raw_notes) {
      return errorResponse("No content available for analysis", 400);
    }

    // Update status to processing
    await supabase
      .from("calls")
      .update({ status: "processing" })
      .eq("id", id);

    try {
      // Delete existing analysis and reports
      await supabase.from("analyses").delete().eq("call_id", id);
      await supabase.from("reports").delete().eq("call_id", id);

      // Run analysis using template system
      const content = call.raw_notes;
      const result = await analyzeCall(id, content, orgId!);

      if (!result.success || !result.analysis) {
        throw new Error(result.error || "Analysis failed");
      }

      // Save analysis
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .insert({
          call_id: id,
          ai_model: "gpt-4o",
          grading_results_json: result.analysis,
          overall_score: result.analysis.overallScore,
          composite_score: result.analysis.compositeScore,
          processing_time_ms: result.processingTimeMs,
          token_usage: result.tokenUsage,
        })
        .select()
        .single();

      if (analysisError) {
        throw new Error("Failed to save analysis");
      }

      // Generate and save report
      const reportJson = {
        version: "2.0",
        generatedAt: new Date().toISOString(),
        callSummary: {
          title: `Call Analysis - ${call.customer_name || "Unknown Customer"}`,
          date: call.call_timestamp,
          duration: call.duration,
          callerName: "Unknown",
          customerInfo: {
            name: call.customer_name,
            company: call.customer_company,
          },
        },
        analysis: result.analysis,
        scorecard: {
          criteria: result.analysis.gradingResults.map((r: { criterionName: string; score: number }) => ({
            name: r.criterionName,
            score: r.score || 0,
            weight: 1,
            passed: (r.score || 0) >= 70,
          })),
          finalScore: result.analysis.compositeScore,
          passed: result.analysis.compositeScore >= 70,
        },
        coaching: {
          topStrengths: result.analysis.strengths.slice(0, 3),
          priorityImprovements: result.analysis.improvements.slice(0, 3),
          actionPlan: result.analysis.recommendations.slice(0, 5),
        },
      };

      await supabase.from("reports").insert({
        call_id: id,
        analysis_id: analysis.id,
        report_json: reportJson,
        status: "ready",
      });

      // Update call status
      await supabase
        .from("calls")
        .update({ status: "analyzed" })
        .eq("id", id);

      // Audit log
      await createAuditLog(
        orgId!,
        user!.id,
        "call.analyzed",
        "call",
        id,
        undefined,
        {
          overall_score: result.analysis.overallScore,
          composite_score: result.analysis.compositeScore,
          processing_time_ms: result.processingTimeMs,
        },
        request
      );

      // Return updated call with analysis
      const { data: updatedCall } = await supabase
        .from("calls")
        .select(`
          *,
          analyses(
            id,
            ai_model,
            grading_results_json,
            overall_score,
            composite_score,
            processing_time_ms,
            created_at
          ),
          reports(
            id,
            report_json,
            status,
            created_at
          )
        `)
        .eq("id", id)
        .single();

      return NextResponse.json({ data: updatedCall });
    } catch (error) {
      // Update call status to failed
      await supabase
        .from("calls")
        .update({ status: "failed" })
        .eq("id", id);

      throw error;
    }
  } catch (error) {
    console.error("Analysis error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to analyze call",
      500
    );
  }
}

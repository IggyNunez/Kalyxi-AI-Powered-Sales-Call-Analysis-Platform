import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  requireAuth,
  requireAdmin,
  errorResponse,
  createAuditLog,
  isValidUUID,
} from "@/lib/api-utils";

// GET /api/calls/[id] - Get single call with full details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid call ID", 400);
  }

  try {
    const supabase = await createClient();

    const { data: call, error } = await supabase
      .from("calls")
      .select(`
        *,
        caller:callers(id, name, email, team, department),
        analyses(
          id,
          ai_model,
          grading_results_json,
          overall_score,
          composite_score,
          processing_time_ms,
          token_usage,
          created_at
        ),
        reports(
          id,
          report_json,
          status,
          pdf_url,
          created_at
        )
      `)
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !call) {
      return errorResponse("Call not found", 404);
    }

    // For callers role, verify they own this call
    if (role === "caller") {
      const { data: callerData } = await supabase
        .from("callers")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!callerData || call.caller_id !== callerData.id) {
        return errorResponse("Forbidden", 403);
      }
    }

    return NextResponse.json({ data: call });
  } catch (error) {
    console.error("Error fetching call:", error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/calls/[id] - Delete call
export async function DELETE(
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

    // Get call for audit log
    const { data: call } = await supabase
      .from("calls")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (!call) {
      return errorResponse("Call not found", 404);
    }

    // Delete call (cascades to analyses, reports, etc.)
    const { error } = await supabase
      .from("calls")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId!);

    if (error) {
      console.error("Error deleting call:", error);
      return errorResponse("Failed to delete call", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "call.deleted",
      "call",
      id,
      call,
      undefined,
      request
    );

    return NextResponse.json({ message: "Call deleted successfully" });
  } catch (error) {
    console.error("Error in call DELETE:", error);
    return errorResponse("Internal server error", 500);
  }
}

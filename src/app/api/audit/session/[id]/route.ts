/**
 * Session Audit Log API
 *
 * GET /api/audit/session/[id] - Get audit log for a session
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  successResponse,
  isValidUUID,
  getPaginationParams,
} from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/audit/session/[id] - Get session audit log
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
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    // Verify session exists and user has access
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, coach_id, agent_id")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (sessionError || !session) {
      return errorResponse("Session not found", 404);
    }

    // Check access - only coach, agent, or admin can view audit log
    const isAdmin = role === "admin" || role === "superadmin" || role === "manager";
    if (!isAdmin && session.coach_id !== user!.id && session.agent_id !== user!.id) {
      return errorResponse("Access denied", 403);
    }

    // Fetch audit log entries
    const { data: auditLog, error, count } = await supabase
      .from("session_audit_log")
      .select(
        `
        *,
        user:user_id (id, full_name, email)
      `,
        { count: "exact" }
      )
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Error fetching session audit log:", error);
      return errorResponse("Failed to fetch audit log", 500);
    }

    return NextResponse.json({
      data: auditLog,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching session audit log:", error);
    return errorResponse("Failed to fetch audit log", 500);
  }
}

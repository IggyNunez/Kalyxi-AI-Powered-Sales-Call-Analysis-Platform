import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  requireRole,
  errorResponse,
  successResponse,
  getPaginationParams,
  getSortParams,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";
import { SessionStatus } from "@/types/database";

// Validation schema for creating sessions
const sessionSchema = z.object({
  template_id: z.string().uuid(),
  call_id: z.string().uuid().optional().nullable(),
  agent_id: z.string().uuid().optional().nullable(),
  google_event_id: z.string().optional().nullable(),
  google_event_title: z.string().optional().nullable(),
  google_event_start: z.string().datetime().optional().nullable(),
  google_event_end: z.string().datetime().optional().nullable(),
  coach_notes: z.string().max(5000).optional().nullable(),
});

interface RouteParams {
  params: Promise<Record<string, string>>;
}

// GET /api/sessions - List sessions
export async function GET(request: Request) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortParams(
      searchParams,
      [
        "created_at",
        "updated_at",
        "started_at",
        "completed_at",
        "status",
        "percentage_score",
      ],
      "created_at"
    );

    // Filters
    const status = searchParams.get("status") as SessionStatus | null;
    const templateId = searchParams.get("template_id");
    const coachId = searchParams.get("coach_id");
    const agentId = searchParams.get("agent_id");
    const callId = searchParams.get("call_id");
    const passStatus = searchParams.get("pass_status");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const mySessionsOnly = searchParams.get("my_sessions") === "true";

    let query = supabase
      .from("sessions")
      .select(
        `
        *,
        templates:template_id (id, name, use_case, scoring_method),
        coach:coach_id (id, name, email),
        agent:agent_id (id, name, email),
        calls:call_id (id, customer_name, call_timestamp)
      `,
        { count: "exact" }
      )
      .eq("org_id", orgId!);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (templateId && isValidUUID(templateId)) {
      query = query.eq("template_id", templateId);
    }

    if (coachId && isValidUUID(coachId)) {
      query = query.eq("coach_id", coachId);
    }

    if (agentId && isValidUUID(agentId)) {
      query = query.eq("agent_id", agentId);
    }

    if (callId && isValidUUID(callId)) {
      query = query.eq("call_id", callId);
    }

    if (passStatus) {
      query = query.eq("pass_status", passStatus);
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    // For non-admin users, only show sessions where they are coach or agent
    if (mySessionsOnly || (role !== "admin" && role !== "superadmin" && role !== "manager")) {
      query = query.or(`coach_id.eq.${user!.id},agent_id.eq.${user!.id}`);
    }

    // Sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data: sessions, error, count } = await query;

    if (error) {
      console.error("Error fetching sessions:", error);
      return errorResponse("Failed to fetch sessions", 500);
    }

    return NextResponse.json({
      data: sessions,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return errorResponse("Failed to fetch sessions", 500);
  }
}

// POST /api/sessions - Create session
export async function POST(request: Request) {
  const { user, orgId, response } = await requireRole([
    "admin",
    "superadmin",
    "manager",
    "coach",
  ]);
  if (response) return response;

  try {
    const body = await request.json();
    const validationResult = sessionSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const sessionData = validationResult.data;

    const supabase = await createClient();

    // Verify template exists and is active
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, status, version, name, scoring_method, use_case, pass_threshold, settings")
      .eq("id", sessionData.template_id)
      .eq("org_id", orgId!)
      .single();

    if (templateError || !template) {
      return errorResponse("Template not found", 404);
    }

    if (template.status !== "active") {
      return errorResponse("Cannot create session with inactive template", 400);
    }

    // Verify call exists if provided
    if (sessionData.call_id) {
      const { data: call, error: callError } = await supabase
        .from("calls")
        .select("id")
        .eq("id", sessionData.call_id)
        .eq("org_id", orgId!)
        .single();

      if (callError || !call) {
        return errorResponse("Call not found", 404);
      }
    }

    // Verify agent exists if provided
    if (sessionData.agent_id) {
      const { data: agent, error: agentError } = await supabase
        .from("users")
        .select("id")
        .eq("id", sessionData.agent_id)
        .eq("org_id", orgId!)
        .single();

      if (agentError || !agent) {
        return errorResponse("Agent not found", 404);
      }
    }

    // Fetch template groups and criteria for snapshot
    const { data: groups } = await supabase
      .from("criteria_groups")
      .select("*")
      .eq("template_id", sessionData.template_id)
      .order("sort_order", { ascending: true });

    const { data: criteria } = await supabase
      .from("criteria")
      .select("*")
      .eq("template_id", sessionData.template_id)
      .order("sort_order", { ascending: true });

    // Create template snapshot
    const templateSnapshot = {
      template: {
        id: template.id,
        name: template.name,
        scoring_method: template.scoring_method,
        use_case: template.use_case,
        pass_threshold: template.pass_threshold,
        settings: template.settings,
      },
      groups: groups || [],
      criteria: criteria || [],
    };

    // Create session
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        org_id: orgId!,
        template_id: sessionData.template_id,
        call_id: sessionData.call_id,
        coach_id: user!.id,
        agent_id: sessionData.agent_id,
        status: "pending",
        google_event_id: sessionData.google_event_id,
        google_event_title: sessionData.google_event_title,
        google_event_start: sessionData.google_event_start,
        google_event_end: sessionData.google_event_end,
        coach_notes: sessionData.coach_notes,
        template_version: template.version,
        template_snapshot: templateSnapshot,
        pass_status: "pending",
      })
      .select(
        `
        *,
        templates:template_id (id, name, use_case, scoring_method),
        coach:coach_id (id, name, email),
        agent:agent_id (id, name, email),
        calls:call_id (id, customer_name, call_timestamp)
      `
      )
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return errorResponse("Failed to create session", 500);
    }

    // Create audit log entry
    await supabase.from("session_audit_log").insert({
      session_id: session.id,
      user_id: user!.id,
      action: "created",
      details: {
        template_id: sessionData.template_id,
        agent_id: sessionData.agent_id,
        call_id: sessionData.call_id,
      },
    });

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "create",
      "session",
      session.id,
      undefined,
      { template_id: sessionData.template_id, agent_id: sessionData.agent_id },
      request
    );

    return successResponse(session, 201);
  } catch (error) {
    console.error("Error creating session:", error);
    return errorResponse("Failed to create session", 500);
  }
}

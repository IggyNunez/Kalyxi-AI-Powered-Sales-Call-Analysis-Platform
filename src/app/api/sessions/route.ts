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
    const statusParam = searchParams.get("status");
    const templateId = searchParams.get("template_id");
    const coachId = searchParams.get("coach_id");
    const agentId = searchParams.get("agent_id");
    const callId = searchParams.get("call_id");
    const passStatus = searchParams.get("pass_status");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const mySessionsOnly = searchParams.get("my_sessions") === "true";

    // Note: sessions.coach_id and sessions.agent_id reference auth.users, not public.users
    // So we can't use automatic Supabase joins for those. We fetch sessions first,
    // then separately fetch user data and merge it.
    let query = supabase
      .from("sessions")
      .select(
        `
        *,
        templates (id, name, use_case, scoring_method),
        calls (id, customer_name, call_timestamp)
      `,
        { count: "exact" }
      )
      .eq("org_id", orgId!);

    // Apply filters - support comma-separated status values
    if (statusParam) {
      const statuses = statusParam.split(",").map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        query = query.eq("status", statuses[0]);
      } else if (statuses.length > 1) {
        query = query.in("status", statuses);
      }
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

    // Fetch coach and agent user data separately
    // (sessions.coach_id and agent_id reference auth.users, not public.users directly)
    let sessionsWithUsers = sessions || [];

    if (sessions && sessions.length > 0) {
      // Collect unique user IDs
      const userIds = new Set<string>();
      for (const session of sessions) {
        if (session.coach_id) userIds.add(session.coach_id);
        if (session.agent_id) userIds.add(session.agent_id);
      }

      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", Array.from(userIds));

        // Create a lookup map
        const userMap = new Map<string, { id: string; name: string; email: string }>();
        if (users) {
          for (const u of users) {
            userMap.set(u.id, u);
          }
        }

        // Merge user data into sessions
        sessionsWithUsers = sessions.map((session) => ({
          ...session,
          coach: session.coach_id ? userMap.get(session.coach_id) || null : null,
          agent: session.agent_id ? userMap.get(session.agent_id) || null : null,
        }));
      }
    }

    return NextResponse.json({
      data: sessionsWithUsers,
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

    // Validate template has criteria
    if (!criteria || criteria.length === 0) {
      return errorResponse(
        "Cannot create session: Template has no criteria. Please add criteria to the template first.",
        400
      );
    }

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
        templates (id, name, use_case, scoring_method),
        calls (id, customer_name, call_timestamp)
      `
      )
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return errorResponse("Failed to create session", 500);
    }

    // Fetch coach and agent user data separately
    const userIds = [session.coach_id, session.agent_id].filter(Boolean);
    let sessionWithUsers = { ...session, coach: null as { id: string; name: string; email: string } | null, agent: null as { id: string; name: string; email: string } | null };

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
        sessionWithUsers.coach = session.coach_id ? userMap.get(session.coach_id) || null : null;
        sessionWithUsers.agent = session.agent_id ? userMap.get(session.agent_id) || null : null;
      }
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

    return successResponse(sessionWithUsers, 201);
  } catch (error) {
    console.error("Error creating session:", error);
    return errorResponse("Failed to create session", 500);
  }
}

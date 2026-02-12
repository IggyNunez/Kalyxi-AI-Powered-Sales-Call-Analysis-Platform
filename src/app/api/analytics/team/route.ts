import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  getPaginationParams,
  getSortParams,
} from "@/lib/api-utils";
import type {
  TeamAnalyticsResponse,
  UserAnalytics,
  TeamAnalyticsSummary,
  SimplifiedRole,
} from "@/types/analytics";

// GET /api/analytics/team - Get team analytics with user metrics
export async function GET(request: NextRequest) {
  const { user, orgId, role, response } = await requireAuth();

  if (response) return response;
  if (!user || !orgId || !role) {
    return errorResponse("Unauthorized", 401);
  }

  // Only admins and superadmins can view team analytics
  if (!["admin", "superadmin"].includes(role)) {
    return errorResponse("Forbidden: Admin access required", 403);
  }

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Parse query params
  const { page, pageSize, offset } = getPaginationParams(searchParams, 20, 100);
  const { sortBy, sortOrder } = getSortParams(
    searchParams,
    ["name", "email", "role", "createdAt", "averageScore", "totalSessions", "lastActive"],
    "name",
    "asc"
  );

  const search = searchParams.get("search") || "";
  const roleFilter = searchParams.get("role") || "all";
  const includeSuspended = searchParams.get("includeSuspended") === "true";

  try {
    // Build base query for users
    let usersQuery = supabase
      .from("users")
      .select("*", { count: "exact" });

    // Superadmins can see all orgs, admins only their own org
    if (role !== "superadmin") {
      usersQuery = usersQuery.eq("org_id", orgId);
    }

    // Apply filters
    if (search) {
      usersQuery = usersQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (roleFilter !== "all") {
      usersQuery = usersQuery.eq("role", roleFilter);
    }

    if (!includeSuspended) {
      // Filter out suspended users - check if profiles has the column
      // For now, we assume is_active indicates not suspended
      usersQuery = usersQuery.eq("is_active", true);
    }

    // Get total count first
    const { count: totalCount } = await usersQuery;

    // Apply sorting and pagination
    const sortColumn = mapSortField(sortBy);
    usersQuery = usersQuery
      .order(sortColumn, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return errorResponse("Failed to fetch users", 500);
    }

    // Get user IDs for batch queries
    const userIds = users?.map((u) => u.id) || [];

    // Batch fetch session metrics for all users
    const sessionMetrics = await getSessionMetrics(supabase, userIds, role === "superadmin" ? null : orgId);

    // Batch fetch call metrics for all users
    const callMetrics = await getCallMetrics(supabase, userIds, role === "superadmin" ? null : orgId);

    // Build user analytics array
    const userAnalytics: UserAnalytics[] = (users || []).map((u) => {
      const sessions = sessionMetrics[u.id] || { total: 0, completed: 0, avgScore: null, passRate: null, coached: 0, avgCoachScore: null };
      const calls = callMetrics[u.id] || { total: 0, analyzed: 0 };

      return {
        id: u.id,
        name: u.name || "Unknown",
        email: u.email,
        role: mapToSimplifiedRole(u.role),
        avatar_url: u.avatar_url,
        lastActive: u.last_login_at,
        createdAt: u.created_at,
        suspended: !u.is_active,
        suspendedAt: null, // Will be populated from profiles if needed
        suspensionReason: null,
        totalSessions: sessions.total,
        completedSessions: sessions.completed,
        averageScore: sessions.avgScore,
        passRate: sessions.passRate,
        sessionsCoached: sessions.coached,
        avgCoachingScore: sessions.avgCoachScore,
        totalCalls: calls.total,
        analyzedCalls: calls.analyzed,
      };
    });

    // Calculate summary metrics
    const summary = await calculateSummary(supabase, role === "superadmin" ? null : orgId);

    const responseData: TeamAnalyticsResponse = {
      users: userAnalytics,
      summary,
      pagination: {
        page,
        pageSize,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize),
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error in team analytics:", error);
    return errorResponse("Internal server error", 500);
  }
}

// Map frontend sort field to database column
function mapSortField(field: string): string {
  const mapping: Record<string, string> = {
    name: "name",
    email: "email",
    role: "role",
    createdAt: "created_at",
    lastActive: "last_login_at",
    // These are computed fields, fallback to name
    averageScore: "name",
    totalSessions: "name",
  };
  return mapping[field] || "name";
}

// Map old roles to simplified roles
function mapToSimplifiedRole(role: string): SimplifiedRole {
  if (role === "superadmin") return "superadmin";
  if (["admin", "manager", "coach"].includes(role)) return "admin";
  return "user";
}

// Batch fetch session metrics for users
async function getSessionMetrics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
  orgId: string | null
) {
  if (userIds.length === 0) return {};

  const metrics: Record<string, {
    total: number;
    completed: number;
    avgScore: number | null;
    passRate: number | null;
    coached: number;
    avgCoachScore: number | null;
  }> = {};

  // Initialize all users with empty metrics
  userIds.forEach((id) => {
    metrics[id] = { total: 0, completed: 0, avgScore: null, passRate: null, coached: 0, avgCoachScore: null };
  });

  // Get sessions where user is the agent (being reviewed)
  let agentQuery = supabase
    .from("sessions")
    .select("agent_id, status, percentage_score, pass_status")
    .in("agent_id", userIds);

  if (orgId) {
    agentQuery = agentQuery.eq("org_id", orgId);
  }

  const { data: agentSessions } = await agentQuery;

  // Get sessions where user is the coach (doing the review)
  let coachQuery = supabase
    .from("sessions")
    .select("coach_id, status, percentage_score")
    .in("coach_id", userIds);

  if (orgId) {
    coachQuery = coachQuery.eq("org_id", orgId);
  }

  const { data: coachSessions } = await coachQuery;

  // Process agent sessions (being reviewed)
  if (agentSessions) {
    const byAgent: Record<string, typeof agentSessions> = {};
    agentSessions.forEach((s) => {
      if (s.agent_id) {
        if (!byAgent[s.agent_id]) byAgent[s.agent_id] = [];
        byAgent[s.agent_id].push(s);
      }
    });

    Object.entries(byAgent).forEach(([agentId, sessions]) => {
      if (!metrics[agentId]) return;

      const completed = sessions.filter((s) => s.status === "completed" || s.status === "reviewed");
      const withScores = completed.filter((s) => s.percentage_score !== null);
      const passed = completed.filter((s) => s.pass_status === "pass");

      metrics[agentId].total = sessions.length;
      metrics[agentId].completed = completed.length;
      metrics[agentId].avgScore = withScores.length > 0
        ? withScores.reduce((sum, s) => sum + (s.percentage_score || 0), 0) / withScores.length
        : null;
      metrics[agentId].passRate = completed.length > 0
        ? (passed.length / completed.length) * 100
        : null;
    });
  }

  // Process coach sessions (doing reviews)
  if (coachSessions) {
    const byCoach: Record<string, typeof coachSessions> = {};
    coachSessions.forEach((s) => {
      if (s.coach_id) {
        if (!byCoach[s.coach_id]) byCoach[s.coach_id] = [];
        byCoach[s.coach_id].push(s);
      }
    });

    Object.entries(byCoach).forEach(([coachId, sessions]) => {
      if (!metrics[coachId]) return;

      const completed = sessions.filter((s) => s.status === "completed" || s.status === "reviewed");
      const withScores = completed.filter((s) => s.percentage_score !== null);

      metrics[coachId].coached = sessions.length;
      metrics[coachId].avgCoachScore = withScores.length > 0
        ? withScores.reduce((sum, s) => sum + (s.percentage_score || 0), 0) / withScores.length
        : null;
    });
  }

  return metrics;
}

// Batch fetch call metrics for users
async function getCallMetrics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
  orgId: string | null
) {
  if (userIds.length === 0) return {};

  const metrics: Record<string, { total: number; analyzed: number }> = {};

  userIds.forEach((id) => {
    metrics[id] = { total: 0, analyzed: 0 };
  });

  // Get callers linked to users
  let callersQuery = supabase
    .from("callers")
    .select("id, user_id")
    .in("user_id", userIds);

  if (orgId) {
    callersQuery = callersQuery.eq("org_id", orgId);
  }

  const { data: callers } = await callersQuery;

  if (!callers || callers.length === 0) return metrics;

  const callerIds = callers.map((c) => c.id);
  const callerToUser: Record<string, string> = {};
  callers.forEach((c) => {
    if (c.user_id) callerToUser[c.id] = c.user_id;
  });

  // Get calls for these callers
  let callsQuery = supabase
    .from("calls")
    .select("caller_id, status")
    .in("caller_id", callerIds);

  if (orgId) {
    callsQuery = callsQuery.eq("org_id", orgId);
  }

  const { data: calls } = await callsQuery;

  if (calls) {
    calls.forEach((call) => {
      const userId = callerToUser[call.caller_id];
      if (userId && metrics[userId]) {
        metrics[userId].total++;
        if (call.status === "analyzed") {
          metrics[userId].analyzed++;
        }
      }
    });
  }

  return metrics;
}

// Calculate summary metrics
async function calculateSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string | null
): Promise<TeamAnalyticsSummary> {
  // Get user counts
  let usersQuery = supabase
    .from("users")
    .select("id, is_active", { count: "exact" });

  if (orgId) {
    usersQuery = usersQuery.eq("org_id", orgId);
  }

  const { data: users, count: totalUsers } = await usersQuery;

  const activeUsers = users?.filter((u) => u.is_active).length || 0;
  const suspendedUsers = (totalUsers || 0) - activeUsers;

  // Get session stats
  let sessionsQuery = supabase
    .from("sessions")
    .select("id, status, percentage_score, pass_status");

  if (orgId) {
    sessionsQuery = sessionsQuery.eq("org_id", orgId);
  }

  const { data: sessions } = await sessionsQuery;

  const totalSessions = sessions?.length || 0;
  const completedSessions = sessions?.filter(
    (s) => s.status === "completed" || s.status === "reviewed"
  ).length || 0;

  const withScores = sessions?.filter((s) => s.percentage_score !== null) || [];
  const avgTeamScore = withScores.length > 0
    ? withScores.reduce((sum, s) => sum + (s.percentage_score || 0), 0) / withScores.length
    : null;

  const passed = sessions?.filter((s) => s.pass_status === "pass").length || 0;
  const avgPassRate = completedSessions > 0
    ? (passed / completedSessions) * 100
    : null;

  return {
    totalUsers: totalUsers || 0,
    activeUsers,
    suspendedUsers,
    avgTeamScore,
    avgPassRate,
    totalSessions,
    completedSessions,
  };
}

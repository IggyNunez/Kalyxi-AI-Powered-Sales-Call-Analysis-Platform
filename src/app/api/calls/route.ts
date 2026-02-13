import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  requireAuth,
  getPaginationParams,
  getSortParams,
  errorResponse,
  isValidUUID,
} from "@/lib/api-utils";

// GET /api/calls - List calls (auto-captured from Google Meet)
export async function GET(request: Request) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortParams(
      searchParams,
      ["call_timestamp", "created_at", "status", "customer_name"],
      "call_timestamp",
      "desc"
    );

    // Build query
    let query = supabase
      .from("calls")
      .select(`
        *,
        analyses(id, overall_score, composite_score, created_at)
      `, { count: "exact" })
      .eq("org_id", orgId!);

    // For caller role, only show calls where they are the agent
    if (role === "caller") {
      query = query.eq("agent_id", user!.id);
    }

    // Filter by status
    const status = searchParams.get("status");
    if (status) {
      query = query.eq("status", status);
    }

    // Filter by date range
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    if (startDate) {
      query = query.gte("call_timestamp", startDate);
    }
    if (endDate) {
      query = query.lte("call_timestamp", endDate);
    }

    // Search by customer name or company
    const search = searchParams.get("search");
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_company.ilike.%${search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data: calls, count, error } = await query;

    if (error) {
      console.error("Error fetching calls:", error);
      return errorResponse("Failed to fetch calls", 500);
    }

    return NextResponse.json({
      data: calls,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in calls GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

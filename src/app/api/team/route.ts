import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  getPaginationParams,
} from "@/lib/api-utils";

// GET /api/team - List team members in the organization
export async function GET(request: Request) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    // Optional filters
    const roleFilter = searchParams.get("role");
    const isActive = searchParams.get("is_active");
    const search = searchParams.get("search");

    let query = supabase
      .from("users")
      .select("id, name, email, role, avatar_url, is_active, created_at", {
        count: "exact",
      })
      .eq("org_id", orgId!);

    // Apply filters
    if (roleFilter) {
      const roles = roleFilter.split(",").map((r) => r.trim()).filter(Boolean);
      if (roles.length === 1) {
        query = query.eq("role", roles[0]);
      } else if (roles.length > 1) {
        query = query.in("role", roles);
      }
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Order and paginate
    query = query
      .order("name", { ascending: true })
      .range(offset, offset + pageSize - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error("Error fetching team members:", error);
      return errorResponse("Failed to fetch team members", 500);
    }

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return errorResponse("Failed to fetch team members", 500);
  }
}

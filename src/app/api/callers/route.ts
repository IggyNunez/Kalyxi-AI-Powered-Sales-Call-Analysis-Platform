import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requireAdmin,
  getPaginationParams,
  getSortParams,
  errorResponse,
  createAuditLog,
  sanitizeInput,
} from "@/lib/api-utils";

const createCallerSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().optional(),
  team: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/callers - List callers
export async function GET(request: Request) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortParams(
      searchParams,
      ["name", "team", "created_at"],
      "name",
      "asc"
    );

    // Build query
    let query = supabase
      .from("callers")
      .select("*, user:users(id, name, email, avatar_url)", { count: "exact" })
      .eq("org_id", orgId!);

    // For callers role, only show their own profile
    if (role === "caller") {
      query = query.eq("user_id", user!.id);
    }

    // Filter by team
    const team = searchParams.get("team");
    if (team) {
      query = query.eq("team", team);
    }

    // Filter by active status
    const active = searchParams.get("active");
    if (active === "true") {
      query = query.eq("is_active", true);
    } else if (active === "false") {
      query = query.eq("is_active", false);
    }

    // Search by name
    const search = searchParams.get("search");
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data: callers, count, error } = await query;

    if (error) {
      console.error("Error fetching callers:", error);
      return errorResponse("Failed to fetch callers", 500);
    }

    return NextResponse.json({
      data: callers,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in callers GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/callers - Create caller
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const validatedData = createCallerSchema.parse(body);

    const supabase = await createClient();

    // Check for duplicate email in org
    if (validatedData.email) {
      const { data: existing } = await supabase
        .from("callers")
        .select("id")
        .eq("org_id", orgId!)
        .eq("email", validatedData.email)
        .single();

      if (existing) {
        return errorResponse("A caller with this email already exists", 400);
      }
    }

    // Create caller
    const { data: caller, error } = await supabase
      .from("callers")
      .insert({
        org_id: orgId!,
        name: sanitizeInput(validatedData.name),
        email: validatedData.email,
        team: validatedData.team ? sanitizeInput(validatedData.team) : null,
        department: validatedData.department ? sanitizeInput(validatedData.department) : null,
        metadata: validatedData.metadata || {},
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating caller:", error);
      return errorResponse("Failed to create caller", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "caller.created",
      "caller",
      caller.id,
      undefined,
      { name: caller.name, email: caller.email },
      request
    );

    return NextResponse.json({ data: caller }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || "Validation failed", 400);
    }
    console.error("Error in callers POST:", error);
    return errorResponse("Internal server error", 500);
  }
}

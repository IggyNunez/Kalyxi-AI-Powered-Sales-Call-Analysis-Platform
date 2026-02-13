import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  requireAdmin,
  errorResponse,
  successResponse,
  getPaginationParams,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";

const skillSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: z
    .enum([
      "communication",
      "sales_technique",
      "product_knowledge",
      "objection_handling",
      "closing",
      "discovery",
      "rapport",
      "presentation",
      "general",
    ])
    .default("general"),
  parent_skill_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
});

// GET /api/skills - List skills
export async function GET(request: Request) {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const category = searchParams.get("category");
    const isActive = searchParams.get("is_active");
    const search = searchParams.get("search");

    let query = supabase
      .from("skills")
      .select("*", { count: "exact" })
      .eq("org_id", orgId!);

    if (category) query = query.eq("category", category);
    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }
    if (search) query = query.ilike("name", `%${search}%`);

    query = query
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching skills:", error);
      return errorResponse("Failed to fetch skills", 500);
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching skills:", error);
    return errorResponse("Failed to fetch skills", 500);
  }
}

// POST /api/skills - Create skill
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const result = skillSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        `Validation error: ${result.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("skills")
      .insert({
        org_id: orgId!,
        ...result.data,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return errorResponse("A skill with this name already exists", 409);
      }
      console.error("Error creating skill:", error);
      return errorResponse("Failed to create skill", 500);
    }

    await createAuditLog(
      orgId!,
      user!.id,
      "create",
      "skill",
      data.id,
      undefined,
      { name: result.data.name, category: result.data.category },
      request
    );

    return successResponse(data, 201);
  } catch (error) {
    console.error("Error creating skill:", error);
    return errorResponse("Failed to create skill", 500);
  }
}

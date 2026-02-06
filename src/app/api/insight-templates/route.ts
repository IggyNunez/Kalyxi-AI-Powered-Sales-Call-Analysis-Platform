import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  requireAdmin,
  errorResponse,
  successResponse,
  getPaginationParams,
  getSortParams,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";

// Validation schema for creating/updating insight templates
const insightTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: z.enum(["general", "coaching", "performance", "compliance", "custom"]).optional(),
  prompt_template: z.string().min(10).max(5000),
  output_format: z.enum(["text", "bullets", "numbered", "json"]).optional(),
  max_insights: z.number().min(1).max(20).optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().min(0).optional(),
});

// GET /api/insight-templates - List insight templates
export async function GET(request: Request) {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortParams(
      searchParams,
      ["name", "category", "display_order", "created_at", "updated_at"],
      "display_order"
    );

    // Filters
    const category = searchParams.get("category");
    const isActive = searchParams.get("is_active");
    const isDefault = searchParams.get("is_default");

    let query = supabase
      .from("insight_templates")
      .select("*", { count: "exact" })
      .eq("org_id", orgId!);

    if (category) {
      query = query.eq("category", category);
    }

    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    if (isDefault === "true") {
      query = query.eq("is_default", true);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data: templates, error, count } = await query;

    if (error) {
      console.error("Error fetching insight templates:", error);
      return errorResponse("Failed to fetch insight templates", 500);
    }

    return NextResponse.json({
      data: templates,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching insight templates:", error);
    return errorResponse("Failed to fetch insight templates", 500);
  }
}

// POST /api/insight-templates - Create insight template
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const validationResult = insightTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const {
      name,
      description,
      category,
      prompt_template,
      output_format,
      max_insights,
      is_active,
      is_default,
      display_order,
    } = validationResult.data;

    const supabase = await createClient();

    // Get highest display order if not provided
    let order = display_order;
    if (order === undefined) {
      const { data: maxOrder } = await supabase
        .from("insight_templates")
        .select("display_order")
        .eq("org_id", orgId!)
        .order("display_order", { ascending: false })
        .limit(1)
        .single();

      order = (maxOrder?.display_order ?? -1) + 1;
    }

    const { data: template, error } = await supabase
      .from("insight_templates")
      .insert({
        org_id: orgId!,
        name,
        description,
        category: category || "general",
        prompt_template,
        output_format: output_format || "text",
        max_insights: max_insights || 5,
        is_active: is_active ?? true,
        is_default: is_default ?? false,
        display_order: order,
        created_by: user!.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating insight template:", error);
      return errorResponse("Failed to create insight template", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "create",
      "insight_template",
      template.id,
      undefined,
      { name, category: category || "general" },
      request
    );

    return successResponse(template, 201);
  } catch (error) {
    console.error("Error creating insight template:", error);
    return errorResponse("Failed to create insight template", 500);
  }
}

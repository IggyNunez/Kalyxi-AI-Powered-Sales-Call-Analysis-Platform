import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  requireRole,
  errorResponse,
  successResponse,
  getPaginationParams,
  getSortParams,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";
import {
  TemplateSettings,
  ScoringMethod,
  TemplateUseCase,
  TemplateStatus,
} from "@/types/database";

// Default template settings
const defaultSettings: TemplateSettings = {
  allow_na: true,
  require_comments_below_threshold: false,
  comments_threshold: 50,
  auto_calculate: true,
  show_weights_to_agents: true,
  allow_partial_submission: false,
};

// Validation schema for creating templates
const templateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  scoring_method: z
    .enum(["weighted", "simple_average", "pass_fail", "points", "custom_formula"])
    .default("weighted"),
  use_case: z
    .enum(["sales_call", "onboarding", "qa_review", "training", "custom"])
    .default("sales_call"),
  pass_threshold: z.number().min(0).max(100).default(70),
  max_total_score: z.number().min(1).max(10000).default(100),
  settings: z
    .object({
      allow_na: z.boolean().optional(),
      require_comments_below_threshold: z.boolean().optional(),
      comments_threshold: z.number().min(0).max(100).optional(),
      auto_calculate: z.boolean().optional(),
      show_weights_to_agents: z.boolean().optional(),
      allow_partial_submission: z.boolean().optional(),
    })
    .optional(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  is_default: z.boolean().default(false),
});

// GET /api/templates - List templates
export async function GET(request: Request) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortParams(
      searchParams,
      ["name", "status", "use_case", "scoring_method", "created_at", "updated_at", "version"],
      "created_at"
    );

    // Filters
    const status = searchParams.get("status") as TemplateStatus | null;
    const useCase = searchParams.get("use_case") as TemplateUseCase | null;
    const scoringMethod = searchParams.get("scoring_method") as ScoringMethod | null;
    const isDefault = searchParams.get("is_default");
    const search = searchParams.get("search");

    let query = supabase
      .from("templates")
      .select("*", { count: "exact" })
      .eq("org_id", orgId!);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (useCase) {
      query = query.eq("use_case", useCase);
    }

    if (scoringMethod) {
      query = query.eq("scoring_method", scoringMethod);
    }

    if (isDefault === "true") {
      query = query.eq("is_default", true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data: templates, error, count } = await query;

    if (error) {
      console.error("Error fetching templates:", error);
      return errorResponse("Failed to fetch templates", 500);
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
    console.error("Error fetching templates:", error);
    return errorResponse("Failed to fetch templates", 500);
  }
}

// POST /api/templates - Create template
export async function POST(request: Request) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const body = await request.json();
    const validationResult = templateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const {
      name,
      description,
      scoring_method,
      use_case,
      pass_threshold,
      max_total_score,
      settings,
      status,
      is_default,
    } = validationResult.data;

    const supabase = await createClient();

    // If setting as default and active, unset other defaults first
    if (is_default && status === "active") {
      await supabase
        .from("templates")
        .update({ is_default: false })
        .eq("org_id", orgId!)
        .eq("is_default", true);
    }

    // Merge provided settings with defaults
    const mergedSettings: TemplateSettings = {
      ...defaultSettings,
      ...settings,
    };

    const { data: template, error } = await supabase
      .from("templates")
      .insert({
        org_id: orgId!,
        name,
        description,
        scoring_method,
        use_case,
        pass_threshold,
        max_total_score,
        settings: mergedSettings,
        status,
        is_default: is_default && status === "active" ? true : false,
        created_by: user!.id,
        activated_at: status === "active" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating template:", error);
      return errorResponse("Failed to create template", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "create",
      "template",
      template.id,
      undefined,
      { name, status, use_case },
      request
    );

    return successResponse(template, 201);
  } catch (error) {
    console.error("Error creating template:", error);
    return errorResponse("Failed to create template", 500);
  }
}

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
import { ScorecardCriterion } from "@/types/database";

// Validation schema for scorecard criteria
const criterionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  weight: z.number().min(1).max(100),
  max_score: z.number().min(1).max(100),
  scoring_guide: z.string().max(1000),
  keywords: z.array(z.string()).optional(),
  order: z.number().min(0),
});

// Validation schema for creating/updating scorecards
const scorecardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  criteria: z.array(criterionSchema).min(1),
  total_weight: z.number().min(100).max(100), // Must equal 100
  status: z.enum(["draft", "active", "archived"]).optional(),
  is_default: z.boolean().optional(),
  script_id: z.string().uuid().nullable().optional(),
});

// GET /api/scorecards - List scorecards
export async function GET(request: Request) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortParams(
      searchParams,
      ["name", "status", "created_at", "updated_at", "version"],
      "created_at"
    );

    // Filters
    const status = searchParams.get("status"); // draft, active, archived
    const isDefault = searchParams.get("is_default");

    let query = supabase
      .from("scorecards")
      .select("*", { count: "exact" })
      .eq("org_id", orgId!);

    if (status) {
      query = query.eq("status", status);
    }

    if (isDefault === "true") {
      query = query.eq("is_default", true);
    }

    // Sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data: scorecards, error, count } = await query;

    if (error) {
      console.error("Error fetching scorecards:", error);
      return errorResponse("Failed to fetch scorecards", 500);
    }

    return NextResponse.json({
      data: scorecards,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching scorecards:", error);
    return errorResponse("Failed to fetch scorecards", 500);
  }
}

// POST /api/scorecards - Create scorecard
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const validationResult = scorecardSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { name, description, criteria, total_weight, status, is_default, script_id } =
      validationResult.data;

    // Validate total weight equals 100
    const sumWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (sumWeight !== 100) {
      return errorResponse(`Total weight must equal 100, got ${sumWeight}`, 400);
    }

    const supabase = await createClient();

    // If setting as default, unset other defaults first
    if (is_default && status === "active") {
      await supabase
        .from("scorecards")
        .update({ is_default: false })
        .eq("org_id", orgId!)
        .eq("is_default", true);
    }

    const { data: scorecard, error } = await supabase
      .from("scorecards")
      .insert({
        org_id: orgId!,
        name,
        description,
        criteria: criteria as unknown as ScorecardCriterion[],
        total_weight,
        status: status || "draft",
        is_default: is_default && status === "active" ? true : false,
        script_id: script_id || null,
        created_by: user!.id,
        activated_at: status === "active" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating scorecard:", error);
      return errorResponse("Failed to create scorecard", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "create",
      "scorecard",
      scorecard.id,
      undefined,
      { name, status: status || "draft" },
      request
    );

    return successResponse(scorecard, 201);
  } catch (error) {
    console.error("Error creating scorecard:", error);
    return errorResponse("Failed to create scorecard", 500);
  }
}

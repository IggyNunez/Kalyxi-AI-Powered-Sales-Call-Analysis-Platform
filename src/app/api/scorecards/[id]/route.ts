import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  requireAdmin,
  errorResponse,
  successResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";
import { ScorecardCriterion } from "@/types/database";

// Validation schema for updating scorecards
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

const updateScorecardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  criteria: z.array(criterionSchema).min(1).optional(),
  total_weight: z.number().min(100).max(100).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  is_default: z.boolean().optional(),
  script_id: z.string().uuid().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/scorecards/[id] - Get single scorecard
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { orgId, response } = await requireAuth();
  if (response) return response;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid scorecard ID", 400);
  }

  try {
    const supabase = await createClient();

    const { data: scorecard, error } = await supabase
      .from("scorecards")
      .select("*, scripts(id, name)")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !scorecard) {
      return errorResponse("Scorecard not found", 404);
    }

    return successResponse(scorecard);
  } catch (error) {
    console.error("Error fetching scorecard:", error);
    return errorResponse("Failed to fetch scorecard", 500);
  }
}

// PATCH /api/scorecards/[id] - Update scorecard (partial)
export async function PATCH(request: Request, { params }: RouteParams) {
  return handleUpdate(request, params);
}

// PUT /api/scorecards/[id] - Update scorecard (full)
export async function PUT(request: Request, { params }: RouteParams) {
  return handleUpdate(request, params);
}

// Shared update handler
async function handleUpdate(request: Request, params: Promise<{ id: string }>) {
  const { id } = await params;
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid scorecard ID", 400);
  }

  try {
    const body = await request.json();
    const validationResult = updateScorecardSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const updates = validationResult.data;

    // Validate total weight if criteria provided
    if (updates.criteria) {
      const sumWeight = updates.criteria.reduce((sum, c) => sum + c.weight, 0);
      if (sumWeight !== 100) {
        return errorResponse(`Total weight must equal 100, got ${sumWeight}`, 400);
      }
    }

    const supabase = await createClient();

    // Get existing scorecard
    const { data: existing, error: fetchError } = await supabase
      .from("scorecards")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existing) {
      return errorResponse("Scorecard not found", 404);
    }

    // If status is changing to active and is_default is true, unset other defaults
    if (updates.status === "active" && updates.is_default) {
      await supabase
        .from("scorecards")
        .update({ is_default: false })
        .eq("org_id", orgId!)
        .eq("is_default", true)
        .neq("id", id);
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.criteria !== undefined) {
      updateData.criteria = updates.criteria as unknown as ScorecardCriterion[];
      updateData.total_weight = updates.criteria.reduce((sum, c) => sum + c.weight, 0);
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
      if (updates.status === "active" && existing.status !== "active") {
        updateData.activated_at = new Date().toISOString();
      }
      if (updates.status === "archived") {
        updateData.archived_at = new Date().toISOString();
        updateData.is_default = false;
      }
    }
    if (updates.is_default !== undefined && updates.status !== "archived") {
      updateData.is_default = updates.is_default;
    }
    if (updates.script_id !== undefined) {
      updateData.script_id = updates.script_id;
    }

    const { data: scorecard, error } = await supabase
      .from("scorecards")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", orgId!)
      .select()
      .single();

    if (error) {
      console.error("Error updating scorecard:", error);
      return errorResponse("Failed to update scorecard", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "update",
      "scorecard",
      id,
      existing,
      scorecard,
      request
    );

    return successResponse(scorecard);
  } catch (error) {
    console.error("Error updating scorecard:", error);
    return errorResponse("Failed to update scorecard", 500);
  }
}

// DELETE /api/scorecards/[id] - Delete scorecard
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid scorecard ID", 400);
  }

  try {
    const supabase = await createClient();

    // Get existing scorecard
    const { data: existing, error: fetchError } = await supabase
      .from("scorecards")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existing) {
      return errorResponse("Scorecard not found", 404);
    }

    // Check if scorecard is in use
    const { count } = await supabase
      .from("call_score_results")
      .select("*", { count: "exact", head: true })
      .eq("scorecard_id", id);

    if (count && count > 0) {
      // Archive instead of delete if in use
      const { error } = await supabase
        .from("scorecards")
        .update({
          status: "archived",
          archived_at: new Date().toISOString(),
          is_default: false,
        })
        .eq("id", id);

      if (error) {
        console.error("Error archiving scorecard:", error);
        return errorResponse("Failed to archive scorecard", 500);
      }

      // Audit log
      await createAuditLog(
        orgId!,
        user!.id,
        "archive",
        "scorecard",
        id,
        existing,
        { status: "archived" },
        request
      );

      return NextResponse.json({
        message: "Scorecard archived (in use by existing calls)",
        archived: true,
      });
    }

    // Delete if not in use
    const { error } = await supabase
      .from("scorecards")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId!);

    if (error) {
      console.error("Error deleting scorecard:", error);
      return errorResponse("Failed to delete scorecard", 500);
    }

    // Audit log
    await createAuditLog(orgId!, user!.id, "delete", "scorecard", id, existing, undefined, request);

    return NextResponse.json({ message: "Scorecard deleted" });
  } catch (error) {
    console.error("Error deleting scorecard:", error);
    return errorResponse("Failed to delete scorecard", 500);
  }
}

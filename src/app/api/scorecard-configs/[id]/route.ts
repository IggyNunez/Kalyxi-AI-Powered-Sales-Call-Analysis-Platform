import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requireAdmin,
  errorResponse,
  createAuditLog,
  sanitizeInput,
} from "@/lib/api-utils";

const scorecardFieldSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  weight: z.number().min(0).max(100),
  scoringMethod: z.enum(["weighted", "average", "sum", "min", "max"]),
  passingThreshold: z.number().min(0).max(100).optional(),
  linkedCriteria: z.array(z.string()).optional(),
});

const updateScorecardSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  fields_json: z.array(scorecardFieldSchema).optional(),
  passing_threshold: z.number().min(0).max(100).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

// GET /api/scorecard-configs/[id] - Get single scorecard config
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;

  try {
    const supabase = await createClient();

    const { data: config, error } = await supabase
      .from("scorecard_configs")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !config) {
      return errorResponse("Scorecard config not found", 404);
    }

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("Error in scorecard-config GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PATCH /api/scorecard-configs/[id] - Update scorecard config
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = updateScorecardSchema.parse(body);

    const supabase = await createClient();

    // Get existing config
    const { data: existingConfig, error: fetchError } = await supabase
      .from("scorecard_configs")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingConfig) {
      return errorResponse("Scorecard config not found", 404);
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (validatedData.name !== undefined) {
      updateData.name = sanitizeInput(validatedData.name);
    }

    if (validatedData.fields_json !== undefined) {
      // Validate field IDs are unique
      const fieldIds = validatedData.fields_json.map((f) => f.id);
      if (new Set(fieldIds).size !== fieldIds.length) {
        return errorResponse("Field IDs must be unique", 400);
      }

      updateData.fields_json = validatedData.fields_json.map((f) => ({
        ...f,
        name: sanitizeInput(f.name),
      }));
    }

    if (validatedData.passing_threshold !== undefined) {
      updateData.passing_threshold = validatedData.passing_threshold;
    }

    if (validatedData.is_active !== undefined) {
      updateData.is_active = validatedData.is_active;
    }

    // Handle is_default - unset other defaults if setting this as default
    if (validatedData.is_default === true) {
      await supabase
        .from("scorecard_configs")
        .update({ is_default: false })
        .eq("org_id", orgId!)
        .neq("id", id);

      updateData.is_default = true;
    } else if (validatedData.is_default === false) {
      updateData.is_default = false;
    }

    // Update config
    const { data: config, error } = await supabase
      .from("scorecard_configs")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", orgId!)
      .select()
      .single();

    if (error) {
      console.error("Error updating scorecard config:", error);
      return errorResponse("Failed to update scorecard config", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "scorecard_config.updated",
      "scorecard_config",
      id,
      existingConfig,
      config,
      request
    );

    return NextResponse.json({ data: config });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || "Validation failed", 400);
    }
    console.error("Error in scorecard-config PATCH:", error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/scorecard-configs/[id] - Delete scorecard config (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  try {
    const supabase = await createClient();

    // Get existing config
    const { data: existingConfig, error: fetchError } = await supabase
      .from("scorecard_configs")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingConfig) {
      return errorResponse("Scorecard config not found", 404);
    }

    // Don't allow deleting the default config
    if (existingConfig.is_default) {
      return errorResponse("Cannot delete the default scorecard config", 400);
    }

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from("scorecard_configs")
      .update({ is_active: false })
      .eq("id", id)
      .eq("org_id", orgId!);

    if (error) {
      console.error("Error deleting scorecard config:", error);
      return errorResponse("Failed to delete scorecard config", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "scorecard_config.deleted",
      "scorecard_config",
      id,
      existingConfig,
      undefined,
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in scorecard-config DELETE:", error);
    return errorResponse("Internal server error", 500);
  }
}

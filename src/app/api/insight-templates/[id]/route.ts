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

const updateInsightTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(["general", "coaching", "performance", "compliance", "custom"]).optional(),
  prompt_template: z.string().min(10).max(5000).optional(),
  output_format: z.enum(["text", "bullets", "numbered", "json"]).optional(),
  max_insights: z.number().min(1).max(20).optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().min(0).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/insight-templates/[id] - Get single insight template
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { orgId, response } = await requireAuth();
  if (response) return response;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid template ID", 400);
  }

  try {
    const supabase = await createClient();

    const { data: template, error } = await supabase
      .from("insight_templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !template) {
      return errorResponse("Insight template not found", 404);
    }

    return successResponse(template);
  } catch (error) {
    console.error("Error fetching insight template:", error);
    return errorResponse("Failed to fetch insight template", 500);
  }
}

// PUT /api/insight-templates/[id] - Update insight template
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid template ID", 400);
  }

  try {
    const body = await request.json();
    const validationResult = updateInsightTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const updates = validationResult.data;
    const supabase = await createClient();

    // Get existing template
    const { data: existing, error: fetchError } = await supabase
      .from("insight_templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existing) {
      return errorResponse("Insight template not found", 404);
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.prompt_template !== undefined) updateData.prompt_template = updates.prompt_template;
    if (updates.output_format !== undefined) updateData.output_format = updates.output_format;
    if (updates.max_insights !== undefined) updateData.max_insights = updates.max_insights;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    if (updates.is_default !== undefined) updateData.is_default = updates.is_default;
    if (updates.display_order !== undefined) updateData.display_order = updates.display_order;

    const { data: template, error } = await supabase
      .from("insight_templates")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", orgId!)
      .select()
      .single();

    if (error) {
      console.error("Error updating insight template:", error);
      return errorResponse("Failed to update insight template", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "update",
      "insight_template",
      id,
      existing,
      template,
      request
    );

    return successResponse(template);
  } catch (error) {
    console.error("Error updating insight template:", error);
    return errorResponse("Failed to update insight template", 500);
  }
}

// DELETE /api/insight-templates/[id] - Delete insight template
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid template ID", 400);
  }

  try {
    const supabase = await createClient();

    // Get existing template
    const { data: existing, error: fetchError } = await supabase
      .from("insight_templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existing) {
      return errorResponse("Insight template not found", 404);
    }

    // Prevent deleting default templates
    if (existing.is_default) {
      return errorResponse("Cannot delete default insight template", 400);
    }

    const { error } = await supabase
      .from("insight_templates")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId!);

    if (error) {
      console.error("Error deleting insight template:", error);
      return errorResponse("Failed to delete insight template", 500);
    }

    await createAuditLog(
      orgId!,
      user!.id,
      "delete",
      "insight_template",
      id,
      existing,
      undefined,
      request
    );

    return NextResponse.json({ message: "Insight template deleted" });
  } catch (error) {
    console.error("Error deleting insight template:", error);
    return errorResponse("Failed to delete insight template", 500);
  }
}

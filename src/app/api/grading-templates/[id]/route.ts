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
import { GradingCriterion } from "@/types/database";

const gradingCriterionSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  type: z.enum(["score", "text", "checklist", "boolean", "percentage"]),
  weight: z.number().min(0).max(100),
  isRequired: z.boolean(),
  order: z.number().int().min(0),
  options: z.array(z.string()).optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  passingThreshold: z.number().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  criteria_json: z.array(gradingCriterionSchema).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

// GET /api/grading-templates/[id] - Get single template
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;

  try {
    const supabase = await createClient();

    const { data: template, error } = await supabase
      .from("grading_templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !template) {
      return errorResponse("Template not found", 404);
    }

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error("Error in template GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PATCH /api/grading-templates/[id] - Update template
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = updateTemplateSchema.parse(body);

    const supabase = await createClient();

    // Get existing template
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("grading_templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingTemplate) {
      return errorResponse("Template not found", 404);
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (validatedData.name !== undefined) {
      updateData.name = sanitizeInput(validatedData.name);
    }

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
        ? sanitizeInput(validatedData.description)
        : null;
    }

    if (validatedData.criteria_json !== undefined) {
      // Validate criteria IDs are unique
      const criteriaIds = validatedData.criteria_json.map((c) => c.id);
      if (new Set(criteriaIds).size !== criteriaIds.length) {
        return errorResponse("Criteria IDs must be unique", 400);
      }

      updateData.criteria_json = validatedData.criteria_json.map((c) => ({
        ...c,
        name: sanitizeInput(c.name),
        description: sanitizeInput(c.description),
      }));
    }

    if (validatedData.is_active !== undefined) {
      updateData.is_active = validatedData.is_active;
    }

    // Handle is_default - unset other defaults if setting this as default
    if (validatedData.is_default === true) {
      await supabase
        .from("grading_templates")
        .update({ is_default: false })
        .eq("org_id", orgId!)
        .neq("id", id);

      updateData.is_default = true;
    } else if (validatedData.is_default === false) {
      updateData.is_default = false;
    }

    // Update template
    const { data: template, error } = await supabase
      .from("grading_templates")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", orgId!)
      .select()
      .single();

    if (error) {
      console.error("Error updating template:", error);
      return errorResponse("Failed to update template", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "grading_template.updated",
      "grading_template",
      id,
      existingTemplate,
      template,
      request
    );

    return NextResponse.json({ data: template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || "Validation failed", 400);
    }
    console.error("Error in template PATCH:", error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/grading-templates/[id] - Delete template (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  try {
    const supabase = await createClient();

    // Get existing template
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("grading_templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingTemplate) {
      return errorResponse("Template not found", 404);
    }

    // Don't allow deleting the default template
    if (existingTemplate.is_default) {
      return errorResponse("Cannot delete the default template", 400);
    }

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from("grading_templates")
      .update({ is_active: false })
      .eq("id", id)
      .eq("org_id", orgId!);

    if (error) {
      console.error("Error deleting template:", error);
      return errorResponse("Failed to delete template", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "grading_template.deleted",
      "grading_template",
      id,
      existingTemplate,
      undefined,
      request
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in template DELETE:", error);
    return errorResponse("Internal server error", 500);
  }
}

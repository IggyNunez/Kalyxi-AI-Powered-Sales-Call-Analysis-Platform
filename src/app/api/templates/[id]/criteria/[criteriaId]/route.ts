import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  requireRole,
  errorResponse,
  successResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";

// Validation schema for criteria configuration
const configSchema = z.record(z.string(), z.unknown()).optional();

// Validation schema for updating criteria
const updateCriteriaSchema = z.object({
  group_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  criteria_type: z
    .enum([
      "scale",
      "pass_fail",
      "checklist",
      "text",
      "dropdown",
      "multi_select",
      "rating_stars",
      "percentage",
    ])
    .optional(),
  config: configSchema,
  weight: z.number().min(0).max(100).optional(),
  max_score: z.number().min(1).max(1000).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_required: z.boolean().optional(),
  is_auto_fail: z.boolean().optional(),
  auto_fail_threshold: z.number().min(0).max(100).optional().nullable(),
  scoring_guide: z.string().max(2000).optional().nullable(),
  keywords: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string; criteriaId: string }>;
}

// GET /api/templates/[id]/criteria/[criteriaId] - Get single criterion
export async function GET(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const { id: templateId, criteriaId } = await params;

    if (!isValidUUID(templateId) || !isValidUUID(criteriaId)) {
      return errorResponse("Invalid ID", 400);
    }

    const supabase = await createClient();

    // Verify template belongs to org
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id")
      .eq("id", templateId)
      .eq("org_id", orgId!)
      .single();

    if (templateError || !template) {
      return errorResponse("Template not found", 404);
    }

    // Fetch criterion
    const { data: criterion, error } = await supabase
      .from("criteria")
      .select("*, criteria_groups(*)")
      .eq("id", criteriaId)
      .eq("template_id", templateId)
      .single();

    if (error || !criterion) {
      return errorResponse("Criterion not found", 404);
    }

    return successResponse(criterion);
  } catch (error) {
    console.error("Error fetching criterion:", error);
    return errorResponse("Failed to fetch criterion", 500);
  }
}

// PUT /api/templates/[id]/criteria/[criteriaId] - Update criterion
export async function PUT(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const { id: templateId, criteriaId } = await params;

    if (!isValidUUID(templateId) || !isValidUUID(criteriaId)) {
      return errorResponse("Invalid ID", 400);
    }

    const body = await request.json();
    const validationResult = updateCriteriaSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const supabase = await createClient();

    // Verify template belongs to org and is editable
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, status")
      .eq("id", templateId)
      .eq("org_id", orgId!)
      .single();

    if (templateError || !template) {
      return errorResponse("Template not found", 404);
    }

    if (template.status === "archived") {
      return errorResponse("Cannot modify an archived template", 400);
    }

    // Verify criterion exists
    const { data: existingCriterion, error: criterionError } = await supabase
      .from("criteria")
      .select("*")
      .eq("id", criteriaId)
      .eq("template_id", templateId)
      .single();

    if (criterionError || !existingCriterion) {
      return errorResponse("Criterion not found", 404);
    }

    const updates = validationResult.data;

    // If changing group, verify it exists
    if (updates.group_id !== undefined && updates.group_id !== null) {
      const { data: group, error: groupError } = await supabase
        .from("criteria_groups")
        .select("id")
        .eq("id", updates.group_id)
        .eq("template_id", templateId)
        .single();

      if (groupError || !group) {
        return errorResponse("Group not found", 404);
      }
    }

    // If changing criteria type, may need to reset config
    if (updates.criteria_type && updates.criteria_type !== existingCriterion.criteria_type) {
      // If config is not also provided, reset to default for new type
      if (!updates.config) {
        updates.config = getDefaultConfig(updates.criteria_type);
      }
    }

    const { data: criterion, error } = await supabase
      .from("criteria")
      .update(updates)
      .eq("id", criteriaId)
      .eq("template_id", templateId)
      .select()
      .single();

    if (error) {
      console.error("Error updating criterion:", error);
      return errorResponse("Failed to update criterion", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "update",
      "criteria",
      criteriaId,
      existingCriterion,
      updates,
      request
    );

    return successResponse(criterion);
  } catch (error) {
    console.error("Error updating criterion:", error);
    return errorResponse("Failed to update criterion", 500);
  }
}

// DELETE /api/templates/[id]/criteria/[criteriaId] - Delete criterion
export async function DELETE(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const { id: templateId, criteriaId } = await params;

    if (!isValidUUID(templateId) || !isValidUUID(criteriaId)) {
      return errorResponse("Invalid ID", 400);
    }

    const supabase = await createClient();

    // Verify template belongs to org and is editable
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, status")
      .eq("id", templateId)
      .eq("org_id", orgId!)
      .single();

    if (templateError || !template) {
      return errorResponse("Template not found", 404);
    }

    if (template.status === "archived") {
      return errorResponse("Cannot modify an archived template", 400);
    }

    // Verify criterion exists
    const { data: existingCriterion, error: criterionError } = await supabase
      .from("criteria")
      .select("*")
      .eq("id", criteriaId)
      .eq("template_id", templateId)
      .single();

    if (criterionError || !existingCriterion) {
      return errorResponse("Criterion not found", 404);
    }

    // Check if criterion has scores in active sessions
    const { count: scoreCount } = await supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("criteria_id", criteriaId);

    if (scoreCount && scoreCount > 0) {
      return errorResponse(
        "Cannot delete criterion that has been used in scoring sessions. Consider archiving the template instead.",
        400
      );
    }

    // Delete criterion
    const { error } = await supabase
      .from("criteria")
      .delete()
      .eq("id", criteriaId)
      .eq("template_id", templateId);

    if (error) {
      console.error("Error deleting criterion:", error);
      return errorResponse("Failed to delete criterion", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "delete",
      "criteria",
      criteriaId,
      existingCriterion,
      undefined,
      request
    );

    return NextResponse.json({ message: "Criterion deleted successfully" });
  } catch (error) {
    console.error("Error deleting criterion:", error);
    return errorResponse("Failed to delete criterion", 500);
  }
}

// Helper function to get default config for criteria type
function getDefaultConfig(criteriaType: string): Record<string, unknown> {
  switch (criteriaType) {
    case "scale":
      return { min: 1, max: 5, step: 1, labels: {} };
    case "pass_fail":
      return { pass_label: "Pass", fail_label: "Fail", pass_value: 100, fail_value: 0 };
    case "checklist":
      return { items: [], scoring: "sum" };
    case "dropdown":
      return { options: [] };
    case "multi_select":
      return { options: [], scoring: "sum" };
    case "rating_stars":
      return { max_stars: 5, allow_half: false };
    case "percentage":
      return { thresholds: [] };
    case "text":
      return { max_length: 1000, placeholder: "" };
    default:
      return {};
  }
}

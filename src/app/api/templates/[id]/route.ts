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
import { TemplateSettings, Criteria, CriteriaGroup } from "@/types/database";

// Validation schema for updating templates
const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  scoring_method: z
    .enum(["weighted", "simple_average", "pass_fail", "points", "custom_formula"])
    .optional(),
  use_case: z
    .enum(["sales_call", "onboarding", "qa_review", "training", "custom"])
    .optional(),
  pass_threshold: z.number().min(0).max(100).optional(),
  max_total_score: z.number().min(1).max(10000).optional(),
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
  status: z.enum(["draft", "active", "archived"]).optional(),
  is_default: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/templates/[id] - Get single template with relations
export async function GET(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid template ID", 400);
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const includeGroups = searchParams.get("include_groups") === "true";
    const includeCriteria = searchParams.get("include_criteria") === "true";

    // Fetch template
    const { data: template, error } = await supabase
      .from("templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !template) {
      return errorResponse("Template not found", 404);
    }

    // Optionally include groups and criteria
    let groups: (CriteriaGroup & { criteria?: Criteria[] })[] | null = null;
    let criteria: Criteria[] | null = null;

    if (includeGroups || includeCriteria) {
      const { data: groupsData } = await supabase
        .from("criteria_groups")
        .select("*")
        .eq("template_id", id)
        .order("sort_order", { ascending: true });

      groups = groupsData as CriteriaGroup[];
    }

    if (includeCriteria) {
      const { data: criteriaData } = await supabase
        .from("criteria")
        .select("*")
        .eq("template_id", id)
        .order("sort_order", { ascending: true });

      criteria = criteriaData as Criteria[];

      // If we have both, nest criteria under groups
      if (groups && criteria) {
        groups = groups.map((group) => ({
          ...group,
          criteria: criteria?.filter((c: Criteria) => c.group_id === group.id) || [],
        }));
      }
    }

    const result = {
      ...template,
      ...(groups && { groups }),
      ...(criteria && !includeGroups && { criteria }),
    };

    return successResponse(result);
  } catch (error) {
    console.error("Error fetching template:", error);
    return errorResponse("Failed to fetch template", 500);
  }
}

// PUT /api/templates/[id] - Update template
export async function PUT(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid template ID", 400);
    }

    const body = await request.json();
    const validationResult = updateTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const supabase = await createClient();

    // Fetch existing template
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingTemplate) {
      return errorResponse("Template not found", 404);
    }

    const updates = validationResult.data;

    // Handle default flag changes
    if (updates.is_default === true && updates.status === "active") {
      // Unset other defaults
      await supabase
        .from("templates")
        .update({ is_default: false })
        .eq("org_id", orgId!)
        .eq("is_default", true)
        .neq("id", id);
    }

    // If activating, set activated_at
    if (updates.status === "active" && existingTemplate.status !== "active") {
      (updates as Record<string, unknown>).activated_at = new Date().toISOString();
    }

    // If archiving, set archived_at
    if (updates.status === "archived" && existingTemplate.status !== "archived") {
      (updates as Record<string, unknown>).archived_at = new Date().toISOString();
    }

    // Merge settings if provided
    if (updates.settings) {
      updates.settings = {
        ...(existingTemplate.settings as TemplateSettings),
        ...updates.settings,
      };
    }

    // Update template
    const { data: template, error } = await supabase
      .from("templates")
      .update(updates)
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
      "update",
      "template",
      id,
      existingTemplate,
      updates,
      request
    );

    return successResponse(template);
  } catch (error) {
    console.error("Error updating template:", error);
    return errorResponse("Failed to update template", 500);
  }
}

// DELETE /api/templates/[id] - Delete template
export async function DELETE(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin"]);
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid template ID", 400);
    }

    const supabase = await createClient();

    // Fetch template first
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existingTemplate) {
      return errorResponse("Template not found", 404);
    }

    // Check if template has active sessions
    const { count: sessionCount } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("template_id", id)
      .in("status", ["pending", "in_progress"]);

    if (sessionCount && sessionCount > 0) {
      return errorResponse(
        "Cannot delete template with active sessions. Please complete or cancel pending sessions first.",
        400
      );
    }

    // Delete template (cascade will handle groups, criteria, etc.)
    const { error } = await supabase
      .from("templates")
      .delete()
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
      "delete",
      "template",
      id,
      existingTemplate,
      undefined,
      request
    );

    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    return errorResponse("Failed to delete template", 500);
  }
}

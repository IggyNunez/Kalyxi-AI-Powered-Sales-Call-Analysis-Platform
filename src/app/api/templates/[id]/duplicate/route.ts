import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireRole,
  errorResponse,
  successResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";

const duplicateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/templates/[id]/duplicate - Deep clone template with groups and criteria
export async function POST(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid template ID", 400);
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = duplicateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { name: customName } = validationResult.data;

    const supabase = await createClient();

    // Fetch original template
    const { data: originalTemplate, error: templateError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (templateError || !originalTemplate) {
      return errorResponse("Template not found", 404);
    }

    // Fetch groups
    const { data: originalGroups } = await supabase
      .from("criteria_groups")
      .select("*")
      .eq("template_id", id)
      .order("sort_order", { ascending: true });

    // Fetch criteria
    const { data: originalCriteria } = await supabase
      .from("criteria")
      .select("*")
      .eq("template_id", id)
      .order("sort_order", { ascending: true });

    // Create new template
    const newTemplateName = customName || `${originalTemplate.name} (Copy)`;

    const { data: newTemplate, error: createError } = await supabase
      .from("templates")
      .insert({
        org_id: orgId!,
        name: newTemplateName,
        description: originalTemplate.description,
        scoring_method: originalTemplate.scoring_method,
        use_case: originalTemplate.use_case,
        pass_threshold: originalTemplate.pass_threshold,
        max_total_score: originalTemplate.max_total_score,
        settings: originalTemplate.settings,
        status: "draft", // Always start as draft
        is_default: false, // Never copy default status
        version: 1,
        created_by: user!.id,
      })
      .select()
      .single();

    if (createError || !newTemplate) {
      console.error("Error creating duplicate template:", createError);
      return errorResponse("Failed to create duplicate template", 500);
    }

    // Map old group IDs to new group IDs
    const groupIdMap: Record<string, string> = {};

    // Create groups
    if (originalGroups && originalGroups.length > 0) {
      for (const group of originalGroups) {
        const { data: newGroup, error: groupError } = await supabase
          .from("criteria_groups")
          .insert({
            template_id: newTemplate.id,
            name: group.name,
            description: group.description,
            sort_order: group.sort_order,
            weight: group.weight,
            is_required: group.is_required,
            is_collapsed_by_default: group.is_collapsed_by_default,
          })
          .select()
          .single();

        if (groupError || !newGroup) {
          console.error("Error creating duplicate group:", groupError);
          // Continue anyway, criteria will be ungrouped
          continue;
        }

        groupIdMap[group.id] = newGroup.id;
      }
    }

    // Create criteria
    if (originalCriteria && originalCriteria.length > 0) {
      const criteriaToInsert = originalCriteria.map((criterion) => ({
        template_id: newTemplate.id,
        group_id: criterion.group_id ? groupIdMap[criterion.group_id] || null : null,
        name: criterion.name,
        description: criterion.description,
        criteria_type: criterion.criteria_type,
        config: criterion.config,
        weight: criterion.weight,
        max_score: criterion.max_score,
        sort_order: criterion.sort_order,
        is_required: criterion.is_required,
        is_auto_fail: criterion.is_auto_fail,
        auto_fail_threshold: criterion.auto_fail_threshold,
        scoring_guide: criterion.scoring_guide,
        keywords: criterion.keywords,
      }));

      const { error: criteriaError } = await supabase
        .from("criteria")
        .insert(criteriaToInsert);

      if (criteriaError) {
        console.error("Error creating duplicate criteria:", criteriaError);
        // Template was created, but criteria failed - return partial success
        return successResponse({
          template: newTemplate,
          warning: "Template created but some criteria may not have been copied",
        }, 201);
      }
    }

    // Fetch complete new template with relations
    const { data: completeTemplate } = await supabase
      .from("templates")
      .select("*")
      .eq("id", newTemplate.id)
      .single();

    const { data: newGroups } = await supabase
      .from("criteria_groups")
      .select("*")
      .eq("template_id", newTemplate.id)
      .order("sort_order", { ascending: true });

    const { data: newCriteria } = await supabase
      .from("criteria")
      .select("*")
      .eq("template_id", newTemplate.id)
      .order("sort_order", { ascending: true });

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "duplicate",
      "template",
      newTemplate.id,
      { source_template_id: id },
      { name: newTemplateName },
      request
    );

    return successResponse({
      template: completeTemplate,
      groups: newGroups,
      criteria: newCriteria,
    }, 201);
  } catch (error) {
    console.error("Error duplicating template:", error);
    return errorResponse("Failed to duplicate template", 500);
  }
}

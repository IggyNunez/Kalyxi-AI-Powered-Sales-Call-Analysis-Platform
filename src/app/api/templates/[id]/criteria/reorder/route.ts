/**
 * Criteria Reorder API
 *
 * PUT /api/templates/[id]/criteria/reorder - Batch reorder criteria
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  checkRole,
  errorResponse,
  successResponse,
  isValidUUID,
} from "@/lib/api-utils";
import { z } from "zod";

const reorderSchema = z.object({
  criteria_ids: z.array(z.string().uuid()),
  group_id: z.string().uuid().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/templates/[id]/criteria/reorder - Reorder criteria
export async function PUT(request: Request, { params }: RouteParams) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  // Only admin/manager can reorder
  const roleResponse = checkRole(role, ["admin", "superadmin", "manager"]);
  if (roleResponse) return roleResponse;

  try {
    const { id: templateId } = await params;

    if (!isValidUUID(templateId)) {
      return errorResponse("Invalid template ID", 400);
    }

    const body = await request.json();
    const validationResult = reorderSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { criteria_ids, group_id } = validationResult.data;

    const supabase = await createClient();

    // Verify template exists and belongs to org
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id")
      .eq("id", templateId)
      .eq("org_id", orgId!)
      .single();

    if (templateError || !template) {
      return errorResponse("Template not found", 404);
    }

    // If group_id is provided, verify it exists
    if (group_id) {
      const { data: group, error: groupError } = await supabase
        .from("criteria_groups")
        .select("id")
        .eq("id", group_id)
        .eq("template_id", templateId)
        .single();

      if (groupError || !group) {
        return errorResponse("Group not found", 404);
      }
    }

    // Update sort_order and optionally group_id for each criteria
    const updates = criteria_ids.map((criteriaId, index) => {
      const updateData: Record<string, unknown> = {
        sort_order: index,
        updated_at: new Date().toISOString(),
      };

      // If group_id is explicitly provided (including null for ungrouped), update it
      if (group_id !== undefined) {
        updateData.group_id = group_id;
      }

      return supabase
        .from("criteria")
        .update(updateData)
        .eq("id", criteriaId)
        .eq("template_id", templateId);
    });

    await Promise.all(updates);

    // Fetch updated criteria
    const { data: criteria, error } = await supabase
      .from("criteria")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching reordered criteria:", error);
      return errorResponse("Failed to fetch reordered criteria", 500);
    }

    return successResponse(criteria);
  } catch (error) {
    console.error("Error reordering criteria:", error);
    return errorResponse("Failed to reorder criteria", 500);
  }
}

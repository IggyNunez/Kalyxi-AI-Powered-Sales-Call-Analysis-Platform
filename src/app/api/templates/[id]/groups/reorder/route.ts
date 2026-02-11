/**
 * Groups Reorder API
 *
 * PUT /api/templates/[id]/groups/reorder - Batch reorder groups
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
  group_ids: z.array(z.string().uuid()),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/templates/[id]/groups/reorder - Reorder groups
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

    const { group_ids } = validationResult.data;

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

    // Update sort_order for each group
    const updates = group_ids.map((groupId, index) =>
      supabase
        .from("criteria_groups")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("id", groupId)
        .eq("template_id", templateId)
    );

    await Promise.all(updates);

    // Fetch updated groups
    const { data: groups, error } = await supabase
      .from("criteria_groups")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching reordered groups:", error);
      return errorResponse("Failed to fetch reordered groups", 500);
    }

    return successResponse(groups);
  } catch (error) {
    console.error("Error reordering groups:", error);
    return errorResponse("Failed to reorder groups", 500);
  }
}

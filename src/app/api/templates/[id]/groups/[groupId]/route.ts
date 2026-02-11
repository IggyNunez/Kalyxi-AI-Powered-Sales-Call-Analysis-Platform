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

// Validation schema for updating groups
const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  weight: z.number().min(0).max(100).optional(),
  is_required: z.boolean().optional(),
  is_collapsed_by_default: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string; groupId: string }>;
}

// GET /api/templates/[id]/groups/[groupId] - Get single group
export async function GET(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const { id: templateId, groupId } = await params;

    if (!isValidUUID(templateId) || !isValidUUID(groupId)) {
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

    // Fetch group with criteria
    const { searchParams } = new URL(request.url);
    const includeCriteria = searchParams.get("include_criteria") === "true";

    const { data: group, error } = await supabase
      .from("criteria_groups")
      .select(includeCriteria ? "*, criteria(*)" : "*")
      .eq("id", groupId)
      .eq("template_id", templateId)
      .single();

    if (error || !group) {
      return errorResponse("Group not found", 404);
    }

    return successResponse(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    return errorResponse("Failed to fetch group", 500);
  }
}

// PUT /api/templates/[id]/groups/[groupId] - Update group
export async function PUT(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const { id: templateId, groupId } = await params;

    if (!isValidUUID(templateId) || !isValidUUID(groupId)) {
      return errorResponse("Invalid ID", 400);
    }

    const body = await request.json();
    const validationResult = updateGroupSchema.safeParse(body);

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

    // Verify group exists
    const { data: existingGroup, error: groupError } = await supabase
      .from("criteria_groups")
      .select("*")
      .eq("id", groupId)
      .eq("template_id", templateId)
      .single();

    if (groupError || !existingGroup) {
      return errorResponse("Group not found", 404);
    }

    const updates = validationResult.data;

    const { data: group, error } = await supabase
      .from("criteria_groups")
      .update(updates)
      .eq("id", groupId)
      .eq("template_id", templateId)
      .select()
      .single();

    if (error) {
      console.error("Error updating group:", error);
      return errorResponse("Failed to update group", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "update",
      "criteria_group",
      groupId,
      existingGroup,
      updates,
      request
    );

    return successResponse(group);
  } catch (error) {
    console.error("Error updating group:", error);
    return errorResponse("Failed to update group", 500);
  }
}

// DELETE /api/templates/[id]/groups/[groupId] - Delete group
export async function DELETE(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const { id: templateId, groupId } = await params;

    if (!isValidUUID(templateId) || !isValidUUID(groupId)) {
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

    // Verify group exists
    const { data: existingGroup, error: groupError } = await supabase
      .from("criteria_groups")
      .select("*")
      .eq("id", groupId)
      .eq("template_id", templateId)
      .single();

    if (groupError || !existingGroup) {
      return errorResponse("Group not found", 404);
    }

    // Get criteria in this group (they will become ungrouped)
    const { data: criteria } = await supabase
      .from("criteria")
      .select("id")
      .eq("group_id", groupId);

    // Option: Either move criteria to ungrouped or delete them
    // Here we'll set group_id to null (ungrouped)
    if (criteria && criteria.length > 0) {
      await supabase
        .from("criteria")
        .update({ group_id: null })
        .eq("group_id", groupId);
    }

    // Delete group
    const { error } = await supabase
      .from("criteria_groups")
      .delete()
      .eq("id", groupId)
      .eq("template_id", templateId);

    if (error) {
      console.error("Error deleting group:", error);
      return errorResponse("Failed to delete group", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "delete",
      "criteria_group",
      groupId,
      existingGroup,
      undefined,
      request
    );

    return NextResponse.json({
      message: "Group deleted successfully",
      ungrouped_criteria_count: criteria?.length || 0,
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    return errorResponse("Failed to delete group", 500);
  }
}

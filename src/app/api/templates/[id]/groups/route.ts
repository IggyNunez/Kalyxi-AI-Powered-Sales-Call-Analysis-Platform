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

// Validation schema for creating groups
const groupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  weight: z.number().min(0).max(100).default(0),
  is_required: z.boolean().default(true),
  is_collapsed_by_default: z.boolean().default(false),
});

// Validation schema for batch reorder
const reorderSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int().min(0),
    })
  ),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/templates/[id]/groups - List groups for template
export async function GET(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const { id: templateId } = await params;

    if (!isValidUUID(templateId)) {
      return errorResponse("Invalid template ID", 400);
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

    // Fetch groups with optional criteria count
    const { searchParams } = new URL(request.url);
    const includeCriteria = searchParams.get("include_criteria") === "true";

    let query = supabase
      .from("criteria_groups")
      .select(includeCriteria ? "*, criteria(*)" : "*")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });

    const { data: groups, error } = await query;

    if (error) {
      console.error("Error fetching groups:", error);
      return errorResponse("Failed to fetch groups", 500);
    }

    return successResponse(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return errorResponse("Failed to fetch groups", 500);
  }
}

// POST /api/templates/[id]/groups - Create group
export async function POST(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const { id: templateId } = await params;

    if (!isValidUUID(templateId)) {
      return errorResponse("Invalid template ID", 400);
    }

    const body = await request.json();
    const validationResult = groupSchema.safeParse(body);

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

    const groupData = validationResult.data;

    // If sort_order not provided, add at the end
    if (groupData.sort_order === undefined) {
      const { data: maxOrder } = await supabase
        .from("criteria_groups")
        .select("sort_order")
        .eq("template_id", templateId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      groupData.sort_order = (maxOrder?.sort_order ?? -1) + 1;
    }

    const { data: group, error } = await supabase
      .from("criteria_groups")
      .insert({
        template_id: templateId,
        ...groupData,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating group:", error);
      return errorResponse("Failed to create group", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "create",
      "criteria_group",
      group.id,
      undefined,
      { name: groupData.name, template_id: templateId },
      request
    );

    return successResponse(group, 201);
  } catch (error) {
    console.error("Error creating group:", error);
    return errorResponse("Failed to create group", 500);
  }
}

// PUT /api/templates/[id]/groups - Batch reorder groups
export async function PUT(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

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

    const supabase = await createClient();

    // Verify template belongs to org
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

    const { groups } = validationResult.data;

    // Update each group's sort_order
    for (const group of groups) {
      const { error } = await supabase
        .from("criteria_groups")
        .update({ sort_order: group.sort_order })
        .eq("id", group.id)
        .eq("template_id", templateId);

      if (error) {
        console.error("Error reordering group:", error);
        return errorResponse("Failed to reorder groups", 500);
      }
    }

    // Fetch updated groups
    const { data: updatedGroups } = await supabase
      .from("criteria_groups")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });

    return successResponse(updatedGroups);
  } catch (error) {
    console.error("Error reordering groups:", error);
    return errorResponse("Failed to reorder groups", 500);
  }
}

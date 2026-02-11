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

// Validation schema for creating criteria
const criteriaSchema = z.object({
  group_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255),
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
    .default("scale"),
  config: configSchema,
  weight: z.number().min(0).max(100).default(0),
  max_score: z.number().min(1).max(1000).default(100),
  sort_order: z.number().int().min(0).optional(),
  is_required: z.boolean().default(true),
  is_auto_fail: z.boolean().default(false),
  auto_fail_threshold: z.number().min(0).max(100).optional().nullable(),
  scoring_guide: z.string().max(2000).optional().nullable(),
  keywords: z.array(z.string()).default([]),
});

// Validation schema for batch reorder
const reorderSchema = z.object({
  criteria: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int().min(0),
      group_id: z.string().uuid().optional().nullable(),
    })
  ),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/templates/[id]/criteria - List criteria for template
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

    // Fetch criteria with optional group filter
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("group_id");

    let query = supabase
      .from("criteria")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });

    if (groupId) {
      if (groupId === "null") {
        query = query.is("group_id", null);
      } else if (isValidUUID(groupId)) {
        query = query.eq("group_id", groupId);
      }
    }

    const { data: criteria, error } = await query;

    if (error) {
      console.error("Error fetching criteria:", error);
      return errorResponse("Failed to fetch criteria", 500);
    }

    return successResponse(criteria);
  } catch (error) {
    console.error("Error fetching criteria:", error);
    return errorResponse("Failed to fetch criteria", 500);
  }
}

// POST /api/templates/[id]/criteria - Create criterion
export async function POST(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const { id: templateId } = await params;

    if (!isValidUUID(templateId)) {
      return errorResponse("Invalid template ID", 400);
    }

    const body = await request.json();
    const validationResult = criteriaSchema.safeParse(body);

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

    const criteriaData = validationResult.data;

    // Verify group exists if provided
    if (criteriaData.group_id) {
      const { data: group, error: groupError } = await supabase
        .from("criteria_groups")
        .select("id")
        .eq("id", criteriaData.group_id)
        .eq("template_id", templateId)
        .single();

      if (groupError || !group) {
        return errorResponse("Group not found", 404);
      }
    }

    // If sort_order not provided, add at the end of the group or template
    if (criteriaData.sort_order === undefined) {
      let maxOrderQuery = supabase
        .from("criteria")
        .select("sort_order")
        .eq("template_id", templateId);

      if (criteriaData.group_id) {
        maxOrderQuery = maxOrderQuery.eq("group_id", criteriaData.group_id);
      } else {
        maxOrderQuery = maxOrderQuery.is("group_id", null);
      }

      const { data: maxOrder } = await maxOrderQuery
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      criteriaData.sort_order = (maxOrder?.sort_order ?? -1) + 1;
    }

    // Set default config based on criteria type
    if (!criteriaData.config) {
      criteriaData.config = getDefaultConfig(criteriaData.criteria_type);
    }

    const { data: criterion, error } = await supabase
      .from("criteria")
      .insert({
        template_id: templateId,
        ...criteriaData,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating criterion:", error);
      return errorResponse("Failed to create criterion", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "create",
      "criteria",
      criterion.id,
      undefined,
      { name: criteriaData.name, template_id: templateId },
      request
    );

    return successResponse(criterion, 201);
  } catch (error) {
    console.error("Error creating criterion:", error);
    return errorResponse("Failed to create criterion", 500);
  }
}

// PUT /api/templates/[id]/criteria - Batch reorder/move criteria
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

    const { criteria } = validationResult.data;

    // Update each criterion's sort_order and optionally group_id
    for (const criterion of criteria) {
      const updateData: Record<string, unknown> = {
        sort_order: criterion.sort_order,
      };

      // Only update group_id if explicitly provided (including null)
      if (criterion.group_id !== undefined) {
        updateData.group_id = criterion.group_id;
      }

      const { error } = await supabase
        .from("criteria")
        .update(updateData)
        .eq("id", criterion.id)
        .eq("template_id", templateId);

      if (error) {
        console.error("Error reordering criterion:", error);
        return errorResponse("Failed to reorder criteria", 500);
      }
    }

    // Fetch updated criteria
    const { data: updatedCriteria } = await supabase
      .from("criteria")
      .select("*")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: true });

    return successResponse(updatedCriteria);
  } catch (error) {
    console.error("Error reordering criteria:", error);
    return errorResponse("Failed to reorder criteria", 500);
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

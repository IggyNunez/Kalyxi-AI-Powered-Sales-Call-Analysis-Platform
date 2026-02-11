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

const publishSchema = z.object({
  change_summary: z.string().max(500).optional(),
  set_as_default: z.boolean().default(false),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/templates/[id]/publish - Publish template and create version snapshot
export async function POST(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid template ID", 400);
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = publishSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { change_summary, set_as_default } = validationResult.data;

    const supabase = await createClient();

    // Fetch template with groups and criteria
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (templateError || !template) {
      return errorResponse("Template not found", 404);
    }

    // Check if template is already archived
    if (template.status === "archived") {
      return errorResponse("Cannot publish an archived template", 400);
    }

    // Fetch groups
    const { data: groups } = await supabase
      .from("criteria_groups")
      .select("*")
      .eq("template_id", id)
      .order("sort_order", { ascending: true });

    // Fetch criteria
    const { data: criteria } = await supabase
      .from("criteria")
      .select("*")
      .eq("template_id", id)
      .order("sort_order", { ascending: true });

    // Validate template has criteria
    if (!criteria || criteria.length === 0) {
      return errorResponse("Template must have at least one criterion to publish", 400);
    }

    // Validate total weight equals 100 for weighted scoring
    if (template.scoring_method === "weighted") {
      const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        return errorResponse(
          `Total weight must equal 100 for weighted scoring. Current total: ${totalWeight}`,
          400
        );
      }
    }

    // Get next version number
    const { data: latestVersion } = await supabase
      .from("template_versions")
      .select("version_number")
      .eq("template_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latestVersion?.version_number || 0) + 1;

    // Create version snapshot
    const snapshot = {
      template: {
        ...template,
        version: nextVersion,
        status: "active",
      },
      groups: groups || [],
      criteria: criteria || [],
    };

    const { data: version, error: versionError } = await supabase
      .from("template_versions")
      .insert({
        template_id: id,
        version_number: nextVersion,
        snapshot,
        change_summary,
        changed_by: user!.id,
      })
      .select()
      .single();

    if (versionError) {
      console.error("Error creating version:", versionError);
      return errorResponse("Failed to create version snapshot", 500);
    }

    // Update template status and version
    const updateData: Record<string, unknown> = {
      status: "active",
      version: nextVersion,
      activated_at: new Date().toISOString(),
    };

    // Handle default flag
    if (set_as_default) {
      // Unset other defaults
      await supabase
        .from("templates")
        .update({ is_default: false })
        .eq("org_id", orgId!)
        .eq("is_default", true)
        .neq("id", id);

      updateData.is_default = true;
    }

    const { data: updatedTemplate, error: updateError } = await supabase
      .from("templates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating template:", updateError);
      return errorResponse("Failed to publish template", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "publish",
      "template",
      id,
      { status: template.status, version: template.version },
      { status: "active", version: nextVersion },
      request
    );

    return successResponse({
      template: updatedTemplate,
      version,
    });
  } catch (error) {
    console.error("Error publishing template:", error);
    return errorResponse("Failed to publish template", 500);
  }
}

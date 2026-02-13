import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  requireAdmin,
  errorResponse,
  successResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";
import { ScriptSection } from "@/types/database";

// Validation schema for script sections
const sectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  tips: z.array(z.string().max(500)).optional(),
  order: z.number().min(0),
});

const updateScriptSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  sections: z.array(sectionSchema).min(1).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  is_default: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/scripts/[id] - Get single script
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { orgId, response } = await requireAuth();
  if (response) return response;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid script ID", 400);
  }

  try {
    const supabase = await createClient();

    const { data: script, error } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !script) {
      return errorResponse("Script not found", 404);
    }

    return successResponse(script);
  } catch (error) {
    console.error("Error fetching script:", error);
    return errorResponse("Failed to fetch script", 500);
  }
}

// PUT /api/scripts/[id] - Update script
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid script ID", 400);
  }

  try {
    const body = await request.json();
    const validationResult = updateScriptSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const updates = validationResult.data;
    const supabase = await createClient();

    // Get existing script
    const { data: existing, error: fetchError } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existing) {
      return errorResponse("Script not found", 404);
    }

    // If status is changing to active and is_default is true, unset other defaults
    if (updates.status === "active" && updates.is_default) {
      await supabase
        .from("scripts")
        .update({ is_default: false })
        .eq("org_id", orgId!)
        .eq("is_default", true)
        .neq("id", id);
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.sections !== undefined) {
      updateData.sections = updates.sections as unknown as ScriptSection[];
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
      if (updates.status === "archived") {
        updateData.archived_at = new Date().toISOString();
        updateData.is_default = false;
      }
    }
    if (updates.is_default !== undefined && updates.status !== "archived") {
      updateData.is_default = updates.is_default;
    }

    const { data: script, error } = await supabase
      .from("scripts")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", orgId!)
      .select()
      .single();

    if (error) {
      console.error("Error updating script:", error);
      return errorResponse("Failed to update script", 500);
    }

    // Audit log
    await createAuditLog(orgId!, user!.id, "update", "script", id, existing, script, request);

    return successResponse(script);
  } catch (error) {
    console.error("Error updating script:", error);
    return errorResponse("Failed to update script", 500);
  }
}

// DELETE /api/scripts/[id] - Delete script
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid script ID", 400);
  }

  try {
    const supabase = await createClient();

    // Get existing script
    const { data: existing, error: fetchError } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (fetchError || !existing) {
      return errorResponse("Script not found", 404);
    }

    // Delete script
    const { error } = await supabase
      .from("scripts")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId!);

    if (error) {
      console.error("Error deleting script:", error);
      return errorResponse("Failed to delete script", 500);
    }

    await createAuditLog(orgId!, user!.id, "delete", "script", id, existing, undefined, request);

    return NextResponse.json({ message: "Script deleted" });
  } catch (error) {
    console.error("Error deleting script:", error);
    return errorResponse("Failed to delete script", 500);
  }
}

import { createClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  errorResponse,
  successResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";

const updateSchema = z.object({
  is_active: z.boolean().optional(),
  expires_at: z.string().nullable().optional(),
  effective_date: z.string().optional(),
});

// PUT /api/template-assignments/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  if (!isValidUUID(id)) return errorResponse("Invalid ID", 400);

  try {
    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        `Validation error: ${result.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("template_assignments")
      .update(result.data)
      .eq("id", id)
      .eq("org_id", orgId!)
      .select()
      .single();

    if (error || !data) return errorResponse("Assignment not found", 404);

    await createAuditLog(
      orgId!,
      user!.id,
      "update",
      "template_assignment",
      id,
      undefined,
      result.data,
      request
    );

    return successResponse(data);
  } catch (error) {
    console.error("Error updating assignment:", error);
    return errorResponse("Failed to update assignment", 500);
  }
}

// DELETE /api/template-assignments/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  if (!isValidUUID(id)) return errorResponse("Invalid ID", 400);

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("template_assignments")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId!);

    if (error) return errorResponse("Failed to delete assignment", 500);

    await createAuditLog(
      orgId!,
      user!.id,
      "delete",
      "template_assignment",
      id,
      undefined,
      undefined,
      request
    );

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return errorResponse("Failed to delete assignment", 500);
  }
}

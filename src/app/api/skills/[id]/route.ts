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

const skillUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  category: z
    .enum([
      "communication",
      "sales_technique",
      "product_knowledge",
      "objection_handling",
      "closing",
      "discovery",
      "rapport",
      "presentation",
      "general",
    ])
    .optional(),
  parent_skill_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

// GET /api/skills/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;
  if (!isValidUUID(id)) return errorResponse("Invalid ID", 400);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !data) return errorResponse("Skill not found", 404);
    return successResponse(data);
  } catch (error) {
    console.error("Error fetching skill:", error);
    return errorResponse("Failed to fetch skill", 500);
  }
}

// PUT /api/skills/[id]
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
    const result = skillUpdateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        `Validation error: ${result.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("skills")
      .update(result.data)
      .eq("id", id)
      .eq("org_id", orgId!)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return errorResponse("A skill with this name already exists", 409);
      }
      return errorResponse("Skill not found", 404);
    }

    await createAuditLog(
      orgId!,
      user!.id,
      "update",
      "skill",
      id,
      undefined,
      result.data,
      request
    );

    return successResponse(data);
  } catch (error) {
    console.error("Error updating skill:", error);
    return errorResponse("Failed to update skill", 500);
  }
}

// DELETE /api/skills/[id]
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
      .from("skills")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId!);

    if (error) return errorResponse("Failed to delete skill", 500);

    await createAuditLog(
      orgId!,
      user!.id,
      "delete",
      "skill",
      id,
      undefined,
      undefined,
      request
    );

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Error deleting skill:", error);
    return errorResponse("Failed to delete skill", 500);
  }
}

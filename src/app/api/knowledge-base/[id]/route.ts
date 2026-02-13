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

const kbDocUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).max(50000).optional(),
  doc_type: z
    .enum(["guideline", "playbook", "product_info", "policy", "faq", "objection_handling", "other"])
    .optional(),
  category: z.string().max(100).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  is_active: z.boolean().optional(),
});

// GET /api/knowledge-base/[id]
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
      .from("knowledge_base_documents")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !data) return errorResponse("Document not found", 404);
    return successResponse(data);
  } catch (error) {
    console.error("Error fetching KB document:", error);
    return errorResponse("Failed to fetch document", 500);
  }
}

// PUT /api/knowledge-base/[id]
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
    const result = kbDocUpdateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        `Validation error: ${result.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("knowledge_base_documents")
      .update(result.data)
      .eq("id", id)
      .eq("org_id", orgId!)
      .select()
      .single();

    if (error || !data) return errorResponse("Document not found", 404);

    await createAuditLog(
      orgId!,
      user!.id,
      "update",
      "knowledge_base_document",
      id,
      undefined,
      result.data,
      request
    );

    return successResponse(data);
  } catch (error) {
    console.error("Error updating KB document:", error);
    return errorResponse("Failed to update document", 500);
  }
}

// DELETE /api/knowledge-base/[id]
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
      .from("knowledge_base_documents")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId!);

    if (error) return errorResponse("Failed to delete document", 500);

    await createAuditLog(
      orgId!,
      user!.id,
      "delete",
      "knowledge_base_document",
      id,
      undefined,
      undefined,
      request
    );

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Error deleting KB document:", error);
    return errorResponse("Failed to delete document", 500);
  }
}

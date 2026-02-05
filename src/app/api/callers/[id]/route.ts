import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requireAdmin,
  errorResponse,
  createAuditLog,
  sanitizeInput,
  isValidUUID,
} from "@/lib/api-utils";

const updateCallerSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional().nullable(),
  team: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/callers/[id] - Get single caller
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid caller ID", 400);
  }

  try {
    const supabase = await createClient();

    const { data: caller, error } = await supabase
      .from("callers")
      .select(`
        *,
        user:users(id, name, email, avatar_url),
        calls(
          id,
          status,
          call_timestamp,
          customer_name,
          customer_company,
          analyses(overall_score, composite_score)
        )
      `)
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (error || !caller) {
      return errorResponse("Caller not found", 404);
    }

    // For callers role, only allow viewing their own profile
    if (role === "caller" && caller.user_id !== user!.id) {
      return errorResponse("Forbidden", 403);
    }

    return NextResponse.json({ data: caller });
  } catch (error) {
    console.error("Error fetching caller:", error);
    return errorResponse("Internal server error", 500);
  }
}

// PATCH /api/callers/[id] - Update caller
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid caller ID", 400);
  }

  try {
    const body = await request.json();
    const validatedData = updateCallerSchema.parse(body);

    const supabase = await createClient();

    // Get current caller
    const { data: currentCaller } = await supabase
      .from("callers")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (!currentCaller) {
      return errorResponse("Caller not found", 404);
    }

    // Check for duplicate email if changing email
    if (validatedData.email && validatedData.email !== currentCaller.email) {
      const { data: existing } = await supabase
        .from("callers")
        .select("id")
        .eq("org_id", orgId!)
        .eq("email", validatedData.email)
        .neq("id", id)
        .single();

      if (existing) {
        return errorResponse("A caller with this email already exists", 400);
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) {
      updateData.name = sanitizeInput(validatedData.name);
    }
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email;
    }
    if (validatedData.team !== undefined) {
      updateData.team = validatedData.team ? sanitizeInput(validatedData.team) : null;
    }
    if (validatedData.department !== undefined) {
      updateData.department = validatedData.department ? sanitizeInput(validatedData.department) : null;
    }
    if (validatedData.is_active !== undefined) {
      updateData.is_active = validatedData.is_active;
    }
    if (validatedData.metadata !== undefined) {
      updateData.metadata = validatedData.metadata;
    }

    // Update caller
    const { data: caller, error } = await supabase
      .from("callers")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", orgId!)
      .select()
      .single();

    if (error) {
      console.error("Error updating caller:", error);
      return errorResponse("Failed to update caller", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "caller.updated",
      "caller",
      caller.id,
      currentCaller,
      updateData,
      request
    );

    return NextResponse.json({ data: caller });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || "Validation failed", 400);
    }
    console.error("Error in caller PATCH:", error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/callers/[id] - Delete caller
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  if (!isValidUUID(id)) {
    return errorResponse("Invalid caller ID", 400);
  }

  try {
    const supabase = await createClient();

    // Get caller first for audit log
    const { data: caller } = await supabase
      .from("callers")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (!caller) {
      return errorResponse("Caller not found", 404);
    }

    // Soft delete by deactivating
    const { error } = await supabase
      .from("callers")
      .update({ is_active: false })
      .eq("id", id)
      .eq("org_id", orgId!);

    if (error) {
      console.error("Error deleting caller:", error);
      return errorResponse("Failed to delete caller", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "caller.deleted",
      "caller",
      id,
      caller,
      undefined,
      request
    );

    return NextResponse.json({ message: "Caller deactivated successfully" });
  } catch (error) {
    console.error("Error in caller DELETE:", error);
    return errorResponse("Internal server error", 500);
  }
}

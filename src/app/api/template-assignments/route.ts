import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  errorResponse,
  successResponse,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";

const assignmentSchema = z.object({
  template_id: z.string().uuid(),
  user_id: z.string().uuid(),
  effective_date: z.string().optional(),
  expires_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

// GET /api/template-assignments - List assignments
export async function GET(request: Request) {
  const { orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("user_id");
    const templateId = searchParams.get("template_id");

    let query = supabase
      .from("template_assignments")
      .select("*, template:templates(id, name, status), user:users(id, name, email)")
      .eq("org_id", orgId!);

    if (userId) query = query.eq("user_id", userId);
    if (templateId) query = query.eq("template_id", templateId);

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching assignments:", error);
      return errorResponse("Failed to fetch assignments", 500);
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return errorResponse("Failed to fetch assignments", 500);
  }
}

// POST /api/template-assignments - Create assignment
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const result = assignmentSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        `Validation error: ${result.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("template_assignments")
      .upsert(
        {
          org_id: orgId!,
          ...result.data,
          assigned_by: user!.id,
        },
        { onConflict: "template_id,user_id" }
      )
      .select("*, template:templates(id, name), user:users(id, name, email)")
      .single();

    if (error) {
      console.error("Error creating assignment:", error);
      return errorResponse("Failed to create assignment", 500);
    }

    await createAuditLog(
      orgId!,
      user!.id,
      "create",
      "template_assignment",
      data.id,
      undefined,
      { template_id: result.data.template_id, user_id: result.data.user_id },
      request
    );

    return successResponse(data, 201);
  } catch (error) {
    console.error("Error creating assignment:", error);
    return errorResponse("Failed to create assignment", 500);
  }
}

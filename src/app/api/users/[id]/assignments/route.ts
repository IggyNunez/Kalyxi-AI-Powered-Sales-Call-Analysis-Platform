import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  isValidUUID,
} from "@/lib/api-utils";

// GET /api/users/[id]/assignments - Get template assignments for a user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  const { id } = await params;
  if (!isValidUUID(id)) return errorResponse("Invalid user ID", 400);

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("template_assignments")
      .select("*, template:templates(id, name, status, scoring_method, use_case)")
      .eq("user_id", id)
      .eq("org_id", orgId!)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

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

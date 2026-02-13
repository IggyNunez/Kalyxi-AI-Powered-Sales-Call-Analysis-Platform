import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  isValidUUID,
} from "@/lib/api-utils";

// GET /api/users/[id]/skills - Get skill score history for a user
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
    const { searchParams } = new URL(request.url);

    const skillId = searchParams.get("skill_id");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    let query = supabase
      .from("user_skill_scores")
      .select("*, skill:skills(id, name, category)")
      .eq("user_id", id)
      .eq("org_id", orgId!)
      .order("scored_at", { ascending: false })
      .limit(limit);

    if (skillId) query = query.eq("skill_id", skillId);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching skill scores:", error);
      return errorResponse("Failed to fetch skill scores", 500);
    }

    // Also compute aggregate scores per skill
    const { data: aggregates } = await supabase
      .rpc("get_user_skill_aggregates", { p_user_id: id, p_org_id: orgId! })
      .select("*");

    return NextResponse.json({
      data: {
        scores: data,
        aggregates: aggregates || [],
      },
    });
  } catch (error) {
    console.error("Error fetching skill scores:", error);
    return errorResponse("Failed to fetch skill scores", 500);
  }
}

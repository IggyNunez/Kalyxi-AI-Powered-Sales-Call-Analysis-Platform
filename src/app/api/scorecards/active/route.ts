import { createClient } from "@/lib/supabase/server";
import { requireAuth, errorResponse, successResponse } from "@/lib/api-utils";

// GET /api/scorecards/active - Get active default scorecard for org
export async function GET() {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();

    // Get active default scorecard
    const { data: scorecard, error } = await supabase
      .from("scorecards")
      .select("*")
      .eq("org_id", orgId!)
      .eq("status", "active")
      .eq("is_default", true)
      .single();

    if (error || !scorecard) {
      // Fallback: get any active scorecard
      const { data: fallbackScorecard, error: fallbackError } = await supabase
        .from("scorecards")
        .select("*")
        .eq("org_id", orgId!)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fallbackError || !fallbackScorecard) {
        return errorResponse("No active scorecard found", 404);
      }

      return successResponse(fallbackScorecard);
    }

    return successResponse(scorecard);
  } catch (error) {
    console.error("Error fetching active scorecard:", error);
    return errorResponse("Failed to fetch active scorecard", 500);
  }
}

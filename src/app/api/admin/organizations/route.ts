import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireSuperadmin, errorResponse } from "@/lib/api-utils";

// GET /api/admin/organizations - List all organizations (superadmin only)
export async function GET() {
  const { response } = await requireSuperadmin();
  if (response) return response;

  try {
    const supabase = createAdminClient();

    // Get all organizations with user and call counts
    const { data: organizations, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name, slug, plan, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (orgsError) {
      console.error("Error fetching organizations:", orgsError);
      return errorResponse("Failed to fetch organizations", 500);
    }

    // Get counts for each organization
    const orgsWithCounts = await Promise.all(
      (organizations || []).map(async (org) => {
        const [usersResult, callsResult] = await Promise.all([
          supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("org_id", org.id),
          supabase
            .from("calls")
            .select("id", { count: "exact", head: true })
            .eq("org_id", org.id),
        ]);

        return {
          ...org,
          _count: {
            users: usersResult.count || 0,
            calls: callsResult.count || 0,
          },
        };
      })
    );

    return NextResponse.json({ data: orgsWithCounts });
  } catch (error) {
    console.error("Error in admin organizations GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

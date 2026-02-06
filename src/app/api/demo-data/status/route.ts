import { NextResponse } from "next/server";
import { requireAdmin, errorResponse } from "@/lib/api-utils";
import { getDemoDataStatus, isDemoDataEnabled } from "@/lib/demo/demo-data";

export async function GET() {
  // Require admin role
  const { orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    // Create Supabase client with service role for demo data operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return errorResponse("Server configuration error: Missing service key", 500);
    }

    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get demo data status
    const status = await getDemoDataStatus(supabase, orgId!);

    return NextResponse.json({
      enabled: isDemoDataEnabled(),
      ...status,
    });
  } catch (error) {
    console.error("Error getting demo data status:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get demo data status",
      500
    );
  }
}

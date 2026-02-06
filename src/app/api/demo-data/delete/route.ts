import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse, createAuditLog } from "@/lib/api-utils";
import { deleteDemoData, isDemoDataEnabled } from "@/lib/demo/demo-data";
import { z } from "zod";

const requestSchema = z.object({
  batchId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  // Check if demo data is enabled
  if (!isDemoDataEnabled()) {
    return errorResponse(
      "Demo data operations are disabled. Set DEMO_DATA_ENABLED=true to enable.",
      403
    );
  }

  // Require admin role
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json().catch(() => ({}));
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { batchId } = validationResult.data;

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

    // Delete demo data
    const result = await deleteDemoData(supabase, orgId!, batchId);

    // Create audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "demo_data_delete",
      "demo_data",
      batchId || "all",
      { deleted: result.deleted },
      undefined,
      request
    );

    if (!result.success) {
      return errorResponse("Failed to delete demo data", 500);
    }

    const totalDeleted = Object.values(result.deleted).reduce((a, b) => a + b, 0);

    return successResponse({
      message: totalDeleted > 0 ? "Demo data deleted successfully" : "No demo data found to delete",
      deleted: result.deleted,
      total: totalDeleted,
    });
  } catch (error) {
    console.error("Error deleting demo data:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete demo data",
      500
    );
  }
}

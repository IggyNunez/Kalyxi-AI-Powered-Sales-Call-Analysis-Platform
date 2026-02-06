import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse, createAuditLog } from "@/lib/api-utils";
import { generateDemoData, isDemoDataEnabled, DemoSize } from "@/lib/demo/demo-data";
import { z } from "zod";

const requestSchema = z.object({
  size: z.enum(["small", "medium", "stress"]),
  seed: z.number().optional(),
});

export async function POST(request: Request) {
  // Check if demo data is enabled
  if (!isDemoDataEnabled()) {
    return errorResponse(
      "Demo data generation is disabled. Set DEMO_DATA_ENABLED=true to enable.",
      403
    );
  }

  // Require admin role
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { size, seed } = validationResult.data;

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

    // Generate demo data
    const result = await generateDemoData(supabase, {
      orgId: orgId!,
      userId: user!.id,
      size: size as DemoSize,
      seed,
    });

    // Create audit log
    const auditSupabase = await createClient();
    await createAuditLog(
      orgId!,
      user!.id,
      "demo_data_generate",
      "demo_data",
      result.batchId,
      undefined,
      { size, counts: result.counts },
      request
    );

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Demo data generation completed with errors",
          batchId: result.batchId,
          counts: result.counts,
          errors: result.errors,
        },
        { status: 207 }
      );
    }

    return successResponse({
      message: "Demo data generated successfully",
      batchId: result.batchId,
      counts: result.counts,
    });
  } catch (error) {
    console.error("Error generating demo data:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate demo data",
      500
    );
  }
}

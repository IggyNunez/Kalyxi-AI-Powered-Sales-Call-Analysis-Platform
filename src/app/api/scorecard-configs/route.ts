import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requireAdmin,
  errorResponse,
  createAuditLog,
  sanitizeInput,
} from "@/lib/api-utils";

const scorecardFieldSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  weight: z.number().min(0).max(100),
  scoringMethod: z.enum(["weighted", "average", "sum", "min", "max"]),
  passingThreshold: z.number().min(0).max(100).optional(),
  linkedCriteria: z.array(z.string()).optional(),
});

const createScorecardSchema = z.object({
  name: z.string().min(2).max(255),
  fields_json: z.array(scorecardFieldSchema),
  passing_threshold: z.number().min(0).max(100).optional(),
  is_default: z.boolean().optional(),
});

// GET /api/scorecard-configs - List scorecard configs
export async function GET(request: Request) {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();

    const { data: configs, error } = await supabase
      .from("scorecard_configs")
      .select("*")
      .eq("org_id", orgId!)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching scorecard configs:", error);
      return errorResponse("Failed to fetch scorecard configs", 500);
    }

    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error("Error in scorecard-configs GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/scorecard-configs - Create scorecard config
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const validatedData = createScorecardSchema.parse(body);

    const supabase = await createClient();

    // Validate field IDs are unique
    const fieldIds = validatedData.fields_json.map((f) => f.id);
    if (new Set(fieldIds).size !== fieldIds.length) {
      return errorResponse("Field IDs must be unique", 400);
    }

    // Sanitize fields
    const sanitizedFields = validatedData.fields_json.map((f) => ({
      ...f,
      name: sanitizeInput(f.name),
    }));

    // Create scorecard config
    const { data: config, error } = await supabase
      .from("scorecard_configs")
      .insert({
        org_id: orgId!,
        name: sanitizeInput(validatedData.name),
        fields_json: sanitizedFields,
        passing_threshold: validatedData.passing_threshold || 70,
        is_default: validatedData.is_default || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating scorecard config:", error);
      return errorResponse("Failed to create scorecard config", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "scorecard_config.created",
      "scorecard_config",
      config.id,
      undefined,
      { name: config.name, fields_count: sanitizedFields.length },
      request
    );

    return NextResponse.json({ data: config }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || "Validation failed", 400);
    }
    console.error("Error in scorecard-configs POST:", error);
    return errorResponse("Internal server error", 500);
  }
}

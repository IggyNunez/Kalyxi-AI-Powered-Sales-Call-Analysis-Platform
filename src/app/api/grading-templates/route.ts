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
import { GradingCriterion } from "@/types/database";

const gradingCriterionSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  type: z.enum(["score", "text", "checklist", "boolean", "percentage"]),
  weight: z.number().min(0).max(100),
  isRequired: z.boolean(),
  order: z.number().int().min(0),
  options: z.array(z.string()).optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  passingThreshold: z.number().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  criteria_json: z.array(gradingCriterionSchema),
  is_default: z.boolean().optional(),
});

// GET /api/grading-templates - List templates
export async function GET(request: Request) {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();

    const { data: templates, error } = await supabase
      .from("grading_templates")
      .select("*")
      .eq("org_id", orgId!)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching templates:", error);
      return errorResponse("Failed to fetch templates", 500);
    }

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Error in templates GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/grading-templates - Create template
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    const supabase = await createClient();

    // Validate criteria IDs are unique
    const criteriaIds = validatedData.criteria_json.map((c) => c.id);
    if (new Set(criteriaIds).size !== criteriaIds.length) {
      return errorResponse("Criteria IDs must be unique", 400);
    }

    // Sanitize criteria
    const sanitizedCriteria: GradingCriterion[] = validatedData.criteria_json.map((c) => ({
      ...c,
      name: sanitizeInput(c.name),
      description: sanitizeInput(c.description),
    }));

    // Create template
    const { data: template, error } = await supabase
      .from("grading_templates")
      .insert({
        org_id: orgId!,
        name: sanitizeInput(validatedData.name),
        description: validatedData.description ? sanitizeInput(validatedData.description) : null,
        criteria_json: sanitizedCriteria,
        is_default: validatedData.is_default || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating template:", error);
      return errorResponse("Failed to create template", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "grading_template.created",
      "grading_template",
      template.id,
      undefined,
      { name: template.name, criteria_count: sanitizedCriteria.length },
      request
    );

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || "Validation failed", 400);
    }
    console.error("Error in templates POST:", error);
    return errorResponse("Internal server error", 500);
  }
}

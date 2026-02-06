import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  requireAdmin,
  errorResponse,
  successResponse,
  getPaginationParams,
  getSortParams,
  createAuditLog,
} from "@/lib/api-utils";
import { z } from "zod";
import { ScriptSection } from "@/types/database";

// Validation schema for script sections
const sectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  tips: z.array(z.string().max(500)).optional(),
  order: z.number().min(0),
});

// Validation schema for creating/updating scripts
const scriptSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  sections: z.array(sectionSchema).min(1),
  status: z.enum(["draft", "active", "archived"]).optional(),
  is_default: z.boolean().optional(),
});

// GET /api/scripts - List scripts
export async function GET(request: Request) {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortParams(
      searchParams,
      ["name", "status", "created_at", "updated_at", "version"],
      "created_at"
    );

    // Filters
    const status = searchParams.get("status");
    const isDefault = searchParams.get("is_default");

    let query = supabase
      .from("scripts")
      .select("*", { count: "exact" })
      .eq("org_id", orgId!);

    if (status) {
      query = query.eq("status", status);
    }

    if (isDefault === "true") {
      query = query.eq("is_default", true);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data: scripts, error, count } = await query;

    if (error) {
      console.error("Error fetching scripts:", error);
      return errorResponse("Failed to fetch scripts", 500);
    }

    return NextResponse.json({
      data: scripts,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching scripts:", error);
    return errorResponse("Failed to fetch scripts", 500);
  }
}

// POST /api/scripts - Create script
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const validationResult = scriptSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        `Validation error: ${validationResult.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const { name, description, sections, status, is_default } = validationResult.data;

    const supabase = await createClient();

    // If setting as default, unset other defaults first
    if (is_default && status === "active") {
      await supabase
        .from("scripts")
        .update({ is_default: false })
        .eq("org_id", orgId!)
        .eq("is_default", true);
    }

    const { data: script, error } = await supabase
      .from("scripts")
      .insert({
        org_id: orgId!,
        name,
        description,
        sections: sections as unknown as ScriptSection[],
        status: status || "draft",
        is_default: is_default && status === "active" ? true : false,
        created_by: user!.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating script:", error);
      return errorResponse("Failed to create script", 500);
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "create",
      "script",
      script.id,
      undefined,
      { name, status: status || "draft" },
      request
    );

    return successResponse(script, 201);
  } catch (error) {
    console.error("Error creating script:", error);
    return errorResponse("Failed to create script", 500);
  }
}

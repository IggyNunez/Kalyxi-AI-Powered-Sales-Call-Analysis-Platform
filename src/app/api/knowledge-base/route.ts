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

const kbDocSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(50000),
  doc_type: z
    .enum(["guideline", "playbook", "product_info", "policy", "faq", "objection_handling", "other"])
    .default("guideline"),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  is_active: z.boolean().default(true),
});

// GET /api/knowledge-base - List KB documents
export async function GET(request: Request) {
  const { orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortParams(
      searchParams,
      ["title", "doc_type", "category", "created_at", "updated_at"],
      "created_at"
    );

    const docType = searchParams.get("doc_type");
    const category = searchParams.get("category");
    const isActive = searchParams.get("is_active");
    const search = searchParams.get("search");

    let query = supabase
      .from("knowledge_base_documents")
      .select("*", { count: "exact" })
      .eq("org_id", orgId!);

    if (docType) query = query.eq("doc_type", docType);
    if (category) query = query.eq("category", category);
    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }
    if (search) query = query.ilike("title", `%${search}%`);

    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching KB documents:", error);
      return errorResponse("Failed to fetch documents", 500);
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching KB documents:", error);
    return errorResponse("Failed to fetch documents", 500);
  }
}

// POST /api/knowledge-base - Create KB document
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const result = kbDocSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        `Validation error: ${result.error.issues.map((e) => e.message).join(", ")}`,
        400
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("knowledge_base_documents")
      .insert({
        org_id: orgId!,
        ...result.data,
        created_by: user!.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating KB document:", error);
      return errorResponse("Failed to create document", 500);
    }

    await createAuditLog(
      orgId!,
      user!.id,
      "create",
      "knowledge_base_document",
      data.id,
      undefined,
      { title: result.data.title, doc_type: result.data.doc_type },
      request
    );

    return successResponse(data, 201);
  } catch (error) {
    console.error("Error creating KB document:", error);
    return errorResponse("Failed to create document", 500);
  }
}

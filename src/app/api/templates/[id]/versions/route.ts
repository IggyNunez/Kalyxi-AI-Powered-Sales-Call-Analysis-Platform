/**
 * Template Versions API
 *
 * GET /api/templates/[id]/versions - List all versions of a template
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  successResponse,
  isValidUUID,
  getPaginationParams,
} from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/templates/[id]/versions - List template versions
export async function GET(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireAuth();
  if (response) return response;

  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return errorResponse("Invalid template ID", 400);
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    // Verify template exists and belongs to org
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, name")
      .eq("id", id)
      .eq("org_id", orgId!)
      .single();

    if (templateError || !template) {
      return errorResponse("Template not found", 404);
    }

    // Fetch versions
    const { data: versions, error, count } = await supabase
      .from("template_versions")
      .select("*", { count: "exact" })
      .eq("template_id", id)
      .order("version_number", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Error fetching template versions:", error);
      return errorResponse("Failed to fetch template versions", 500);
    }

    return NextResponse.json({
      data: versions,
      template: {
        id: template.id,
        name: template.name,
      },
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching template versions:", error);
    return errorResponse("Failed to fetch template versions", 500);
  }
}

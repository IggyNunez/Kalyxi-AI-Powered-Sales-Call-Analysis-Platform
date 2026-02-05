import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requireAdmin,
  getPaginationParams,
  getSortParams,
  errorResponse,
  createAuditLog,
  sanitizeInput,
  isValidUUID,
} from "@/lib/api-utils";

const createCallSchema = z.object({
  caller_id: z.string().uuid(),
  raw_notes: z.string().min(10).max(50000),
  customer_name: z.string().max(255).optional(),
  customer_company: z.string().max(255).optional(),
  customer_phone: z.string().max(50).optional(),
  customer_email: z.string().email().optional(),
  duration: z.number().int().positive().optional(),
  call_timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/calls - List calls
export async function GET(request: Request) {
  const { user, orgId, role, response } = await requireAuth();
  if (response) return response;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { page, pageSize, offset } = getPaginationParams(searchParams);
    const { sortBy, sortOrder } = getSortParams(
      searchParams,
      ["call_timestamp", "created_at", "status", "customer_name"],
      "call_timestamp",
      "desc"
    );

    // Build query
    let query = supabase
      .from("calls")
      .select(`
        *,
        caller:callers(id, name, team),
        analyses(id, overall_score, composite_score, created_at)
      `, { count: "exact" })
      .eq("org_id", orgId!);

    // For callers role, only show their own calls
    if (role === "caller") {
      // Get caller ID for current user
      const { data: callerData } = await supabase
        .from("callers")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (callerData) {
        query = query.eq("caller_id", callerData.id);
      } else {
        // No caller profile, return empty
        return NextResponse.json({
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        });
      }
    }

    // Filter by caller
    const callerId = searchParams.get("caller_id");
    if (callerId && isValidUUID(callerId)) {
      query = query.eq("caller_id", callerId);
    }

    // Filter by status
    const status = searchParams.get("status");
    if (status) {
      query = query.eq("status", status);
    }

    // Filter by date range
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    if (startDate) {
      query = query.gte("call_timestamp", startDate);
    }
    if (endDate) {
      query = query.lte("call_timestamp", endDate);
    }

    // Search by customer name or company
    const search = searchParams.get("search");
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_company.ilike.%${search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data: calls, count, error } = await query;

    if (error) {
      console.error("Error fetching calls:", error);
      return errorResponse("Failed to fetch calls", 500);
    }

    return NextResponse.json({
      data: calls,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in calls GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/calls - Create call (manual entry)
export async function POST(request: Request) {
  const { user, orgId, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const validatedData = createCallSchema.parse(body);

    const supabase = await createClient();

    // Verify caller exists in org
    const { data: caller } = await supabase
      .from("callers")
      .select("id")
      .eq("id", validatedData.caller_id)
      .eq("org_id", orgId!)
      .single();

    if (!caller) {
      return errorResponse("Caller not found", 404);
    }

    // Create call
    const { data: call, error } = await supabase
      .from("calls")
      .insert({
        org_id: orgId!,
        caller_id: validatedData.caller_id,
        raw_notes: sanitizeInput(validatedData.raw_notes),
        source: "manual",
        status: "pending",
        customer_name: validatedData.customer_name ? sanitizeInput(validatedData.customer_name) : null,
        customer_company: validatedData.customer_company ? sanitizeInput(validatedData.customer_company) : null,
        customer_phone: validatedData.customer_phone,
        customer_email: validatedData.customer_email,
        duration: validatedData.duration,
        call_timestamp: validatedData.call_timestamp || new Date().toISOString(),
        metadata: validatedData.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating call:", error);
      return errorResponse("Failed to create call", 500);
    }

    // Check if auto-analyze is enabled and queue the call
    const { data: org } = await supabase
      .from("organizations")
      .select("settings_json")
      .eq("id", orgId!)
      .single();

    const settings = org?.settings_json as { features?: { autoAnalyze?: boolean } } | null;
    if (settings?.features?.autoAnalyze) {
      // Add to processing queue
      await supabase.from("processing_queue").insert({
        org_id: orgId!,
        call_id: call.id,
        status: "queued",
        priority: 0,
      });
    }

    // Audit log
    await createAuditLog(
      orgId!,
      user!.id,
      "call.created",
      "call",
      call.id,
      undefined,
      { caller_id: call.caller_id, source: "manual" },
      request
    );

    return NextResponse.json({ data: call }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || "Validation failed", 400);
    }
    console.error("Error in calls POST:", error);
    return errorResponse("Internal server error", 500);
  }
}

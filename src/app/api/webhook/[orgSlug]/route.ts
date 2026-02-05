import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

// Webhook payload schema
const webhookPayloadSchema = z.object({
  caller_id: z.string().optional(), // External caller ID
  caller_email: z.string().email().optional(), // Or identify by email
  caller_name: z.string().optional(), // Or create new caller
  raw_notes: z.string().min(10).max(100000),
  customer_name: z.string().max(255).optional(),
  customer_company: z.string().max(255).optional(),
  customer_phone: z.string().max(50).optional(),
  customer_email: z.string().email().optional(),
  duration: z.number().int().positive().optional(),
  call_timestamp: z.string().datetime().optional(),
  external_id: z.string().max(255).optional(), // For deduplication
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Verify webhook signature
function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// POST /api/webhook/[orgSlug] - Receive call data via webhook
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const startTime = Date.now();
  const { orgSlug } = await params;

  const supabase = createAdminClient();

  // Get organization by slug
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, webhook_secret, settings_json")
    .eq("slug", orgSlug)
    .single();

  if (orgError || !org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  // Get raw body for signature verification
  const rawBody = await request.text();
  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    await logWebhook(supabase, org.id, request, rawBody, 400, "Invalid JSON", startTime);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify signature if provided
  const signature = request.headers.get("x-webhook-signature");
  const authHeader = request.headers.get("authorization");

  // Check auth - either signature or bearer token
  let authenticated = false;

  if (signature) {
    authenticated = verifySignature(rawBody, signature, org.webhook_secret);
  } else if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    authenticated = token === org.webhook_secret;
  }

  if (!authenticated) {
    await logWebhook(supabase, org.id, request, body, 401, "Invalid authentication", startTime);
    return NextResponse.json(
      { error: "Invalid authentication" },
      { status: 401 }
    );
  }

  // Validate payload
  const validationResult = webhookPayloadSchema.safeParse(body);

  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues[0]?.message || "Validation failed";
    await logWebhook(supabase, org.id, request, body, 400, errorMessage, startTime);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  const data = validationResult.data;

  try {
    // Check for duplicate by external_id
    if (data.external_id) {
      const { data: existing } = await supabase
        .from("calls")
        .select("id")
        .eq("org_id", org.id)
        .eq("external_id", data.external_id)
        .single();

      if (existing) {
        await logWebhook(supabase, org.id, request, body, 409, "Duplicate call", startTime);
        return NextResponse.json(
          { error: "Call with this external_id already exists", call_id: existing.id },
          { status: 409 }
        );
      }
    }

    // Find or create caller
    let callerId: string | null = null;

    if (data.caller_id) {
      // Look up by external ID in metadata
      const { data: caller } = await supabase
        .from("callers")
        .select("id")
        .eq("org_id", org.id)
        .contains("metadata", { external_id: data.caller_id })
        .single();

      if (caller) {
        callerId = caller.id;
      }
    }

    if (!callerId && data.caller_email) {
      // Look up by email
      const { data: caller } = await supabase
        .from("callers")
        .select("id")
        .eq("org_id", org.id)
        .eq("email", data.caller_email)
        .single();

      if (caller) {
        callerId = caller.id;
      }
    }

    if (!callerId && (data.caller_name || data.caller_email)) {
      // Create new caller
      const { data: newCaller, error: callerError } = await supabase
        .from("callers")
        .insert({
          org_id: org.id,
          name: data.caller_name || data.caller_email?.split("@")[0] || "Unknown Caller",
          email: data.caller_email,
          is_active: true,
          metadata: data.caller_id ? { external_id: data.caller_id } : {},
        })
        .select("id")
        .single();

      if (callerError) {
        await logWebhook(supabase, org.id, request, body, 500, "Failed to create caller", startTime);
        return NextResponse.json(
          { error: "Failed to create caller" },
          { status: 500 }
        );
      }

      callerId = newCaller.id;
    }

    if (!callerId) {
      await logWebhook(supabase, org.id, request, body, 400, "Caller identification required", startTime);
      return NextResponse.json(
        { error: "Caller identification required (caller_id, caller_email, or caller_name)" },
        { status: 400 }
      );
    }

    // Create call
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert({
        org_id: org.id,
        caller_id: callerId,
        raw_notes: data.raw_notes,
        source: "webhook",
        status: "pending",
        external_id: data.external_id,
        customer_name: data.customer_name,
        customer_company: data.customer_company,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email,
        duration: data.duration,
        call_timestamp: data.call_timestamp || new Date().toISOString(),
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (callError) {
      await logWebhook(supabase, org.id, request, body, 500, "Failed to create call", startTime);
      return NextResponse.json(
        { error: "Failed to create call" },
        { status: 500 }
      );
    }

    // Queue for processing if auto-analyze is enabled
    const settings = org.settings_json as { features?: { autoAnalyze?: boolean } } | null;
    if (settings?.features?.autoAnalyze !== false) {
      await supabase.from("processing_queue").insert({
        org_id: org.id,
        call_id: call.id,
        status: "queued",
        priority: 0,
      });
    }

    // Log successful webhook
    await logWebhook(supabase, org.id, request, body, 201, null, startTime, { call_id: call.id });

    return NextResponse.json(
      {
        success: true,
        call_id: call.id,
        caller_id: callerId,
        status: "pending",
        queued_for_analysis: settings?.features?.autoAnalyze !== false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    await logWebhook(supabase, org.id, request, body, 500, "Internal server error", startTime);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/webhook/[orgSlug] - Test endpoint
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const supabase = createAdminClient();

  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();

  if (error || !org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "active",
    organization: org.name,
    endpoint: `/api/webhook/${orgSlug}`,
    methods: ["POST"],
    authentication: ["Bearer token", "x-webhook-signature header"],
  });
}

// Helper to log webhook requests
async function logWebhook(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  request: Request,
  payload: unknown,
  statusCode: number,
  errorMessage: string | null,
  startTime: number,
  response?: Record<string, unknown>
) {
  try {
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Don't log sensitive headers
      if (!["authorization", "x-webhook-signature", "cookie"].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    await supabase.from("webhook_logs").insert({
      org_id: orgId,
      endpoint: `/api/webhook/${orgId}`,
      method: request.method,
      headers,
      payload: payload as Record<string, unknown>,
      status_code: statusCode,
      response: response || (errorMessage ? { error: errorMessage } : null),
      error_message: errorMessage,
      processing_time_ms: Date.now() - startTime,
      ip_address: request.headers.get("x-forwarded-for") || null,
    });
  } catch (error) {
    console.error("Failed to log webhook:", error);
  }
}

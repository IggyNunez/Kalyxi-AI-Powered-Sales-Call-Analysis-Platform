import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import type { PlanTier } from "@/types/analytics";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update organization plan (superadmin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const { data: profile } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "superadmin") {
      return NextResponse.json(
        { error: "Superadmin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { plan, customLimits } = body;

    if (!plan) {
      return NextResponse.json({ error: "Plan is required" }, { status: 400 });
    }

    const validPlans: PlanTier[] = ["free", "starter", "professional", "enterprise"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be one of: free, starter, professional, enterprise" },
        { status: 400 }
      );
    }

    // Get default plan limits
    const planLimits = customLimits || PLAN_LIMITS[plan as PlanTier];

    // Update organization plan
    const { data: organization, error } = await supabase
      .from("organizations")
      .update({
        plan,
        plan_limits: planLimits,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating organization plan:", error);
      return NextResponse.json(
        { error: "Failed to update plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      organization,
      message: `Plan updated to ${plan}`,
    });
  } catch (error) {
    console.error("Error in PUT /api/organizations/[id]/plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get organization plan details (superadmin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const { data: profile } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "superadmin") {
      return NextResponse.json(
        { error: "Superadmin access required" },
        { status: 403 }
      );
    }

    // Get organization plan details
    const { data: organization, error } = await supabase
      .from("organizations")
      .select(
        `
        id,
        name,
        plan,
        plan_limits,
        billing_email,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_status,
        trial_ends_at,
        current_period_start,
        current_period_end
      `
      )
      .eq("id", id)
      .single();

    if (error || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get current usage from org_usage table
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const { data: usage } = await supabase
      .from("org_usage")
      .select("*")
      .eq("org_id", id)
      .eq("period_start", periodStart)
      .single();

    // Get all available plans
    const { data: planDefinitions } = await supabase
      .from("plan_definitions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    return NextResponse.json({
      plan: {
        current: organization.plan,
        limits: organization.plan_limits,
        subscription: {
          status: organization.subscription_status,
          trialEndsAt: organization.trial_ends_at,
          periodStart: organization.current_period_start,
          periodEnd: organization.current_period_end,
        },
        billing: {
          email: organization.billing_email,
          stripeCustomerId: organization.stripe_customer_id,
          stripeSubscriptionId: organization.stripe_subscription_id,
        },
      },
      usage: usage || {
        calls_count: 0,
        sessions_count: 0,
        ai_analyses_count: 0,
        storage_bytes_used: 0,
      },
      availablePlans: planDefinitions || [],
    });
  } catch (error) {
    console.error("Error in GET /api/organizations/[id]/plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

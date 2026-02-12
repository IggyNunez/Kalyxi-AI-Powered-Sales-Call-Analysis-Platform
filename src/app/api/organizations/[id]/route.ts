import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single organization (superadmin only)
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

    // Get organization with stats
    const { data: organization, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get user count
    const { count: userCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("org_id", id)
      .eq("is_active", true);

    // Get session count
    const { count: sessionCount } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("org_id", id);

    // Get template count
    const { count: templateCount } = await supabase
      .from("templates")
      .select("*", { count: "exact", head: true })
      .eq("org_id", id);

    // Get call count
    const { count: callCount } = await supabase
      .from("calls")
      .select("*", { count: "exact", head: true })
      .eq("org_id", id);

    return NextResponse.json({
      organization: {
        ...organization,
        stats: {
          users: userCount || 0,
          sessions: sessionCount || 0,
          templates: templateCount || 0,
          calls: callCount || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error in GET /api/organizations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update an organization (superadmin only)
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
    const {
      name,
      slug,
      plan,
      plan_limits,
      billing_email,
      subscription_status,
      trial_ends_at,
    } = body;

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (slug !== undefined) {
      // Check if slug is unique
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .neq("id", id)
        .single();

      if (existingOrg) {
        return NextResponse.json(
          { error: "Organization with this slug already exists" },
          { status: 400 }
        );
      }
      updates.slug = slug;
    }
    if (plan !== undefined) updates.plan = plan;
    if (plan_limits !== undefined) updates.plan_limits = plan_limits;
    if (billing_email !== undefined) updates.billing_email = billing_email;
    if (subscription_status !== undefined)
      updates.subscription_status = subscription_status;
    if (trial_ends_at !== undefined) updates.trial_ends_at = trial_ends_at;

    // Update organization
    const { data: organization, error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating organization:", error);
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error in PUT /api/organizations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an organization (superadmin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check if organization has users
    const { count: userCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("org_id", id);

    if (userCount && userCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete organization with ${userCount} active users. Please remove all users first.`,
        },
        { status: 400 }
      );
    }

    // Delete organization
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting organization:", error);
      return NextResponse.json(
        { error: "Failed to delete organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/organizations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

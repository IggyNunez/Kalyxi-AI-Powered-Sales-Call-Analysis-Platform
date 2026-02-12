import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - List all organizations (superadmin only)
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "";

    // Build query
    let query = supabase.from("organizations").select(
      `
        id,
        name,
        slug,
        plan,
        plan_limits,
        billing_email,
        subscription_status,
        trial_ends_at,
        created_at,
        updated_at
      `,
      { count: "exact" }
    );

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    if (plan && plan !== "all") {
      query = query.eq("plan", plan);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: organizations, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching organizations:", error);
      return NextResponse.json(
        { error: "Failed to fetch organizations" },
        { status: 500 }
      );
    }

    // Get user counts for each organization
    const orgIds = organizations?.map((org) => org.id) || [];

    if (orgIds.length > 0) {
      const { data: userCounts } = await supabase
        .from("users")
        .select("org_id")
        .in("org_id", orgIds)
        .eq("is_active", true);

      // Count users per org
      const countMap: Record<string, number> = {};
      userCounts?.forEach((user) => {
        if (user.org_id) {
          countMap[user.org_id] = (countMap[user.org_id] || 0) + 1;
        }
      });

      // Add user counts to organizations
      organizations?.forEach((org) => {
        (org as unknown as { userCount: number }).userCount = countMap[org.id] || 0;
      });
    }

    return NextResponse.json({
      organizations,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new organization (superadmin only)
export async function POST(request: NextRequest) {
  try {
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
    const { name, slug, plan = "free", billing_email } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate slug if not provided
    const orgSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    // Check if slug is unique
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization with this slug already exists" },
        { status: 400 }
      );
    }

    // Create organization
    const { data: organization, error } = await supabase
      .from("organizations")
      .insert({
        name,
        slug: orgSlug,
        plan,
        billing_email,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating organization:", error);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters").optional(),
  inviteToken: z.string().optional(), // For joining existing org
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, organizationName, inviteToken } = registerSchema.parse(body);

    const supabase = createAdminClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    let orgId: string;

    // Handle invite token (joining existing org)
    if (inviteToken) {
      const { data: invitation, error: inviteError } = await supabase
        .from("invitations")
        .select("id, org_id, email, role, expires_at, accepted_at")
        .eq("token", inviteToken)
        .single();

      if (inviteError || !invitation) {
        return NextResponse.json(
          { error: "Invalid invitation token" },
          { status: 400 }
        );
      }

      if (invitation.accepted_at) {
        return NextResponse.json(
          { error: "Invitation has already been used" },
          { status: 400 }
        );
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "Invitation has expired" },
          { status: 400 }
        );
      }

      if (invitation.email !== email) {
        return NextResponse.json(
          { error: "Invitation is for a different email address" },
          { status: 400 }
        );
      }

      orgId = invitation.org_id;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (authError) {
        console.error("Auth user creation failed:", authError);
        return NextResponse.json(
          { error: "Failed to create account" },
          { status: 500 }
        );
      }

      // Create user profile with role from invitation
      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        org_id: orgId,
        email,
        name,
        role: invitation.role,
        is_active: true,
      });

      if (userError) {
        // Rollback auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        console.error("User profile creation failed:", userError);
        return NextResponse.json(
          { error: "Failed to create user profile" },
          { status: 500 }
        );
      }

      // Mark invitation as accepted
      await supabase
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return NextResponse.json({
        id: authData.user.id,
        name,
        email,
        message: "Account created successfully. You can now log in.",
      });
    }

    // Creating new organization
    if (!organizationName) {
      return NextResponse.json(
        { error: "Organization name is required for new accounts" },
        { status: 400 }
      );
    }

    // Generate slug from organization name
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug already exists
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .single();

    const finalSlug = existingOrg ? `${slug}-${Date.now()}` : slug;

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: organizationName,
        slug: finalSlug,
        plan: "free",
        settings_json: {
          branding: {
            primaryColor: "#8B5CF6",
            companyName: organizationName,
          },
          timezone: "UTC",
          notifications: {
            emailOnNewCall: true,
            emailOnLowScore: true,
            lowScoreThreshold: 60,
            dailyDigest: false,
          },
          ai: {
            model: "gpt-4o",
            temperature: 0.3,
          },
          features: {
            gatekeeperDetection: true,
            autoAnalyze: true,
            competitorTracking: true,
          },
        },
      })
      .select()
      .single();

    if (orgError || !org) {
      console.error("Organization creation failed:", orgError);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      );
    }

    orgId = org.id;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) {
      // Rollback organization
      await supabase.from("organizations").delete().eq("id", orgId);
      console.error("Auth user creation failed:", authError);
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    // Create user profile as admin of new org
    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      org_id: orgId,
      email,
      name,
      role: "admin", // First user of org is admin
      is_active: true,
    });

    if (userError) {
      // Rollback auth user and organization
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from("organizations").delete().eq("id", orgId);
      console.error("User profile creation failed:", userError);
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.from("audit_logs").insert({
      org_id: orgId,
      user_id: authData.user.id,
      action: "organization.created",
      entity_type: "organization",
      entity_id: orgId,
      new_values: { name: organizationName, slug: finalSlug },
    });

    return NextResponse.json({
      id: authData.user.id,
      name,
      email,
      organizationId: orgId,
      organizationSlug: finalSlug,
      message: "Account and organization created successfully. You can now log in.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      return NextResponse.json(
        { error: issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

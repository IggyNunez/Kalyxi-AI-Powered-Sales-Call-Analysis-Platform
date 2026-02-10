/**
 * Auto-Setup Route
 *
 * Automatically creates a user profile and organization for OAuth users
 * who signed in but don't have a profile in public.users yet.
 */

import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const autoSetupSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name } = autoSetupSchema.parse(body);

    const supabase = createAdminClient();

    // Check if user profile already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "User profile already exists" },
        { status: 400 }
      );
    }

    // Generate a unique org name and slug from email
    const emailPrefix = email.split("@")[0] || "user";
    const orgName = `${name}'s Workspace`;
    const baseSlug = emailPrefix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Check if slug exists
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();

    const finalSlug = existingOrg
      ? `${baseSlug}-${Date.now()}`
      : baseSlug;

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        slug: finalSlug,
        plan: "free",
        settings_json: {
          branding: {
            primaryColor: "#8B5CF6",
            companyName: orgName,
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
      console.error("Auto-setup: Organization creation failed:", orgError);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      );
    }

    // Create user profile
    const { error: userError } = await supabase.from("users").insert({
      id: userId,
      org_id: org.id,
      email,
      name,
      role: "admin", // User who creates org is admin
      is_active: true,
    });

    if (userError) {
      // Rollback organization
      await supabase.from("organizations").delete().eq("id", org.id);
      console.error("Auto-setup: User profile creation failed:", userError);
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.from("audit_logs").insert({
      org_id: org.id,
      user_id: userId,
      action: "organization.auto_created",
      entity_type: "organization",
      entity_id: org.id,
      new_values: { name: orgName, slug: finalSlug, source: "oauth_auto_setup" },
    });

    console.log(`Auto-setup: Created profile for user ${userId} with org ${org.id}`);

    return NextResponse.json({
      success: true,
      organizationId: org.id,
      organizationSlug: finalSlug,
      message: "Profile created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    console.error("Auto-setup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

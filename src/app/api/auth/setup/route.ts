import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const setupSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  companyName: z.string().min(2),
  companySlug: z.string().min(2).max(50),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, email, companyName, companySlug } = setupSchema.parse(body);

    const supabase = createAdminClient();

    // Check if user already has an organization
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "User already set up" },
        { status: 400 }
      );
    }

    // Check if slug is taken
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", companySlug)
      .maybeSingle();

    let finalSlug = companySlug;
    if (existingOrg) {
      // Add random suffix to make unique
      finalSlug = `${companySlug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: companyName,
        slug: finalSlug,
        settings_json: {
          branding: {
            primaryColor: "#4F46E5",
            companyName: companyName,
          },
          timezone: "America/New_York",
          notifications: {
            emailOnNewCall: true,
            emailOnLowScore: true,
            lowScoreThreshold: 50,
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
        plan: "free",
      })
      .select()
      .single();

    if (orgError) {
      console.error("Organization creation error:", orgError);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      );
    }

    // Create user record
    const { error: userError } = await supabase
      .from("users")
      .insert({
        id: userId,
        org_id: org.id,
        email: email,
        name: name,
        role: "admin", // First user is admin
        is_active: true,
      });

    if (userError) {
      console.error("User creation error:", userError);
      // Rollback organization
      await supabase.from("organizations").delete().eq("id", org.id);
      return NextResponse.json(
        { error: "Failed to create user record" },
        { status: 500 }
      );
    }

    // Create a caller record for the admin (they might also be a sales rep)
    await supabase
      .from("callers")
      .insert({
        org_id: org.id,
        user_id: userId,
        name: name,
        email: email,
        is_active: true,
      });

    // Log the audit
    await supabase.from("audit_logs").insert({
      org_id: org.id,
      user_id: userId,
      action: "organization.created",
      entity_type: "organization",
      entity_id: org.id,
      new_values: { name: companyName, slug: finalSlug },
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

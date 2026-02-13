import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole, errorResponse } from "@/lib/api-utils";
import crypto from "crypto";

// POST /api/team/quick-add - Create a team member without invitation
// Creates a Supabase auth user + users record. The person can be invited to log in later.
export async function POST(request: Request) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return errorResponse("Name and email are required", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return errorResponse("Invalid email format", 400);
    }

    const adminClient = createAdminClient();

    // Check if user already exists in this org
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("org_id", orgId!)
      .single();

    if (existingUser) {
      return errorResponse("A team member with this email already exists", 400);
    }

    // Generate a random password (the user won't know it — they'd use invite/reset flow later)
    const randomPassword = crypto.randomBytes(32).toString("base64url");

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: randomPassword,
      email_confirm: true,
    });

    if (authError) {
      // If auth user already exists (maybe from another org), try to find and use them
      if (authError.message?.includes("already been registered")) {
        // Look up the existing auth user
        const { data: { users: existingAuthUsers } } = await adminClient.auth.admin.listUsers();
        const existingAuth = existingAuthUsers?.find(u => u.email === normalizedEmail);

        if (existingAuth) {
          // Create the users record linking to the existing auth user
          const { data: newUser, error: userError } = await adminClient
            .from("users")
            .insert({
              id: existingAuth.id,
              org_id: orgId!,
              email: normalizedEmail,
              name: name.trim(),
              role: "caller",
              is_active: true,
            })
            .select("id, name, email, role, avatar_url, is_active, created_at")
            .single();

          if (userError) {
            console.error("[QuickAdd] Failed to create user record:", userError);
            return errorResponse("Failed to create team member", 500);
          }

          return NextResponse.json({ data: newUser }, { status: 201 });
        }
      }

      console.error("[QuickAdd] Auth error:", authError);
      return errorResponse("Failed to create user account", 500);
    }

    // Create users record
    const { data: newUser, error: userError } = await adminClient
      .from("users")
      .insert({
        id: authData.user.id,
        org_id: orgId!,
        email: normalizedEmail,
        name: name.trim(),
        role: "caller",
        is_active: true,
      })
      .select("id, name, email, role, avatar_url, is_active, created_at")
      .single();

    if (userError) {
      // Clean up auth user if users insert fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      console.error("[QuickAdd] Failed to create user record:", userError);
      return errorResponse("Failed to create team member", 500);
    }

    return NextResponse.json({ data: newUser }, { status: 201 });
  } catch (error) {
    console.error("[QuickAdd] Error:", error);
    return errorResponse("Failed to create team member", 500);
  }
}

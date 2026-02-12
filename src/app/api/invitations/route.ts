import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAddUser } from "@/lib/plan-limits";
import crypto from "crypto";

// GET - List invitations for the organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with role and org
    const { data: profile } = await supabase
      .from("users")
      .select("id, org_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.org_id) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 403 }
      );
    }

    // Only admins can view invitations
    if (!["admin", "superadmin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only admins can view invitations" },
        { status: 403 }
      );
    }

    // Get invitations for the organization
    const { data: invitations, error } = await supabase
      .from("invitations")
      .select(
        `
        id,
        email,
        role,
        token,
        expires_at,
        accepted_at,
        created_at,
        invited_by,
        inviter:users!invitations_invited_by_fkey(id, name, email)
      `
      )
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitations:", error);
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Error in GET /api/invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with role and org
    const { data: profile } = await supabase
      .from("users")
      .select("id, org_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.org_id) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 403 }
      );
    }

    // Only admins can create invitations
    if (!["admin", "superadmin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only admins can invite users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = "user" } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate role
    if (!["admin", "user"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'user'" },
        { status: 400 }
      );
    }

    // Check plan limits
    const limitCheck = await canAddUser(profile.org_id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.error || "User limit reached for your plan",
          limit: limitCheck.limit,
          current: limitCheck.current,
        },
        { status: 403 }
      );
    }

    // Check if user already exists in the org
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("org_id", profile.org_id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists in your organization" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabase
      .from("invitations")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("org_id", profile.org_id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: "An active invitation already exists for this email" },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Create invitation
    const { data: invitation, error } = await supabase
      .from("invitations")
      .insert({
        org_id: profile.org_id,
        email: email.toLowerCase(),
        role,
        invited_by: profile.id,
        token,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(), // 7 days
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating invitation:", error);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    // TODO: Send invitation email
    // For now, return the invitation link
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
      inviteUrl,
    });
  } catch (error) {
    console.error("Error in POST /api/invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke an invitation
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with role and org
    const { data: profile } = await supabase
      .from("users")
      .select("id, org_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.org_id) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 403 }
      );
    }

    // Only admins can revoke invitations
    if (!["admin", "superadmin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only admins can revoke invitations" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Delete the invitation
    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", invitationId)
      .eq("org_id", profile.org_id);

    if (error) {
      console.error("Error deleting invitation:", error);
      return NextResponse.json(
        { error: "Failed to revoke invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

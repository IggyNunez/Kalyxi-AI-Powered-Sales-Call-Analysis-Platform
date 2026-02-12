import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET - Validate invitation token (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Find the invitation
    const { data: invitation, error } = await supabase
      .from("invitations")
      .select(
        `
        id,
        email,
        role,
        expires_at,
        accepted_at,
        org_id,
        organization:organizations!invitations_org_id_fkey(id, name)
      `
      )
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token", valid: false },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: "Invitation has already been accepted", valid: false },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired", valid: false },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error", valid: false },
      { status: 500 }
    );
  }
}

// POST - Accept invitation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const { name, password } = body;

    if (!name || !password) {
      return NextResponse.json(
        { error: "Name and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: "Invitation has already been accepted" },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", invitation.email)
      .single();

    if (existingUser) {
      // User exists - update their org_id and role
      const { error: updateError } = await supabase
        .from("users")
        .update({
          org_id: invitation.org_id,
          role: invitation.role,
        })
        .eq("id", existingUser.id);

      if (updateError) {
        console.error("Error updating existing user:", updateError);
        return NextResponse.json(
          { error: "Failed to update user" },
          { status: 500 }
        );
      }

      // Mark invitation as accepted
      await supabase
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return NextResponse.json({
        success: true,
        message: "Your account has been linked to the organization. Please log in.",
        existingUser: true,
      });
    }

    // Create new auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: {
        data: {
          name,
          org_id: invitation.org_id,
          role: invitation.role,
        },
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json(
        { error: authError.message || "Failed to create account" },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      email: invitation.email,
      name,
      org_id: invitation.org_id,
      role: invitation.role,
      is_active: true,
    });

    if (profileError) {
      console.error("Error creating user profile:", profileError);
      // Try to delete the auth user if profile creation fails
      // Note: This may not work depending on RLS policies
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
      success: true,
      message: "Account created successfully. Please check your email to verify your account.",
      existingUser: false,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

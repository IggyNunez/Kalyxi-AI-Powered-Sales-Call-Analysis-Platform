import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";

// POST /api/users/[id]/suspend - Suspend a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, role, response } = await requireAuth();

  if (response) return response;
  if (!user || !orgId || !role) {
    return errorResponse("Unauthorized", 401);
  }

  // Only admins and superadmins can suspend users
  if (!["admin", "superadmin"].includes(role)) {
    return errorResponse("Forbidden: Admin access required", 403);
  }

  const { id: targetUserId } = await params;

  if (!isValidUUID(targetUserId)) {
    return errorResponse("Invalid user ID", 400);
  }

  // Cannot suspend yourself
  if (targetUserId === user.id) {
    return errorResponse("Cannot suspend yourself", 400);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Suspended by admin";

    const supabase = await createClient();

    // Get target user
    const { data: targetUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (fetchError || !targetUser) {
      return errorResponse("User not found", 404);
    }

    // Regular admins can only manage users in their own org
    if (role !== "superadmin" && targetUser.org_id !== orgId) {
      return errorResponse("Cannot manage users in other organizations", 403);
    }

    // Cannot suspend a superadmin unless you're a superadmin
    if (targetUser.role === "superadmin" && role !== "superadmin") {
      return errorResponse("Cannot suspend superadmins", 403);
    }

    // Check if already suspended
    if (!targetUser.is_active) {
      return errorResponse("User is already suspended", 400);
    }

    // Suspend the user by setting is_active to false
    const { error: updateError } = await supabase
      .from("users")
      .update({ is_active: false })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("Suspend error:", updateError);
      return errorResponse("Failed to suspend user", 500);
    }

    // Create audit log
    await createAuditLog(
      targetUser.org_id,
      user.id,
      "user_suspended",
      "user",
      targetUserId,
      { is_active: true },
      { is_active: false, suspension_reason: reason },
      request
    );

    return NextResponse.json({
      message: "User suspended successfully",
    });
  } catch (error) {
    console.error("Suspend error:", error);
    return errorResponse("An error occurred", 500);
  }
}

// DELETE /api/users/[id]/suspend - Unsuspend a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, role, response } = await requireAuth();

  if (response) return response;
  if (!user || !orgId || !role) {
    return errorResponse("Unauthorized", 401);
  }

  // Only admins and superadmins can unsuspend users
  if (!["admin", "superadmin"].includes(role)) {
    return errorResponse("Forbidden: Admin access required", 403);
  }

  const { id: targetUserId } = await params;

  if (!isValidUUID(targetUserId)) {
    return errorResponse("Invalid user ID", 400);
  }

  try {
    const supabase = await createClient();

    // Get target user
    const { data: targetUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (fetchError || !targetUser) {
      return errorResponse("User not found", 404);
    }

    // Regular admins can only manage users in their own org
    if (role !== "superadmin" && targetUser.org_id !== orgId) {
      return errorResponse("Cannot manage users in other organizations", 403);
    }

    // Check if not suspended
    if (targetUser.is_active) {
      return errorResponse("User is not suspended", 400);
    }

    // Unsuspend the user
    const { error: updateError } = await supabase
      .from("users")
      .update({ is_active: true })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("Unsuspend error:", updateError);
      return errorResponse("Failed to unsuspend user", 500);
    }

    // Create audit log
    await createAuditLog(
      targetUser.org_id,
      user.id,
      "user_unsuspended",
      "user",
      targetUserId,
      { is_active: false },
      { is_active: true },
      request
    );

    return NextResponse.json({
      message: "User unsuspended successfully",
    });
  } catch (error) {
    console.error("Unsuspend error:", error);
    return errorResponse("An error occurred", 500);
  }
}

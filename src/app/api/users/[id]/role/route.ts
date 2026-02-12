import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuth,
  errorResponse,
  isValidUUID,
  createAuditLog,
} from "@/lib/api-utils";

// PUT /api/users/[id]/role - Change user role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, orgId, role, response } = await requireAuth();

  if (response) return response;
  if (!user || !orgId || !role) {
    return errorResponse("Unauthorized", 401);
  }

  // Only admins and superadmins can change roles
  if (!["admin", "superadmin"].includes(role)) {
    return errorResponse("Forbidden: Admin access required", 403);
  }

  const { id: targetUserId } = await params;

  if (!isValidUUID(targetUserId)) {
    return errorResponse("Invalid user ID", 400);
  }

  // Cannot change your own role
  if (targetUserId === user.id) {
    return errorResponse("Cannot change your own role", 400);
  }

  try {
    const body = await request.json();
    const { role: newRole } = body;

    // Validate new role
    const validRoles = ["user", "admin"];
    if (!newRole || !validRoles.includes(newRole)) {
      return errorResponse("Invalid role. Must be 'user' or 'admin'", 400);
    }

    // Regular admins cannot create superadmins
    if (newRole === "superadmin" && role !== "superadmin") {
      return errorResponse("Only superadmins can create superadmins", 403);
    }

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

    // Cannot demote a superadmin unless you're a superadmin
    if (targetUser.role === "superadmin" && role !== "superadmin") {
      return errorResponse("Cannot change superadmin role", 403);
    }

    // Check if this is the last admin in the org
    if (targetUser.role === "admin" && newRole === "user") {
      const { count: adminCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("org_id", targetUser.org_id)
        .in("role", ["admin", "superadmin"]);

      if (adminCount && adminCount <= 1) {
        return errorResponse(
          "Cannot demote the last admin in the organization",
          400
        );
      }
    }

    // Update the role
    const { error: updateError } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("Role update error:", updateError);
      return errorResponse("Failed to update role", 500);
    }

    // Create audit log
    await createAuditLog(
      targetUser.org_id,
      user.id,
      "role_changed",
      "user",
      targetUserId,
      { role: targetUser.role },
      { role: newRole },
      request
    );

    return NextResponse.json({
      message: "Role updated successfully",
      role: newRole,
    });
  } catch (error) {
    console.error("Role change error:", error);
    return errorResponse("An error occurred", 500);
  }
}

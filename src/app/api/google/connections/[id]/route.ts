import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole, errorResponse, isValidUUID } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/google/connections/[id] - Update connection attribution
export async function PATCH(request: Request, { params }: RouteParams) {
  const { user, orgId, response } = await requireRole(["admin", "superadmin", "manager"]);
  if (response) return response;

  try {
    const { id: connectionId } = await params;

    if (!isValidUUID(connectionId)) {
      return errorResponse("Invalid connection ID", 400);
    }

    const body = await request.json();
    const { maps_to_user_id } = body;

    // Validate maps_to_user_id if provided (can be null to unset)
    if (maps_to_user_id !== null && maps_to_user_id !== undefined) {
      if (!isValidUUID(maps_to_user_id)) {
        return errorResponse("Invalid user ID", 400);
      }
    }

    const adminClient = createAdminClient();

    // Verify the connection belongs to someone in this org
    const { data: connection, error: connError } = await adminClient
      .from("google_connections")
      .select("id, user_id")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      return errorResponse("Connection not found", 404);
    }

    // Verify the connection's user belongs to this org
    const { data: connUser } = await adminClient
      .from("users")
      .select("org_id")
      .eq("id", connection.user_id)
      .single();

    if (!connUser || connUser.org_id !== orgId) {
      return errorResponse("Connection not found", 404);
    }

    // If setting maps_to_user_id, verify the target user belongs to this org
    if (maps_to_user_id) {
      const { data: targetUser } = await adminClient
        .from("users")
        .select("id, org_id")
        .eq("id", maps_to_user_id)
        .single();

      if (!targetUser || targetUser.org_id !== orgId) {
        return errorResponse("Target user not found in your organization", 400);
      }
    }

    // Update the connection
    const { data: updated, error: updateError } = await adminClient
      .from("google_connections")
      .update({ maps_to_user_id: maps_to_user_id || null })
      .eq("id", connectionId)
      .select("id, google_email, maps_to_user_id")
      .single();

    if (updateError) {
      console.error("[Connections] Update error:", updateError);
      return errorResponse("Failed to update connection", 500);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[Connections] PATCH error:", error);
    return errorResponse("Failed to update connection", 500);
  }
}

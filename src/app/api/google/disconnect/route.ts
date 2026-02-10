/**
 * Google OAuth Disconnect Route
 *
 * Disconnects a Google account by deleting the connection.
 * Optionally revokes the OAuth token with Google.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteGoogleConnection,
  getGoogleConnection,
  getDecryptedRefreshToken,
} from "@/lib/google/storage";

/**
 * Attempt to revoke the token with Google.
 * This is best-effort - we proceed with deletion even if revocation fails.
 */
async function revokeGoogleToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    return response.ok;
  } catch (error) {
    console.warn("[Google Disconnect] Token revocation failed:", error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { connectionId, revokeToken = true } = body as {
      connectionId?: string;
      revokeToken?: boolean;
    };

    if (!connectionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "connectionId is required" },
        { status: 400 }
      );
    }

    // Get the connection to verify ownership and get the token
    const connection = await getGoogleConnection(connectionId);

    if (!connection) {
      return NextResponse.json(
        { error: "Not Found", message: "Connection not found" },
        { status: 404 }
      );
    }

    if (connection.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not own this connection" },
        { status: 403 }
      );
    }

    // Optionally revoke the token with Google
    let revoked = false;
    if (revokeToken) {
      try {
        const refreshToken = getDecryptedRefreshToken(connection);
        revoked = await revokeGoogleToken(refreshToken);
      } catch (error) {
        console.warn("[Google Disconnect] Failed to decrypt/revoke token:", error);
      }
    }

    // Delete the connection from our database
    const deleted = await deleteGoogleConnection(user.id, connectionId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Delete Failed", message: "Failed to delete connection" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Google account disconnected successfully",
      tokenRevoked: revoked,
    });
  } catch (error) {
    console.error("[Google Disconnect] Error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: error instanceof Error ? error.message : "Failed to disconnect Google account",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  // Support DELETE method as well
  return POST(request);
}

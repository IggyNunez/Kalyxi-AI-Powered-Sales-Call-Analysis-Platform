/**
 * Extension Token Management Routes
 *
 * Create, list, and revoke extension API tokens.
 * These tokens are used by the Chrome extension for push sync.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createExtensionToken,
  listExtensionTokens,
  revokeExtensionToken,
} from "@/lib/google/storage";

/**
 * GET: List all extension tokens for the authenticated user.
 */
export async function GET() {
  try {
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

    const tokens = await listExtensionTokens(user.id);

    return NextResponse.json({
      success: true,
      tokens,
    });
  } catch (error) {
    console.error("[Extension Token] List error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: error instanceof Error ? error.message : "Failed to list tokens",
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new extension token.
 *
 * Body:
 * - name: string (optional, defaults to "Chrome Extension")
 * - expiresInDays: number (optional, null = no expiry)
 *
 * Returns the raw token (only shown once!) and token info.
 */
export async function POST(request: Request) {
  try {
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
    const body = await request.json().catch(() => ({}));
    const { name = "Chrome Extension", expiresInDays } = body as {
      name?: string;
      expiresInDays?: number;
    };

    // Validate expiry
    if (expiresInDays !== undefined && (expiresInDays < 1 || expiresInDays > 365)) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "expiresInDays must be between 1 and 365",
        },
        { status: 400 }
      );
    }

    // Create the token
    const { token, tokenInfo } = await createExtensionToken(user.id, name, expiresInDays);

    return NextResponse.json({
      success: true,
      message: "Token created successfully. Save this token - it won't be shown again!",
      token, // Only shown once!
      tokenInfo,
    });
  } catch (error) {
    console.error("[Extension Token] Create error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: error instanceof Error ? error.message : "Failed to create token",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Revoke an extension token.
 *
 * Body:
 * - tokenId: string (required)
 */
export async function DELETE(request: Request) {
  try {
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
    const body = await request.json().catch(() => ({}));
    const { tokenId } = body as { tokenId?: string };

    if (!tokenId) {
      return NextResponse.json(
        { error: "Bad Request", message: "tokenId is required" },
        { status: 400 }
      );
    }

    // Revoke the token
    const revoked = await revokeExtensionToken(user.id, tokenId);

    if (!revoked) {
      return NextResponse.json(
        { error: "Not Found", message: "Token not found or already revoked" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token revoked successfully",
    });
  } catch (error) {
    console.error("[Extension Token] Revoke error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: error instanceof Error ? error.message : "Failed to revoke token",
      },
      { status: 500 }
    );
  }
}

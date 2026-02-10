/**
 * Extension Token Validation Route
 *
 * Validates an extension API token without performing any sync.
 * Used by the Chrome extension to test configuration.
 */

import { NextResponse } from "next/server";
import { validateExtensionToken } from "@/lib/google/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { valid: false, error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const userId = await validateExtensionToken(token);

    if (!userId) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: "Token is valid",
    });
  } catch (error) {
    console.error("[Extension Validate] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Validation failed" },
      { status: 500 }
    );
  }
}

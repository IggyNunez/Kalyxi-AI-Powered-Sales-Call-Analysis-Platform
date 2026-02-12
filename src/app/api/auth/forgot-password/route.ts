import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api-utils";

// POST /api/auth/forgot-password - Send password reset email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return errorResponse("Email is required", 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse("Invalid email format", 400);
    }

    const supabase = await createClient();

    // Get the redirect URL for password reset
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
    const redirectTo = `${origin}/reset-password`;

    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("Password reset error:", error);
      // Don't reveal if email exists or not for security
      // Always return success message
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return errorResponse("An error occurred. Please try again.", 500);
  }
}

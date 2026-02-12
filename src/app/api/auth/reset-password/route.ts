import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api-utils";

// POST /api/auth/reset-password - Update password with reset token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return errorResponse("Password is required", 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return errorResponse("Password must be at least 8 characters", 400);
    }

    const supabase = await createClient();

    // Update the user's password
    // The user must have clicked the magic link from their email
    // which sets up the session before this API is called
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("Password update error:", error);

      if (error.message.includes("session")) {
        return errorResponse(
          "Your password reset link has expired. Please request a new one.",
          400
        );
      }

      return errorResponse(error.message || "Failed to update password", 400);
    }

    return NextResponse.json({
      message: "Password updated successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse("An error occurred. Please try again.", 500);
  }
}

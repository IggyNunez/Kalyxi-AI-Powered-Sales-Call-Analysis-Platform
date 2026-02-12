import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// TOTP verification using HMAC-SHA1
function generateTOTP(secret: string, counter: number): string {
  // Convert base32 secret to buffer
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.toUpperCase()) {
    const val = base32Chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const secretBuffer = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < secretBuffer.length; i++) {
    secretBuffer[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }

  // Create counter buffer (8 bytes, big-endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  // Generate HMAC-SHA1
  const hmac = crypto.createHmac("sha1", secretBuffer);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Get 6 digits
  const otp = (code % 1000000).toString().padStart(6, "0");
  return otp;
}

function verifyTOTP(
  token: string,
  secret: string,
  window: number = 1
): boolean {
  // Get current time step (30 seconds)
  const timeStep = Math.floor(Date.now() / 1000 / 30);

  // Check current and adjacent time steps
  for (let i = -window; i <= window; i++) {
    const expectedToken = generateTOTP(secret, timeStep + i);
    if (token === expectedToken) {
      return true;
    }
  }

  return false;
}

// POST - Verify TOTP code and enable 2FA
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Verification code required" },
        { status: 400 }
      );
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid code format. Must be 6 digits." },
        { status: 400 }
      );
    }

    // Get user profile with TOTP secret
    const { data: profile } = await supabase
      .from("users")
      .select("id, totp_secret, totp_enabled")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (profile.totp_enabled) {
      return NextResponse.json(
        { error: "2FA is already enabled" },
        { status: 400 }
      );
    }

    if (!profile.totp_secret) {
      return NextResponse.json(
        { error: "Please generate a 2FA secret first" },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTOTP(code, profile.totp_secret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    // Enable 2FA
    const { error: updateError } = await supabase
      .from("users")
      .update({
        totp_enabled: true,
        totp_verified_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error enabling 2FA:", updateError);
      return NextResponse.json(
        { error: "Failed to enable 2FA" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "2FA has been enabled successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/auth/2fa/verify:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

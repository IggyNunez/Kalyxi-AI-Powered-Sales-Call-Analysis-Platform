/**
 * Google OAuth Utilities
 *
 * Handles OAuth URL generation, state signing/verification, and token exchange.
 * Uses HMAC-SHA256 for CSRF protection on OAuth state.
 *
 * Environment Variables Required:
 * - GOOGLE_OAUTH_CLIENT_ID
 * - GOOGLE_OAUTH_CLIENT_SECRET
 * - GOOGLE_OAUTH_REDIRECT_URL
 * - OAUTH_STATE_HMAC_SECRET (for signing state)
 */

import "server-only";
import { createHmac, randomBytes } from "crypto";
import type { GoogleTokenResponse, GoogleUserInfo, OAuthStatePayload } from "./types";

// Google OAuth endpoints
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

// Required scopes for Meet transcript access
// Using drive.readonly for broader compatibility (includes drive.meet.readonly)
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

/**
 * Get OAuth configuration from environment variables.
 * @throws Error if any required variable is missing
 */
export function getOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUrl = process.env.GOOGLE_OAUTH_REDIRECT_URL;
  const hmacSecret = process.env.OAUTH_STATE_HMAC_SECRET;

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!redirectUrl) missing.push("GOOGLE_OAUTH_REDIRECT_URL");
  if (!hmacSecret) missing.push("OAUTH_STATE_HMAC_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Set these in your Vercel dashboard or .env.local file."
    );
  }

  // After validation, we know these are all defined
  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUrl: redirectUrl!,
    hmacSecret: hmacSecret!,
  };
}

/**
 * Sign an OAuth state payload with HMAC-SHA256.
 *
 * @param payload - State data to sign
 * @returns Signed state string (base64 JSON + signature)
 */
export function signState(payload: OAuthStatePayload): string {
  const { hmacSecret } = getOAuthConfig();

  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson).toString("base64url");

  const hmac = createHmac("sha256", hmacSecret);
  hmac.update(payloadBase64);
  const signature = hmac.digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a signed OAuth state.
 *
 * @param state - The signed state string from OAuth callback
 * @returns Decoded payload if valid
 * @throws Error if signature is invalid or state is malformed
 */
export function verifySignedState(state: string): OAuthStatePayload {
  const { hmacSecret } = getOAuthConfig();

  const parts = state.split(".");
  if (parts.length !== 2) {
    throw new Error("Invalid state format: expected 2 parts separated by dot");
  }

  const [payloadBase64, providedSignature] = parts;

  // Verify signature
  const hmac = createHmac("sha256", hmacSecret);
  hmac.update(payloadBase64);
  const expectedSignature = hmac.digest("base64url");

  if (providedSignature !== expectedSignature) {
    throw new Error("Invalid state signature: CSRF protection failed");
  }

  // Decode payload
  try {
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as OAuthStatePayload;

    // Validate required fields
    if (!payload.userId || !payload.nonce || !payload.timestamp) {
      throw new Error("Invalid state payload: missing required fields");
    }

    // Check timestamp (reject if older than 10 minutes)
    const ageMs = Date.now() - payload.timestamp;
    const maxAgeMs = 10 * 60 * 1000; // 10 minutes
    if (ageMs > maxAgeMs) {
      throw new Error("State expired: OAuth flow took too long");
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.message.includes("State")) {
      throw error;
    }
    throw new Error("Invalid state payload: failed to parse JSON");
  }
}

/**
 * Build the Google OAuth authorization URL.
 *
 * @param userId - The authenticated user's ID (for state)
 * @param redirectUrl - Optional override for redirect URL
 * @returns Full authorization URL to redirect user to
 */
export function buildGoogleAuthUrl(
  userId: string,
  redirectUrl?: string
): string {
  const config = getOAuthConfig();

  // Create signed state for CSRF protection
  const statePayload: OAuthStatePayload = {
    userId,
    nonce: randomBytes(16).toString("hex"),
    timestamp: Date.now(),
    redirectUrl,
  };
  const state = signState(statePayload);

  // Build URL with query params
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUrl,
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    access_type: "offline", // Request refresh token
    prompt: "consent", // Force consent to ensure refresh token
    state,
    include_granted_scopes: "true",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and refresh tokens.
 *
 * @param code - Authorization code from OAuth callback
 * @returns Token response with access_token, refresh_token, etc.
 * @throws Error if exchange fails
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<GoogleTokenResponse> {
  const config = getOAuthConfig();

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUrl,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Token exchange failed: ${response.status}`;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = `Token exchange failed: ${errorJson.error} - ${errorJson.error_description || ""}`;
    } catch {
      errorMessage += ` - ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  const tokens = (await response.json()) as GoogleTokenResponse;

  if (!tokens.access_token) {
    throw new Error("Token exchange failed: no access_token in response");
  }

  return tokens;
}

/**
 * Refresh an access token using a refresh token.
 *
 * @param refreshToken - The refresh token
 * @returns New token response (without refresh_token)
 * @throws Error if refresh fails
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const config = getOAuthConfig();

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Token refresh failed: ${response.status}`;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = `Token refresh failed: ${errorJson.error} - ${errorJson.error_description || ""}`;

      // Check for specific errors that indicate revoked access
      if (errorJson.error === "invalid_grant") {
        throw new Error(
          "Refresh token is invalid or expired. User needs to reconnect their Google account."
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("invalid or expired")) {
        throw e;
      }
      errorMessage += ` - ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as GoogleTokenResponse;
}

/**
 * Fetch the user's Google account info using an access token.
 *
 * @param accessToken - Valid Google access token
 * @returns User info including email and ID
 * @throws Error if fetch fails
 */
export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch user info: ${response.status} - ${errorText}`);
  }

  const userInfo = (await response.json()) as GoogleUserInfo;

  if (!userInfo.email) {
    throw new Error("Failed to fetch user info: no email in response");
  }

  return userInfo;
}

/**
 * Revoke a Google OAuth token.
 *
 * @param token - Access token or refresh token to revoke
 * @returns True if revocation succeeded
 */
export async function revokeGoogleToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      { method: "POST" }
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Validate OAuth configuration without making API calls.
 */
export function validateOAuthConfig(): {
  valid: boolean;
  errors: string[];
  redirectUrl?: string;
} {
  const errors: string[] = [];
  let redirectUrl: string | undefined;

  try {
    const config = getOAuthConfig();
    redirectUrl = config.redirectUrl;

    // Validate redirect URL format
    try {
      new URL(config.redirectUrl);
    } catch {
      errors.push(`Invalid GOOGLE_OAUTH_REDIRECT_URL: not a valid URL`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Invalid OAuth config");
  }

  return {
    valid: errors.length === 0,
    errors,
    redirectUrl,
  };
}

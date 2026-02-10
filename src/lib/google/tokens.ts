/**
 * Token Management
 *
 * Server-only utilities for managing Google OAuth tokens.
 * Handles token refresh, validation, and database updates.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptToken, encryptToken } from "./crypto";
import { refreshAccessToken } from "./oauth";
import type { GoogleConnection, EncryptedToken } from "./types";

// Buffer time before token expiry to trigger refresh (5 minutes)
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Sanitize and validate a connectionId, removing any trailing suffix
 */
function validateConnectionId(connectionId: string): string {
  if (!connectionId || typeof connectionId !== "string") {
    throw new Error("connectionId is required");
  }
  // Remove any trailing :N suffix (handles Supabase deduplication issue)
  const sanitized = connectionId.replace(/:\d+$/, "");
  if (!UUID_REGEX.test(sanitized)) {
    throw new Error(`Invalid connectionId: "${connectionId}" is not a valid UUID`);
  }
  return sanitized;
}

/**
 * Check if a token is expired or about to expire.
 *
 * @param expiryTime - ISO timestamp of token expiry
 * @param bufferMs - Buffer time in milliseconds (default: 5 min)
 * @returns True if token is expired or will expire within buffer
 */
export function isTokenExpired(
  expiryTime: string,
  bufferMs: number = TOKEN_REFRESH_BUFFER_MS
): boolean {
  const expiryDate = new Date(expiryTime);
  const bufferDate = new Date(Date.now() + bufferMs);
  return expiryDate <= bufferDate;
}

/**
 * Get a valid access token for a Google connection.
 *
 * If the current token is expired or about to expire, this will
 * automatically refresh it and update the database.
 *
 * @param connectionId - The Google connection ID
 * @returns Valid access token
 * @throws Error if connection not found or refresh fails
 */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const supabase = createAdminClient();

  // Validate and sanitize connectionId
  const validConnectionId = validateConnectionId(connectionId);

  // Fetch the connection
  const { data: connection, error } = await supabase
    .from("google_connections")
    .select("*")
    .eq("id", validConnectionId)
    .single();

  if (error || !connection) {
    throw new Error(`Google connection not found: ${connectionId}`);
  }

  const conn = connection as GoogleConnection;

  // Check if token needs refresh
  if (!isTokenExpired(conn.token_expiry)) {
    return conn.access_token;
  }

  // Decrypt the refresh token
  const encryptedToken: EncryptedToken = {
    ciphertext: conn.refresh_token_encrypted,
    iv: conn.refresh_token_iv,
    tag: conn.refresh_token_tag,
  };

  let refreshToken: string;
  try {
    refreshToken = decryptToken(encryptedToken);
  } catch (error) {
    throw new Error(
      `Failed to decrypt refresh token for connection ${connectionId}: ` +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }

  // Refresh the token
  let newTokens;
  try {
    newTokens = await refreshAccessToken(refreshToken);
  } catch (error) {
    // Update connection with error status
    await supabase
      .from("google_connections")
      .update({
        last_sync_error:
          error instanceof Error ? error.message : "Token refresh failed",
      })
      .eq("id", validConnectionId);

    throw error;
  }

  // Calculate new expiry time
  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);

  // Prepare update data
  const updateData: Record<string, string | null> = {
    access_token: newTokens.access_token,
    token_expiry: newExpiry.toISOString(),
    last_sync_error: null, // Clear any previous error
  };

  // If a new refresh token was provided, encrypt and store it
  if (newTokens.refresh_token) {
    const newEncrypted = encryptToken(newTokens.refresh_token);
    updateData.refresh_token_encrypted = newEncrypted.ciphertext;
    updateData.refresh_token_iv = newEncrypted.iv;
    updateData.refresh_token_tag = newEncrypted.tag;
  }

  // Update the database
  const { error: updateError } = await supabase
    .from("google_connections")
    .update(updateData)
    .eq("id", validConnectionId);

  if (updateError) {
    console.error("Failed to update token in database:", updateError);
    // Still return the new token even if DB update failed
  }

  return newTokens.access_token;
}

/**
 * Get valid access tokens for multiple connections.
 *
 * @param connectionIds - Array of connection IDs
 * @returns Map of connectionId -> accessToken
 */
export async function getValidAccessTokens(
  connectionIds: string[]
): Promise<Map<string, string>> {
  const tokens = new Map<string, string>();

  // Process in parallel with error handling
  await Promise.all(
    connectionIds.map(async (connectionId) => {
      try {
        const token = await getValidAccessToken(connectionId);
        tokens.set(connectionId, token);
      } catch (error) {
        console.error(
          `Failed to get token for connection ${connectionId}:`,
          error instanceof Error ? error.message : error
        );
      }
    })
  );

  return tokens;
}

/**
 * Validate that a connection's tokens are still valid.
 *
 * @param connectionId - The Google connection ID
 * @returns Object with validation status
 */
export async function validateConnection(connectionId: string): Promise<{
  valid: boolean;
  error?: string;
  expiresAt?: string;
  needsRefresh?: boolean;
}> {
  const supabase = createAdminClient();

  // Validate and sanitize connectionId
  let validConnectionId: string;
  try {
    validConnectionId = validateConnectionId(connectionId);
  } catch {
    return { valid: false, error: "Invalid connection ID" };
  }

  // Fetch the connection
  const { data: connection, error } = await supabase
    .from("google_connections")
    .select("token_expiry, refresh_token_encrypted")
    .eq("id", validConnectionId)
    .single();

  if (error || !connection) {
    return { valid: false, error: "Connection not found" };
  }

  const needsRefresh = isTokenExpired(connection.token_expiry);

  // Try to get a valid token to confirm the connection works
  try {
    await getValidAccessToken(connectionId);
    return {
      valid: true,
      expiresAt: connection.token_expiry,
      needsRefresh,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Token validation failed",
      expiresAt: connection.token_expiry,
      needsRefresh,
    };
  }
}

/**
 * Get all connections that need token refresh.
 *
 * @returns Array of connection IDs needing refresh
 */
export async function getConnectionsNeedingRefresh(): Promise<string[]> {
  const supabase = createAdminClient();
  const bufferDate = new Date(Date.now() + TOKEN_REFRESH_BUFFER_MS);

  const { data, error } = await supabase
    .from("google_connections")
    .select("id")
    .lt("token_expiry", bufferDate.toISOString());

  if (error) {
    console.error("Failed to get connections needing refresh:", error);
    return [];
  }

  return data?.map((c) => c.id) || [];
}

/**
 * Proactively refresh tokens that are about to expire.
 * Call this from a cron job to prevent token expiry issues.
 *
 * @returns Results of refresh attempts
 */
export async function refreshExpiringTokens(): Promise<{
  refreshed: number;
  failed: number;
  errors: string[];
}> {
  const connectionIds = await getConnectionsNeedingRefresh();
  const results = { refreshed: 0, failed: 0, errors: [] as string[] };

  for (const connectionId of connectionIds) {
    try {
      await getValidAccessToken(connectionId);
      results.refreshed++;
    } catch (error) {
      results.failed++;
      results.errors.push(
        `${connectionId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return results;
}

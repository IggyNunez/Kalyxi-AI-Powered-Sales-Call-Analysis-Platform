/**
 * Supabase Storage Helpers
 *
 * Server-only database operations for Google connections and Meet transcripts.
 * Uses encrypted refresh tokens and enforces proper access control.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { encryptToken, decryptToken } from "./crypto";
import { createHash, randomBytes } from "crypto";
import type {
  GoogleConnection,
  GoogleConnectionPublic,
  MeetTranscript,
  ExtensionToken,
  ExtensionTokenPublic,
  CreateConnectionInput,
  SaveTranscriptInput,
  EncryptedToken,
} from "./types";

// ============================================================================
// GOOGLE CONNECTIONS
// ============================================================================

/**
 * Create or update a Google OAuth connection.
 *
 * @param input - Connection data including tokens
 * @returns The created/updated connection (public fields only)
 */
export async function createOrUpdateGoogleConnection(
  input: CreateConnectionInput
): Promise<GoogleConnectionPublic> {
  const supabase = createAdminClient();

  // Encrypt the refresh token
  const encrypted = encryptToken(input.refreshToken);

  // Calculate token expiry
  const tokenExpiry = input.tokenExpiry.toISOString();

  // Prepare the data
  const connectionData = {
    user_id: input.userId,
    google_email: input.googleEmail,
    google_user_id: input.googleUserId || null,
    access_token: input.accessToken,
    refresh_token_encrypted: encrypted.ciphertext,
    refresh_token_iv: encrypted.iv,
    refresh_token_tag: encrypted.tag,
    token_expiry: tokenExpiry,
    scopes: input.scopes,
    last_sync_error: null,
  };

  // Upsert based on user_id + google_email
  const { data, error } = await supabase
    .from("google_connections")
    .upsert(connectionData, {
      onConflict: "user_id,google_email",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save Google connection: ${error.message}`);
  }

  const conn = data as GoogleConnection;

  return {
    id: conn.id,
    google_email: conn.google_email,
    scopes: conn.scopes,
    last_sync_at: conn.last_sync_at,
    last_sync_error: conn.last_sync_error,
    created_at: conn.created_at,
    is_token_valid: new Date(conn.token_expiry) > new Date(),
  };
}

/**
 * Get a Google connection by ID (with encrypted tokens for server use).
 *
 * @param connectionId - The connection ID
 * @returns Full connection data or null
 */
export async function getGoogleConnection(
  connectionId: string
): Promise<GoogleConnection | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("google_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get Google connection: ${error.message}`);
  }

  return data as GoogleConnection;
}

/**
 * Get decrypted refresh token for a connection.
 *
 * @param connection - The connection with encrypted token
 * @returns Decrypted refresh token
 */
export function getDecryptedRefreshToken(connection: GoogleConnection): string {
  const encrypted: EncryptedToken = {
    ciphertext: connection.refresh_token_encrypted,
    iv: connection.refresh_token_iv,
    tag: connection.refresh_token_tag,
  };
  return decryptToken(encrypted);
}

/**
 * List all Google connections for a user (public fields only).
 *
 * @param userId - The user ID
 * @returns Array of public connection data
 */
export async function listUserGoogleConnections(
  userId: string
): Promise<GoogleConnectionPublic[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("google_connections")
    .select("id, google_email, scopes, last_sync_at, last_sync_error, created_at, token_expiry")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list Google connections: ${error.message}`);
  }

  return (data || []).map((conn) => ({
    id: conn.id,
    google_email: conn.google_email,
    scopes: conn.scopes,
    last_sync_at: conn.last_sync_at,
    last_sync_error: conn.last_sync_error,
    created_at: conn.created_at,
    is_token_valid: new Date(conn.token_expiry) > new Date(),
  }));
}

/**
 * Delete a Google connection.
 *
 * @param userId - The user ID (for authorization)
 * @param connectionId - The connection ID
 * @returns True if deleted
 */
export async function deleteGoogleConnection(
  userId: string,
  connectionId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error, count } = await supabase
    .from("google_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete Google connection: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Update connection tokens after refresh.
 *
 * @param connectionId - The connection ID
 * @param accessToken - New access token
 * @param tokenExpiry - New expiry time
 * @param refreshToken - Optional new refresh token
 */
export async function updateConnectionTokens(
  connectionId: string,
  accessToken: string,
  tokenExpiry: Date,
  refreshToken?: string
): Promise<void> {
  const supabase = createAdminClient();

  const updateData: Record<string, string | null> = {
    access_token: accessToken,
    token_expiry: tokenExpiry.toISOString(),
    last_sync_error: null,
  };

  if (refreshToken) {
    const encrypted = encryptToken(refreshToken);
    updateData.refresh_token_encrypted = encrypted.ciphertext;
    updateData.refresh_token_iv = encrypted.iv;
    updateData.refresh_token_tag = encrypted.tag;
  }

  const { error } = await supabase
    .from("google_connections")
    .update(updateData)
    .eq("id", connectionId);

  if (error) {
    throw new Error(`Failed to update connection tokens: ${error.message}`);
  }
}

/**
 * Update sync status for a connection.
 *
 * @param connectionId - The connection ID
 * @param error - Error message (null if success)
 * @param cursor - Sync cursor for incremental sync
 */
export async function updateSyncStatus(
  connectionId: string,
  error: string | null,
  cursor?: string
): Promise<void> {
  const supabase = createAdminClient();

  const updateData: Record<string, string | null> = {
    last_sync_at: new Date().toISOString(),
    last_sync_error: error,
  };

  if (cursor !== undefined) {
    updateData.sync_cursor = cursor;
  }

  await supabase
    .from("google_connections")
    .update(updateData)
    .eq("id", connectionId);
}

/**
 * Get all connections (for cron sync).
 *
 * @returns Array of full connection data
 */
export async function getAllGoogleConnections(): Promise<GoogleConnection[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("google_connections")
    .select("*")
    .order("last_sync_at", { ascending: true, nullsFirst: true });

  if (error) {
    throw new Error(`Failed to get all connections: ${error.message}`);
  }

  return (data || []) as GoogleConnection[];
}

// ============================================================================
// MEET TRANSCRIPTS
// ============================================================================

/**
 * Save a transcript to the database.
 *
 * @param input - Transcript data
 * @returns The saved transcript
 */
export async function saveTranscript(
  input: SaveTranscriptInput
): Promise<MeetTranscript> {
  const supabase = createAdminClient();

  const transcriptData = {
    user_id: input.userId,
    connection_id: input.connectionId,
    meeting_code: input.meetingCode,
    conference_record_name: input.conferenceRecordName,
    transcript_name: input.transcriptName,
    transcript_state: input.transcriptState,
    docs_document_id: input.docsDocumentId || null,
    text_content: input.textContent,
    text_source: input.textSource,
    entries_count: input.entriesCount || 0,
    meeting_start_time: input.meetingStartTime || null,
    meeting_end_time: input.meetingEndTime || null,
    meeting_space_name: input.meetingSpaceName || null,
    participants: input.participants || [],
    metadata: input.metadata || {},
  };

  const { data, error } = await supabase
    .from("meet_transcripts")
    .upsert(transcriptData, {
      onConflict: "connection_id,conference_record_name,transcript_name",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save transcript: ${error.message}`);
  }

  return data as MeetTranscript;
}

/**
 * Check if a transcript already exists.
 *
 * @param connectionId - The connection ID
 * @param conferenceRecordName - The conference record name
 * @returns True if exists
 */
export async function transcriptExists(
  connectionId: string,
  conferenceRecordName: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("meet_transcripts")
    .select("id", { count: "exact", head: true })
    .eq("connection_id", connectionId)
    .eq("conference_record_name", conferenceRecordName);

  if (error) {
    throw new Error(`Failed to check transcript: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * List transcripts for a user.
 *
 * @param userId - The user ID
 * @param options - Pagination options
 * @returns Array of transcripts
 */
export async function listTranscripts(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    connectionId?: string;
  }
): Promise<MeetTranscript[]> {
  const supabase = createAdminClient();
  const { limit = 50, offset = 0, connectionId } = options || {};

  let query = supabase
    .from("meet_transcripts")
    .select("*")
    .eq("user_id", userId)
    .order("meeting_end_time", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (connectionId) {
    query = query.eq("connection_id", connectionId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list transcripts: ${error.message}`);
  }

  return (data || []) as MeetTranscript[];
}

/**
 * Get a transcript by ID.
 *
 * @param userId - The user ID (for authorization)
 * @param transcriptId - The transcript ID
 * @returns The transcript or null
 */
export async function getTranscriptById(
  userId: string,
  transcriptId: string
): Promise<MeetTranscript | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("meet_transcripts")
    .select("*")
    .eq("id", transcriptId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get transcript: ${error.message}`);
  }

  return data as MeetTranscript;
}

/**
 * Delete a transcript.
 *
 * @param userId - The user ID (for authorization)
 * @param transcriptId - The transcript ID
 * @returns True if deleted
 */
export async function deleteTranscript(
  userId: string,
  transcriptId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error, count } = await supabase
    .from("meet_transcripts")
    .delete()
    .eq("id", transcriptId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete transcript: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

// ============================================================================
// EXTENSION TOKENS
// ============================================================================

/**
 * Create a new extension API token.
 *
 * @param userId - The user ID
 * @param name - Token name
 * @param expiresInDays - Days until expiry (null = no expiry)
 * @returns The raw token (only shown once) and public info
 */
export async function createExtensionToken(
  userId: string,
  name: string = "Chrome Extension",
  expiresInDays?: number
): Promise<{ token: string; tokenInfo: ExtensionTokenPublic }> {
  const supabase = createAdminClient();

  // Generate a secure random token
  const rawToken = randomBytes(32).toString("base64url");
  const tokenPrefix = rawToken.substring(0, 8);

  // Hash the token for storage
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  // Calculate expiry
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("extension_tokens")
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      name,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create extension token: ${error.message}`);
  }

  const tokenData = data as ExtensionToken;

  return {
    token: rawToken,
    tokenInfo: {
      id: tokenData.id,
      token_prefix: tokenData.token_prefix,
      name: tokenData.name,
      last_used_at: tokenData.last_used_at,
      use_count: tokenData.use_count,
      created_at: tokenData.created_at,
      expires_at: tokenData.expires_at,
      is_active: !tokenData.revoked_at,
    },
  };
}

/**
 * Validate an extension token and get the user ID.
 *
 * @param token - The raw token
 * @returns User ID if valid, null otherwise
 */
export async function validateExtensionToken(
  token: string
): Promise<string | null> {
  const supabase = createAdminClient();

  // Hash the provided token
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Find the token
  const { data, error } = await supabase
    .from("extension_tokens")
    .select("id, user_id, expires_at, revoked_at, use_count")
    .eq("token_hash", tokenHash)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if revoked
  if (data.revoked_at) {
    return null;
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Update last used
  await supabase
    .from("extension_tokens")
    .update({
      last_used_at: new Date().toISOString(),
      use_count: (data.use_count || 0) + 1,
    })
    .eq("id", data.id);

  return data.user_id;
}

/**
 * List extension tokens for a user.
 *
 * @param userId - The user ID
 * @returns Array of public token info
 */
export async function listExtensionTokens(
  userId: string
): Promise<ExtensionTokenPublic[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("extension_tokens")
    .select("id, token_prefix, name, last_used_at, use_count, created_at, expires_at, revoked_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list extension tokens: ${error.message}`);
  }

  return (data || []).map((t) => ({
    id: t.id,
    token_prefix: t.token_prefix,
    name: t.name,
    last_used_at: t.last_used_at,
    use_count: t.use_count,
    created_at: t.created_at,
    expires_at: t.expires_at,
    is_active: !t.revoked_at,
  }));
}

/**
 * Revoke an extension token.
 *
 * @param userId - The user ID (for authorization)
 * @param tokenId - The token ID
 * @returns True if revoked
 */
export async function revokeExtensionToken(
  userId: string,
  tokenId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error, count } = await supabase
    .from("extension_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) {
    throw new Error(`Failed to revoke extension token: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

// ============================================================================
// SYNC LOGS
// ============================================================================

/**
 * Create a sync log entry.
 */
export async function createSyncLog(
  connectionId: string | null,
  userId: string | null,
  syncType: "cron" | "manual" | "push"
): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sync_logs")
    .insert({
      connection_id: connectionId,
      user_id: userId,
      sync_type: syncType,
      status: "started",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create sync log: ${error.message}`);
  }

  return data.id;
}

/**
 * Update a sync log with results.
 */
export async function updateSyncLog(
  logId: string,
  status: "completed" | "failed",
  results: {
    conferencesChecked?: number;
    transcriptsFetched?: number;
    transcriptsSaved?: number;
    errorMessage?: string;
    errorDetails?: Record<string, unknown>;
  },
  startTime?: Date
): Promise<void> {
  const supabase = createAdminClient();

  const completedAt = new Date();
  const durationMs = startTime
    ? completedAt.getTime() - startTime.getTime()
    : null;

  await supabase
    .from("sync_logs")
    .update({
      status,
      conferences_checked: results.conferencesChecked || 0,
      transcripts_fetched: results.transcriptsFetched || 0,
      transcripts_saved: results.transcriptsSaved || 0,
      error_message: results.errorMessage || null,
      error_details: results.errorDetails || null,
      completed_at: completedAt.toISOString(),
      duration_ms: durationMs,
    })
    .eq("id", logId);
}

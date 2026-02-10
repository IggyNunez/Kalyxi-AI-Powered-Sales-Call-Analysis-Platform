/**
 * Supabase Transcript Storage (Optional)
 *
 * Server-only module for persisting Google Meet transcripts to Supabase.
 * This is optional and can be enabled by uncommenting the imports
 * and ensuring the transcripts table exists in your Supabase database.
 *
 * Table Schema (run this SQL in Supabase SQL Editor):
 *
 * ```sql
 * CREATE TABLE IF NOT EXISTS meet_transcripts (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   meeting_code TEXT NOT NULL,
 *   conference_record TEXT NOT NULL,
 *   transcript_name TEXT NOT NULL,
 *   transcript_state TEXT NOT NULL,
 *   docs_document_id TEXT,
 *   text_content TEXT NOT NULL,
 *   entries_count INTEGER DEFAULT 0,
 *   metadata JSONB DEFAULT '{}'::jsonb,
 *   organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
 *   created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW(),
 *
 *   -- Unique constraint to prevent duplicate transcripts
 *   UNIQUE(meeting_code, conference_record, transcript_name)
 * );
 *
 * -- Index for fast lookups by meeting code
 * CREATE INDEX IF NOT EXISTS idx_meet_transcripts_meeting_code
 *   ON meet_transcripts(meeting_code);
 *
 * -- Index for organization queries
 * CREATE INDEX IF NOT EXISTS idx_meet_transcripts_organization
 *   ON meet_transcripts(organization_id);
 *
 * -- Enable RLS
 * ALTER TABLE meet_transcripts ENABLE ROW LEVEL SECURITY;
 *
 * -- RLS policy: users can see transcripts from their organization
 * CREATE POLICY "Users can view their organization's transcripts"
 *   ON meet_transcripts FOR SELECT
 *   USING (
 *     organization_id IN (
 *       SELECT organization_id FROM profiles WHERE id = auth.uid()
 *     )
 *   );
 *
 * -- RLS policy: users can insert transcripts for their organization
 * CREATE POLICY "Users can insert transcripts for their organization"
 *   ON meet_transcripts FOR INSERT
 *   WITH CHECK (
 *     organization_id IN (
 *       SELECT organization_id FROM profiles WHERE id = auth.uid()
 *     )
 *   );
 * ```
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { TranscriptState } from "./types";

/**
 * Interface for transcript storage record
 */
export interface StoredTranscript {
  id: string;
  meeting_code: string;
  conference_record: string;
  transcript_name: string;
  transcript_state: TranscriptState;
  docs_document_id: string | null;
  text_content: string;
  entries_count: number;
  metadata: Record<string, unknown>;
  organization_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for saving a transcript
 */
export interface SaveTranscriptInput {
  meetingCode: string;
  conferenceRecord: string;
  transcriptName: string;
  transcriptState: TranscriptState;
  docsDocumentId?: string;
  textContent: string;
  entriesCount?: number;
  metadata?: Record<string, unknown>;
  organizationId?: string;
  createdBy?: string;
}

/**
 * Save a transcript to Supabase.
 *
 * Uses upsert to update existing transcripts if they already exist
 * (based on meeting_code + conference_record + transcript_name).
 *
 * @param input - Transcript data to save
 * @returns The saved transcript record
 */
export async function saveTranscript(
  input: SaveTranscriptInput
): Promise<StoredTranscript> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("meet_transcripts")
    .upsert(
      {
        meeting_code: input.meetingCode,
        conference_record: input.conferenceRecord,
        transcript_name: input.transcriptName,
        transcript_state: input.transcriptState,
        docs_document_id: input.docsDocumentId || null,
        text_content: input.textContent,
        entries_count: input.entriesCount || 0,
        metadata: input.metadata || {},
        organization_id: input.organizationId || null,
        created_by: input.createdBy || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "meeting_code,conference_record,transcript_name",
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save transcript: ${error.message}`);
  }

  return data as StoredTranscript;
}

/**
 * Get a transcript by meeting code.
 *
 * Returns the most recent transcript for the given meeting code.
 *
 * @param meetingCode - The meeting code (e.g., "abc-defg-hij")
 * @param organizationId - Optional organization filter
 * @returns The transcript record, or null if not found
 */
export async function getTranscriptByMeetingCode(
  meetingCode: string,
  organizationId?: string
): Promise<StoredTranscript | null> {
  const supabase = createAdminClient();

  let query = supabase
    .from("meet_transcripts")
    .select("*")
    .eq("meeting_code", meetingCode.trim().toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to get transcript: ${error.message}`);
  }

  return data as StoredTranscript;
}

/**
 * List all transcripts for an organization.
 *
 * @param organizationId - The organization ID
 * @param options - Pagination options
 * @returns Array of transcript records
 */
export async function listTranscripts(
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: "created_at" | "updated_at";
    ascending?: boolean;
  }
): Promise<StoredTranscript[]> {
  const supabase = createAdminClient();
  const {
    limit = 50,
    offset = 0,
    orderBy = "created_at",
    ascending = false,
  } = options || {};

  const { data, error } = await supabase
    .from("meet_transcripts")
    .select("*")
    .eq("organization_id", organizationId)
    .order(orderBy, { ascending })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to list transcripts: ${error.message}`);
  }

  return data as StoredTranscript[];
}

/**
 * Delete a transcript by ID.
 *
 * @param transcriptId - The transcript ID
 * @returns True if deleted, false if not found
 */
export async function deleteTranscript(transcriptId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error, count } = await supabase
    .from("meet_transcripts")
    .delete()
    .eq("id", transcriptId);

  if (error) {
    throw new Error(`Failed to delete transcript: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Search transcripts by text content.
 *
 * Uses PostgreSQL full-text search if configured, otherwise falls back
 * to ILIKE pattern matching.
 *
 * @param query - Search query
 * @param organizationId - Optional organization filter
 * @param limit - Maximum results to return
 * @returns Array of matching transcript records
 */
export async function searchTranscripts(
  query: string,
  organizationId?: string,
  limit: number = 20
): Promise<StoredTranscript[]> {
  const supabase = createAdminClient();

  let dbQuery = supabase
    .from("meet_transcripts")
    .select("*")
    .ilike("text_content", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (organizationId) {
    dbQuery = dbQuery.eq("organization_id", organizationId);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search transcripts: ${error.message}`);
  }

  return data as StoredTranscript[];
}

/**
 * Check if the meet_transcripts table exists.
 *
 * Useful for conditional storage features.
 *
 * @returns True if the table exists and is accessible
 */
export async function isStorageEnabled(): Promise<boolean> {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from("meet_transcripts")
      .select("id")
      .limit(0);

    return !error;
  } catch {
    return false;
  }
}

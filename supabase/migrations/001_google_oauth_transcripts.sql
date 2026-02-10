-- ============================================================================
-- Google OAuth Connections & Meet Transcripts Schema
-- ============================================================================
-- Run this in your Supabase SQL Editor
-- This creates tables for storing Google OAuth connections with encrypted
-- refresh tokens, Meet transcripts, and extension API tokens.
-- ============================================================================

-- ============================================================================
-- 1. GOOGLE CONNECTIONS TABLE
-- ============================================================================
-- Stores OAuth connections between users and their Google accounts.
-- Users can connect multiple Google accounts.
-- Refresh tokens are encrypted before storage.

CREATE TABLE IF NOT EXISTS google_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Google account info
    google_email TEXT NOT NULL,
    google_user_id TEXT, -- Google's unique user ID

    -- OAuth tokens (refresh_token is encrypted)
    access_token TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted
    refresh_token_iv TEXT NOT NULL,        -- Initialization vector
    refresh_token_tag TEXT NOT NULL,       -- Auth tag

    -- Token metadata
    token_expiry TIMESTAMPTZ NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

    -- Sync state
    last_sync_at TIMESTAMPTZ,
    last_sync_error TEXT,
    sync_cursor TEXT, -- For incremental sync (last conferenceRecord time)

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate Google accounts per user
    UNIQUE(user_id, google_email)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_google_connections_user_id
    ON google_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_google_connections_google_email
    ON google_connections(google_email);
CREATE INDEX IF NOT EXISTS idx_google_connections_last_sync
    ON google_connections(last_sync_at);

-- ============================================================================
-- 2. MEET TRANSCRIPTS TABLE
-- ============================================================================
-- Stores fetched Google Meet transcripts.

CREATE TABLE IF NOT EXISTS meet_transcripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES google_connections(id) ON DELETE CASCADE,

    -- Meeting identification
    meeting_code TEXT NOT NULL,
    conference_record_name TEXT NOT NULL, -- e.g., "conferenceRecords/abc123"

    -- Transcript info
    transcript_name TEXT NOT NULL, -- e.g., "conferenceRecords/abc123/transcripts/xyz"
    transcript_state TEXT NOT NULL, -- STARTED, ENDED, FILE_GENERATED
    docs_document_id TEXT, -- Google Docs ID if available

    -- Content
    text_content TEXT NOT NULL,
    text_source TEXT NOT NULL DEFAULT 'entries', -- 'docs' or 'entries'
    entries_count INTEGER DEFAULT 0,

    -- Meeting metadata
    meeting_start_time TIMESTAMPTZ,
    meeting_end_time TIMESTAMPTZ,
    meeting_space_name TEXT,

    -- Participants (optional JSON array)
    participants JSONB DEFAULT '[]'::JSONB,

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate transcripts
    UNIQUE(connection_id, conference_record_name, transcript_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meet_transcripts_user_id
    ON meet_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_meet_transcripts_connection_id
    ON meet_transcripts(connection_id);
CREATE INDEX IF NOT EXISTS idx_meet_transcripts_meeting_code
    ON meet_transcripts(meeting_code);
CREATE INDEX IF NOT EXISTS idx_meet_transcripts_meeting_end_time
    ON meet_transcripts(meeting_end_time DESC);
CREATE INDEX IF NOT EXISTS idx_meet_transcripts_created_at
    ON meet_transcripts(created_at DESC);

-- ============================================================================
-- 3. EXTENSION API TOKENS TABLE
-- ============================================================================
-- Stores hashed API tokens for Chrome extension authentication.
-- Users can generate tokens from the dashboard to use with the extension.

CREATE TABLE IF NOT EXISTS extension_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Token identification (we store hash, not the raw token)
    token_hash TEXT NOT NULL UNIQUE,
    token_prefix TEXT NOT NULL, -- First 8 chars for identification
    name TEXT DEFAULT 'Chrome Extension', -- User-friendly name

    -- Usage tracking
    last_used_at TIMESTAMPTZ,
    use_count INTEGER DEFAULT 0,

    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL = no expiry
    revoked_at TIMESTAMPTZ, -- NULL = active

    -- Constraints
    CONSTRAINT extension_tokens_active_check
        CHECK (revoked_at IS NULL OR revoked_at > created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_extension_tokens_user_id
    ON extension_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_tokens_token_hash
    ON extension_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_extension_tokens_active
    ON extension_tokens(user_id) WHERE revoked_at IS NULL;

-- ============================================================================
-- 4. SYNC LOGS TABLE (Optional - for debugging)
-- ============================================================================
-- Logs sync operations for debugging and monitoring.

CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID REFERENCES google_connections(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Sync info
    sync_type TEXT NOT NULL, -- 'cron', 'manual', 'push'
    status TEXT NOT NULL, -- 'started', 'completed', 'failed'

    -- Results
    conferences_checked INTEGER DEFAULT 0,
    transcripts_fetched INTEGER DEFAULT 0,
    transcripts_saved INTEGER DEFAULT 0,

    -- Errors
    error_message TEXT,
    error_details JSONB,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Context
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at
    ON sync_logs(started_at DESC);

-- ============================================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Google Connections Policies
-- ----------------------------------------------------------------------------

-- Users can view their own connections
CREATE POLICY "Users can view own google connections"
    ON google_connections FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own connections
CREATE POLICY "Users can insert own google connections"
    ON google_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own google connections"
    ON google_connections FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own google connections"
    ON google_connections FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can do everything (for server-side operations)
CREATE POLICY "Service role full access to google connections"
    ON google_connections FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- Meet Transcripts Policies
-- ----------------------------------------------------------------------------

-- Users can view their own transcripts
CREATE POLICY "Users can view own transcripts"
    ON meet_transcripts FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own transcripts
CREATE POLICY "Users can insert own transcripts"
    ON meet_transcripts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own transcripts
CREATE POLICY "Users can update own transcripts"
    ON meet_transcripts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own transcripts
CREATE POLICY "Users can delete own transcripts"
    ON meet_transcripts FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to transcripts"
    ON meet_transcripts FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- Extension Tokens Policies
-- ----------------------------------------------------------------------------

-- Users can view their own extension tokens
CREATE POLICY "Users can view own extension tokens"
    ON extension_tokens FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own extension tokens
CREATE POLICY "Users can insert own extension tokens"
    ON extension_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update (revoke) their own extension tokens
CREATE POLICY "Users can update own extension tokens"
    ON extension_tokens FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own extension tokens
CREATE POLICY "Users can delete own extension tokens"
    ON extension_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to extension tokens"
    ON extension_tokens FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- Sync Logs Policies
-- ----------------------------------------------------------------------------

-- Users can view their own sync logs
CREATE POLICY "Users can view own sync logs"
    ON sync_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to sync logs"
    ON sync_logs FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_google_connections_updated_at
    BEFORE UPDATE ON google_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meet_transcripts_updated_at
    BEFORE UPDATE ON meet_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. CLEANUP FUNCTION (Optional)
-- ============================================================================
-- Call this periodically to clean up old sync logs

CREATE OR REPLACE FUNCTION cleanup_old_sync_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sync_logs
    WHERE started_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

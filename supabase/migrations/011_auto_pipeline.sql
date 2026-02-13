-- Migration 011: Auto Pipeline
-- Add columns to calls table for automatic Google Meet capture pipeline
-- Calls are now auto-created from Meet transcripts, not manual uploads

-- Add auto-capture fields to calls
ALTER TABLE calls ADD COLUMN IF NOT EXISTS meet_code TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS conference_record_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS meet_transcript_id UUID REFERENCES meet_transcripts(id) ON DELETE SET NULL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS auto_analysis_status TEXT DEFAULT 'pending'
    CHECK (auto_analysis_status IN ('pending', 'analyzing', 'completed', 'failed', 'skipped'));
ALTER TABLE calls ADD COLUMN IF NOT EXISTS auto_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Indexes for the auto pipeline
CREATE INDEX IF NOT EXISTS idx_calls_meet_transcript_id ON calls(meet_transcript_id);
CREATE INDEX IF NOT EXISTS idx_calls_meet_code ON calls(meet_code);
CREATE INDEX IF NOT EXISTS idx_calls_auto_analysis_status ON calls(auto_analysis_status) WHERE auto_analysis_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);

-- Allow the source column to accept 'google_meet' value
-- (The existing CHECK constraint may need updating)
DO $$
BEGIN
    -- Drop existing constraint if it exists and recreate with new values
    ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_source_check;
    ALTER TABLE calls ADD CONSTRAINT calls_source_check
        CHECK (source IN ('manual', 'webhook', 'google_notes', 'api', 'upload', 'google_meet', 'calendar'));
EXCEPTION
    WHEN others THEN
        -- If constraint doesn't exist, just add it
        ALTER TABLE calls ADD CONSTRAINT calls_source_check
            CHECK (source IN ('manual', 'webhook', 'google_notes', 'api', 'upload', 'google_meet', 'calendar'));
END $$;

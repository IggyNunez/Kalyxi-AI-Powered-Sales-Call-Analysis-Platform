-- Migration 014: Google Connection Attribution
-- Adds maps_to_user_id to google_connections so calls from each Google account
-- can be attributed to the correct team member (not just the admin who connected it).

-- Add attribution field: "who should calls from this Google account be graded for?"
ALTER TABLE google_connections
  ADD COLUMN IF NOT EXISTS maps_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Default: existing connections map to the user who connected them
UPDATE google_connections SET maps_to_user_id = user_id WHERE maps_to_user_id IS NULL;

-- Index for pipeline lookups
CREATE INDEX IF NOT EXISTS idx_google_connections_maps_to
  ON google_connections(maps_to_user_id);

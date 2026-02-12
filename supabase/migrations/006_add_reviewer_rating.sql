-- Migration: Add reviewer_rating column to sessions table
-- This column was missing from the original coaching platform schema

-- Add reviewer_rating column for manager review scoring (1-5 scale)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS reviewer_rating INTEGER CHECK (reviewer_rating >= 1 AND reviewer_rating <= 5);

-- Also rename review_notes to reviewer_notes for consistency with codebase
-- First add the new column
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

-- Copy data from old column if it exists
UPDATE sessions SET reviewer_notes = review_notes WHERE review_notes IS NOT NULL;

-- Note: We keep review_notes for backward compatibility - it can be removed in a future migration
-- after confirming no data loss

-- Migration 010: Clean up legacy tables
-- Move legacy scoring/grading systems to archive schema
-- These are replaced by the modern templates/criteria/sessions/scores system

-- Create archive schema for safety (can drop later after verification)
CREATE SCHEMA IF NOT EXISTS archive;

-- Archive legacy grading templates
ALTER TABLE IF EXISTS public.grading_templates SET SCHEMA archive;

-- Archive legacy scorecards
ALTER TABLE IF EXISTS public.scorecards SET SCHEMA archive;

-- Archive legacy scorecard configs
ALTER TABLE IF EXISTS public.scorecard_configs SET SCHEMA archive;

-- Archive legacy call score results (replaced by sessions/scores)
ALTER TABLE IF EXISTS public.call_score_results SET SCHEMA archive;

-- Archive legacy criteria optimizations
ALTER TABLE IF EXISTS public.criteria_optimizations SET SCHEMA archive;

-- Archive manual upload processing queue (no more manual uploads)
ALTER TABLE IF EXISTS public.processing_queue SET SCHEMA archive;

-- Remove legacy scorecard reference from templates table
ALTER TABLE IF EXISTS public.templates DROP COLUMN IF EXISTS legacy_scorecard_id;

-- Note: The callers table is kept for now as some calls reference it
-- It will be phased out as the system transitions to user-based tracking

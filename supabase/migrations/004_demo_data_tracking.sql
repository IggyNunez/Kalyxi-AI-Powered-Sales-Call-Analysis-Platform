-- Migration: Add demo_batch_id for tracking demo data
-- This allows clean deletion of demo data without affecting production records

-- Add demo_batch_id to key tables
ALTER TABLE callers ADD COLUMN IF NOT EXISTS demo_batch_id UUID DEFAULT NULL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS demo_batch_id UUID DEFAULT NULL;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS demo_batch_id UUID DEFAULT NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS demo_batch_id UUID DEFAULT NULL;
ALTER TABLE grading_templates ADD COLUMN IF NOT EXISTS demo_batch_id UUID DEFAULT NULL;
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS demo_batch_id UUID DEFAULT NULL;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS demo_batch_id UUID DEFAULT NULL;
ALTER TABLE insight_templates ADD COLUMN IF NOT EXISTS demo_batch_id UUID DEFAULT NULL;
ALTER TABLE call_score_results ADD COLUMN IF NOT EXISTS demo_batch_id UUID DEFAULT NULL;

-- Create indexes for efficient demo data queries
CREATE INDEX IF NOT EXISTS idx_callers_demo_batch ON callers(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_demo_batch ON calls(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_demo_batch ON analyses(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_demo_batch ON reports(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grading_templates_demo_batch ON grading_templates(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scorecards_demo_batch ON scorecards(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scripts_demo_batch ON scripts(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insight_templates_demo_batch ON insight_templates(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_score_results_demo_batch ON call_score_results(demo_batch_id) WHERE demo_batch_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN callers.demo_batch_id IS 'UUID of demo data batch for easy cleanup. NULL = production data.';
COMMENT ON COLUMN calls.demo_batch_id IS 'UUID of demo data batch for easy cleanup. NULL = production data.';
COMMENT ON COLUMN analyses.demo_batch_id IS 'UUID of demo data batch for easy cleanup. NULL = production data.';
COMMENT ON COLUMN reports.demo_batch_id IS 'UUID of demo data batch for easy cleanup. NULL = production data.';

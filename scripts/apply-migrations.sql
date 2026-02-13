-- ============================================================================
-- Combined Migrations 010-013 for Kalyxi Platform Simplification
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mblhtxyhywfjtvimqczv/sql
-- ============================================================================

-- ============================================================================
-- Migration 010: Clean up legacy tables
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS archive;
ALTER TABLE IF EXISTS public.grading_templates SET SCHEMA archive;
ALTER TABLE IF EXISTS public.scorecards SET SCHEMA archive;
ALTER TABLE IF EXISTS public.scorecard_configs SET SCHEMA archive;
ALTER TABLE IF EXISTS public.call_score_results SET SCHEMA archive;
ALTER TABLE IF EXISTS public.criteria_optimizations SET SCHEMA archive;
ALTER TABLE IF EXISTS public.processing_queue SET SCHEMA archive;
ALTER TABLE IF EXISTS public.templates DROP COLUMN IF EXISTS legacy_scorecard_id;

-- ============================================================================
-- Migration 011: Auto Pipeline
-- ============================================================================
ALTER TABLE calls ADD COLUMN IF NOT EXISTS meet_code TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS conference_record_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS meet_transcript_id UUID REFERENCES meet_transcripts(id) ON DELETE SET NULL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS auto_analysis_status TEXT DEFAULT 'pending'
    CHECK (auto_analysis_status IN ('pending', 'analyzing', 'completed', 'failed', 'skipped'));
ALTER TABLE calls ADD COLUMN IF NOT EXISTS auto_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calls_meet_transcript_id ON calls(meet_transcript_id);
CREATE INDEX IF NOT EXISTS idx_calls_meet_code ON calls(meet_code);
CREATE INDEX IF NOT EXISTS idx_calls_auto_analysis_status ON calls(auto_analysis_status) WHERE auto_analysis_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);

DO $$
BEGIN
    ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_source_check;
    ALTER TABLE calls ADD CONSTRAINT calls_source_check
        CHECK (source IN ('manual', 'webhook', 'google_notes', 'api', 'upload', 'google_meet', 'calendar'));
EXCEPTION
    WHEN others THEN
        ALTER TABLE calls ADD CONSTRAINT calls_source_check
            CHECK (source IN ('manual', 'webhook', 'google_notes', 'api', 'upload', 'google_meet', 'calendar'));
END $$;

-- ============================================================================
-- Migration 012: Knowledge Base
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'guideline'
    CHECK (doc_type IN ('guideline', 'playbook', 'product_info', 'policy', 'faq', 'objection_handling', 'other')),
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('communication', 'sales_technique', 'product_knowledge', 'objection_handling', 'closing', 'discovery', 'rapport', 'presentation', 'general')),
  parent_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_kb_docs_org_active ON knowledge_base_documents(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_kb_docs_type ON knowledge_base_documents(org_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_skills_org_active ON skills(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(org_id, category);
CREATE INDEX IF NOT EXISTS idx_skills_parent ON skills(parent_skill_id);

ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org KB documents"
  ON knowledge_base_documents FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can insert KB documents"
  ON knowledge_base_documents FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

CREATE POLICY "Admins can update KB documents"
  ON knowledge_base_documents FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

CREATE POLICY "Admins can delete KB documents"
  ON knowledge_base_documents FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org skills"
  ON skills FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can insert skills"
  ON skills FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

CREATE POLICY "Admins can update skills"
  ON skills FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

CREATE POLICY "Admins can delete skills"
  ON skills FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

CREATE OR REPLACE TRIGGER set_kb_docs_updated_at
  BEFORE UPDATE ON knowledge_base_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration 013: Template Assignments + Skills Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_skill_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  evidence TEXT,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_assignments_user ON template_assignments(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_template_assignments_template ON template_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_template_assignments_org ON template_assignments(org_id);

CREATE INDEX IF NOT EXISTS idx_user_skill_scores_user ON user_skill_scores(user_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_scores_session ON user_skill_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_scores_org ON user_skill_scores(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_scores_scored_at ON user_skill_scores(user_id, scored_at);

ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org template assignments"
  ON template_assignments FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can insert template assignments"
  ON template_assignments FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

CREATE POLICY "Admins can update template assignments"
  ON template_assignments FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

CREATE POLICY "Admins can delete template assignments"
  ON template_assignments FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin', 'manager')
    )
  );

ALTER TABLE user_skill_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org skill scores"
  ON user_skill_scores FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can insert skill scores"
  ON user_skill_scores FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin', 'manager', 'coach')
    )
  );

CREATE OR REPLACE TRIGGER set_template_assignments_updated_at
  BEFORE UPDATE ON template_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

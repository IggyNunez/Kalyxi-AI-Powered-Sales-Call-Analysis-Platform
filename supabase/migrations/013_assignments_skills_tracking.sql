-- ============================================================================
-- Migration 013: Template Assignments + Skills Tracking
-- Per-salesperson template assignment and skill score history
-- ============================================================================

-- Template Assignments (assign specific templates to salespeople)
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

-- User Skill Scores (per-session skill assessment)
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

-- Indexes
CREATE INDEX idx_template_assignments_user ON template_assignments(user_id, is_active);
CREATE INDEX idx_template_assignments_template ON template_assignments(template_id);
CREATE INDEX idx_template_assignments_org ON template_assignments(org_id);

CREATE INDEX idx_user_skill_scores_user ON user_skill_scores(user_id, skill_id);
CREATE INDEX idx_user_skill_scores_session ON user_skill_scores(session_id);
CREATE INDEX idx_user_skill_scores_org ON user_skill_scores(org_id, user_id);
CREATE INDEX idx_user_skill_scores_scored_at ON user_skill_scores(user_id, scored_at);

-- RLS for template_assignments
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

-- RLS for user_skill_scores
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

-- Triggers
CREATE TRIGGER set_template_assignments_updated_at
  BEFORE UPDATE ON template_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

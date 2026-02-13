-- ============================================================================
-- Migration 012: Knowledge Base
-- Adds knowledge base documents and skills taxonomy
-- ============================================================================

-- Knowledge Base Documents
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

-- Skills taxonomy
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

-- Indexes
CREATE INDEX idx_kb_docs_org_active ON knowledge_base_documents(org_id, is_active);
CREATE INDEX idx_kb_docs_type ON knowledge_base_documents(org_id, doc_type);
CREATE INDEX idx_skills_org_active ON skills(org_id, is_active);
CREATE INDEX idx_skills_category ON skills(org_id, category);
CREATE INDEX idx_skills_parent ON skills(parent_skill_id);

-- RLS Policies for knowledge_base_documents
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

-- RLS Policies for skills
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

-- Updated_at triggers
CREATE TRIGGER set_kb_docs_updated_at
  BEFORE UPDATE ON knowledge_base_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

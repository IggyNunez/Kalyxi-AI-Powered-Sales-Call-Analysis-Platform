-- Migration: Scripts, Scorecards, and Insight Templates
-- Version: 003
-- Description: Adds comprehensive scoring and insights system

-- ============================================================================
-- 1. SCRIPTS TABLE - Sales call scripts with versioning
-- ============================================================================
CREATE TABLE IF NOT EXISTS scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Script metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,

    -- Script content (JSONB for flexibility)
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: [{ "name": "Opening", "content": "...", "tips": ["..."], "order": 1 }]

    -- Status management
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    is_default BOOLEAN NOT NULL DEFAULT false,

    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_active_default_script UNIQUE (org_id, is_default)
        DEFERRABLE INITIALLY DEFERRED
);

-- Partial unique index: only one active default script per org
CREATE UNIQUE INDEX idx_scripts_one_default_per_org
    ON scripts (org_id)
    WHERE is_default = true AND status = 'active';

-- Index for common queries
CREATE INDEX idx_scripts_org_status ON scripts(org_id, status);
CREATE INDEX idx_scripts_org_default ON scripts(org_id, is_default) WHERE is_default = true;

-- ============================================================================
-- 2. SCORECARDS TABLE - Enhanced scorecards with versioning
-- ============================================================================
CREATE TABLE IF NOT EXISTS scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Scorecard metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,

    -- Criteria configuration (JSONB for flexibility)
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: [{
    --   "id": "uuid",
    --   "name": "Opening",
    --   "description": "...",
    --   "weight": 20,
    --   "max_score": 10,
    --   "scoring_guide": "1-3: Poor, 4-6: Average, 7-10: Excellent",
    --   "keywords": ["greeting", "introduction"],
    --   "order": 1
    -- }]

    -- Total weight must equal 100
    total_weight INTEGER NOT NULL DEFAULT 100,

    -- Status management (draft -> active -> archived)
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    is_default BOOLEAN NOT NULL DEFAULT false,

    -- Optional: link to script this scorecard is designed for
    script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,

    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    activated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,

    -- Versioning: reference to previous version
    previous_version_id UUID REFERENCES scorecards(id) ON DELETE SET NULL
);

-- Partial unique index: only one active default scorecard per org
CREATE UNIQUE INDEX idx_scorecards_one_default_per_org
    ON scorecards (org_id)
    WHERE is_default = true AND status = 'active';

-- Indexes for common queries
CREATE INDEX idx_scorecards_org_status ON scorecards(org_id, status);
CREATE INDEX idx_scorecards_org_active ON scorecards(org_id) WHERE status = 'active';
CREATE INDEX idx_scorecards_script ON scorecards(script_id) WHERE script_id IS NOT NULL;

-- ============================================================================
-- 3. INSIGHT TEMPLATES TABLE - Configurable insight generation
-- ============================================================================
CREATE TABLE IF NOT EXISTS insight_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general'
        CHECK (category IN ('general', 'coaching', 'performance', 'compliance', 'custom')),

    -- Template configuration
    prompt_template TEXT NOT NULL,
    -- Example: "Based on the call analysis, identify the top 3 areas where {caller_name} can improve..."

    -- Output configuration
    output_format VARCHAR(20) NOT NULL DEFAULT 'text'
        CHECK (output_format IN ('text', 'bullets', 'numbered', 'json')),
    max_insights INTEGER DEFAULT 5,

    -- Visibility
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_insight_templates_org_active ON insight_templates(org_id, is_active);
CREATE INDEX idx_insight_templates_org_category ON insight_templates(org_id, category);
CREATE INDEX idx_insight_templates_display_order ON insight_templates(org_id, display_order);

-- ============================================================================
-- 4. CALL SCORE RESULTS TABLE - Detailed scoring per call
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_score_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE RESTRICT,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Overall scores
    total_score DECIMAL(5,2) NOT NULL,
    max_possible_score DECIMAL(5,2) NOT NULL,
    percentage_score DECIMAL(5,2) NOT NULL,

    -- Detailed criteria scores (JSONB)
    criteria_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {
    --   "criterion_id": {
    --     "name": "Opening",
    --     "score": 8,
    --     "max_score": 10,
    --     "weight": 20,
    --     "weighted_score": 16,
    --     "feedback": "Strong greeting but missed...",
    --     "highlights": ["Good energy", "Clear introduction"],
    --     "improvements": ["Could personalize more"]
    --   }
    -- }

    -- AI-generated summary
    summary TEXT,
    strengths JSONB DEFAULT '[]'::jsonb,
    improvements JSONB DEFAULT '[]'::jsonb,

    -- Scoring metadata
    scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    scored_by VARCHAR(50) NOT NULL DEFAULT 'ai' CHECK (scored_by IN ('ai', 'manual', 'hybrid')),

    -- Versioning info (snapshot of scorecard version used)
    scorecard_version INTEGER NOT NULL,
    scorecard_snapshot JSONB, -- Full scorecard criteria at time of scoring

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_call_score_results_call ON call_score_results(call_id);
CREATE INDEX idx_call_score_results_scorecard ON call_score_results(scorecard_id);
CREATE INDEX idx_call_score_results_org ON call_score_results(org_id);
CREATE INDEX idx_call_score_results_org_date ON call_score_results(org_id, scored_at DESC);
CREATE INDEX idx_call_score_results_percentage ON call_score_results(org_id, percentage_score);

-- ============================================================================
-- 5. CRITERIA OPTIMIZATIONS TABLE - Track performance by criteria
-- ============================================================================
CREATE TABLE IF NOT EXISTS criteria_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- What we're tracking
    criterion_name VARCHAR(255) NOT NULL,
    criterion_id VARCHAR(100), -- From scorecard criteria

    -- Aggregated stats
    total_evaluations INTEGER NOT NULL DEFAULT 0,
    total_score DECIMAL(10,2) NOT NULL DEFAULT 0,
    average_score DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_evaluations > 0
             THEN total_score / total_evaluations
             ELSE 0
        END
    ) STORED,

    -- Score distribution
    score_distribution JSONB DEFAULT '{}'::jsonb,
    -- Example: { "1-3": 5, "4-6": 15, "7-10": 30 }

    -- Trends
    trend_data JSONB DEFAULT '[]'::jsonb,
    -- Example: [{ "date": "2024-01", "avg": 7.2, "count": 45 }]

    -- Common feedback themes
    common_strengths JSONB DEFAULT '[]'::jsonb,
    common_improvements JSONB DEFAULT '[]'::jsonb,

    -- Time period (for aggregation)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Metadata
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique per org + criterion + period
    CONSTRAINT unique_criteria_optimization
        UNIQUE (org_id, criterion_name, period_start, period_end)
);

-- Indexes
CREATE INDEX idx_criteria_optimizations_org ON criteria_optimizations(org_id);
CREATE INDEX idx_criteria_optimizations_criterion ON criteria_optimizations(org_id, criterion_name);
CREATE INDEX idx_criteria_optimizations_period ON criteria_optimizations(org_id, period_start, period_end);

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_score_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria_optimizations ENABLE ROW LEVEL SECURITY;

-- SCRIPTS POLICIES
CREATE POLICY "scripts_select_own_org" ON scripts
    FOR SELECT USING (
        org_id = user_org_id() OR is_superadmin()
    );

CREATE POLICY "scripts_insert_admin" ON scripts
    FOR INSERT WITH CHECK (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

CREATE POLICY "scripts_update_admin" ON scripts
    FOR UPDATE USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

CREATE POLICY "scripts_delete_admin" ON scripts
    FOR DELETE USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

-- SCORECARDS POLICIES
CREATE POLICY "scorecards_select_own_org" ON scorecards
    FOR SELECT USING (
        org_id = user_org_id() OR is_superadmin()
    );

CREATE POLICY "scorecards_insert_admin" ON scorecards
    FOR INSERT WITH CHECK (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

CREATE POLICY "scorecards_update_admin" ON scorecards
    FOR UPDATE USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

CREATE POLICY "scorecards_delete_admin" ON scorecards
    FOR DELETE USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

-- INSIGHT TEMPLATES POLICIES
CREATE POLICY "insight_templates_select_own_org" ON insight_templates
    FOR SELECT USING (
        org_id = user_org_id() OR is_superadmin()
    );

CREATE POLICY "insight_templates_insert_admin" ON insight_templates
    FOR INSERT WITH CHECK (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

CREATE POLICY "insight_templates_update_admin" ON insight_templates
    FOR UPDATE USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

CREATE POLICY "insight_templates_delete_admin" ON insight_templates
    FOR DELETE USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

-- CALL SCORE RESULTS POLICIES
CREATE POLICY "call_score_results_select_own_org" ON call_score_results
    FOR SELECT USING (
        org_id = user_org_id() OR is_superadmin()
    );

CREATE POLICY "call_score_results_insert_system" ON call_score_results
    FOR INSERT WITH CHECK (
        org_id = user_org_id()
    );

CREATE POLICY "call_score_results_update_admin" ON call_score_results
    FOR UPDATE USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

CREATE POLICY "call_score_results_delete_admin" ON call_score_results
    FOR DELETE USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

-- CRITERIA OPTIMIZATIONS POLICIES
CREATE POLICY "criteria_optimizations_select_own_org" ON criteria_optimizations
    FOR SELECT USING (
        org_id = user_org_id() OR is_superadmin()
    );

CREATE POLICY "criteria_optimizations_insert_system" ON criteria_optimizations
    FOR INSERT WITH CHECK (
        org_id = user_org_id()
    );

CREATE POLICY "criteria_optimizations_update_system" ON criteria_optimizations
    FOR UPDATE USING (
        org_id = user_org_id()
    );

CREATE POLICY "criteria_optimizations_delete_admin" ON criteria_optimizations
    FOR DELETE USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

-- ============================================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_scripts_updated_at
    BEFORE UPDATE ON scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scorecards_updated_at
    BEFORE UPDATE ON scorecards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_insight_templates_updated_at
    BEFORE UPDATE ON insight_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_call_score_results_updated_at
    BEFORE UPDATE ON call_score_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_criteria_optimizations_updated_at
    BEFORE UPDATE ON criteria_optimizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 8. DEFAULT DATA SEEDING FUNCTION
-- ============================================================================

-- Function to create default scorecard for new organizations
CREATE OR REPLACE FUNCTION create_default_scorecard_for_org()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO scorecards (org_id, name, description, criteria, total_weight, status, is_default)
    VALUES (
        NEW.id,
        'Default Sales Scorecard',
        'Standard scorecard for evaluating sales calls',
        '[
            {
                "id": "opening",
                "name": "Opening & Introduction",
                "description": "How well did the caller open the conversation and introduce themselves?",
                "weight": 15,
                "max_score": 10,
                "scoring_guide": "1-3: Poor greeting, no introduction. 4-6: Basic greeting, minimal rapport. 7-10: Excellent greeting, strong rapport building.",
                "order": 1
            },
            {
                "id": "discovery",
                "name": "Discovery & Needs Analysis",
                "description": "How effectively did the caller uncover customer needs and pain points?",
                "weight": 25,
                "max_score": 10,
                "scoring_guide": "1-3: No discovery questions. 4-6: Basic questions asked. 7-10: Deep discovery, understood needs.",
                "order": 2
            },
            {
                "id": "presentation",
                "name": "Product Presentation",
                "description": "How well did the caller present the solution and its benefits?",
                "weight": 20,
                "max_score": 10,
                "scoring_guide": "1-3: No clear presentation. 4-6: Basic features mentioned. 7-10: Tailored presentation with clear value.",
                "order": 3
            },
            {
                "id": "objection_handling",
                "name": "Objection Handling",
                "description": "How effectively did the caller address concerns and objections?",
                "weight": 20,
                "max_score": 10,
                "scoring_guide": "1-3: Ignored or argued. 4-6: Acknowledged but weak response. 7-10: Skillfully addressed all concerns.",
                "order": 4
            },
            {
                "id": "closing",
                "name": "Closing & Next Steps",
                "description": "How well did the caller close and establish next steps?",
                "weight": 20,
                "max_score": 10,
                "scoring_guide": "1-3: No close attempt. 4-6: Weak close, unclear next steps. 7-10: Strong close, clear action items.",
                "order": 5
            }
        ]'::jsonb,
        100,
        'active',
        true
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new organizations
DROP TRIGGER IF EXISTS create_default_scorecard_on_org_insert ON organizations;
CREATE TRIGGER create_default_scorecard_on_org_insert
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION create_default_scorecard_for_org();

-- Function to create default insight templates for new organizations
CREATE OR REPLACE FUNCTION create_default_insight_templates_for_org()
RETURNS TRIGGER AS $$
BEGIN
    -- Coaching insights template
    INSERT INTO insight_templates (org_id, name, description, category, prompt_template, output_format, max_insights, is_default, display_order)
    VALUES (
        NEW.id,
        'Coaching Recommendations',
        'AI-generated coaching tips based on call performance',
        'coaching',
        'Based on the call analysis and scores, provide specific coaching recommendations for the sales representative. Focus on actionable improvements they can implement in their next call.',
        'bullets',
        5,
        true,
        1
    );

    -- Performance summary template
    INSERT INTO insight_templates (org_id, name, description, category, prompt_template, output_format, max_insights, is_default, display_order)
    VALUES (
        NEW.id,
        'Performance Summary',
        'High-level summary of call performance',
        'performance',
        'Provide a brief executive summary of this sales call, highlighting key moments, overall effectiveness, and outcome assessment.',
        'text',
        1,
        true,
        2
    );

    -- Strengths analysis template
    INSERT INTO insight_templates (org_id, name, description, category, prompt_template, output_format, max_insights, is_default, display_order)
    VALUES (
        NEW.id,
        'Key Strengths',
        'Identify what went well in the call',
        'general',
        'Identify the top strengths demonstrated in this call. What did the representative do particularly well?',
        'bullets',
        3,
        true,
        3
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new organizations
DROP TRIGGER IF EXISTS create_default_insight_templates_on_org_insert ON organizations;
CREATE TRIGGER create_default_insight_templates_on_org_insert
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION create_default_insight_templates_for_org();

-- ============================================================================
-- 9. SEED DEFAULT DATA FOR EXISTING ORGANIZATIONS
-- ============================================================================

-- Create default scorecards for existing orgs that don't have one
INSERT INTO scorecards (org_id, name, description, criteria, total_weight, status, is_default)
SELECT
    o.id,
    'Default Sales Scorecard',
    'Standard scorecard for evaluating sales calls',
    '[
        {
            "id": "opening",
            "name": "Opening & Introduction",
            "description": "How well did the caller open the conversation and introduce themselves?",
            "weight": 15,
            "max_score": 10,
            "scoring_guide": "1-3: Poor greeting, no introduction. 4-6: Basic greeting, minimal rapport. 7-10: Excellent greeting, strong rapport building.",
            "order": 1
        },
        {
            "id": "discovery",
            "name": "Discovery & Needs Analysis",
            "description": "How effectively did the caller uncover customer needs and pain points?",
            "weight": 25,
            "max_score": 10,
            "scoring_guide": "1-3: No discovery questions. 4-6: Basic questions asked. 7-10: Deep discovery, understood needs.",
            "order": 2
        },
        {
            "id": "presentation",
            "name": "Product Presentation",
            "description": "How well did the caller present the solution and its benefits?",
            "weight": 20,
            "max_score": 10,
            "scoring_guide": "1-3: No clear presentation. 4-6: Basic features mentioned. 7-10: Tailored presentation with clear value.",
            "order": 3
        },
        {
            "id": "objection_handling",
            "name": "Objection Handling",
            "description": "How effectively did the caller address concerns and objections?",
            "weight": 20,
            "max_score": 10,
            "scoring_guide": "1-3: Ignored or argued. 4-6: Acknowledged but weak response. 7-10: Skillfully addressed all concerns.",
            "order": 4
        },
        {
            "id": "closing",
            "name": "Closing & Next Steps",
            "description": "How well did the caller close and establish next steps?",
            "weight": 20,
            "max_score": 10,
            "scoring_guide": "1-3: No close attempt. 4-6: Weak close, unclear next steps. 7-10: Strong close, clear action items.",
            "order": 5
        }
    ]'::jsonb,
    100,
    'active',
    true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM scorecards s WHERE s.org_id = o.id AND s.is_default = true
);

-- Create default insight templates for existing orgs
INSERT INTO insight_templates (org_id, name, description, category, prompt_template, output_format, max_insights, is_default, display_order)
SELECT
    o.id,
    'Coaching Recommendations',
    'AI-generated coaching tips based on call performance',
    'coaching',
    'Based on the call analysis and scores, provide specific coaching recommendations for the sales representative. Focus on actionable improvements they can implement in their next call.',
    'bullets',
    5,
    true,
    1
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM insight_templates it WHERE it.org_id = o.id AND it.category = 'coaching' AND it.is_default = true
);

INSERT INTO insight_templates (org_id, name, description, category, prompt_template, output_format, max_insights, is_default, display_order)
SELECT
    o.id,
    'Performance Summary',
    'High-level summary of call performance',
    'performance',
    'Provide a brief executive summary of this sales call, highlighting key moments, overall effectiveness, and outcome assessment.',
    'text',
    1,
    true,
    2
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM insight_templates it WHERE it.org_id = o.id AND it.category = 'performance' AND it.is_default = true
);

INSERT INTO insight_templates (org_id, name, description, category, prompt_template, output_format, max_insights, is_default, display_order)
SELECT
    o.id,
    'Key Strengths',
    'Identify what went well in the call',
    'general',
    'Identify the top strengths demonstrated in this call. What did the representative do particularly well?',
    'bullets',
    3,
    true,
    3
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM insight_templates it WHERE it.org_id = o.id AND it.category = 'general' AND it.is_default = true
);

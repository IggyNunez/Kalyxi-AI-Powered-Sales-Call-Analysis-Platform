-- ============================================================================
-- Coaching Platform Schema Migration
-- ============================================================================
-- This migration adds tables for the customizable criteria & scorecard
-- coaching platform with:
-- - Hierarchical templates with criteria groups
-- - Multiple criteria types
-- - Manual scoring sessions linked to calls
-- - Google Calendar integration
-- - Enhanced analytics support
-- ============================================================================

-- ============================================================================
-- PREREQUISITE: Run this FIRST in a separate query before running this migration:
--
--   ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
--   ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coach';
--
-- PostgreSQL requires enum values to be committed before they can be used.
-- ============================================================================

-- ============================================================================
-- 1. TEMPLATES TABLE
-- ============================================================================
-- Enhanced scoring templates that replace/extend scorecards with richer config

CREATE TABLE IF NOT EXISTS templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,

    -- Scoring configuration
    scoring_method TEXT NOT NULL DEFAULT 'weighted'
        CHECK (scoring_method IN ('weighted', 'simple_average', 'pass_fail', 'points', 'custom_formula')),
    use_case TEXT NOT NULL DEFAULT 'sales_call'
        CHECK (use_case IN ('sales_call', 'onboarding', 'qa_review', 'training', 'custom')),

    -- Score settings
    pass_threshold NUMERIC(5,2) DEFAULT 70.00,
    max_total_score NUMERIC(10,2) DEFAULT 100.00,

    -- Advanced settings stored as JSONB
    settings JSONB DEFAULT '{
        "allow_na": true,
        "require_comments_below_threshold": false,
        "comments_threshold": 50,
        "auto_calculate": true,
        "show_weights_to_agents": true,
        "allow_partial_submission": false
    }'::JSONB,

    -- Status and versioning
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),
    version INTEGER NOT NULL DEFAULT 1,
    is_default BOOLEAN DEFAULT FALSE,

    -- Legacy reference (for migration from scorecards)
    legacy_scorecard_id UUID REFERENCES scorecards(id) ON DELETE SET NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_org_id ON templates(org_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_use_case ON templates(use_case);
CREATE INDEX IF NOT EXISTS idx_templates_is_default ON templates(org_id) WHERE is_default = TRUE;

-- ============================================================================
-- 2. CRITERIA GROUPS TABLE
-- ============================================================================
-- Sections/categories within templates for organizing criteria

CREATE TABLE IF NOT EXISTS criteria_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

    -- Group info
    name TEXT NOT NULL,
    description TEXT,

    -- Ordering and weight
    sort_order INTEGER NOT NULL DEFAULT 0,
    weight NUMERIC(5,2) DEFAULT 0, -- Group-level weight (optional)

    -- Settings
    is_required BOOLEAN DEFAULT TRUE,
    is_collapsed_by_default BOOLEAN DEFAULT FALSE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_criteria_groups_template_id ON criteria_groups(template_id);
CREATE INDEX IF NOT EXISTS idx_criteria_groups_sort_order ON criteria_groups(template_id, sort_order);

-- ============================================================================
-- 3. CRITERIA TABLE
-- ============================================================================
-- Individual scoring criteria items with type-specific configuration

CREATE TABLE IF NOT EXISTS criteria (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    group_id UUID REFERENCES criteria_groups(id) ON DELETE SET NULL,

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,

    -- Criteria type
    criteria_type TEXT NOT NULL DEFAULT 'scale'
        CHECK (criteria_type IN (
            'scale',        -- Numeric scale (e.g., 1-5, 1-10)
            'pass_fail',    -- Binary pass/fail
            'checklist',    -- Multiple checkbox items
            'text',         -- Free text response
            'dropdown',     -- Single select from options
            'multi_select', -- Multiple select from options
            'rating_stars', -- Star rating (1-5)
            'percentage'    -- 0-100% slider/input
        )),

    -- Type-specific configuration stored as JSONB
    -- Examples:
    -- scale: { "min": 1, "max": 5, "step": 1, "labels": {"1": "Poor", "5": "Excellent"} }
    -- pass_fail: { "pass_label": "Pass", "fail_label": "Fail", "pass_value": 100, "fail_value": 0 }
    -- checklist: { "items": [{"id": "a", "label": "Item A", "points": 10}], "scoring": "sum" }
    -- dropdown: { "options": [{"value": "a", "label": "Option A", "score": 10}] }
    -- rating_stars: { "max_stars": 5, "allow_half": true }
    -- percentage: { "thresholds": [{"value": 80, "label": "Good", "color": "green"}] }
    config JSONB DEFAULT '{}'::JSONB,

    -- Scoring
    weight NUMERIC(5,2) NOT NULL DEFAULT 0,
    max_score NUMERIC(10,2) DEFAULT 100,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Requirements
    is_required BOOLEAN DEFAULT TRUE,
    is_auto_fail BOOLEAN DEFAULT FALSE,
    auto_fail_threshold NUMERIC(5,2), -- Score below this triggers auto-fail

    -- AI scoring hints (for future AI-assisted scoring)
    scoring_guide TEXT,
    keywords TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_criteria_template_id ON criteria(template_id);
CREATE INDEX IF NOT EXISTS idx_criteria_group_id ON criteria(group_id);
CREATE INDEX IF NOT EXISTS idx_criteria_sort_order ON criteria(template_id, group_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_criteria_type ON criteria(criteria_type);

-- ============================================================================
-- 4. SESSIONS TABLE
-- ============================================================================
-- Scoring sessions linked to calls

CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,

    -- Link to call (optional - manual sessions may not have a call)
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

    -- Participants
    coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User doing the scoring
    agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User being scored

    -- Session status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',      -- Created but not started
            'in_progress',  -- Scoring in progress
            'completed',    -- Scoring finished
            'reviewed',     -- Manager has reviewed
            'disputed',     -- Agent disputed the score
            'cancelled'     -- Session cancelled
        )),

    -- Google Calendar integration
    google_event_id TEXT,
    google_event_title TEXT,
    google_event_start TIMESTAMPTZ,
    google_event_end TIMESTAMPTZ,
    google_calendar_link_id UUID, -- FK added after google_calendar_links table

    -- Scores (calculated)
    total_score NUMERIC(10,2),
    total_possible NUMERIC(10,2),
    percentage_score NUMERIC(5,2),
    pass_status TEXT CHECK (pass_status IN ('pass', 'fail', 'pending')),

    -- Auto-fail tracking
    has_auto_fail BOOLEAN DEFAULT FALSE,
    auto_fail_criteria_ids UUID[] DEFAULT ARRAY[]::UUID[],

    -- Notes
    coach_notes TEXT,
    agent_notes TEXT,

    -- Review workflow
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Dispute workflow
    disputed_at TIMESTAMPTZ,
    dispute_reason TEXT,
    dispute_resolved_at TIMESTAMPTZ,
    dispute_resolution TEXT,

    -- Template version snapshot (stores template state at time of scoring)
    template_version INTEGER,
    template_snapshot JSONB,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_org_id ON sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_sessions_template_id ON sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_sessions_call_id ON sessions(call_id);
CREATE INDEX IF NOT EXISTS idx_sessions_coach_id ON sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_google_event ON sessions(google_event_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON sessions(completed_at DESC);

-- ============================================================================
-- 5. SCORES TABLE
-- ============================================================================
-- Individual criterion scores per session

CREATE TABLE IF NOT EXISTS scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    criteria_id UUID NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
    criteria_group_id UUID REFERENCES criteria_groups(id) ON DELETE SET NULL,

    -- Score value (flexible JSONB to handle all criteria types)
    -- Examples:
    -- scale: { "value": 4 }
    -- pass_fail: { "passed": true }
    -- checklist: { "checked": ["item1", "item2"], "unchecked": ["item3"] }
    -- dropdown: { "selected": "option_a" }
    -- multi_select: { "selected": ["opt1", "opt2"] }
    -- rating_stars: { "stars": 4.5 }
    -- percentage: { "value": 85 }
    -- text: { "response": "Good communication skills..." }
    value JSONB NOT NULL DEFAULT '{}'::JSONB,

    -- Calculated scores
    raw_score NUMERIC(10,2),       -- Score before normalization
    normalized_score NUMERIC(5,2), -- Score as percentage (0-100)
    weighted_score NUMERIC(10,2),  -- Score after applying weight

    -- Special handling
    is_na BOOLEAN DEFAULT FALSE,   -- Marked as N/A
    is_auto_fail_triggered BOOLEAN DEFAULT FALSE,

    -- Feedback
    comment TEXT,

    -- Snapshot of criteria config at time of scoring
    criteria_snapshot JSONB,

    -- Audit
    scored_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    scored_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate scores per session/criteria
    UNIQUE(session_id, criteria_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scores_session_id ON scores(session_id);
CREATE INDEX IF NOT EXISTS idx_scores_criteria_id ON scores(criteria_id);
CREATE INDEX IF NOT EXISTS idx_scores_criteria_group_id ON scores(criteria_group_id);
CREATE INDEX IF NOT EXISTS idx_scores_is_auto_fail ON scores(session_id) WHERE is_auto_fail_triggered = TRUE;

-- ============================================================================
-- 6. GOOGLE CALENDAR LINKS TABLE
-- ============================================================================
-- Links between calendars and templates for auto-session creation

CREATE TABLE IF NOT EXISTS google_calendar_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

    -- Google Calendar info
    calendar_id TEXT NOT NULL,      -- Google Calendar ID
    calendar_name TEXT,             -- Display name
    google_account_email TEXT NOT NULL,

    -- OAuth tokens (encrypted like google_connections)
    access_token TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    refresh_token_iv TEXT NOT NULL,
    refresh_token_tag TEXT NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

    -- Event filtering
    event_filter JSONB DEFAULT '{
        "title_contains": [],
        "title_not_contains": [],
        "min_duration_minutes": 0,
        "max_duration_minutes": null,
        "require_attendees": false,
        "attendee_domains": [],
        "exclude_all_day": true,
        "exclude_recurring": false
    }'::JSONB,

    -- Sync settings
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_direction TEXT DEFAULT 'calendar_to_sessions'
        CHECK (sync_direction IN ('calendar_to_sessions', 'bidirectional')),
    auto_create_sessions BOOLEAN DEFAULT TRUE,

    -- Webhook for push notifications
    webhook_channel_id TEXT,
    webhook_resource_id TEXT,
    webhook_expiration TIMESTAMPTZ,

    -- Sync state
    last_sync_at TIMESTAMPTZ,
    last_sync_error TEXT,
    sync_cursor TEXT, -- For incremental sync

    -- User mapping (which attendee field maps to agent)
    agent_mapping JSONB DEFAULT '{
        "type": "attendee_email",
        "field": "email",
        "fallback_to_organizer": false
    }'::JSONB,

    -- Created by
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate calendar links per template
    UNIQUE(template_id, calendar_id)
);

-- Add FK to sessions table
ALTER TABLE sessions
    ADD CONSTRAINT fk_sessions_calendar_link
    FOREIGN KEY (google_calendar_link_id)
    REFERENCES google_calendar_links(id)
    ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_links_org_id ON google_calendar_links(org_id);
CREATE INDEX IF NOT EXISTS idx_calendar_links_template_id ON google_calendar_links(template_id);
CREATE INDEX IF NOT EXISTS idx_calendar_links_calendar_id ON google_calendar_links(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_links_sync_enabled ON google_calendar_links(sync_enabled) WHERE sync_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_calendar_links_webhook_exp ON google_calendar_links(webhook_expiration);

-- ============================================================================
-- 7. SESSION AUDIT LOG TABLE
-- ============================================================================
-- Detailed audit trail for session actions

CREATE TABLE IF NOT EXISTS session_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Action info
    action TEXT NOT NULL,
    -- Actions: created, started, score_updated, completed, reviewed,
    --          disputed, dispute_resolved, cancelled, reopened

    -- Details
    details JSONB DEFAULT '{}'::JSONB,
    -- Example: { "criteria_id": "...", "old_score": 3, "new_score": 4 }

    -- Request context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_audit_session_id ON session_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_session_audit_user_id ON session_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_session_audit_action ON session_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_session_audit_created_at ON session_audit_log(created_at DESC);

-- ============================================================================
-- 8. TEMPLATE VERSIONS TABLE
-- ============================================================================
-- Version snapshots for templates

CREATE TABLE IF NOT EXISTS template_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

    -- Version info
    version_number INTEGER NOT NULL,

    -- Full snapshot of template + groups + criteria
    snapshot JSONB NOT NULL,

    -- Change tracking
    change_summary TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique version per template
    UNIQUE(template_id, version_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_version ON template_versions(template_id, version_number DESC);

-- ============================================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Templates Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view templates in their org"
    ON templates FOR SELECT
    USING (org_id = user_org_id());

CREATE POLICY "Admins can create templates"
    ON templates FOR INSERT
    WITH CHECK (org_id = user_org_id() AND user_role() IN ('admin', 'manager'));

CREATE POLICY "Admins can update templates"
    ON templates FOR UPDATE
    USING (org_id = user_org_id() AND user_role() IN ('admin', 'manager'))
    WITH CHECK (org_id = user_org_id() AND user_role() IN ('admin', 'manager'));

CREATE POLICY "Admins can delete templates"
    ON templates FOR DELETE
    USING (org_id = user_org_id() AND user_role() IN ('admin', 'manager'));

CREATE POLICY "Service role full access to templates"
    ON templates FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- Criteria Groups Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view criteria groups via template"
    ON criteria_groups FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM templates t
        WHERE t.id = criteria_groups.template_id
        AND t.org_id = user_org_id()
    ));

CREATE POLICY "Admins can manage criteria groups"
    ON criteria_groups FOR ALL
    USING (EXISTS (
        SELECT 1 FROM templates t
        WHERE t.id = criteria_groups.template_id
        AND t.org_id = user_org_id()
        AND user_role() IN ('admin', 'manager')
    ));

CREATE POLICY "Service role full access to criteria groups"
    ON criteria_groups FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- Criteria Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view criteria via template"
    ON criteria FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM templates t
        WHERE t.id = criteria.template_id
        AND t.org_id = user_org_id()
    ));

CREATE POLICY "Admins can manage criteria"
    ON criteria FOR ALL
    USING (EXISTS (
        SELECT 1 FROM templates t
        WHERE t.id = criteria.template_id
        AND t.org_id = user_org_id()
        AND user_role() IN ('admin', 'manager')
    ));

CREATE POLICY "Service role full access to criteria"
    ON criteria FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- Sessions Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view sessions in their org"
    ON sessions FOR SELECT
    USING (org_id = user_org_id());

CREATE POLICY "Coaches and admins can create sessions"
    ON sessions FOR INSERT
    WITH CHECK (org_id = user_org_id() AND user_role() IN ('admin', 'manager', 'coach'));

CREATE POLICY "Session owners and admins can update sessions"
    ON sessions FOR UPDATE
    USING (
        org_id = user_org_id() AND (
            coach_id = auth.uid() OR
            user_role() IN ('admin', 'manager')
        )
    )
    WITH CHECK (org_id = user_org_id());

CREATE POLICY "Admins can delete sessions"
    ON sessions FOR DELETE
    USING (org_id = user_org_id() AND user_role() IN ('admin', 'manager'));

CREATE POLICY "Service role full access to sessions"
    ON sessions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- Scores Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view scores via session"
    ON scores FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = scores.session_id
        AND s.org_id = user_org_id()
    ));

CREATE POLICY "Coaches can manage scores for their sessions"
    ON scores FOR ALL
    USING (EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = scores.session_id
        AND s.org_id = user_org_id()
        AND (s.coach_id = auth.uid() OR user_role() IN ('admin', 'manager'))
    ));

CREATE POLICY "Service role full access to scores"
    ON scores FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- Google Calendar Links Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view calendar links in their org"
    ON google_calendar_links FOR SELECT
    USING (org_id = user_org_id());

CREATE POLICY "Admins can manage calendar links"
    ON google_calendar_links FOR ALL
    USING (org_id = user_org_id() AND user_role() IN ('admin', 'manager'));

CREATE POLICY "Service role full access to calendar links"
    ON google_calendar_links FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- Session Audit Log Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view audit logs via session"
    ON session_audit_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = session_audit_log.session_id
        AND s.org_id = user_org_id()
    ));

CREATE POLICY "System can insert audit logs"
    ON session_audit_log FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = session_audit_log.session_id
        AND s.org_id = user_org_id()
    ));

CREATE POLICY "Service role full access to audit logs"
    ON session_audit_log FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ----------------------------------------------------------------------------
-- Template Versions Policies
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can view template versions via template"
    ON template_versions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM templates t
        WHERE t.id = template_versions.template_id
        AND t.org_id = user_org_id()
    ));

CREATE POLICY "System can create template versions"
    ON template_versions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM templates t
        WHERE t.id = template_versions.template_id
        AND t.org_id = user_org_id()
        AND user_role() IN ('admin', 'manager')
    ));

CREATE POLICY "Service role full access to template versions"
    ON template_versions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 10. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_criteria_groups_updated_at
    BEFORE UPDATE ON criteria_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_criteria_updated_at
    BEFORE UPDATE ON criteria
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scores_updated_at
    BEFORE UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_links_updated_at
    BEFORE UPDATE ON google_calendar_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. HELPER FUNCTIONS
-- ============================================================================

-- Function to create a template version snapshot
CREATE OR REPLACE FUNCTION create_template_version(
    p_template_id UUID,
    p_change_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_version_id UUID;
    v_next_version INTEGER;
    v_snapshot JSONB;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
    FROM template_versions
    WHERE template_id = p_template_id;

    -- Build snapshot
    SELECT jsonb_build_object(
        'template', row_to_json(t.*),
        'groups', (
            SELECT COALESCE(jsonb_agg(row_to_json(g.*) ORDER BY g.sort_order), '[]'::jsonb)
            FROM criteria_groups g
            WHERE g.template_id = p_template_id
        ),
        'criteria', (
            SELECT COALESCE(jsonb_agg(row_to_json(c.*) ORDER BY c.sort_order), '[]'::jsonb)
            FROM criteria c
            WHERE c.template_id = p_template_id
        )
    ) INTO v_snapshot
    FROM templates t
    WHERE t.id = p_template_id;

    -- Insert version
    INSERT INTO template_versions (template_id, version_number, snapshot, change_summary, changed_by)
    VALUES (p_template_id, v_next_version, v_snapshot, p_change_summary, auth.uid())
    RETURNING id INTO v_version_id;

    -- Update template version
    UPDATE templates SET version = v_next_version WHERE id = p_template_id;

    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate session score
CREATE OR REPLACE FUNCTION calculate_session_score(p_session_id UUID)
RETURNS TABLE (
    total_score NUMERIC,
    total_possible NUMERIC,
    percentage_score NUMERIC,
    pass_status TEXT,
    has_auto_fail BOOLEAN,
    auto_fail_criteria_ids UUID[]
) AS $$
DECLARE
    v_template templates%ROWTYPE;
    v_scoring_method TEXT;
    v_pass_threshold NUMERIC;
BEGIN
    -- Get template info
    SELECT t.* INTO v_template
    FROM templates t
    JOIN sessions s ON s.template_id = t.id
    WHERE s.id = p_session_id;

    v_scoring_method := v_template.scoring_method;
    v_pass_threshold := v_template.pass_threshold;

    -- Calculate based on scoring method
    IF v_scoring_method = 'weighted' THEN
        RETURN QUERY
        SELECT
            COALESCE(SUM(sc.weighted_score), 0) AS total_score,
            COALESCE(SUM(c.max_score * c.weight / 100), 0) AS total_possible,
            CASE
                WHEN COALESCE(SUM(c.max_score * c.weight / 100), 0) > 0
                THEN ROUND(COALESCE(SUM(sc.weighted_score), 0) / COALESCE(SUM(c.max_score * c.weight / 100), 0) * 100, 2)
                ELSE 0
            END AS percentage_score,
            CASE
                WHEN EXISTS (SELECT 1 FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE)
                THEN 'fail'
                WHEN COALESCE(SUM(sc.weighted_score), 0) / NULLIF(COALESCE(SUM(c.max_score * c.weight / 100), 0), 0) * 100 >= v_pass_threshold
                THEN 'pass'
                ELSE 'fail'
            END AS pass_status,
            EXISTS (SELECT 1 FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE) AS has_auto_fail,
            ARRAY(SELECT criteria_id FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE) AS auto_fail_criteria_ids
        FROM scores sc
        JOIN criteria c ON c.id = sc.criteria_id
        WHERE sc.session_id = p_session_id
        AND sc.is_na = FALSE;

    ELSIF v_scoring_method = 'simple_average' THEN
        RETURN QUERY
        SELECT
            COALESCE(AVG(sc.normalized_score), 0) AS total_score,
            100::NUMERIC AS total_possible,
            COALESCE(AVG(sc.normalized_score), 0) AS percentage_score,
            CASE
                WHEN EXISTS (SELECT 1 FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE)
                THEN 'fail'
                WHEN COALESCE(AVG(sc.normalized_score), 0) >= v_pass_threshold
                THEN 'pass'
                ELSE 'fail'
            END AS pass_status,
            EXISTS (SELECT 1 FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE) AS has_auto_fail,
            ARRAY(SELECT criteria_id FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE) AS auto_fail_criteria_ids
        FROM scores sc
        WHERE sc.session_id = p_session_id
        AND sc.is_na = FALSE;

    ELSIF v_scoring_method = 'pass_fail' THEN
        RETURN QUERY
        SELECT
            CASE
                WHEN COUNT(*) FILTER (WHERE sc.normalized_score < 100) = 0 THEN 100::NUMERIC
                ELSE 0::NUMERIC
            END AS total_score,
            100::NUMERIC AS total_possible,
            CASE
                WHEN COUNT(*) FILTER (WHERE sc.normalized_score < 100) = 0 THEN 100::NUMERIC
                ELSE 0::NUMERIC
            END AS percentage_score,
            CASE
                WHEN EXISTS (SELECT 1 FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE)
                THEN 'fail'
                WHEN COUNT(*) FILTER (WHERE sc.normalized_score < 100) = 0
                THEN 'pass'
                ELSE 'fail'
            END AS pass_status,
            EXISTS (SELECT 1 FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE) AS has_auto_fail,
            ARRAY(SELECT criteria_id FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE) AS auto_fail_criteria_ids
        FROM scores sc
        WHERE sc.session_id = p_session_id
        AND sc.is_na = FALSE;

    ELSIF v_scoring_method = 'points' THEN
        RETURN QUERY
        SELECT
            COALESCE(SUM(sc.raw_score), 0) AS total_score,
            COALESCE(SUM(c.max_score), 0) AS total_possible,
            CASE
                WHEN COALESCE(SUM(c.max_score), 0) > 0
                THEN ROUND(COALESCE(SUM(sc.raw_score), 0) / COALESCE(SUM(c.max_score), 0) * 100, 2)
                ELSE 0
            END AS percentage_score,
            CASE
                WHEN EXISTS (SELECT 1 FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE)
                THEN 'fail'
                WHEN COALESCE(SUM(sc.raw_score), 0) / NULLIF(COALESCE(SUM(c.max_score), 0), 0) * 100 >= v_pass_threshold
                THEN 'pass'
                ELSE 'fail'
            END AS pass_status,
            EXISTS (SELECT 1 FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE) AS has_auto_fail,
            ARRAY(SELECT criteria_id FROM scores WHERE session_id = p_session_id AND is_auto_fail_triggered = TRUE) AS auto_fail_criteria_ids
        FROM scores sc
        JOIN criteria c ON c.id = sc.criteria_id
        WHERE sc.session_id = p_session_id
        AND sc.is_na = FALSE;

    ELSE
        -- Default fallback (weighted)
        RETURN QUERY
        SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 'pending'::TEXT, FALSE, ARRAY[]::UUID[];
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session scores
CREATE OR REPLACE FUNCTION update_session_scores()
RETURNS TRIGGER AS $$
DECLARE
    v_result RECORD;
BEGIN
    -- Calculate new scores
    SELECT * INTO v_result FROM calculate_session_score(NEW.session_id);

    -- Update session
    UPDATE sessions SET
        total_score = v_result.total_score,
        total_possible = v_result.total_possible,
        percentage_score = v_result.percentage_score,
        pass_status = v_result.pass_status,
        has_auto_fail = v_result.has_auto_fail,
        auto_fail_criteria_ids = v_result.auto_fail_criteria_ids
    WHERE id = NEW.session_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update session scores when scores change
CREATE TRIGGER trigger_update_session_scores
    AFTER INSERT OR UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION update_session_scores();

-- ============================================================================
-- 12. MIGRATION FUNCTION: CONVERT SCORECARDS TO TEMPLATES
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_scorecard_to_template(p_scorecard_id UUID)
RETURNS UUID AS $$
DECLARE
    v_scorecard scorecards%ROWTYPE;
    v_template_id UUID;
    v_default_group_id UUID;
    v_criterion JSONB;
    v_criteria_order INTEGER := 0;
BEGIN
    -- Get scorecard
    SELECT * INTO v_scorecard FROM scorecards WHERE id = p_scorecard_id;

    IF v_scorecard IS NULL THEN
        RAISE EXCEPTION 'Scorecard not found: %', p_scorecard_id;
    END IF;

    -- Create template
    INSERT INTO templates (
        org_id, name, description, scoring_method, status, is_default,
        legacy_scorecard_id, created_by, activated_at
    ) VALUES (
        v_scorecard.org_id,
        v_scorecard.name,
        v_scorecard.description,
        'weighted',
        v_scorecard.status,
        v_scorecard.is_default,
        v_scorecard.id,
        v_scorecard.created_by,
        v_scorecard.activated_at
    ) RETURNING id INTO v_template_id;

    -- Create default group
    INSERT INTO criteria_groups (template_id, name, description, sort_order)
    VALUES (v_template_id, 'General Criteria', 'Migrated from scorecard', 0)
    RETURNING id INTO v_default_group_id;

    -- Migrate criteria from JSONB array
    FOR v_criterion IN SELECT * FROM jsonb_array_elements(v_scorecard.criteria)
    LOOP
        INSERT INTO criteria (
            template_id, group_id, name, description, criteria_type,
            weight, max_score, sort_order, scoring_guide, keywords
        ) VALUES (
            v_template_id,
            v_default_group_id,
            v_criterion->>'name',
            v_criterion->>'description',
            'scale',
            (v_criterion->>'weight')::NUMERIC,
            (v_criterion->>'max_score')::NUMERIC,
            v_criteria_order,
            v_criterion->>'scoring_guide',
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_criterion->'keywords', '[]'::jsonb)))
        );
        v_criteria_order := v_criteria_order + 1;
    END LOOP;

    -- Create initial version snapshot
    PERFORM create_template_version(v_template_id, 'Migrated from scorecard');

    RETURN v_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Kalyxi AI Sales Call Analysis Platform
-- Initial Database Schema with Row Level Security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('caller', 'admin', 'superadmin');
CREATE TYPE call_status AS ENUM ('pending', 'processing', 'analyzed', 'failed');
CREATE TYPE call_source AS ENUM ('webhook', 'google_notes', 'manual', 'api');
CREATE TYPE grading_field_type AS ENUM ('score', 'text', 'checklist', 'boolean', 'percentage');
CREATE TYPE plan_type AS ENUM ('free', 'starter', 'professional', 'enterprise');
CREATE TYPE report_status AS ENUM ('generating', 'ready', 'failed');
CREATE TYPE queue_status AS ENUM ('queued', 'processing', 'completed', 'failed');

-- ============================================
-- CORE TABLES
-- ============================================

-- Organizations (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings_json JSONB DEFAULT '{}',
    plan plan_type DEFAULT 'free',
    webhook_secret VARCHAR(64) DEFAULT encode(gen_random_bytes(32), 'hex'),
    api_key_hash VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    role user_role DEFAULT 'caller',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Callers (Sales reps being evaluated)
CREATE TABLE callers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    team VARCHAR(100),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calls (Individual call records)
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES callers(id) ON DELETE CASCADE,
    raw_notes TEXT NOT NULL,
    source call_source DEFAULT 'manual',
    status call_status DEFAULT 'pending',
    external_id VARCHAR(255),
    customer_name VARCHAR(255),
    customer_company VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    duration INTEGER, -- in seconds
    recording_url VARCHAR(500),
    transcription TEXT,
    call_timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analyses (AI-generated analysis per call)
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    ai_model VARCHAR(50) NOT NULL,
    grading_results_json JSONB NOT NULL,
    overall_score DECIMAL(5,2),
    composite_score DECIMAL(5,2),
    processing_time_ms INTEGER,
    token_usage JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grading Templates (Configurable grading criteria)
CREATE TABLE grading_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria_json JSONB NOT NULL DEFAULT '[]',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scorecard Configs
CREATE TABLE scorecard_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    fields_json JSONB NOT NULL DEFAULT '[]',
    passing_threshold DECIMAL(5,2) DEFAULT 70.00,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    report_json JSONB NOT NULL,
    status report_status DEFAULT 'generating',
    pdf_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Logs
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    headers JSONB DEFAULT '{}',
    payload JSONB DEFAULT '{}',
    status_code INTEGER NOT NULL,
    response JSONB,
    error_message TEXT,
    processing_time_ms INTEGER,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'caller',
    token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing Queue
CREATE TABLE processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    status queue_status DEFAULT 'queued',
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys for organizations
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    scopes JSONB DEFAULT '["read", "write"]',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Limiting
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- IP, user_id, or api_key
    endpoint VARCHAR(255) NOT NULL,
    requests INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Users
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Callers
CREATE INDEX idx_callers_org_id ON callers(org_id);
CREATE INDEX idx_callers_user_id ON callers(user_id);
CREATE INDEX idx_callers_team ON callers(team);

-- Calls
CREATE INDEX idx_calls_org_id ON calls(org_id);
CREATE INDEX idx_calls_caller_id ON calls(caller_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_source ON calls(source);
CREATE INDEX idx_calls_call_timestamp ON calls(call_timestamp DESC);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);

-- Analyses
CREATE INDEX idx_analyses_call_id ON analyses(call_id);
CREATE INDEX idx_analyses_overall_score ON analyses(overall_score DESC);

-- Grading Templates
CREATE INDEX idx_grading_templates_org_id ON grading_templates(org_id);
CREATE INDEX idx_grading_templates_is_default ON grading_templates(org_id, is_default) WHERE is_default = TRUE;

-- Scorecard Configs
CREATE INDEX idx_scorecard_configs_org_id ON scorecard_configs(org_id);

-- Reports
CREATE INDEX idx_reports_call_id ON reports(call_id);
CREATE INDEX idx_reports_analysis_id ON reports(analysis_id);

-- Webhook Logs
CREATE INDEX idx_webhook_logs_org_id ON webhook_logs(org_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Invitations
CREATE INDEX idx_invitations_org_id ON invitations(org_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);

-- Audit Logs
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Processing Queue
CREATE INDEX idx_processing_queue_status ON processing_queue(status);
CREATE INDEX idx_processing_queue_scheduled ON processing_queue(scheduled_at) WHERE status = 'queued';

-- Rate Limits
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, endpoint);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE callers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's org_id
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID AS $$
    SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin')
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get caller_id for current user (if they are a caller)
CREATE OR REPLACE FUNCTION public.user_caller_id()
RETURNS UUID AS $$
    SELECT id FROM callers WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Organizations Policies
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (id = public.user_org_id() OR public.is_superadmin());

CREATE POLICY "Superadmins can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (public.is_superadmin());

CREATE POLICY "Admins can update their organization"
    ON organizations FOR UPDATE
    USING (id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

-- Users Policies
CREATE POLICY "Users can view users in their org"
    ON users FOR SELECT
    USING (org_id = public.user_org_id() OR public.is_superadmin());

CREATE POLICY "Admins can create users in their org"
    ON users FOR INSERT
    WITH CHECK (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

CREATE POLICY "Admins can update users in their org"
    ON users FOR UPDATE
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (id = auth.uid());

-- Callers Policies
CREATE POLICY "Users can view callers in their org"
    ON callers FOR SELECT
    USING (org_id = public.user_org_id() OR public.is_superadmin());

CREATE POLICY "Admins can manage callers"
    ON callers FOR ALL
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

-- Calls Policies
CREATE POLICY "Callers can view their own calls"
    ON calls FOR SELECT
    USING (
        (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'))
        OR (caller_id = public.user_caller_id())
        OR public.is_superadmin()
    );

CREATE POLICY "Admins can create calls"
    ON calls FOR INSERT
    WITH CHECK (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

CREATE POLICY "Admins can update calls"
    ON calls FOR UPDATE
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

CREATE POLICY "Admins can delete calls"
    ON calls FOR DELETE
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

-- Analyses Policies (via calls relationship)
CREATE POLICY "Users can view analyses for accessible calls"
    ON analyses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = analyses.call_id
            AND (
                (calls.org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'))
                OR calls.caller_id = public.user_caller_id()
                OR public.is_superadmin()
            )
        )
    );

CREATE POLICY "System can create analyses"
    ON analyses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = call_id
            AND calls.org_id = public.user_org_id()
        )
    );

-- Grading Templates Policies
CREATE POLICY "Users can view grading templates in their org"
    ON grading_templates FOR SELECT
    USING (org_id = public.user_org_id() OR public.is_superadmin());

CREATE POLICY "Admins can manage grading templates"
    ON grading_templates FOR ALL
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

-- Scorecard Configs Policies
CREATE POLICY "Users can view scorecard configs in their org"
    ON scorecard_configs FOR SELECT
    USING (org_id = public.user_org_id() OR public.is_superadmin());

CREATE POLICY "Admins can manage scorecard configs"
    ON scorecard_configs FOR ALL
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

-- Reports Policies
CREATE POLICY "Users can view reports for accessible calls"
    ON reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = reports.call_id
            AND (
                (calls.org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'))
                OR calls.caller_id = public.user_caller_id()
                OR public.is_superadmin()
            )
        )
    );

CREATE POLICY "System can manage reports"
    ON reports FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = call_id
            AND calls.org_id = public.user_org_id()
        )
    );

-- Webhook Logs Policies
CREATE POLICY "Admins can view webhook logs"
    ON webhook_logs FOR SELECT
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

-- Invitations Policies
CREATE POLICY "Admins can view invitations"
    ON invitations FOR SELECT
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

CREATE POLICY "Admins can create invitations"
    ON invitations FOR INSERT
    WITH CHECK (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

CREATE POLICY "Admins can delete invitations"
    ON invitations FOR DELETE
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

-- Audit Logs Policies
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

-- Processing Queue Policies
CREATE POLICY "Admins can view processing queue"
    ON processing_queue FOR SELECT
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

-- API Keys Policies
CREATE POLICY "Admins can manage API keys"
    ON api_keys FOR ALL
    USING (org_id = public.user_org_id() AND public.user_role() IN ('admin', 'superadmin'));

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Caller Statistics View
CREATE OR REPLACE VIEW caller_stats AS
SELECT
    c.id AS caller_id,
    c.name AS caller_name,
    c.org_id,
    COUNT(DISTINCT calls.id) AS total_calls,
    COALESCE(AVG(a.overall_score), 0) AS avg_score,
    COALESCE(MAX(a.overall_score), 0) AS highest_score,
    COALESCE(MIN(a.overall_score), 0) AS lowest_score,
    COUNT(DISTINCT CASE WHEN calls.call_timestamp >= NOW() - INTERVAL '7 days' THEN calls.id END) AS calls_this_week,
    COUNT(DISTINCT CASE WHEN calls.call_timestamp >= NOW() - INTERVAL '30 days' THEN calls.id END) AS calls_this_month,
    COALESCE(
        AVG(CASE WHEN calls.call_timestamp >= NOW() - INTERVAL '7 days' THEN a.overall_score END) -
        AVG(CASE WHEN calls.call_timestamp < NOW() - INTERVAL '7 days' AND calls.call_timestamp >= NOW() - INTERVAL '14 days' THEN a.overall_score END),
        0
    ) AS score_trend
FROM callers c
LEFT JOIN calls ON c.id = calls.caller_id
LEFT JOIN analyses a ON calls.id = a.call_id
GROUP BY c.id, c.name, c.org_id;

-- Organization Analytics View
CREATE OR REPLACE VIEW org_analytics AS
SELECT
    o.id AS org_id,
    COUNT(DISTINCT calls.id) AS total_calls,
    COUNT(DISTINCT c.id) AS total_callers,
    COALESCE(AVG(a.overall_score), 0) AS avg_score,
    (
        SELECT caller_id FROM caller_stats cs
        WHERE cs.org_id = o.id
        ORDER BY avg_score DESC LIMIT 1
    ) AS top_performer_id,
    (
        SELECT caller_name FROM caller_stats cs
        WHERE cs.org_id = o.id
        ORDER BY avg_score DESC LIMIT 1
    ) AS top_performer_name,
    COUNT(DISTINCT CASE WHEN calls.call_timestamp >= CURRENT_DATE THEN calls.id END) AS calls_today,
    COUNT(DISTINCT CASE WHEN calls.call_timestamp >= NOW() - INTERVAL '7 days' THEN calls.id END) AS calls_this_week
FROM organizations o
LEFT JOIN callers c ON o.id = c.org_id
LEFT JOIN calls ON c.id = calls.caller_id
LEFT JOIN analyses a ON calls.id = a.call_id
GROUP BY o.id;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get caller rankings
CREATE OR REPLACE FUNCTION get_caller_ranking(p_org_id UUID, p_period VARCHAR DEFAULT 'month')
RETURNS TABLE (
    caller_id UUID,
    caller_name VARCHAR,
    avg_score DECIMAL,
    total_calls BIGINT,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        COALESCE(AVG(a.overall_score), 0)::DECIMAL AS avg_score,
        COUNT(calls.id) AS total_calls,
        ROW_NUMBER() OVER (ORDER BY COALESCE(AVG(a.overall_score), 0) DESC) AS rank
    FROM callers c
    LEFT JOIN calls ON c.id = calls.caller_id
        AND calls.call_timestamp >= CASE
            WHEN p_period = 'week' THEN NOW() - INTERVAL '7 days'
            WHEN p_period = 'month' THEN NOW() - INTERVAL '30 days'
            WHEN p_period = 'quarter' THEN NOW() - INTERVAL '90 days'
            ELSE NOW() - INTERVAL '30 days'
        END
    LEFT JOIN analyses a ON calls.id = a.call_id
    WHERE c.org_id = p_org_id AND c.is_active = TRUE
    GROUP BY c.id, c.name
    ORDER BY avg_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER callers_updated_at BEFORE UPDATE ON callers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER grading_templates_updated_at BEFORE UPDATE ON grading_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scorecard_configs_updated_at BEFORE UPDATE ON scorecard_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Ensure only one default grading template per org
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE grading_templates
        SET is_default = FALSE
        WHERE org_id = NEW.org_id AND id != NEW.id AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grading_templates_single_default
    BEFORE INSERT OR UPDATE ON grading_templates
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_template();

-- Ensure only one default scorecard config per org
CREATE OR REPLACE FUNCTION ensure_single_default_scorecard()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE scorecard_configs
        SET is_default = FALSE
        WHERE org_id = NEW.org_id AND id != NEW.id AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scorecard_configs_single_default
    BEFORE INSERT OR UPDATE ON scorecard_configs
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_scorecard();

-- Auto-queue calls for processing
CREATE OR REPLACE FUNCTION auto_queue_call()
RETURNS TRIGGER AS $$
DECLARE
    org_settings JSONB;
BEGIN
    -- Get org settings
    SELECT settings_json INTO org_settings FROM organizations WHERE id = NEW.org_id;

    -- If auto_analyze is enabled, queue the call
    IF (org_settings->'features'->>'autoAnalyze')::boolean = TRUE THEN
        INSERT INTO processing_queue (org_id, call_id, status, priority)
        VALUES (NEW.org_id, NEW.id, 'queued', 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calls_auto_queue
    AFTER INSERT ON calls
    FOR EACH ROW EXECUTE FUNCTION auto_queue_call();

-- ============================================
-- SEED DATA FOR DEFAULT GRADING TEMPLATE
-- ============================================

-- This will be inserted when an organization is created
CREATE OR REPLACE FUNCTION create_default_grading_template()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO grading_templates (org_id, name, description, criteria_json, is_default, is_active)
    VALUES (
        NEW.id,
        'Default Sales Call Grading',
        'Standard grading criteria for sales calls',
        '[
            {
                "id": "strengths",
                "name": "Strengths",
                "description": "Key positive behaviors demonstrated",
                "type": "text",
                "weight": 10,
                "isRequired": true,
                "order": 1
            },
            {
                "id": "improvements",
                "name": "Areas for Improvement",
                "description": "Identified coaching opportunities",
                "type": "text",
                "weight": 10,
                "isRequired": true,
                "order": 2
            },
            {
                "id": "script_used",
                "name": "Script Elements Used",
                "description": "Checklist of script items followed",
                "type": "checklist",
                "weight": 15,
                "isRequired": true,
                "order": 3,
                "options": ["Introduction", "Value Proposition", "Discovery Questions", "Handling Objections", "Close Attempt"]
            },
            {
                "id": "objection_handling",
                "name": "Objection Handling",
                "description": "Quality of response to objections",
                "type": "score",
                "weight": 15,
                "isRequired": true,
                "order": 4,
                "minValue": 1,
                "maxValue": 10
            },
            {
                "id": "empathetic_tone",
                "name": "Empathetic Tone",
                "description": "Warmth, understanding, rapport building",
                "type": "score",
                "weight": 10,
                "isRequired": true,
                "order": 5,
                "minValue": 1,
                "maxValue": 10
            },
            {
                "id": "clear_identification",
                "name": "Clear Identification",
                "description": "Caller properly identified self and purpose",
                "type": "score",
                "weight": 10,
                "isRequired": true,
                "order": 6,
                "minValue": 1,
                "maxValue": 10
            },
            {
                "id": "value_proposition",
                "name": "Value Proposition",
                "description": "Effectiveness of value communication",
                "type": "score",
                "weight": 15,
                "isRequired": true,
                "order": 7,
                "minValue": 1,
                "maxValue": 10
            },
            {
                "id": "appointment_setting",
                "name": "Appointment Setting",
                "description": "Success in booking next steps",
                "type": "boolean",
                "weight": 10,
                "isRequired": true,
                "order": 8
            },
            {
                "id": "action_items",
                "name": "Immediate Action Items",
                "description": "Follow-up tasks identified",
                "type": "text",
                "weight": 5,
                "isRequired": false,
                "order": 9
            }
        ]'::JSONB,
        TRUE,
        TRUE
    );

    -- Create default scorecard config
    INSERT INTO scorecard_configs (org_id, name, fields_json, passing_threshold, is_default, is_active)
    VALUES (
        NEW.id,
        'Default Scorecard',
        '[
            {
                "id": "overall_performance",
                "name": "Overall Performance",
                "weight": 30,
                "scoringMethod": "weighted",
                "passingThreshold": 70,
                "linkedCriteria": ["objection_handling", "value_proposition", "empathetic_tone"]
            },
            {
                "id": "script_adherence",
                "name": "Script Adherence",
                "weight": 25,
                "scoringMethod": "average",
                "passingThreshold": 60,
                "linkedCriteria": ["script_used", "clear_identification"]
            },
            {
                "id": "outcome",
                "name": "Call Outcome",
                "weight": 25,
                "scoringMethod": "sum",
                "passingThreshold": 50,
                "linkedCriteria": ["appointment_setting"]
            },
            {
                "id": "professionalism",
                "name": "Professionalism",
                "weight": 20,
                "scoringMethod": "average",
                "passingThreshold": 70,
                "linkedCriteria": ["empathetic_tone", "clear_identification"]
            }
        ]'::JSONB,
        70.00,
        TRUE,
        TRUE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_create_defaults
    AFTER INSERT ON organizations
    FOR EACH ROW EXECUTE FUNCTION create_default_grading_template();

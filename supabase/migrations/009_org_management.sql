-- ============================================================================
-- Migration 009: Organization Management & Billing
-- ============================================================================
-- Adds:
-- - Plan/billing fields to organizations
-- - Plan limits JSONB structure
-- - Usage tracking
-- - Cross-org analytics indexes
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATION PLAN & BILLING FIELDS
-- ============================================================================

-- Plan tier (free, starter, professional, enterprise)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'
    CHECK (plan IN ('free', 'starter', 'professional', 'enterprise'));

-- Plan limits stored as JSONB for flexibility
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_limits JSONB DEFAULT '{
    "max_users": 5,
    "max_calls_per_month": 100,
    "max_templates": 3,
    "max_sessions_per_month": 50,
    "ai_analysis_enabled": false,
    "calendar_sync_enabled": false,
    "export_enabled": false,
    "custom_branding_enabled": false,
    "api_access_enabled": false,
    "sso_enabled": false
}'::JSONB;

-- Billing contact email
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- Stripe integration
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Subscription status
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', 'paused'));

-- Trial tracking
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Usage tracking period
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month');

-- ============================================================================
-- 2. USAGE TRACKING TABLE
-- ============================================================================
-- Track monthly usage for plan limit enforcement

CREATE TABLE IF NOT EXISTS org_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Period tracking
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Usage counters
    calls_count INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    ai_analyses_count INTEGER DEFAULT 0,
    storage_bytes_used BIGINT DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One usage record per org per period
    UNIQUE(org_id, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_usage_org_id ON org_usage(org_id);
CREATE INDEX IF NOT EXISTS idx_org_usage_period ON org_usage(org_id, period_start, period_end);

-- ============================================================================
-- 3. PLAN DEFINITIONS (for reference/validation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10,2),
    price_yearly NUMERIC(10,2),
    limits JSONB NOT NULL,
    features JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plan definitions
INSERT INTO plan_definitions (id, name, description, price_monthly, price_yearly, limits, features, sort_order)
VALUES
    ('free', 'Free', 'For individuals getting started', 0, 0, '{
        "max_users": 5,
        "max_calls_per_month": 100,
        "max_templates": 3,
        "max_sessions_per_month": 50,
        "ai_analysis_enabled": false,
        "calendar_sync_enabled": false,
        "export_enabled": false,
        "custom_branding_enabled": false,
        "api_access_enabled": false,
        "sso_enabled": false
    }', '["Basic call tracking", "Manual scoring", "Basic reports"]', 0),

    ('starter', 'Starter', 'For small teams', 29, 290, '{
        "max_users": 15,
        "max_calls_per_month": 500,
        "max_templates": 10,
        "max_sessions_per_month": 200,
        "ai_analysis_enabled": true,
        "calendar_sync_enabled": true,
        "export_enabled": true,
        "custom_branding_enabled": false,
        "api_access_enabled": false,
        "sso_enabled": false
    }', '["AI call analysis", "Calendar sync", "CSV export", "Priority support"]', 1),

    ('professional', 'Professional', 'For growing teams', 99, 990, '{
        "max_users": 50,
        "max_calls_per_month": 2000,
        "max_templates": -1,
        "max_sessions_per_month": -1,
        "ai_analysis_enabled": true,
        "calendar_sync_enabled": true,
        "export_enabled": true,
        "custom_branding_enabled": true,
        "api_access_enabled": true,
        "sso_enabled": false
    }', '["Unlimited templates", "Unlimited sessions", "Custom branding", "API access", "Advanced analytics"]', 2),

    ('enterprise', 'Enterprise', 'For large organizations', 299, 2990, '{
        "max_users": -1,
        "max_calls_per_month": -1,
        "max_templates": -1,
        "max_sessions_per_month": -1,
        "ai_analysis_enabled": true,
        "calendar_sync_enabled": true,
        "export_enabled": true,
        "custom_branding_enabled": true,
        "api_access_enabled": true,
        "sso_enabled": true
    }', '["Unlimited everything", "SSO/SAML", "Dedicated support", "Custom integrations", "SLA guarantee"]', 3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    limits = EXCLUDED.limits,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================================================
-- 4. INDEXES FOR CROSS-ORG ANALYTICS
-- ============================================================================

-- Index for quick org user counts
CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(org_id, role);

-- Index for session analytics
CREATE INDEX IF NOT EXISTS idx_sessions_org_completed ON sessions(org_id, status, completed_at);
CREATE INDEX IF NOT EXISTS idx_sessions_org_created ON sessions(org_id, created_at);

-- Index for score analytics
CREATE INDEX IF NOT EXISTS idx_scores_session_scored ON scores(session_id, scored_at);

-- Index for call analytics
CREATE INDEX IF NOT EXISTS idx_calls_org_timestamp ON calls(org_id, call_timestamp);

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE org_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_definitions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view org usage" ON org_usage;
DROP POLICY IF EXISTS "Superadmins can view all usage" ON org_usage;
DROP POLICY IF EXISTS "Service role full access to org_usage" ON org_usage;
DROP POLICY IF EXISTS "Anyone can view plan definitions" ON plan_definitions;
DROP POLICY IF EXISTS "Service role full access to plan_definitions" ON plan_definitions;

-- Usage: admins can view their org's usage
CREATE POLICY "Admins can view org usage"
    ON org_usage FOR SELECT
    USING (org_id = user_org_id() AND user_role() IN ('admin', 'superadmin'));

-- Superadmins can view all usage
CREATE POLICY "Superadmins can view all usage"
    ON org_usage FOR SELECT
    USING (user_role() = 'superadmin');

-- Service role full access
CREATE POLICY "Service role full access to org_usage"
    ON org_usage FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Plan definitions: everyone can read
CREATE POLICY "Anyone can view plan definitions"
    ON plan_definitions FOR SELECT
    USING (true);

-- Service role can manage plan definitions
CREATE POLICY "Service role full access to plan_definitions"
    ON plan_definitions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Get current org usage for a specific metric
CREATE OR REPLACE FUNCTION get_current_usage(
    p_org_id UUID,
    p_metric TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_usage INTEGER := 0;
    v_period_start DATE;
BEGIN
    -- Get current period start
    SELECT current_period_start::DATE INTO v_period_start
    FROM organizations
    WHERE id = p_org_id;

    IF v_period_start IS NULL THEN
        v_period_start := DATE_TRUNC('month', NOW())::DATE;
    END IF;

    -- Get usage for metric
    EXECUTE format(
        'SELECT COALESCE(%I, 0) FROM org_usage WHERE org_id = $1 AND period_start = $2',
        p_metric
    ) INTO v_usage USING p_org_id, v_period_start;

    RETURN COALESCE(v_usage, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if org is within plan limits
CREATE OR REPLACE FUNCTION check_plan_limit(
    p_org_id UUID,
    p_limit_name TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_plan_limits JSONB;
    v_limit INTEGER;
    v_current_usage INTEGER;
BEGIN
    -- Get plan limits
    SELECT plan_limits INTO v_plan_limits
    FROM organizations
    WHERE id = p_org_id;

    -- Get specific limit (-1 means unlimited)
    v_limit := (v_plan_limits->>p_limit_name)::INTEGER;

    IF v_limit = -1 THEN
        RETURN jsonb_build_object('allowed', true, 'limit', -1, 'current', 0);
    END IF;

    -- Get current usage
    v_current_usage := get_current_usage(p_org_id, p_limit_name || '_count');

    IF v_current_usage + p_increment <= v_limit THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'limit', v_limit,
            'current', v_current_usage,
            'remaining', v_limit - v_current_usage
        );
    ELSE
        RETURN jsonb_build_object(
            'allowed', false,
            'limit', v_limit,
            'current', v_current_usage,
            'remaining', GREATEST(0, v_limit - v_current_usage),
            'error', format('Plan limit exceeded: %s', p_limit_name)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(
    p_org_id UUID,
    p_metric TEXT,
    p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    -- Get current period
    SELECT current_period_start::DATE, current_period_end::DATE
    INTO v_period_start, v_period_end
    FROM organizations
    WHERE id = p_org_id;

    IF v_period_start IS NULL THEN
        v_period_start := DATE_TRUNC('month', NOW())::DATE;
        v_period_end := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::DATE;
    END IF;

    -- Upsert usage record
    INSERT INTO org_usage (org_id, period_start, period_end)
    VALUES (p_org_id, v_period_start, v_period_end)
    ON CONFLICT (org_id, period_start) DO NOTHING;

    -- Increment counter
    EXECUTE format(
        'UPDATE org_usage SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE org_id = $2 AND period_start = $3',
        p_metric, p_metric
    ) USING p_amount, p_org_id, v_period_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get organization stats for superadmin dashboard
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    -- Only superadmins can call this
    IF user_role()::TEXT != 'superadmin' THEN
        RAISE EXCEPTION 'Unauthorized: superadmin access required';
    END IF;

    SELECT jsonb_build_object(
        'total_orgs', (SELECT COUNT(*) FROM organizations),
        'total_users', (SELECT COUNT(*) FROM users),
        'active_users', (SELECT COUNT(*) FROM users WHERE is_active = true),
        'total_sessions', (SELECT COUNT(*) FROM sessions),
        'total_calls', (SELECT COUNT(*) FROM calls),
        'orgs_by_plan', (
            SELECT jsonb_object_agg(plan, count)
            FROM (SELECT plan, COUNT(*) as count FROM organizations GROUP BY plan) t
        ),
        'new_orgs_this_month', (
            SELECT COUNT(*) FROM organizations
            WHERE created_at >= DATE_TRUNC('month', NOW())
        ),
        'new_users_this_month', (
            SELECT COUNT(*) FROM users
            WHERE created_at >= DATE_TRUNC('month', NOW())
        )
    ) INTO v_stats;

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 7. TRIGGERS FOR USAGE TRACKING
-- ============================================================================

-- Auto-increment calls_count when a call is created
CREATE OR REPLACE FUNCTION track_call_usage()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM increment_usage(NEW.org_id, 'calls_count', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_track_call_usage ON calls;
CREATE TRIGGER trigger_track_call_usage
    AFTER INSERT ON calls
    FOR EACH ROW
    EXECUTE FUNCTION track_call_usage();

-- Auto-increment sessions_count when a session is created
CREATE OR REPLACE FUNCTION track_session_usage()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM increment_usage(NEW.org_id, 'sessions_count', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_track_session_usage ON sessions;
CREATE TRIGGER trigger_track_session_usage
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION track_session_usage();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

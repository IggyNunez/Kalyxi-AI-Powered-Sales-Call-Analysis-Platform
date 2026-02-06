-- WARNING: This script will DROP all Kalyxi tables and types
-- Only use this for development/testing - NEVER in production!

-- Use a DO block to handle errors gracefully
DO $$
BEGIN
    -- Drop triggers (wrapped in exception handlers)
    BEGIN DROP TRIGGER IF EXISTS organizations_create_defaults ON organizations; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS scorecard_configs_single_default ON scorecard_configs; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS grading_templates_single_default ON grading_templates; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS calls_auto_queue ON calls; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS reports_updated_at ON reports; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS scorecard_configs_updated_at ON scorecard_configs; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS grading_templates_updated_at ON grading_templates; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS calls_updated_at ON calls; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS callers_updated_at ON callers; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS users_updated_at ON users; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS organizations_updated_at ON organizations; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS update_scripts_updated_at ON scripts; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS update_scorecards_updated_at ON scorecards; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS update_insight_templates_updated_at ON insight_templates; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS update_call_score_results_updated_at ON call_score_results; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS update_criteria_optimizations_updated_at ON criteria_optimizations; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS create_default_scorecard_on_org_insert ON organizations; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DROP TRIGGER IF EXISTS create_default_insight_templates_on_org_insert ON organizations; EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- Drop views
DROP VIEW IF EXISTS org_analytics CASCADE;
DROP VIEW IF EXISTS caller_stats CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS create_default_grading_template() CASCADE;
DROP FUNCTION IF EXISTS auto_queue_call() CASCADE;
DROP FUNCTION IF EXISTS ensure_single_default_scorecard() CASCADE;
DROP FUNCTION IF EXISTS ensure_single_default_template() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS cleanup_rate_limits() CASCADE;
DROP FUNCTION IF EXISTS get_caller_ranking(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.user_caller_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_superadmin() CASCADE;
DROP FUNCTION IF EXISTS public.user_role() CASCADE;
DROP FUNCTION IF EXISTS public.user_org_id() CASCADE;
DROP FUNCTION IF EXISTS create_default_scorecard_for_org() CASCADE;
DROP FUNCTION IF EXISTS create_default_insight_templates_for_org() CASCADE;

-- Drop tables (CASCADE handles dependencies automatically)
DROP TABLE IF EXISTS criteria_optimizations CASCADE;
DROP TABLE IF EXISTS call_score_results CASCADE;
DROP TABLE IF EXISTS insight_templates CASCADE;
DROP TABLE IF EXISTS scorecards CASCADE;
DROP TABLE IF EXISTS scripts CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS processing_queue CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS scorecard_configs CASCADE;
DROP TABLE IF EXISTS grading_templates CASCADE;
DROP TABLE IF EXISTS analyses CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS callers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop types
DROP TYPE IF EXISTS queue_status CASCADE;
DROP TYPE IF EXISTS report_status CASCADE;
DROP TYPE IF EXISTS plan_type CASCADE;
DROP TYPE IF EXISTS grading_field_type CASCADE;
DROP TYPE IF EXISTS call_source CASCADE;
DROP TYPE IF EXISTS call_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE 'Schema reset complete. You can now run the migrations in order.';
END $$;

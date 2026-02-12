-- ============================================================================
-- Migration 007: Simplify Role System
-- ============================================================================
-- Consolidates 5 roles (caller, admin, superadmin, manager, coach) to 3 roles:
-- - superadmin: Full platform access (cross-org)
-- - admin: Full org access (single org)
-- - user: Basic access (own data only)
-- ============================================================================

-- ============================================================================
-- IMPORTANT: Run this command FIRST in a separate query before running this migration:
--
--   ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'user';
--
-- PostgreSQL requires enum values to be committed before they can be used.
-- ============================================================================

-- ============================================================================
-- 1. UPDATE EXISTING USER ROLES
-- ============================================================================
-- Map old roles to new roles:
-- manager, coach -> admin (they had elevated org access)
-- caller -> user (basic access)

-- Note: 'user' enum value must be added first (see above)
UPDATE users SET role = 'admin' WHERE role IN ('manager', 'coach');
UPDATE users SET role = 'user' WHERE role = 'caller';

-- ============================================================================
-- 2. UPDATE RLS POLICIES FOR NEW ROLES
-- ============================================================================
-- Drop and recreate policies that reference old roles

-- Templates policies
DROP POLICY IF EXISTS "Admins can create templates" ON templates;
DROP POLICY IF EXISTS "Admins can update templates" ON templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON templates;

CREATE POLICY "Admins can create templates"
    ON templates FOR INSERT
    WITH CHECK (org_id = user_org_id() AND user_role() IN ('admin', 'superadmin'));

CREATE POLICY "Admins can update templates"
    ON templates FOR UPDATE
    USING (org_id = user_org_id() AND user_role() IN ('admin', 'superadmin'))
    WITH CHECK (org_id = user_org_id() AND user_role() IN ('admin', 'superadmin'));

CREATE POLICY "Admins can delete templates"
    ON templates FOR DELETE
    USING (org_id = user_org_id() AND user_role() IN ('admin', 'superadmin'));

-- Criteria groups policies
DROP POLICY IF EXISTS "Admins can manage criteria groups" ON criteria_groups;

CREATE POLICY "Admins can manage criteria groups"
    ON criteria_groups FOR ALL
    USING (EXISTS (
        SELECT 1 FROM templates t
        WHERE t.id = criteria_groups.template_id
        AND t.org_id = user_org_id()
        AND user_role() IN ('admin', 'superadmin')
    ));

-- Criteria policies
DROP POLICY IF EXISTS "Admins can manage criteria" ON criteria;

CREATE POLICY "Admins can manage criteria"
    ON criteria FOR ALL
    USING (EXISTS (
        SELECT 1 FROM templates t
        WHERE t.id = criteria.template_id
        AND t.org_id = user_org_id()
        AND user_role() IN ('admin', 'superadmin')
    ));

-- Sessions policies
DROP POLICY IF EXISTS "Coaches and admins can create sessions" ON sessions;
DROP POLICY IF EXISTS "Session owners and admins can update sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON sessions;

CREATE POLICY "Admins can create sessions"
    ON sessions FOR INSERT
    WITH CHECK (org_id = user_org_id() AND user_role() IN ('admin', 'superadmin'));

CREATE POLICY "Session owners and admins can update sessions"
    ON sessions FOR UPDATE
    USING (
        org_id = user_org_id() AND (
            coach_id = auth.uid() OR
            user_role() IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (org_id = user_org_id());

CREATE POLICY "Admins can delete sessions"
    ON sessions FOR DELETE
    USING (org_id = user_org_id() AND user_role() IN ('admin', 'superadmin'));

-- Scores policies
DROP POLICY IF EXISTS "Coaches can manage scores for their sessions" ON scores;

CREATE POLICY "Admins can manage scores for their sessions"
    ON scores FOR ALL
    USING (EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = scores.session_id
        AND s.org_id = user_org_id()
        AND (s.coach_id = auth.uid() OR user_role() IN ('admin', 'superadmin'))
    ));

-- Google Calendar Links policies
DROP POLICY IF EXISTS "Admins can manage calendar links" ON google_calendar_links;

CREATE POLICY "Admins can manage calendar links"
    ON google_calendar_links FOR ALL
    USING (org_id = user_org_id() AND user_role() IN ('admin', 'superadmin'));

-- Template versions policies
DROP POLICY IF EXISTS "System can create template versions" ON template_versions;

CREATE POLICY "Admins can create template versions"
    ON template_versions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM templates t
        WHERE t.id = template_versions.template_id
        AND t.org_id = user_org_id()
        AND user_role() IN ('admin', 'superadmin')
    ));

-- ============================================================================
-- 3. ADD SUPERADMIN CROSS-ORG POLICIES
-- ============================================================================
-- Superadmins can access data across all organizations

CREATE POLICY "Superadmins can view all templates"
    ON templates FOR SELECT
    USING (user_role() = 'superadmin');

CREATE POLICY "Superadmins can view all sessions"
    ON sessions FOR SELECT
    USING (user_role() = 'superadmin');

CREATE POLICY "Superadmins can view all users"
    ON users FOR SELECT
    USING (user_role() = 'superadmin');

CREATE POLICY "Superadmins can view all organizations"
    ON organizations FOR SELECT
    USING (user_role() = 'superadmin');

-- ============================================================================
-- 4. user_role() FUNCTION
-- ============================================================================
-- The existing user_role() function already returns the role from users table.
-- No changes needed - enum values work with string comparisons.

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- ============================================================================
-- Migration 008: Authentication Enhancements
-- ============================================================================
-- Adds:
-- - User invitations system (enhances existing table if present)
-- - User suspension tracking
-- - Two-factor authentication (TOTP)
-- ============================================================================

-- ============================================================================
-- 1. INVITATIONS TABLE
-- ============================================================================
-- Create if not exists, or ensure all columns are present

CREATE TABLE IF NOT EXISTS invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add any missing columns to existing invitations table
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Update role constraint to use new simplified roles
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('admin', 'user'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

-- ============================================================================
-- 2. USER SUSPENSION TRACKING
-- ============================================================================
-- Add suspension columns to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Index for checking suspended users
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(suspended_at) WHERE suspended_at IS NOT NULL;

-- ============================================================================
-- 3. TWO-FACTOR AUTHENTICATION
-- ============================================================================
-- Add TOTP columns to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_codes JSONB;

-- Index for 2FA enabled users
CREATE INDEX IF NOT EXISTS idx_users_totp_enabled ON users(id) WHERE totp_enabled = TRUE;

-- ============================================================================
-- 4. OAUTH PROVIDER TRACKING
-- ============================================================================
-- Track which OAuth providers a user has linked

ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_providers JSONB DEFAULT '[]'::JSONB;

-- ============================================================================
-- 5. ROW LEVEL SECURITY FOR INVITATIONS
-- ============================================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can manage org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can update org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete org invitations" ON invitations;
DROP POLICY IF EXISTS "Service role full access to invitations" ON invitations;
DROP POLICY IF EXISTS "Anyone can validate invitation tokens" ON invitations;

-- Admins can view invitations for their org
CREATE POLICY "Admins can view org invitations"
    ON invitations FOR SELECT
    USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

-- Admins can create invitations for their org
CREATE POLICY "Admins can create org invitations"
    ON invitations FOR INSERT
    WITH CHECK (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

-- Admins can update invitations (e.g., mark as accepted)
CREATE POLICY "Admins can update org invitations"
    ON invitations FOR UPDATE
    USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

-- Admins can delete invitations
CREATE POLICY "Admins can delete org invitations"
    ON invitations FOR DELETE
    USING (
        org_id = user_org_id() AND user_role() IN ('admin', 'superadmin')
    );

-- Service role full access
CREATE POLICY "Service role full access to invitations"
    ON invitations FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Public can validate invitation tokens (for accepting invites)
CREATE POLICY "Anyone can validate invitation tokens"
    ON invitations FOR SELECT
    USING (
        token IS NOT NULL AND expires_at > NOW() AND accepted_at IS NULL
    );

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is suspended
CREATE OR REPLACE FUNCTION is_user_suspended(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = p_user_id
        AND suspended_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to suspend a user
CREATE OR REPLACE FUNCTION suspend_user(
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_admin_role TEXT;
BEGIN
    -- Check if caller is admin
    SELECT role::TEXT INTO v_admin_role FROM users WHERE id = v_admin_id;

    IF v_admin_role NOT IN ('admin', 'superadmin') THEN
        RAISE EXCEPTION 'Only admins can suspend users';
    END IF;

    -- Cannot suspend yourself
    IF p_user_id = v_admin_id THEN
        RAISE EXCEPTION 'Cannot suspend yourself';
    END IF;

    -- Update user
    UPDATE users
    SET
        suspended_at = NOW(),
        suspended_by = v_admin_id,
        suspension_reason = p_reason
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsuspend a user
CREATE OR REPLACE FUNCTION unsuspend_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_admin_role TEXT;
BEGIN
    -- Check if caller is admin
    SELECT role::TEXT INTO v_admin_role FROM users WHERE id = v_admin_id;

    IF v_admin_role NOT IN ('admin', 'superadmin') THEN
        RAISE EXCEPTION 'Only admins can unsuspend users';
    END IF;

    -- Update user
    UPDATE users
    SET
        suspended_at = NULL,
        suspended_by = NULL,
        suspension_reason = NULL
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure random token for invitations
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to validate and accept an invitation
CREATE OR REPLACE FUNCTION accept_invitation(
    p_token TEXT,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_invitation invitations%ROWTYPE;
    v_result JSONB;
BEGIN
    -- Find valid invitation
    SELECT * INTO v_invitation
    FROM invitations
    WHERE token = p_token
    AND expires_at > NOW()
    AND accepted_at IS NULL;

    IF v_invitation IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired invitation'
        );
    END IF;

    -- Mark invitation as accepted
    UPDATE invitations
    SET accepted_at = NOW()
    WHERE id = v_invitation.id;

    -- Update user with org and role
    UPDATE users
    SET
        org_id = v_invitation.org_id,
        role = v_invitation.role::user_role
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'org_id', v_invitation.org_id,
        'role', v_invitation.role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

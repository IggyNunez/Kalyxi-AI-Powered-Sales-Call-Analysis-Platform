-- Migration: Add missing DELETE policies
-- Date: 2026-02-06
-- Description: Adds DELETE policies for organizations and users tables

-- Organizations DELETE policy (superadmin only)
CREATE POLICY "Superadmins can delete organizations"
    ON organizations FOR DELETE
    USING (public.is_superadmin());

-- Users DELETE policy (admins can delete users in their org, users cannot delete themselves)
CREATE POLICY "Admins can delete users in their org"
    ON users FOR DELETE
    USING (
        org_id = public.user_org_id()
        AND public.user_role() IN ('admin', 'superadmin')
        AND id != auth.uid()  -- Prevent self-deletion
    );

-- Analyses DELETE policy (admins can delete analyses for calls in their org)
CREATE POLICY "Admins can delete analyses"
    ON analyses FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = analyses.call_id
            AND calls.org_id = public.user_org_id()
            AND public.user_role() IN ('admin', 'superadmin')
        )
    );

-- Analyses UPDATE policy (for reanalysis)
CREATE POLICY "Admins can update analyses"
    ON analyses FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = analyses.call_id
            AND calls.org_id = public.user_org_id()
            AND public.user_role() IN ('admin', 'superadmin')
        )
    );

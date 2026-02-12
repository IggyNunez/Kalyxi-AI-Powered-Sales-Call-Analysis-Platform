import { createClient } from "@/lib/supabase/server";
import type { PlanLimits, PlanLimitCheck, PlanTier } from "@/types/analytics";

// Default plan limits
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    max_users: 5,
    max_calls_per_month: 100,
    max_templates: 3,
    max_sessions_per_month: 50,
    ai_analysis_enabled: false,
    calendar_sync_enabled: false,
    export_enabled: false,
    custom_branding_enabled: false,
    api_access_enabled: false,
    sso_enabled: false,
  },
  starter: {
    max_users: 15,
    max_calls_per_month: 500,
    max_templates: 10,
    max_sessions_per_month: 200,
    ai_analysis_enabled: true,
    calendar_sync_enabled: true,
    export_enabled: true,
    custom_branding_enabled: false,
    api_access_enabled: false,
    sso_enabled: false,
  },
  professional: {
    max_users: 50,
    max_calls_per_month: 2000,
    max_templates: -1, // Unlimited
    max_sessions_per_month: -1, // Unlimited
    ai_analysis_enabled: true,
    calendar_sync_enabled: true,
    export_enabled: true,
    custom_branding_enabled: true,
    api_access_enabled: true,
    sso_enabled: false,
  },
  enterprise: {
    max_users: -1, // Unlimited
    max_calls_per_month: -1, // Unlimited
    max_templates: -1, // Unlimited
    max_sessions_per_month: -1, // Unlimited
    ai_analysis_enabled: true,
    calendar_sync_enabled: true,
    export_enabled: true,
    custom_branding_enabled: true,
    api_access_enabled: true,
    sso_enabled: true,
  },
};

// Get organization plan limits
export async function getOrgPlanLimits(orgId: string): Promise<PlanLimits> {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("plan, plan_limits")
    .eq("id", orgId)
    .single();

  if (!org) {
    return PLAN_LIMITS.free;
  }

  // Use custom plan_limits if set, otherwise use default for plan tier
  if (org.plan_limits) {
    return org.plan_limits as PlanLimits;
  }

  const plan = (org.plan || "free") as PlanTier;
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

// Check if a feature is enabled for an organization
export async function isFeatureEnabled(
  orgId: string,
  feature: keyof PlanLimits
): Promise<boolean> {
  const limits = await getOrgPlanLimits(orgId);
  const value = limits[feature];

  // For boolean features
  if (typeof value === "boolean") {
    return value;
  }

  // For numeric limits, -1 means unlimited (enabled)
  if (typeof value === "number") {
    return value !== 0;
  }

  return false;
}

// Check if organization is within a specific limit
export async function checkPlanLimit(
  orgId: string,
  limitName: keyof PlanLimits,
  currentUsage: number,
  increment: number = 1
): Promise<PlanLimitCheck> {
  const limits = await getOrgPlanLimits(orgId);
  const limit = limits[limitName];

  // Boolean features
  if (typeof limit === "boolean") {
    return {
      allowed: limit,
      limit: limit ? 1 : 0,
      current: limit ? 0 : 1,
      error: limit ? undefined : `Feature "${limitName}" is not available on your plan`,
    };
  }

  // Numeric limits
  if (typeof limit === "number") {
    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        limit: -1,
        current: currentUsage,
      };
    }

    const newUsage = currentUsage + increment;
    const allowed = newUsage <= limit;

    return {
      allowed,
      limit,
      current: currentUsage,
      remaining: Math.max(0, limit - currentUsage),
      error: allowed
        ? undefined
        : `Plan limit exceeded: ${limitName} (${currentUsage}/${limit})`,
    };
  }

  return {
    allowed: false,
    limit: 0,
    current: 0,
    error: "Invalid limit configuration",
  };
}

// Get current usage counts for an organization
export async function getOrgUsage(orgId: string): Promise<{
  users: number;
  calls: number;
  templates: number;
  sessions: number;
}> {
  const supabase = await createClient();

  // Get user count
  const { count: userCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_active", true);

  // Get call count for current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: callCount } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("created_at", startOfMonth.toISOString());

  // Get template count
  const { count: templateCount } = await supabase
    .from("templates")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .neq("status", "archived");

  // Get session count for current month
  const { count: sessionCount } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("created_at", startOfMonth.toISOString());

  return {
    users: userCount || 0,
    calls: callCount || 0,
    templates: templateCount || 0,
    sessions: sessionCount || 0,
  };
}

// Check if organization can add a new user
export async function canAddUser(orgId: string): Promise<PlanLimitCheck> {
  const usage = await getOrgUsage(orgId);
  return checkPlanLimit(orgId, "max_users", usage.users, 1);
}

// Check if organization can add a new call
export async function canAddCall(orgId: string): Promise<PlanLimitCheck> {
  const usage = await getOrgUsage(orgId);
  return checkPlanLimit(orgId, "max_calls_per_month", usage.calls, 1);
}

// Check if organization can add a new template
export async function canAddTemplate(orgId: string): Promise<PlanLimitCheck> {
  const usage = await getOrgUsage(orgId);
  return checkPlanLimit(orgId, "max_templates", usage.templates, 1);
}

// Check if organization can add a new session
export async function canAddSession(orgId: string): Promise<PlanLimitCheck> {
  const usage = await getOrgUsage(orgId);
  return checkPlanLimit(orgId, "max_sessions_per_month", usage.sessions, 1);
}

// Check if AI analysis is enabled
export async function canUseAiAnalysis(orgId: string): Promise<boolean> {
  return isFeatureEnabled(orgId, "ai_analysis_enabled");
}

// Check if calendar sync is enabled
export async function canUseCalendarSync(orgId: string): Promise<boolean> {
  return isFeatureEnabled(orgId, "calendar_sync_enabled");
}

// Check if export is enabled
export async function canUseExport(orgId: string): Promise<boolean> {
  return isFeatureEnabled(orgId, "export_enabled");
}

// Check if API access is enabled
export async function canUseApi(orgId: string): Promise<boolean> {
  return isFeatureEnabled(orgId, "api_access_enabled");
}

// Get plan tier display name
export function getPlanDisplayName(plan: PlanTier): string {
  const names: Record<PlanTier, string> = {
    free: "Free",
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };
  return names[plan] || "Free";
}

// Get plan tier by limit configuration
export function getPlanTierFromLimits(limits: PlanLimits): PlanTier {
  // Check from highest to lowest
  if (limits.sso_enabled) return "enterprise";
  if (limits.api_access_enabled && limits.custom_branding_enabled) return "professional";
  if (limits.ai_analysis_enabled) return "starter";
  return "free";
}

// ============================================================================
// Team Analytics Types
// ============================================================================

export type SimplifiedRole = 'superadmin' | 'admin' | 'user';

export interface UserAnalytics {
  id: string;
  name: string;
  email: string;
  role: SimplifiedRole;
  avatar_url?: string;

  // Activity
  lastActive: string | null;
  createdAt: string;
  suspended: boolean;
  suspendedAt?: string | null;
  suspensionReason?: string | null;

  // Performance metrics (for users being reviewed)
  totalSessions: number;
  completedSessions: number;
  averageScore: number | null;
  passRate: number | null;

  // Coaching metrics (for admins doing reviews)
  sessionsCoached: number;
  avgCoachingScore: number | null;

  // Call metrics
  totalCalls: number;
  analyzedCalls: number;
}

export interface TeamAnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  avgTeamScore: number | null;
  avgPassRate: number | null;
  totalSessions: number;
  completedSessions: number;
}

export interface TeamAnalyticsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TeamAnalyticsResponse {
  users: UserAnalytics[];
  summary: TeamAnalyticsSummary;
  pagination: TeamAnalyticsPagination;
}

export interface TeamAnalyticsFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: SimplifiedRole | 'all';
  sortBy?: keyof UserAnalytics;
  sortOrder?: 'asc' | 'desc';
  includeSuspended?: boolean;
}

// ============================================================================
// User Detail Types (for modal)
// ============================================================================

export interface UserSessionHistory {
  id: string;
  templateName: string;
  status: string;
  score: number | null;
  passStatus: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface UserScoreBreakdown {
  templateId: string;
  templateName: string;
  sessionsCount: number;
  avgScore: number;
  passRate: number;
}

export interface UserActivityEvent {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface UserDetailResponse {
  user: UserAnalytics;
  sessions: UserSessionHistory[];
  scoreBreakdown: UserScoreBreakdown[];
  activityLog: UserActivityEvent[];
  performanceTrend: PerformanceTrendPoint[];
}

export interface PerformanceTrendPoint {
  date: string;
  avgScore: number;
  sessionsCount: number;
}

// ============================================================================
// Platform Analytics Types (Superadmin)
// ============================================================================

export interface PlatformStats {
  totalOrgs: number;
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalCalls: number;
  orgsByPlan: Record<string, number>;
  newOrgsThisMonth: number;
  newUsersThisMonth: number;
}

export interface OrgAnalytics {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  userCount: number;
  callCount: number;
  sessionCount: number;
  avgScore: number | null;
  createdAt: string;
}

export interface PlatformAnalyticsResponse {
  stats: PlatformStats;
  orgs: OrgAnalytics[];
  pagination: TeamAnalyticsPagination;
}

// ============================================================================
// Organization Management Types
// ============================================================================

export interface PlanLimits {
  max_users: number;
  max_calls_per_month: number;
  max_templates: number;
  max_sessions_per_month: number;
  ai_analysis_enabled: boolean;
  calendar_sync_enabled: boolean;
  export_enabled: boolean;
  custom_branding_enabled: boolean;
  api_access_enabled: boolean;
  sso_enabled: boolean;
}

export interface OrgUsage {
  calls_count: number;
  sessions_count: number;
  ai_analyses_count: number;
  storage_bytes_used: number;
  api_calls_count: number;
}

export interface PlanLimitCheck {
  allowed: boolean;
  limit: number;
  current: number;
  remaining?: number;
  error?: string;
}

export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  features: string[];
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums
export type UserRole = "caller" | "admin" | "superadmin" | "manager" | "coach";
export type CallStatus = "pending" | "processing" | "analyzed" | "failed";
export type CallSource = "webhook" | "google_notes" | "manual" | "api" | "calendar";
export type GradingFieldType = "score" | "text" | "checklist" | "boolean" | "percentage";
export type ImportanceLevel = "high" | "medium" | "low";
export type PlanType = "free" | "starter" | "professional" | "enterprise";
export type ReportStatus = "generating" | "ready" | "failed";
export type ScriptStatus = "draft" | "active" | "archived";
export type ScorecardStatus = "draft" | "active" | "archived";
export type InsightCategory = "general" | "coaching" | "performance" | "compliance" | "custom";
export type InsightOutputFormat = "text" | "bullets" | "numbered" | "json";
export type ScoredBy = "ai" | "manual" | "hybrid";

// New Coaching Platform Enums
export type ScoringMethod = "weighted" | "simple_average" | "pass_fail" | "points" | "custom_formula";
export type TemplateUseCase = "sales_call" | "onboarding" | "qa_review" | "training" | "custom";
export type TemplateStatus = "draft" | "active" | "archived";
export type CriteriaType =
  | "scale"
  | "pass_fail"
  | "checklist"
  | "text"
  | "dropdown"
  | "multi_select"
  | "rating_stars"
  | "percentage";
export type SessionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "reviewed"
  | "disputed"
  | "cancelled";
export type PassStatus = "pass" | "fail" | "pending";
export type SyncDirection = "calendar_to_sessions" | "bidirectional";
export type SessionAuditAction =
  | "created"
  | "started"
  | "score_updated"
  | "completed"
  | "reviewed"
  | "disputed"
  | "dispute_resolved"
  | "cancelled"
  | "reopened";

// Grading criteria configuration
export interface GradingCriterion {
  id: string;
  name: string;
  description: string;
  type: GradingFieldType;
  weight: number;
  isRequired: boolean;
  order: number;
  options?: string[]; // For checklist type
  minValue?: number;
  maxValue?: number;
  passingThreshold?: number;
}

export interface ScorecardField {
  id: string;
  name: string;
  weight: number;
  scoringMethod: "average" | "sum" | "weighted";
  passingThreshold: number;
  linkedCriteria: string[]; // IDs of grading criteria
}

// Script section structure for JSONB
export interface ScriptSection {
  id: string;
  name: string;
  content: string;
  tips?: string[];
  order: number;
}

// Scorecard criterion structure for JSONB
export interface ScorecardCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  max_score: number;
  scoring_guide: string;
  keywords?: string[];
  order: number;
}

// ============================================================================
// COACHING PLATFORM TYPES
// ============================================================================

// Template settings JSONB structure
export interface TemplateSettings {
  allow_na: boolean;
  require_comments_below_threshold: boolean;
  comments_threshold: number;
  auto_calculate: boolean;
  show_weights_to_agents: boolean;
  allow_partial_submission: boolean;
}

// Criteria type-specific configurations
export interface ScaleCriteriaConfig {
  min: number;
  max: number;
  step: number;
  labels?: Record<string, string>; // e.g., { "1": "Poor", "5": "Excellent" }
}

export interface PassFailCriteriaConfig {
  pass_label: string;
  fail_label: string;
  pass_value: number;
  fail_value: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  points: number;
}

export interface ChecklistCriteriaConfig {
  items: ChecklistItem[];
  scoring: "sum" | "average" | "all_required";
}

export interface DropdownOption {
  value: string;
  label: string;
  score: number;
}

export interface DropdownCriteriaConfig {
  options: DropdownOption[];
}

export interface MultiSelectCriteriaConfig {
  options: DropdownOption[];
  scoring: "sum" | "average";
}

export interface StarsCriteriaConfig {
  max_stars: number;
  allow_half: boolean;
}

export interface PercentageThreshold {
  value: number;
  label: string;
  color: string;
}

export interface PercentageCriteriaConfig {
  thresholds: PercentageThreshold[];
}

export interface TextCriteriaConfig {
  max_length?: number;
  placeholder?: string;
  min_length?: number;
}

export type CriteriaConfig =
  | ScaleCriteriaConfig
  | PassFailCriteriaConfig
  | ChecklistCriteriaConfig
  | DropdownCriteriaConfig
  | MultiSelectCriteriaConfig
  | StarsCriteriaConfig
  | PercentageCriteriaConfig
  | TextCriteriaConfig;

// Score value structures for different criteria types
export interface ScaleScoreValue {
  value: number;
}

export interface PassFailScoreValue {
  passed: boolean;
}

export interface ChecklistScoreValue {
  checked: string[];
  unchecked: string[];
}

export interface DropdownScoreValue {
  selected: string;
}

export interface MultiSelectScoreValue {
  selected: string[];
}

export interface StarsScoreValue {
  stars: number;
}

export interface PercentageScoreValue {
  value: number;
}

export interface TextScoreValue {
  response: string;
}

export type ScoreValue =
  | ScaleScoreValue
  | PassFailScoreValue
  | ChecklistScoreValue
  | DropdownScoreValue
  | MultiSelectScoreValue
  | StarsScoreValue
  | PercentageScoreValue
  | TextScoreValue;

// Event filter for calendar integration
export interface CalendarEventFilter {
  title_contains: string[];
  title_not_contains: string[];
  min_duration_minutes: number;
  max_duration_minutes: number | null;
  require_attendees: boolean;
  attendee_domains: string[];
  exclude_all_day: boolean;
  exclude_recurring: boolean;
}

// Agent mapping for calendar events
export interface AgentMapping {
  type: "attendee_email" | "organizer" | "custom_field";
  field: string;
  fallback_to_organizer: boolean;
}

// Template version snapshot structure
export interface TemplateVersionSnapshot {
  template: Record<string, unknown>;
  groups: Record<string, unknown>[];
  criteria: Record<string, unknown>[];
}

// Detailed criterion score result
export interface CriterionScoreResult {
  name: string;
  score: number;
  max_score: number;
  weight: number;
  weighted_score: number;
  feedback?: string;
  highlights?: string[];
  improvements?: string[];
}

// Organization settings
export interface OrgSettings {
  branding: {
    primaryColor: string;
    logo?: string;
    companyName: string;
  };
  timezone: string;
  notifications: {
    emailOnNewCall: boolean;
    emailOnLowScore: boolean;
    lowScoreThreshold: number;
    dailyDigest: boolean;
  };
  ai: {
    model: "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo";
    temperature: number;
    customPromptPrefix?: string;
  };
  features: {
    gatekeeperDetection: boolean;
    autoAnalyze: boolean;
    competitorTracking: boolean;
  };
}

// Grading results from AI
export interface GradingResult {
  criterionId: string;
  criterionName: string;
  type: GradingFieldType;
  value: number | string | boolean | string[];
  score?: number; // Normalized 0-100
  feedback?: string;
  confidence?: number;
}

export interface AnalysisResults {
  overallScore: number;
  gradingResults: GradingResult[];
  compositeScore: number;
  strengths: string[];
  improvements: string[];
  executiveSummary: string;
  actionItems: string[];
  objections: Array<{
    objection: string;
    response: string;
    effectiveness: number;
  }>;
  gatekeeperDetected?: boolean;
  gatekeeperHandling?: string;
  competitorMentions: string[];
  sentiment: {
    overall: "positive" | "neutral" | "negative";
    score: number;
    progression: Array<{ timestamp: number; sentiment: number }>;
  };
  callMetrics: {
    talkRatio: number;
    questionCount: number;
    interruptionCount: number;
    silenceDuration: number;
  };
  recommendations: string[];
}

// Report JSON structure
export interface ReportJson {
  version: string;
  generatedAt: string;
  callSummary: {
    title: string;
    date: string;
    duration?: number;
    callerName: string;
    customerInfo?: {
      name?: string;
      company?: string;
    };
  };
  analysis: AnalysisResults;
  scorecard: {
    criteria: Array<{
      name: string;
      score: number;
      weight: number;
      passed: boolean;
    }>;
    finalScore: number;
    passed: boolean;
  };
  coaching: {
    topStrengths: string[];
    priorityImprovements: string[];
    actionPlan: string[];
    resources?: string[];
  };
  trends?: {
    scoreChange: number;
    rankChange: number;
    comparisonPeriod: string;
  };
}

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings_json: OrgSettings;
          plan: PlanType;
          webhook_secret: string;
          api_key_hash?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings_json?: OrgSettings;
          plan?: PlanType;
          webhook_secret?: string;
          api_key_hash?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings_json?: OrgSettings;
          plan?: PlanType;
          webhook_secret?: string;
          api_key_hash?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          name?: string;
          avatar_url?: string;
          role: UserRole;
          is_active: boolean;
          last_login_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          email: string;
          name?: string;
          avatar_url?: string;
          role?: UserRole;
          is_active?: boolean;
          last_login_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          name?: string;
          avatar_url?: string;
          role?: UserRole;
          is_active?: boolean;
          last_login_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      callers: {
        Row: {
          id: string;
          org_id: string;
          user_id?: string;
          name: string;
          email?: string;
          team?: string;
          department?: string;
          is_active: boolean;
          metadata?: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id?: string;
          name: string;
          email?: string;
          team?: string;
          department?: string;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          name?: string;
          email?: string;
          team?: string;
          department?: string;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          org_id: string;
          caller_id: string;
          raw_notes: string;
          source: CallSource;
          status: CallStatus;
          external_id?: string;
          customer_name?: string;
          customer_company?: string;
          customer_phone?: string;
          duration?: number;
          recording_url?: string;
          call_timestamp: string;
          metadata?: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          caller_id: string;
          raw_notes: string;
          source?: CallSource;
          status?: CallStatus;
          external_id?: string;
          customer_name?: string;
          customer_company?: string;
          customer_phone?: string;
          duration?: number;
          recording_url?: string;
          call_timestamp?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          caller_id?: string;
          raw_notes?: string;
          source?: CallSource;
          status?: CallStatus;
          external_id?: string;
          customer_name?: string;
          customer_company?: string;
          customer_phone?: string;
          duration?: number;
          recording_url?: string;
          call_timestamp?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      analyses: {
        Row: {
          id: string;
          call_id: string;
          ai_model: string;
          grading_results_json: AnalysisResults;
          overall_score: number;
          composite_score: number;
          processing_time_ms?: number;
          token_usage?: {
            prompt: number;
            completion: number;
            total: number;
          };
          error_message?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          ai_model: string;
          grading_results_json: AnalysisResults;
          overall_score: number;
          composite_score: number;
          processing_time_ms?: number;
          token_usage?: {
            prompt: number;
            completion: number;
            total: number;
          };
          error_message?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          ai_model?: string;
          grading_results_json?: AnalysisResults;
          overall_score?: number;
          composite_score?: number;
          processing_time_ms?: number;
          token_usage?: {
            prompt: number;
            completion: number;
            total: number;
          };
          error_message?: string;
          created_at?: string;
        };
      };
      grading_templates: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description?: string;
          criteria_json: GradingCriterion[];
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string;
          criteria_json: GradingCriterion[];
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string;
          criteria_json?: GradingCriterion[];
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      scorecard_configs: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          fields_json: ScorecardField[];
          passing_threshold: number;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          fields_json: ScorecardField[];
          passing_threshold?: number;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          fields_json?: ScorecardField[];
          passing_threshold?: number;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          call_id: string;
          analysis_id: string;
          report_json: ReportJson;
          status: ReportStatus;
          pdf_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          analysis_id: string;
          report_json: ReportJson;
          status?: ReportStatus;
          pdf_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          analysis_id?: string;
          report_json?: ReportJson;
          status?: ReportStatus;
          pdf_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      webhook_logs: {
        Row: {
          id: string;
          org_id: string;
          endpoint: string;
          method: string;
          headers: Json;
          payload: Json;
          status_code: number;
          response?: Json;
          error_message?: string;
          processing_time_ms: number;
          ip_address?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          endpoint: string;
          method: string;
          headers: Json;
          payload: Json;
          status_code: number;
          response?: Json;
          error_message?: string;
          processing_time_ms: number;
          ip_address?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          endpoint?: string;
          method?: string;
          headers?: Json;
          payload?: Json;
          status_code?: number;
          response?: Json;
          error_message?: string;
          processing_time_ms?: number;
          ip_address?: string;
          created_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: UserRole;
          token: string;
          expires_at: string;
          accepted_at?: string;
          invited_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role?: UserRole;
          token: string;
          expires_at: string;
          accepted_at?: string;
          invited_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          role?: UserRole;
          token?: string;
          expires_at?: string;
          accepted_at?: string;
          invited_by?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          org_id: string;
          user_id?: string;
          action: string;
          entity_type: string;
          entity_id?: string;
          old_values?: Json;
          new_values?: Json;
          ip_address?: string;
          user_agent?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id?: string;
          action: string;
          entity_type: string;
          entity_id?: string;
          old_values?: Json;
          new_values?: Json;
          ip_address?: string;
          user_agent?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          old_values?: Json;
          new_values?: Json;
          ip_address?: string;
          user_agent?: string;
          created_at?: string;
        };
      };
      processing_queue: {
        Row: {
          id: string;
          org_id: string;
          call_id: string;
          status: "queued" | "processing" | "completed" | "failed";
          priority: number;
          attempts: number;
          max_attempts: number;
          last_error?: string;
          scheduled_at: string;
          started_at?: string;
          completed_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          call_id: string;
          status?: "queued" | "processing" | "completed" | "failed";
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          last_error?: string;
          scheduled_at?: string;
          started_at?: string;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          call_id?: string;
          status?: "queued" | "processing" | "completed" | "failed";
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          last_error?: string;
          scheduled_at?: string;
          started_at?: string;
          completed_at?: string;
          created_at?: string;
        };
      };
      scripts: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description?: string;
          version: number;
          sections: ScriptSection[];
          status: ScriptStatus;
          is_default: boolean;
          created_by?: string;
          created_at: string;
          updated_at: string;
          archived_at?: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string;
          version?: number;
          sections?: ScriptSection[];
          status?: ScriptStatus;
          is_default?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string;
          version?: number;
          sections?: ScriptSection[];
          status?: ScriptStatus;
          is_default?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string;
        };
      };
      scorecards: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description?: string;
          version: number;
          criteria: ScorecardCriterion[];
          total_weight: number;
          status: ScorecardStatus;
          is_default: boolean;
          script_id?: string;
          created_by?: string;
          created_at: string;
          updated_at: string;
          activated_at?: string;
          archived_at?: string;
          previous_version_id?: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string;
          version?: number;
          criteria?: ScorecardCriterion[];
          total_weight?: number;
          status?: ScorecardStatus;
          is_default?: boolean;
          script_id?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          activated_at?: string;
          archived_at?: string;
          previous_version_id?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string;
          version?: number;
          criteria?: ScorecardCriterion[];
          total_weight?: number;
          status?: ScorecardStatus;
          is_default?: boolean;
          script_id?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          activated_at?: string;
          archived_at?: string;
          previous_version_id?: string;
        };
      };
      insight_templates: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description?: string;
          category: InsightCategory;
          prompt_template: string;
          output_format: InsightOutputFormat;
          max_insights?: number;
          is_active: boolean;
          is_default: boolean;
          display_order: number;
          created_by?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string;
          category?: InsightCategory;
          prompt_template: string;
          output_format?: InsightOutputFormat;
          max_insights?: number;
          is_active?: boolean;
          is_default?: boolean;
          display_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string;
          category?: InsightCategory;
          prompt_template?: string;
          output_format?: InsightOutputFormat;
          max_insights?: number;
          is_active?: boolean;
          is_default?: boolean;
          display_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      call_score_results: {
        Row: {
          id: string;
          call_id: string;
          scorecard_id: string;
          org_id: string;
          total_score: number;
          max_possible_score: number;
          percentage_score: number;
          criteria_scores: Record<string, CriterionScoreResult>;
          summary?: string;
          strengths: string[];
          improvements: string[];
          scored_at: string;
          scored_by: ScoredBy;
          scorecard_version: number;
          scorecard_snapshot?: ScorecardCriterion[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          scorecard_id: string;
          org_id: string;
          total_score: number;
          max_possible_score: number;
          percentage_score: number;
          criteria_scores?: Record<string, CriterionScoreResult>;
          summary?: string;
          strengths?: string[];
          improvements?: string[];
          scored_at?: string;
          scored_by?: ScoredBy;
          scorecard_version: number;
          scorecard_snapshot?: ScorecardCriterion[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          scorecard_id?: string;
          org_id?: string;
          total_score?: number;
          max_possible_score?: number;
          percentage_score?: number;
          criteria_scores?: Record<string, CriterionScoreResult>;
          summary?: string;
          strengths?: string[];
          improvements?: string[];
          scored_at?: string;
          scored_by?: ScoredBy;
          scorecard_version?: number;
          scorecard_snapshot?: ScorecardCriterion[];
          created_at?: string;
          updated_at?: string;
        };
      };
      criteria_optimizations: {
        Row: {
          id: string;
          org_id: string;
          criterion_name: string;
          criterion_id?: string;
          total_evaluations: number;
          total_score: number;
          average_score: number;
          score_distribution: Record<string, number>;
          trend_data: Array<{ date: string; avg: number; count: number }>;
          common_strengths: string[];
          common_improvements: string[];
          period_start: string;
          period_end: string;
          last_calculated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          criterion_name: string;
          criterion_id?: string;
          total_evaluations?: number;
          total_score?: number;
          score_distribution?: Record<string, number>;
          trend_data?: Array<{ date: string; avg: number; count: number }>;
          common_strengths?: string[];
          common_improvements?: string[];
          period_start: string;
          period_end: string;
          last_calculated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          criterion_name?: string;
          criterion_id?: string;
          total_evaluations?: number;
          total_score?: number;
          score_distribution?: Record<string, number>;
          trend_data?: Array<{ date: string; avg: number; count: number }>;
          common_strengths?: string[];
          common_improvements?: string[];
          period_start?: string;
          period_end?: string;
          last_calculated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ================================================================
      // COACHING PLATFORM TABLES
      // ================================================================
      templates: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description?: string;
          scoring_method: ScoringMethod;
          use_case: TemplateUseCase;
          pass_threshold: number;
          max_total_score: number;
          settings: TemplateSettings;
          status: TemplateStatus;
          version: number;
          is_default: boolean;
          legacy_scorecard_id?: string;
          created_by?: string;
          created_at: string;
          updated_at: string;
          activated_at?: string;
          archived_at?: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string;
          scoring_method?: ScoringMethod;
          use_case?: TemplateUseCase;
          pass_threshold?: number;
          max_total_score?: number;
          settings?: TemplateSettings;
          status?: TemplateStatus;
          version?: number;
          is_default?: boolean;
          legacy_scorecard_id?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          activated_at?: string;
          archived_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string;
          scoring_method?: ScoringMethod;
          use_case?: TemplateUseCase;
          pass_threshold?: number;
          max_total_score?: number;
          settings?: TemplateSettings;
          status?: TemplateStatus;
          version?: number;
          is_default?: boolean;
          legacy_scorecard_id?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          activated_at?: string;
          archived_at?: string;
        };
      };
      criteria_groups: {
        Row: {
          id: string;
          template_id: string;
          name: string;
          description?: string;
          sort_order: number;
          weight: number;
          is_required: boolean;
          is_collapsed_by_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          name: string;
          description?: string;
          sort_order?: number;
          weight?: number;
          is_required?: boolean;
          is_collapsed_by_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          name?: string;
          description?: string;
          sort_order?: number;
          weight?: number;
          is_required?: boolean;
          is_collapsed_by_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      criteria: {
        Row: {
          id: string;
          template_id: string;
          group_id?: string;
          name: string;
          description?: string;
          criteria_type: CriteriaType;
          config: CriteriaConfig;
          weight: number;
          max_score: number;
          sort_order: number;
          is_required: boolean;
          is_auto_fail: boolean;
          auto_fail_threshold?: number;
          scoring_guide?: string;
          keywords: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          group_id?: string;
          name: string;
          description?: string;
          criteria_type?: CriteriaType;
          config?: CriteriaConfig;
          weight?: number;
          max_score?: number;
          sort_order?: number;
          is_required?: boolean;
          is_auto_fail?: boolean;
          auto_fail_threshold?: number;
          scoring_guide?: string;
          keywords?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          group_id?: string;
          name?: string;
          description?: string;
          criteria_type?: CriteriaType;
          config?: CriteriaConfig;
          weight?: number;
          max_score?: number;
          sort_order?: number;
          is_required?: boolean;
          is_auto_fail?: boolean;
          auto_fail_threshold?: number;
          scoring_guide?: string;
          keywords?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          org_id: string;
          template_id: string;
          call_id?: string;
          coach_id?: string;
          agent_id?: string;
          status: SessionStatus;
          google_event_id?: string;
          google_event_title?: string;
          google_event_start?: string;
          google_event_end?: string;
          google_calendar_link_id?: string;
          total_score?: number;
          total_possible?: number;
          percentage_score?: number;
          pass_status?: PassStatus;
          has_auto_fail: boolean;
          auto_fail_criteria_ids: string[];
          coach_notes?: string;
          agent_notes?: string;
          reviewed_by?: string;
          reviewed_at?: string;
          review_notes?: string;
          disputed_at?: string;
          dispute_reason?: string;
          dispute_resolved_at?: string;
          dispute_resolution?: string;
          template_version?: number;
          template_snapshot?: TemplateVersionSnapshot;
          created_at: string;
          updated_at: string;
          started_at?: string;
          completed_at?: string;
          cancelled_at?: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          template_id: string;
          call_id?: string;
          coach_id?: string;
          agent_id?: string;
          status?: SessionStatus;
          google_event_id?: string;
          google_event_title?: string;
          google_event_start?: string;
          google_event_end?: string;
          google_calendar_link_id?: string;
          total_score?: number;
          total_possible?: number;
          percentage_score?: number;
          pass_status?: PassStatus;
          has_auto_fail?: boolean;
          auto_fail_criteria_ids?: string[];
          coach_notes?: string;
          agent_notes?: string;
          reviewed_by?: string;
          reviewed_at?: string;
          review_notes?: string;
          disputed_at?: string;
          dispute_reason?: string;
          dispute_resolved_at?: string;
          dispute_resolution?: string;
          template_version?: number;
          template_snapshot?: TemplateVersionSnapshot;
          created_at?: string;
          updated_at?: string;
          started_at?: string;
          completed_at?: string;
          cancelled_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          template_id?: string;
          call_id?: string;
          coach_id?: string;
          agent_id?: string;
          status?: SessionStatus;
          google_event_id?: string;
          google_event_title?: string;
          google_event_start?: string;
          google_event_end?: string;
          google_calendar_link_id?: string;
          total_score?: number;
          total_possible?: number;
          percentage_score?: number;
          pass_status?: PassStatus;
          has_auto_fail?: boolean;
          auto_fail_criteria_ids?: string[];
          coach_notes?: string;
          agent_notes?: string;
          reviewed_by?: string;
          reviewed_at?: string;
          review_notes?: string;
          disputed_at?: string;
          dispute_reason?: string;
          dispute_resolved_at?: string;
          dispute_resolution?: string;
          template_version?: number;
          template_snapshot?: TemplateVersionSnapshot;
          created_at?: string;
          updated_at?: string;
          started_at?: string;
          completed_at?: string;
          cancelled_at?: string;
        };
      };
      scores: {
        Row: {
          id: string;
          session_id: string;
          criteria_id: string;
          criteria_group_id?: string;
          value: ScoreValue;
          raw_score?: number;
          normalized_score?: number;
          weighted_score?: number;
          is_na: boolean;
          is_auto_fail_triggered: boolean;
          comment?: string;
          criteria_snapshot?: CriteriaConfig;
          scored_by?: string;
          scored_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          criteria_id: string;
          criteria_group_id?: string;
          value: ScoreValue;
          raw_score?: number;
          normalized_score?: number;
          weighted_score?: number;
          is_na?: boolean;
          is_auto_fail_triggered?: boolean;
          comment?: string;
          criteria_snapshot?: CriteriaConfig;
          scored_by?: string;
          scored_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          criteria_id?: string;
          criteria_group_id?: string;
          value?: ScoreValue;
          raw_score?: number;
          normalized_score?: number;
          weighted_score?: number;
          is_na?: boolean;
          is_auto_fail_triggered?: boolean;
          comment?: string;
          criteria_snapshot?: CriteriaConfig;
          scored_by?: string;
          scored_at?: string;
          updated_at?: string;
        };
      };
      google_calendar_links: {
        Row: {
          id: string;
          org_id: string;
          template_id: string;
          calendar_id: string;
          calendar_name?: string;
          google_account_email: string;
          access_token: string;
          refresh_token_encrypted: string;
          refresh_token_iv: string;
          refresh_token_tag: string;
          token_expiry: string;
          scopes: string[];
          event_filter: CalendarEventFilter;
          sync_enabled: boolean;
          sync_direction: SyncDirection;
          auto_create_sessions: boolean;
          webhook_channel_id?: string;
          webhook_resource_id?: string;
          webhook_expiration?: string;
          last_sync_at?: string;
          last_sync_error?: string;
          sync_cursor?: string;
          agent_mapping: AgentMapping;
          created_by?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          template_id: string;
          calendar_id: string;
          calendar_name?: string;
          google_account_email: string;
          access_token: string;
          refresh_token_encrypted: string;
          refresh_token_iv: string;
          refresh_token_tag: string;
          token_expiry: string;
          scopes?: string[];
          event_filter?: CalendarEventFilter;
          sync_enabled?: boolean;
          sync_direction?: SyncDirection;
          auto_create_sessions?: boolean;
          webhook_channel_id?: string;
          webhook_resource_id?: string;
          webhook_expiration?: string;
          last_sync_at?: string;
          last_sync_error?: string;
          sync_cursor?: string;
          agent_mapping?: AgentMapping;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          template_id?: string;
          calendar_id?: string;
          calendar_name?: string;
          google_account_email?: string;
          access_token?: string;
          refresh_token_encrypted?: string;
          refresh_token_iv?: string;
          refresh_token_tag?: string;
          token_expiry?: string;
          scopes?: string[];
          event_filter?: CalendarEventFilter;
          sync_enabled?: boolean;
          sync_direction?: SyncDirection;
          auto_create_sessions?: boolean;
          webhook_channel_id?: string;
          webhook_resource_id?: string;
          webhook_expiration?: string;
          last_sync_at?: string;
          last_sync_error?: string;
          sync_cursor?: string;
          agent_mapping?: AgentMapping;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      session_audit_log: {
        Row: {
          id: string;
          session_id: string;
          user_id?: string;
          action: SessionAuditAction;
          details: Json;
          ip_address?: string;
          user_agent?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id?: string;
          action: SessionAuditAction;
          details?: Json;
          ip_address?: string;
          user_agent?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          action?: SessionAuditAction;
          details?: Json;
          ip_address?: string;
          user_agent?: string;
          created_at?: string;
        };
      };
      template_versions: {
        Row: {
          id: string;
          template_id: string;
          version_number: number;
          snapshot: TemplateVersionSnapshot;
          change_summary?: string;
          changed_by?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          version_number: number;
          snapshot: TemplateVersionSnapshot;
          change_summary?: string;
          changed_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          version_number?: number;
          snapshot?: TemplateVersionSnapshot;
          change_summary?: string;
          changed_by?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      caller_stats: {
        Row: {
          caller_id: string;
          caller_name: string;
          org_id: string;
          total_calls: number;
          avg_score: number;
          highest_score: number;
          lowest_score: number;
          calls_this_week: number;
          calls_this_month: number;
          score_trend: number;
        };
      };
      org_analytics: {
        Row: {
          org_id: string;
          total_calls: number;
          total_callers: number;
          avg_score: number;
          top_performer_id: string;
          top_performer_name: string;
          calls_today: number;
          calls_this_week: number;
        };
      };
    };
    Functions: {
      get_caller_ranking: {
        Args: { p_org_id: string; p_period: string };
        Returns: Array<{
          caller_id: string;
          caller_name: string;
          avg_score: number;
          total_calls: number;
          rank: number;
        }>;
      };
    };
    Enums: {
      user_role: UserRole;
      call_status: CallStatus;
      call_source: CallSource;
      grading_field_type: GradingFieldType;
      plan_type: PlanType;
      report_status: ReportStatus;
    };
  };
}

// Helper types for easier usage
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type Caller = Database["public"]["Tables"]["callers"]["Row"];
export type CallerInsert = Database["public"]["Tables"]["callers"]["Insert"];
export type Call = Database["public"]["Tables"]["calls"]["Row"];
export type CallInsert = Database["public"]["Tables"]["calls"]["Insert"];
export type Analysis = Database["public"]["Tables"]["analyses"]["Row"];
export type AnalysisInsert = Database["public"]["Tables"]["analyses"]["Insert"];
export type GradingTemplate = Database["public"]["Tables"]["grading_templates"]["Row"];
export type GradingTemplateInsert = Database["public"]["Tables"]["grading_templates"]["Insert"];
export type ScorecardConfig = Database["public"]["Tables"]["scorecard_configs"]["Row"];
export type ScorecardConfigInsert = Database["public"]["Tables"]["scorecard_configs"]["Insert"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type WebhookLog = Database["public"]["Tables"]["webhook_logs"]["Row"];
export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type ProcessingQueueItem = Database["public"]["Tables"]["processing_queue"]["Row"];

// New types for Scripts, Scorecards, Insights
export type Script = Database["public"]["Tables"]["scripts"]["Row"];
export type ScriptInsert = Database["public"]["Tables"]["scripts"]["Insert"];
export type ScriptUpdate = Database["public"]["Tables"]["scripts"]["Update"];

export type Scorecard = Database["public"]["Tables"]["scorecards"]["Row"];
export type ScorecardInsert = Database["public"]["Tables"]["scorecards"]["Insert"];
export type ScorecardUpdate = Database["public"]["Tables"]["scorecards"]["Update"];

export type InsightTemplate = Database["public"]["Tables"]["insight_templates"]["Row"];
export type InsightTemplateInsert = Database["public"]["Tables"]["insight_templates"]["Insert"];
export type InsightTemplateUpdate = Database["public"]["Tables"]["insight_templates"]["Update"];

export type CallScoreResult = Database["public"]["Tables"]["call_score_results"]["Row"];
export type CallScoreResultInsert = Database["public"]["Tables"]["call_score_results"]["Insert"];
export type CallScoreResultUpdate = Database["public"]["Tables"]["call_score_results"]["Update"];

export type CriteriaOptimization = Database["public"]["Tables"]["criteria_optimizations"]["Row"];
export type CriteriaOptimizationInsert = Database["public"]["Tables"]["criteria_optimizations"]["Insert"];
export type CriteriaOptimizationUpdate = Database["public"]["Tables"]["criteria_optimizations"]["Update"];

// Coaching Platform Types
export type Template = Database["public"]["Tables"]["templates"]["Row"];
export type TemplateInsert = Database["public"]["Tables"]["templates"]["Insert"];
export type TemplateUpdate = Database["public"]["Tables"]["templates"]["Update"];

export type CriteriaGroup = Database["public"]["Tables"]["criteria_groups"]["Row"];
export type CriteriaGroupInsert = Database["public"]["Tables"]["criteria_groups"]["Insert"];
export type CriteriaGroupUpdate = Database["public"]["Tables"]["criteria_groups"]["Update"];

export type Criteria = Database["public"]["Tables"]["criteria"]["Row"];
export type CriteriaInsert = Database["public"]["Tables"]["criteria"]["Insert"];
export type CriteriaUpdate = Database["public"]["Tables"]["criteria"]["Update"];

export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
export type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

export type Score = Database["public"]["Tables"]["scores"]["Row"];
export type ScoreInsert = Database["public"]["Tables"]["scores"]["Insert"];
export type ScoreUpdate = Database["public"]["Tables"]["scores"]["Update"];

export type GoogleCalendarLink = Database["public"]["Tables"]["google_calendar_links"]["Row"];
export type GoogleCalendarLinkInsert = Database["public"]["Tables"]["google_calendar_links"]["Insert"];
export type GoogleCalendarLinkUpdate = Database["public"]["Tables"]["google_calendar_links"]["Update"];

export type SessionAuditLog = Database["public"]["Tables"]["session_audit_log"]["Row"];
export type SessionAuditLogInsert = Database["public"]["Tables"]["session_audit_log"]["Insert"];
export type SessionAuditLogUpdate = Database["public"]["Tables"]["session_audit_log"]["Update"];

export type TemplateVersion = Database["public"]["Tables"]["template_versions"]["Row"];
export type TemplateVersionInsert = Database["public"]["Tables"]["template_versions"]["Insert"];
export type TemplateVersionUpdate = Database["public"]["Tables"]["template_versions"]["Update"];

// Template with relations (for API responses)
export interface TemplateWithRelations extends Template {
  groups: CriteriaGroupWithCriteria[];
  versions?: TemplateVersion[];
  calendar_links?: GoogleCalendarLink[];
}

export interface CriteriaGroupWithCriteria extends CriteriaGroup {
  criteria: Criteria[];
}

// Session with relations (for API responses)
export interface SessionWithRelations extends Session {
  template?: Template;
  coach?: User;
  agent?: User;
  call?: Call;
  scores?: Score[];
  audit_log?: SessionAuditLog[];
}

// Score calculation result
export interface SessionScoreResult {
  total_score: number;
  total_possible: number;
  percentage_score: number;
  pass_status: PassStatus;
  has_auto_fail: boolean;
  auto_fail_criteria_ids: string[];
}

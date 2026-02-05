export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums
export type UserRole = "caller" | "admin" | "superadmin";
export type CallStatus = "pending" | "processing" | "analyzed" | "failed";
export type CallSource = "webhook" | "google_notes" | "manual" | "api";
export type GradingFieldType = "score" | "text" | "checklist" | "boolean" | "percentage";
export type ImportanceLevel = "high" | "medium" | "low";
export type PlanType = "free" | "starter" | "professional" | "enterprise";
export type ReportStatus = "generating" | "ready" | "failed";

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

// Re-export database types
export * from "./database";

// Legacy types for compatibility with existing components
export interface Call {
  id: string;
  title?: string;
  raw_notes?: string;
  status: "pending" | "processing" | "analyzed" | "failed";
  source: "manual" | "webhook" | "upload";
  duration?: number;
  call_timestamp: string;
  customer_name?: string;
  customer_company?: string;
  customer_phone?: string;
  customer_email?: string;
  external_id?: string;
  org_id: string;
  caller_id?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  caller?: {
    id: string;
    name: string;
    team?: string;
  };
  analyses?: Analysis[];
}

export interface Analysis {
  id: string;
  call_id: string;
  overall_score?: number;
  composite_score?: number;
  sentiment_score?: number;
  sentiment_label?: string;
  talk_ratio?: number;
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  key_topics?: string[];
  objections?: string[];
  action_items?: string[];
  next_steps?: string[];
  competitor_mentions?: string[];
  pricing_discussed?: boolean;
  decision_maker_present?: boolean;
  follow_up_required?: boolean;
  deal_probability?: number;
  criteria_scores?: Record<string, CriterionScore>;
  results_json?: AnalysisResults;
  created_at: string;
}

export interface CriterionScore {
  score: number;
  max_score: number;
  feedback: string;
}

export interface AnalysisResults {
  summary: string;
  overall_score: number;
  sentiment: {
    score: number;
    label: string;
  };
  talk_ratio: number;
  key_topics: string[];
  objections_handled: Array<{
    objection: string;
    response: string;
    effectiveness: number;
  }>;
  strengths: string[];
  areas_for_improvement: string[];
  action_items: string[];
  criteria_scores: Record<string, CriterionScore>;
  deal_probability: number;
  next_steps: string[];
  competitor_mentions: string[];
}

export interface DashboardStats {
  totalCalls: number;
  analyzedCalls: number;
  averageScore: number;
  topScore: number;
  callsByStatus: Record<string, number>;
  scoreDistribution: Array<{ range: string; count: number }>;
  callsOverTime: Array<{ date: string; count: number; avgScore: number }>;
  recentScores: Array<{
    callerId: string;
    callerName: string;
    score: number;
    date: string;
  }>;
  period: string;
}

export interface Caller {
  id: string;
  name: string;
  email?: string;
  team?: string;
  department?: string;
  org_id: string;
  user_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  calls?: Call[];
}

export interface ChartData {
  name: string;
  value: number;
}

export interface Insight {
  id: string;
  call_id?: string;
  org_id: string;
  type: "strength" | "improvement" | "objection" | "opportunity" | "risk" | "general";
  title: string;
  description: string;
  importance: "high" | "medium" | "low";
  timestamp?: number;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

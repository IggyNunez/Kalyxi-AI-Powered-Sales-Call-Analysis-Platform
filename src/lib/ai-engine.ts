/**
 * AI Engine
 *
 * Handles AI-powered analysis of sales call transcripts using the
 * modern template/criteria system (8 criteria types).
 *
 * Main export: analyzeWithTemplate() - used by auto-pipeline and manual triggers
 */

import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/server";
import type {
  Template,
  Criteria,
  CriteriaGroup,
  CriteriaType,
  OrgSettings,
  ScoreValue,
  ScaleCriteriaConfig,
  PassFailCriteriaConfig,
  ChecklistCriteriaConfig,
  DropdownCriteriaConfig,
  MultiSelectCriteriaConfig,
  StarsCriteriaConfig,
  PercentageCriteriaConfig,
} from "@/types/database";

// ============================================================================
// OPENAI CLIENT
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// ============================================================================
// TYPES
// ============================================================================

export interface AIScoreResult {
  criteriaId: string;
  groupId?: string | null;
  value: ScoreValue;
  rawScore: number;
  normalizedScore: number;
  weightedScore: number;
  isAutoFailTriggered: boolean;
  comment: string;
}

export interface AnalyzeWithTemplateResult {
  success: boolean;
  scores?: AIScoreResult[];
  analysis?: {
    summary: string;
    strengths: string[];
    improvements: string[];
    actionItems: string[];
    objections: Array<{
      objection: string;
      response: string;
      effectiveness: number;
    }>;
    sentiment: {
      overall: "positive" | "neutral" | "negative";
      score: number;
    };
    talkRatio: number;
    competitorMentions: string[];
  };
  model?: string;
  processingTimeMs?: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
  error?: string;
}

// Shape of each criterion score returned by the AI
interface AICriterionResponse {
  criteriaId: string;
  value: unknown;
  feedback: string;
  autoFailTriggered?: boolean;
}

interface AIResponse {
  criteriaScores: AICriterionResponse[];
  summary: string;
  strengths: string[];
  improvements: string[];
  actionItems: string[];
  objections: Array<{
    objection: string;
    response: string;
    effectiveness: number;
  }>;
  sentiment: {
    overall: "positive" | "neutral" | "negative";
    score: number;
  };
  talkRatio: number;
  competitorMentions: string[];
}

// ============================================================================
// PROMPT BUILDER
// ============================================================================

function buildCriterionPromptSection(criterion: Criteria): string {
  const config = criterion.config;
  let typeInstructions = "";
  let valueFormat = "";

  switch (criterion.criteria_type) {
    case "scale": {
      const c = config as ScaleCriteriaConfig;
      typeInstructions = `Score on a scale from ${c.min} to ${c.max} (step: ${c.step}).`;
      if (c.labels) {
        const labelStr = Object.entries(c.labels)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        typeInstructions += ` Labels: ${labelStr}`;
      }
      valueFormat = `{ "value": <number ${c.min}-${c.max}> }`;
      break;
    }
    case "pass_fail": {
      const c = config as PassFailCriteriaConfig;
      typeInstructions = `Pass/Fail assessment. "${c.pass_label}" (score: ${c.pass_value}) or "${c.fail_label}" (score: ${c.fail_value}).`;
      valueFormat = `{ "passed": <boolean> }`;
      break;
    }
    case "checklist": {
      const c = config as ChecklistCriteriaConfig;
      const items = c.items.map((i) => `"${i.id}": ${i.label} (${i.points} pts)`).join(", ");
      typeInstructions = `Checklist - mark which items were demonstrated. Items: ${items}. Scoring: ${c.scoring}.`;
      valueFormat = `{ "checked": [<item_id strings>], "unchecked": [<item_id strings>] }`;
      break;
    }
    case "text": {
      typeInstructions = "Provide a detailed text assessment.";
      valueFormat = `{ "response": "<text>" }`;
      break;
    }
    case "dropdown": {
      const c = config as DropdownCriteriaConfig;
      const opts = c.options.map((o) => `"${o.value}": ${o.label} (score: ${o.score})`).join(", ");
      typeInstructions = `Select the best-matching option. Options: ${opts}.`;
      valueFormat = `{ "selected": "<option_value>" }`;
      break;
    }
    case "multi_select": {
      const c = config as MultiSelectCriteriaConfig;
      const opts = c.options.map((o) => `"${o.value}": ${o.label} (score: ${o.score})`).join(", ");
      typeInstructions = `Select all applicable options. Options: ${opts}. Scoring: ${c.scoring}.`;
      valueFormat = `{ "selected": [<option_value strings>] }`;
      break;
    }
    case "rating_stars": {
      const c = config as StarsCriteriaConfig;
      typeInstructions = `Star rating from 0 to ${c.max_stars}${c.allow_half ? " (half stars allowed)" : ""}.`;
      valueFormat = `{ "stars": <number 0-${c.max_stars}> }`;
      break;
    }
    case "percentage": {
      typeInstructions = "Percentage score from 0 to 100.";
      valueFormat = `{ "value": <number 0-100> }`;
      break;
    }
  }

  const keywordsHint = criterion.keywords?.length
    ? `\n    Look for keywords: ${criterion.keywords.join(", ")}`
    : "";
  const scoringGuide = criterion.scoring_guide
    ? `\n    Scoring guide: ${criterion.scoring_guide}`
    : "";
  const autoFail = criterion.is_auto_fail
    ? `\n    ⚠️ AUTO-FAIL: If score is below ${criterion.auto_fail_threshold ?? 0}, the entire session fails.`
    : "";

  return `  - ID: "${criterion.id}"
    Name: ${criterion.name}
    Description: ${criterion.description || "N/A"}
    Type: ${criterion.criteria_type}
    ${typeInstructions}
    Value format: ${valueFormat}
    Weight: ${criterion.weight} | Max score: ${criterion.max_score}${scoringGuide}${keywordsHint}${autoFail}`;
}

function buildTemplateAnalysisPrompt(
  template: Template,
  criteria: Criteria[],
  groups: CriteriaGroup[]
): string {
  // Organize criteria by group
  const ungrouped = criteria.filter((c) => !c.group_id);
  const grouped = groups
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({
      group: g,
      criteria: criteria
        .filter((c) => c.group_id === g.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((g) => g.criteria.length > 0);

  let criteriaSection = "";

  if (ungrouped.length > 0) {
    criteriaSection += "## Criteria (Ungrouped)\n";
    for (const c of ungrouped.sort((a, b) => a.sort_order - b.sort_order)) {
      criteriaSection += buildCriterionPromptSection(c) + "\n\n";
    }
  }

  for (const { group, criteria: groupCriteria } of grouped) {
    criteriaSection += `## Group: ${group.name}${group.description ? ` - ${group.description}` : ""} (weight: ${group.weight})\n`;
    for (const c of groupCriteria) {
      criteriaSection += buildCriterionPromptSection(c) + "\n\n";
    }
  }

  return `You are an expert sales call analyst and coach. Analyze the following sales call transcript and evaluate it against the scoring template "${template.name}".

Scoring method: ${template.scoring_method}
Pass threshold: ${template.pass_threshold}%

${criteriaSection}

## Instructions
1. Read the transcript carefully
2. For EACH criterion listed above, provide a score using the exact value format specified
3. Provide specific, evidence-based feedback for each criterion
4. Also provide an overall analysis with strengths, improvements, action items, etc.

## Response Format
Return a JSON object with this exact structure:
{
  "criteriaScores": [
    {
      "criteriaId": "<criterion ID from above>",
      "value": <value object matching the criterion's value format>,
      "feedback": "<specific evidence-based feedback>",
      "autoFailTriggered": false
    }
  ],
  "summary": "<2-3 sentence executive summary>",
  "strengths": ["<specific strength>"],
  "improvements": ["<specific improvement area>"],
  "actionItems": ["<specific follow-up action>"],
  "objections": [
    {
      "objection": "<customer objection>",
      "response": "<how it was handled>",
      "effectiveness": <1-10>
    }
  ],
  "sentiment": {
    "overall": "positive|neutral|negative",
    "score": <-1 to 1>
  },
  "talkRatio": <0-1, estimated salesperson talk time ratio>,
  "competitorMentions": ["<competitor name>"]
}

IMPORTANT:
- Each criteriaScores entry must use the EXACT criteriaId from the criteria list above
- Each value must match the exact format specified for that criterion type
- For checklist items, use the exact item IDs provided
- For dropdown/multi_select, use the exact option values provided
- Set autoFailTriggered to true ONLY if the criterion has auto-fail enabled AND the score is below the threshold
- Be thorough, specific, and constructive in feedback`;
}

// ============================================================================
// SCORE CALCULATION
// ============================================================================

function calculateRawScore(
  criteriaType: CriteriaType,
  value: ScoreValue,
  config: Criteria["config"],
  maxScore: number
): number {
  switch (criteriaType) {
    case "scale": {
      const c = config as ScaleCriteriaConfig;
      const v = (value as { value: number }).value;
      if (typeof v !== "number") return 0;
      const range = c.max - c.min;
      if (range <= 0) return 0;
      return Math.max(0, Math.min(maxScore, ((v - c.min) / range) * maxScore));
    }
    case "pass_fail": {
      const c = config as PassFailCriteriaConfig;
      const passed = (value as { passed: boolean }).passed;
      return passed ? c.pass_value : c.fail_value;
    }
    case "checklist": {
      const c = config as ChecklistCriteriaConfig;
      const checked = (value as { checked: string[] }).checked || [];
      const items = c.items || [];
      if (items.length === 0) return 0;
      if (c.scoring === "sum") {
        return items
          .filter((i) => checked.includes(i.id))
          .reduce((sum, i) => sum + i.points, 0);
      } else if (c.scoring === "average") {
        const checkedItems = items.filter((i) => checked.includes(i.id));
        if (checkedItems.length === 0) return 0;
        const totalPoints = checkedItems.reduce((sum, i) => sum + i.points, 0);
        return totalPoints / items.length;
      } else {
        // all_required
        return checked.length === items.length ? maxScore : 0;
      }
    }
    case "text": {
      // Text criteria have no numeric score
      return 0;
    }
    case "dropdown": {
      const c = config as DropdownCriteriaConfig;
      const selected = (value as { selected: string }).selected;
      const option = c.options.find((o) => o.value === selected);
      return option?.score ?? 0;
    }
    case "multi_select": {
      const c = config as MultiSelectCriteriaConfig;
      const selected = (value as { selected: string[] }).selected || [];
      const selectedOptions = c.options.filter((o) => selected.includes(o.value));
      if (selectedOptions.length === 0) return 0;
      const total = selectedOptions.reduce((sum, o) => sum + o.score, 0);
      return c.scoring === "average" ? total / selectedOptions.length : total;
    }
    case "rating_stars": {
      const c = config as StarsCriteriaConfig;
      const stars = (value as { stars: number }).stars;
      if (c.max_stars <= 0) return 0;
      return (stars / c.max_stars) * maxScore;
    }
    case "percentage": {
      const v = (value as { value: number }).value;
      return (v / 100) * maxScore;
    }
    default:
      return 0;
  }
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze a transcript against a template's criteria using AI.
 * Returns structured scores for each criterion plus analysis metadata.
 */
export async function analyzeWithTemplate(
  transcript: string,
  template: Template,
  criteria: Criteria[],
  groups: CriteriaGroup[],
  kbContext?: string
): Promise<AnalyzeWithTemplateResult> {
  const startTime = Date.now();

  try {
    // Get org settings for AI model configuration
    const supabase = await createAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("settings_json")
      .eq("id", template.org_id)
      .single();

    const settings = org?.settings_json as OrgSettings | null;
    const model = settings?.ai?.model || "gpt-4o";
    const temperature = settings?.ai?.temperature || 0.3;
    const customPrefix = settings?.ai?.customPromptPrefix || "";

    // Build the prompt
    const systemPrompt = buildTemplateAnalysisPrompt(template, criteria, groups);

    // Build user message
    let userContent = "";
    if (customPrefix) {
      userContent += customPrefix + "\n\n";
    }
    if (kbContext) {
      userContent += `## Company Knowledge Base Context\n${kbContext}\n\n`;
    }
    userContent += `## Call Transcript\n${transcript}`;

    // Call OpenAI
    const response = await getOpenAIClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "No response from AI" };
    }

    const aiResponse = JSON.parse(content) as AIResponse;

    // Map AI responses to scored results
    const scores: AIScoreResult[] = [];

    for (const aiScore of aiResponse.criteriaScores || []) {
      const criterion = criteria.find((c) => c.id === aiScore.criteriaId);
      if (!criterion) continue;

      const value = aiScore.value as ScoreValue;
      const rawScore = calculateRawScore(
        criterion.criteria_type,
        value,
        criterion.config,
        criterion.max_score
      );
      const normalizedScore =
        criterion.max_score > 0 ? (rawScore / criterion.max_score) * 100 : 0;
      const weightedScore = normalizedScore * (criterion.weight / 100);

      // Check auto-fail
      const isAutoFailTriggered =
        criterion.is_auto_fail &&
        criterion.auto_fail_threshold != null &&
        normalizedScore < criterion.auto_fail_threshold;

      scores.push({
        criteriaId: criterion.id,
        groupId: criterion.group_id || null,
        value,
        rawScore,
        normalizedScore,
        weightedScore,
        isAutoFailTriggered: isAutoFailTriggered || (aiScore.autoFailTriggered ?? false),
        comment: aiScore.feedback || "",
      });
    }

    const processingTimeMs = Date.now() - startTime;
    const tokenUsage = {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    };

    return {
      success: true,
      scores,
      analysis: {
        summary: aiResponse.summary || "",
        strengths: aiResponse.strengths || [],
        improvements: aiResponse.improvements || [],
        actionItems: aiResponse.actionItems || [],
        objections: aiResponse.objections || [],
        sentiment: aiResponse.sentiment || { overall: "neutral", score: 0 },
        talkRatio: aiResponse.talkRatio ?? 0.5,
        competitorMentions: aiResponse.competitorMentions || [],
      },
      model,
      processingTimeMs,
      tokenUsage,
    };
  } catch (error) {
    console.error("[AIEngine] Analysis error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}

// ============================================================================
// LEGACY COMPAT: analyzeCall (used by /api/calls/[id]/analyze)
// ============================================================================

/**
 * Analyze a call by ID using the org's default template.
 * This wraps analyzeWithTemplate for backward compatibility with the
 * manual analyze endpoint.
 */
export async function analyzeCall(
  callId: string,
  rawNotes: string,
  orgId: string
): Promise<{
  success: boolean;
  analysis?: {
    overallScore: number;
    compositeScore: number;
    summary: string;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
    gradingResults: Array<{
      criterionId: string;
      criterionName: string;
      type: string;
      score: number;
      feedback: string;
    }>;
  };
  processingTimeMs?: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
  error?: string;
}> {
  const supabase = await createAdminClient();

  // Find org's default template
  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
    .eq("is_default", true)
    .single();

  if (!template) {
    // Fallback to any active template
    const { data: anyTemplate } = await supabase
      .from("templates")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!anyTemplate) {
      return { success: false, error: "No active template found for this organization" };
    }

    return analyzeCallWithTemplate(rawNotes, anyTemplate as unknown as Template);
  }

  return analyzeCallWithTemplate(rawNotes, template as unknown as Template);
}

async function analyzeCallWithTemplate(
  rawNotes: string,
  template: Template
): Promise<{
  success: boolean;
  analysis?: {
    overallScore: number;
    compositeScore: number;
    summary: string;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
    gradingResults: Array<{
      criterionId: string;
      criterionName: string;
      type: string;
      score: number;
      feedback: string;
    }>;
  };
  processingTimeMs?: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
  error?: string;
}> {
  const supabase = await createAdminClient();

  const { data: criteria } = await supabase
    .from("criteria")
    .select("*")
    .eq("template_id", template.id)
    .order("sort_order");

  const { data: groups } = await supabase
    .from("criteria_groups")
    .select("*")
    .eq("template_id", template.id)
    .order("sort_order");

  if (!criteria || criteria.length === 0) {
    return { success: false, error: "Template has no criteria" };
  }

  const result = await analyzeWithTemplate(
    rawNotes,
    template,
    criteria as Criteria[],
    (groups || []) as CriteriaGroup[]
  );

  if (!result.success || !result.scores) {
    return { success: false, error: result.error };
  }

  // Convert to legacy format
  const totalWeightedScore = result.scores.reduce(
    (sum, s) => sum + s.weightedScore,
    0
  );
  const totalWeight = result.scores.reduce((sum, s) => {
    const c = criteria.find((cr) => cr.id === s.criteriaId);
    return sum + (c?.weight || 0);
  }, 0);
  const compositeScore =
    totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;

  return {
    success: true,
    analysis: {
      overallScore: compositeScore,
      compositeScore,
      summary: result.analysis?.summary || "",
      strengths: result.analysis?.strengths || [],
      improvements: result.analysis?.improvements || [],
      recommendations: result.analysis?.actionItems || [],
      gradingResults: result.scores.map((s) => {
        const c = criteria.find((cr) => cr.id === s.criteriaId);
        return {
          criterionId: s.criteriaId,
          criterionName: c?.name || "Unknown",
          type: c?.criteria_type || "scale",
          score: s.normalizedScore,
          feedback: s.comment,
        };
      }),
    },
    processingTimeMs: result.processingTimeMs,
    tokenUsage: result.tokenUsage,
  };
}

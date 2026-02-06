import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/server";
import {
  GradingCriterion,
  AnalysisResults,
  GradingResult,
  OrgSettings,
  ScorecardCriterion,
  Scorecard,
  CriterionScoreResult,
} from "@/types/database";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Build dynamic prompt from grading criteria (legacy support)
function buildAnalysisPrompt(criteria: GradingCriterion[]): string {
  const criteriaDescriptions = criteria
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      let typeDesc = "";
      switch (c.type) {
        case "score":
          typeDesc = `Score from ${c.minValue || 1} to ${c.maxValue || 10}`;
          break;
        case "text":
          typeDesc = "Detailed text analysis";
          break;
        case "checklist":
          typeDesc = `Checklist of items: ${c.options?.join(", ")}`;
          break;
        case "boolean":
          typeDesc = "Yes/No assessment";
          break;
        case "percentage":
          typeDesc = "Percentage (0-100)";
          break;
      }
      return `- ${c.name} (${c.id}): ${c.description}. Type: ${typeDesc}`;
    })
    .join("\n");

  return buildBasePrompt(criteriaDescriptions);
}

// Build prompt from scorecard criteria (new enhanced system)
function buildScorecardPrompt(criteria: ScorecardCriterion[]): string {
  const criteriaDescriptions = criteria
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const keywordsHint = c.keywords?.length
        ? ` Look for keywords: ${c.keywords.join(", ")}.`
        : "";
      return `- ${c.name} (${c.id}): ${c.description}
    Score: 0 to ${c.max_score}
    Weight: ${c.weight}%
    Scoring Guide: ${c.scoring_guide}${keywordsHint}`;
    })
    .join("\n\n");

  return `You are an expert sales call analyst. Analyze the following sales call notes/transcription and provide a comprehensive evaluation based on the scorecard criteria below.

## Scorecard Criteria to Evaluate:
${criteriaDescriptions}

## Response Format:
Return a JSON object with the following structure:
{
  "overallScore": number (0-100, weighted average of all criteria),
  "criteriaScores": {
    "criterion_id": {
      "name": "string",
      "score": number (0 to max_score for this criterion),
      "max_score": number,
      "weight": number,
      "weighted_score": number (score/max_score * weight),
      "feedback": "string (specific feedback)",
      "highlights": ["string array of positive observations"],
      "improvements": ["string array of suggestions"]
    }
  },
  "gradingResults": [
    {
      "criterionId": "string",
      "criterionName": "string",
      "type": "score",
      "value": number,
      "score": number (normalized 0-100),
      "feedback": "string",
      "confidence": number (0-1)
    }
  ],
  "compositeScore": number (weighted average),
  "strengths": ["string array of key strengths"],
  "improvements": ["string array of improvement areas"],
  "executiveSummary": "2-3 sentence summary",
  "actionItems": ["string array of follow-up actions"],
  "objections": [
    {
      "objection": "the objection",
      "response": "how handled",
      "effectiveness": number (1-10)
    }
  ],
  "gatekeeperDetected": boolean,
  "gatekeeperHandling": "string if detected",
  "competitorMentions": ["string array"],
  "sentiment": {
    "overall": "positive|neutral|negative",
    "score": number (-1 to 1),
    "progression": [{"timestamp": number, "sentiment": number}]
  },
  "callMetrics": {
    "talkRatio": number (0-1),
    "questionCount": number,
    "interruptionCount": number,
    "silenceDuration": number
  },
  "recommendations": ["string array of coaching tips"]
}

Be thorough and specific. Each criterion score should match the scoring guide provided.`;
}

// Base prompt builder
function buildBasePrompt(criteriaDescriptions: string): string {
  return `You are an expert sales call analyst. Analyze the following sales call notes/transcription and provide a comprehensive evaluation.

## Grading Criteria to Evaluate:
${criteriaDescriptions}

## Response Format:
Return a JSON object with the following structure:
{
  "overallScore": number (0-100, overall call quality),
  "gradingResults": [
    {
      "criterionId": "string (the criterion id)",
      "criterionName": "string",
      "type": "score|text|checklist|boolean|percentage",
      "value": "the actual value based on type",
      "score": number (normalized 0-100 for comparison),
      "feedback": "string (specific feedback for this criterion)",
      "confidence": number (0-1, how confident you are in this assessment)
    }
  ],
  "compositeScore": number (weighted average based on criterion weights),
  "strengths": ["string array of key strengths demonstrated"],
  "improvements": ["string array of specific improvement areas"],
  "executiveSummary": "2-3 sentence summary of the call",
  "actionItems": ["string array of follow-up actions needed"],
  "objections": [
    {
      "objection": "the customer objection",
      "response": "how it was handled",
      "effectiveness": number (1-10)
    }
  ],
  "gatekeeperDetected": boolean,
  "gatekeeperHandling": "string (if gatekeeper detected, how it was handled)",
  "competitorMentions": ["string array of competitors mentioned"],
  "sentiment": {
    "overall": "positive|neutral|negative",
    "score": number (-1 to 1),
    "progression": [{"timestamp": number, "sentiment": number}]
  },
  "callMetrics": {
    "talkRatio": number (0-1, estimated caller talk time),
    "questionCount": number,
    "interruptionCount": number,
    "silenceDuration": number (estimated)
  },
  "recommendations": ["string array of specific coaching recommendations"]
}

Be thorough, specific, and constructive in your feedback. Focus on actionable insights.`;
}

// Analyze a single call
export async function analyzeCall(
  callId: string,
  rawNotes: string,
  orgId: string
): Promise<{
  success: boolean;
  analysis?: AnalysisResults;
  scorecard?: Scorecard;
  processingTimeMs?: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
  error?: string;
}> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  try {
    // Get organization settings
    const { data: org } = await supabase
      .from("organizations")
      .select("settings_json")
      .eq("id", orgId)
      .single();

    const settings = org?.settings_json as OrgSettings | null;
    const model = settings?.ai?.model || "gpt-4o";
    const temperature = settings?.ai?.temperature || 0.3;
    const customPrefix = settings?.ai?.customPromptPrefix || "";

    // Try to get active scorecard first (new system)
    const { data: scorecard } = await supabase
      .from("scorecards")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .eq("is_default", true)
      .single();

    let systemPrompt: string;
    let scorecardCriteria: ScorecardCriterion[] | null = null;
    let legacyCriteria: GradingCriterion[] | null = null;

    if (scorecard) {
      // Use new scorecard system
      scorecardCriteria = scorecard.criteria as ScorecardCriterion[];
      systemPrompt = buildScorecardPrompt(scorecardCriteria);
    } else {
      // Fall back to legacy grading templates
      const { data: template } = await supabase
        .from("grading_templates")
        .select("criteria_json")
        .eq("org_id", orgId)
        .eq("is_default", true)
        .eq("is_active", true)
        .single();

      if (!template) {
        return { success: false, error: "No active scorecard or grading template found" };
      }

      legacyCriteria = template.criteria_json as GradingCriterion[];
      systemPrompt = buildAnalysisPrompt(legacyCriteria);
    }

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${customPrefix ? customPrefix + "\n\n" : ""}## Call Notes/Transcription:\n${rawNotes}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "No response from AI" };
    }

    const analysisResults = JSON.parse(content) as AnalysisResults;

    // Calculate composite score from weighted criteria
    let weightedSum = 0;
    let totalWeight = 0;

    if (scorecardCriteria) {
      // New scorecard system - use criteriaScores if available
      const resultsWithCriteria = analysisResults as unknown as { criteriaScores?: Record<string, CriterionScoreResult> };
      const criteriaScores = resultsWithCriteria.criteriaScores;
      if (criteriaScores) {
        for (const [id, data] of Object.entries(criteriaScores)) {
          const criterion = scorecardCriteria.find((c) => c.id === id);
          if (criterion && data.score !== undefined) {
            const normalizedScore = (data.score / data.max_score) * 100;
            weightedSum += normalizedScore * criterion.weight;
            totalWeight += criterion.weight;
          }
        }
      } else {
        // Fallback to gradingResults
        for (const result of analysisResults.gradingResults || []) {
          const criterion = scorecardCriteria.find((c) => c.id === result.criterionId);
          if (criterion && result.score !== undefined) {
            weightedSum += result.score * criterion.weight;
            totalWeight += criterion.weight;
          }
        }
      }
    } else if (legacyCriteria) {
      // Legacy grading template system
      for (const result of analysisResults.gradingResults || []) {
        const criterion = legacyCriteria.find((c) => c.id === result.criterionId);
        if (criterion && result.score !== undefined) {
          weightedSum += result.score * criterion.weight;
          totalWeight += criterion.weight;
        }
      }
    }

    if (totalWeight > 0) {
      analysisResults.compositeScore = Math.round(weightedSum / totalWeight);
    }

    const processingTimeMs = Date.now() - startTime;
    const tokenUsage = {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    };

    return {
      success: true,
      analysis: analysisResults,
      scorecard: scorecard || undefined,
      processingTimeMs,
      tokenUsage,
    };
  } catch (error) {
    console.error("AI analysis error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}

// Process a call from the queue
export async function processQueuedCall(queueItemId: string): Promise<boolean> {
  const supabase = createAdminClient();

  // Get queue item
  const { data: queueItem, error: queueError } = await supabase
    .from("processing_queue")
    .select("*, call:calls(*)")
    .eq("id", queueItemId)
    .single();

  if (queueError || !queueItem) {
    console.error("Queue item not found:", queueItemId);
    return false;
  }

  // Update status to processing
  await supabase
    .from("processing_queue")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", queueItemId);

  // Update call status
  await supabase
    .from("calls")
    .update({ status: "processing" })
    .eq("id", queueItem.call_id);

  try {
    const call = queueItem.call as { id: string; raw_notes: string; org_id: string };

    // Run analysis
    const result = await analyzeCall(call.id, call.raw_notes, call.org_id);

    if (!result.success || !result.analysis) {
      throw new Error(result.error || "Analysis failed");
    }

    // Save analysis
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .insert({
        call_id: call.id,
        ai_model: "gpt-4o",
        grading_results_json: result.analysis,
        overall_score: result.analysis.overallScore,
        composite_score: result.analysis.compositeScore,
        processing_time_ms: result.processingTimeMs,
        token_usage: result.tokenUsage,
      })
      .select()
      .single();

    if (analysisError) {
      throw new Error("Failed to save analysis");
    }

    // Save call_score_results if scorecard was used
    if (result.scorecard) {
      const analysisWithCriteria = result.analysis as unknown as { criteriaScores?: Record<string, CriterionScoreResult> };
      const criteriaScores = analysisWithCriteria.criteriaScores;
      const scorecardCriteria = result.scorecard.criteria as ScorecardCriterion[];

      // Calculate total and percentage scores
      let totalScore = 0;
      let maxPossibleScore = 0;

      if (criteriaScores) {
        for (const data of Object.values(criteriaScores)) {
          totalScore += data.weighted_score || 0;
          maxPossibleScore += data.weight || 0;
        }
      } else {
        // Fallback calculation
        for (const criterion of scorecardCriteria) {
          maxPossibleScore += criterion.max_score * (criterion.weight / 100);
        }
        totalScore = (result.analysis.compositeScore / 100) * maxPossibleScore;
      }

      const percentageScore = maxPossibleScore > 0
        ? (totalScore / maxPossibleScore) * 100
        : result.analysis.compositeScore;

      await supabase.from("call_score_results").insert({
        call_id: call.id,
        scorecard_id: result.scorecard.id,
        org_id: call.org_id,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        percentage_score: percentageScore,
        criteria_scores: criteriaScores || {},
        summary: result.analysis.executiveSummary,
        strengths: result.analysis.strengths || [],
        improvements: result.analysis.improvements || [],
        scored_by: "ai",
        scorecard_version: result.scorecard.version,
        scorecard_snapshot: scorecardCriteria,
      });
    }

    // Generate report
    const report = generateReport(call, result.analysis, result.scorecard);

    await supabase.from("reports").insert({
      call_id: call.id,
      analysis_id: analysis.id,
      report_json: report,
      status: "ready",
    });

    // Update call and queue status
    await supabase
      .from("calls")
      .update({ status: "analyzed" })
      .eq("id", call.id);

    await supabase
      .from("processing_queue")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", queueItemId);

    return true;
  } catch (error) {
    console.error("Queue processing error:", error);

    const newAttempts = (queueItem.attempts || 0) + 1;
    const maxAttempts = queueItem.max_attempts || 3;

    if (newAttempts >= maxAttempts) {
      // Max retries reached
      await supabase
        .from("processing_queue")
        .update({
          status: "failed",
          attempts: newAttempts,
          last_error: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", queueItemId);

      await supabase
        .from("calls")
        .update({ status: "failed" })
        .eq("id", queueItem.call_id);
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, newAttempts) * 60000; // 2^n minutes
      await supabase
        .from("processing_queue")
        .update({
          status: "queued",
          attempts: newAttempts,
          last_error: error instanceof Error ? error.message : "Unknown error",
          scheduled_at: new Date(Date.now() + retryDelay).toISOString(),
        })
        .eq("id", queueItemId);

      await supabase
        .from("calls")
        .update({ status: "pending" })
        .eq("id", queueItem.call_id);
    }

    return false;
  }
}

// Generate report from analysis
function generateReport(
  call: { id: string; raw_notes: string; org_id: string },
  analysis: AnalysisResults,
  scorecard?: Scorecard
) {
  const scorecardCriteria = scorecard?.criteria as ScorecardCriterion[] | undefined;
  const analysisWithCriteria = analysis as unknown as { criteriaScores?: Record<string, CriterionScoreResult> };
  const criteriaScores = analysisWithCriteria.criteriaScores;

  // Build scorecard section with weights from scorecard if available
  let scorecardSection;
  if (scorecardCriteria && criteriaScores) {
    scorecardSection = {
      name: scorecard?.name || "Scorecard",
      version: scorecard?.version || 1,
      criteria: scorecardCriteria.map((c) => {
        const score = criteriaScores[c.id];
        return {
          name: c.name,
          score: score?.score || 0,
          maxScore: c.max_score,
          weight: c.weight,
          weightedScore: score?.weighted_score || 0,
          passed: score ? (score.score / score.max_score) >= 0.7 : false,
        };
      }),
      finalScore: analysis.compositeScore,
      passed: analysis.compositeScore >= 70,
    };
  } else {
    // Legacy format
    scorecardSection = {
      criteria: (analysis.gradingResults || []).map((r) => ({
        name: r.criterionName,
        score: r.score || 0,
        weight: 1,
        passed: (r.score || 0) >= 70,
      })),
      finalScore: analysis.compositeScore,
      passed: analysis.compositeScore >= 70,
    };
  }

  return {
    version: "2.0",
    generatedAt: new Date().toISOString(),
    callSummary: {
      title: `Call Analysis`,
      date: new Date().toISOString(),
      callerName: "Unknown", // Would be enriched from call data
    },
    analysis,
    scorecard: scorecardSection,
    coaching: {
      topStrengths: (analysis.strengths || []).slice(0, 3),
      priorityImprovements: (analysis.improvements || []).slice(0, 3),
      actionPlan: (analysis.recommendations || []).slice(0, 5),
    },
  };
}

// Process pending queue items (called by cron or background job)
export async function processQueue(maxItems: number = 10): Promise<number> {
  const supabase = createAdminClient();

  // Get pending items
  const { data: items, error } = await supabase
    .from("processing_queue")
    .select("id")
    .eq("status", "queued")
    .lte("scheduled_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("scheduled_at", { ascending: true })
    .limit(maxItems);

  if (error || !items || items.length === 0) {
    return 0;
  }

  let processed = 0;
  for (const item of items) {
    const success = await processQueuedCall(item.id);
    if (success) processed++;
  }

  return processed;
}

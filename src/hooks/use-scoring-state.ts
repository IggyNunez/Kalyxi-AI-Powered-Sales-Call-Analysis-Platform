"use client";

import { useMemo } from "react";
import {
  Criteria,
  Template,
  ScoreValue,
  SessionScoreResult,
} from "@/types/database";
import {
  calculateSessionScore,
  calculateCriteriaScore,
  ScoreInput,
} from "@/lib/scoring-engine";

interface LocalScore {
  value: ScoreValue | null;
  is_na: boolean;
  comment: string;
  isSaving: boolean;
  lastSaved: Date | null;
}

interface UseScoringStateInput {
  template: Template;
  criteria: Criteria[];
  localScores: Map<string, LocalScore>;
}

interface UseScoringStateReturn {
  // Progress tracking
  totalCriteria: number;
  scoredCriteria: number;
  requiredCriteria: number;
  scoredRequired: number;
  progressPercent: number;
  requiredProgressPercent: number;

  // Real-time score preview
  projectedScore: SessionScoreResult | null;
  isPassing: boolean;
  passThreshold: number;

  // Auto-fail tracking
  autoFailTriggered: boolean;
  autoFailCriteriaIds: string[];
  autoFailCriteriaNames: string[];

  // Required tracking
  unscoredRequiredIds: string[];
  allRequiredScored: boolean;

  // Helpers
  canComplete: boolean;
  nextUnscoredId: string | null;
  nextUnscoredRequiredId: string | null;
}

export function useScoringState({
  template,
  criteria,
  localScores,
}: UseScoringStateInput): UseScoringStateReturn {
  return useMemo(() => {
    // Basic counts
    const totalCriteria = criteria.length;
    const requiredCriteriaList = criteria.filter((c) => c.is_required);
    const requiredCriteria = requiredCriteriaList.length;

    // Count scored criteria
    let scoredCriteria = 0;
    let scoredRequired = 0;
    const unscoredRequiredIds: string[] = [];

    for (const c of criteria) {
      const score = localScores.get(c.id);
      const isScored = score && (score.value !== null || score.is_na);

      if (isScored) {
        scoredCriteria++;
        if (c.is_required) {
          scoredRequired++;
        }
      } else if (c.is_required) {
        unscoredRequiredIds.push(c.id);
      }
    }

    // Calculate progress percentages
    const progressPercent =
      totalCriteria > 0 ? (scoredCriteria / totalCriteria) * 100 : 0;
    const requiredProgressPercent =
      requiredCriteria > 0 ? (scoredRequired / requiredCriteria) * 100 : 100;

    // Build score inputs for calculation
    const scoreInputs: ScoreInput[] = [];
    const autoFailCriteriaIds: string[] = [];
    const autoFailCriteriaNames: string[] = [];

    for (const c of criteria) {
      const localScore = localScores.get(c.id);
      if (!localScore || (localScore.value === null && !localScore.is_na)) {
        continue; // Skip unscored
      }

      const scoreInput: ScoreInput = {
        criteria: c,
        value: localScore.value || { value: 0 },
        isNa: localScore.is_na,
      };

      scoreInputs.push(scoreInput);

      // Check for auto-fail on this criteria
      if (!localScore.is_na && localScore.value !== null) {
        const result = calculateCriteriaScore(scoreInput);
        if (result.isAutoFailTriggered) {
          autoFailCriteriaIds.push(c.id);
          autoFailCriteriaNames.push(c.name);
        }
      }
    }

    // Calculate projected score
    let projectedScore: SessionScoreResult | null = null;
    if (scoreInputs.length > 0) {
      projectedScore = calculateSessionScore({
        template,
        criteria,
        scores: scoreInputs,
      });
    }

    // Determine pass/fail status
    const passThreshold = template.pass_threshold || 70;
    const autoFailTriggered = autoFailCriteriaIds.length > 0;
    const isPassing =
      projectedScore !== null &&
      !autoFailTriggered &&
      projectedScore.percentage_score >= passThreshold;

    // Required check
    const allRequiredScored = unscoredRequiredIds.length === 0;

    // Can complete - either all required scored, or partial submission allowed
    const settings = template.settings as {
      allow_partial_submission?: boolean;
    } | null;
    const allowPartial = settings?.allow_partial_submission || false;
    const canComplete = allRequiredScored || allowPartial;

    // Find next unscored criteria (in sort order)
    const sortedCriteria = [...criteria].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    const nextUnscored = sortedCriteria.find((c) => {
      const score = localScores.get(c.id);
      return !score || (score.value === null && !score.is_na);
    });
    const nextUnscoredId = nextUnscored?.id || null;

    // Find next unscored required criteria
    const nextUnscoredRequired = sortedCriteria.find((c) => {
      if (!c.is_required) return false;
      const score = localScores.get(c.id);
      return !score || (score.value === null && !score.is_na);
    });
    const nextUnscoredRequiredId = nextUnscoredRequired?.id || null;

    return {
      // Progress
      totalCriteria,
      scoredCriteria,
      requiredCriteria,
      scoredRequired,
      progressPercent: Math.round(progressPercent),
      requiredProgressPercent: Math.round(requiredProgressPercent),

      // Score preview
      projectedScore,
      isPassing,
      passThreshold,

      // Auto-fail
      autoFailTriggered,
      autoFailCriteriaIds,
      autoFailCriteriaNames,

      // Required
      unscoredRequiredIds,
      allRequiredScored,

      // Helpers
      canComplete,
      nextUnscoredId,
      nextUnscoredRequiredId,
    };
  }, [template, criteria, localScores]);
}

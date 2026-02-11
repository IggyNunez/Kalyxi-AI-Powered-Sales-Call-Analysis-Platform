/**
 * Scoring Engine
 *
 * Handles score calculation for different criteria types and scoring methods.
 * Supports: weighted, simple_average, pass_fail, points, custom_formula
 */

import {
  Criteria,
  CriteriaType,
  ScoringMethod,
  Score,
  ScoreValue,
  ScaleCriteriaConfig,
  PassFailCriteriaConfig,
  ChecklistCriteriaConfig,
  DropdownCriteriaConfig,
  MultiSelectCriteriaConfig,
  StarsCriteriaConfig,
  PercentageCriteriaConfig,
  SessionScoreResult,
  PassStatus,
  Template,
  CriteriaConfig,
} from "@/types/database";

// ============================================================================
// TYPES
// ============================================================================

export interface ScoreInput {
  criteria: Criteria;
  value: ScoreValue;
  isNa?: boolean;
}

export interface CriteriaScoreResult {
  criteriaId: string;
  rawScore: number;
  normalizedScore: number; // 0-100
  weightedScore: number;
  isNa: boolean;
  isAutoFailTriggered: boolean;
}

export interface SessionScoreInput {
  template: Template;
  criteria: Criteria[];
  scores: ScoreInput[];
}

// ============================================================================
// CRITERIA SCORE CALCULATORS
// ============================================================================

/**
 * Calculate raw score for a scale criteria
 */
function calculateScaleScore(
  value: ScoreValue,
  config: ScaleCriteriaConfig,
  maxScore: number
): number {
  const scaleValue = (value as { value: number }).value;
  if (typeof scaleValue !== "number") return 0;

  const { min, max } = config;
  const range = max - min;
  if (range <= 0) return 0;

  // Normalize to 0-1, then scale to maxScore
  const normalized = (scaleValue - min) / range;
  return Math.max(0, Math.min(maxScore, normalized * maxScore));
}

/**
 * Calculate raw score for a pass/fail criteria
 */
function calculatePassFailScore(
  value: ScoreValue,
  config: PassFailCriteriaConfig
): number {
  const passed = (value as { passed: boolean }).passed;
  return passed ? config.pass_value : config.fail_value;
}

/**
 * Calculate raw score for a checklist criteria
 */
function calculateChecklistScore(
  value: ScoreValue,
  config: ChecklistCriteriaConfig,
  maxScore: number
): number {
  const checked = (value as { checked: string[] }).checked || [];
  const items = config.items || [];

  if (items.length === 0) return 0;

  if (config.scoring === "sum") {
    // Sum points of checked items
    const totalPoints = items
      .filter((item) => checked.includes(item.id))
      .reduce((sum, item) => sum + item.points, 0);
    const maxPoints = items.reduce((sum, item) => sum + item.points, 0);
    return maxPoints > 0 ? (totalPoints / maxPoints) * maxScore : 0;
  } else if (config.scoring === "average") {
    // Average of checked items
    const checkedItems = items.filter((item) => checked.includes(item.id));
    if (checkedItems.length === 0) return 0;
    const avgPoints =
      checkedItems.reduce((sum, item) => sum + item.points, 0) /
      checkedItems.length;
    const maxPoints = Math.max(...items.map((item) => item.points));
    return maxPoints > 0 ? (avgPoints / maxPoints) * maxScore : 0;
  } else if (config.scoring === "all_required") {
    // All items must be checked for full score
    return checked.length === items.length ? maxScore : 0;
  }

  return 0;
}

/**
 * Calculate raw score for a dropdown criteria
 */
function calculateDropdownScore(
  value: ScoreValue,
  config: DropdownCriteriaConfig,
  maxScore: number
): number {
  const selected = (value as { selected: string }).selected;
  const option = config.options?.find((opt) => opt.value === selected);
  if (!option) return 0;

  const maxOptionScore = Math.max(...config.options.map((opt) => opt.score));
  return maxOptionScore > 0 ? (option.score / maxOptionScore) * maxScore : 0;
}

/**
 * Calculate raw score for a multi-select criteria
 */
function calculateMultiSelectScore(
  value: ScoreValue,
  config: MultiSelectCriteriaConfig,
  maxScore: number
): number {
  const selected = (value as { selected: string[] }).selected || [];
  const options = config.options || [];

  if (options.length === 0 || selected.length === 0) return 0;

  const selectedOptions = options.filter((opt) => selected.includes(opt.value));

  if (config.scoring === "sum") {
    const totalScore = selectedOptions.reduce((sum, opt) => sum + opt.score, 0);
    const maxPossible = options.reduce((sum, opt) => sum + opt.score, 0);
    return maxPossible > 0 ? (totalScore / maxPossible) * maxScore : 0;
  } else if (config.scoring === "average") {
    const avgScore =
      selectedOptions.reduce((sum, opt) => sum + opt.score, 0) /
      selectedOptions.length;
    const maxOptionScore = Math.max(...options.map((opt) => opt.score));
    return maxOptionScore > 0 ? (avgScore / maxOptionScore) * maxScore : 0;
  }

  return 0;
}

/**
 * Calculate raw score for a star rating criteria
 */
function calculateStarsScore(
  value: ScoreValue,
  config: StarsCriteriaConfig,
  maxScore: number
): number {
  const stars = (value as { stars: number }).stars;
  if (typeof stars !== "number") return 0;

  const maxStars = config.max_stars || 5;
  return maxStars > 0 ? (stars / maxStars) * maxScore : 0;
}

/**
 * Calculate raw score for a percentage criteria
 */
function calculatePercentageScore(
  value: ScoreValue,
  _config: PercentageCriteriaConfig,
  maxScore: number
): number {
  const percentage = (value as { value: number }).value;
  if (typeof percentage !== "number") return 0;

  // Percentage is already 0-100
  return (Math.max(0, Math.min(100, percentage)) / 100) * maxScore;
}

/**
 * Calculate raw score for a text criteria (always returns max score if present)
 */
function calculateTextScore(value: ScoreValue, maxScore: number): number {
  const response = (value as { response: string }).response;
  // Text criteria typically gives full score if response is provided
  return response && response.trim().length > 0 ? maxScore : 0;
}

// ============================================================================
// MAIN SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate score for a single criteria
 */
export function calculateCriteriaScore(input: ScoreInput): CriteriaScoreResult {
  const { criteria, value, isNa = false } = input;

  // Handle N/A
  if (isNa) {
    return {
      criteriaId: criteria.id,
      rawScore: 0,
      normalizedScore: 0,
      weightedScore: 0,
      isNa: true,
      isAutoFailTriggered: false,
    };
  }

  let rawScore = 0;
  const config = criteria.config as CriteriaConfig;
  const maxScore = criteria.max_score || 100;

  // Calculate raw score based on criteria type
  switch (criteria.criteria_type) {
    case "scale":
      rawScore = calculateScaleScore(
        value,
        config as ScaleCriteriaConfig,
        maxScore
      );
      break;
    case "pass_fail":
      rawScore = calculatePassFailScore(value, config as PassFailCriteriaConfig);
      break;
    case "checklist":
      rawScore = calculateChecklistScore(
        value,
        config as ChecklistCriteriaConfig,
        maxScore
      );
      break;
    case "dropdown":
      rawScore = calculateDropdownScore(
        value,
        config as DropdownCriteriaConfig,
        maxScore
      );
      break;
    case "multi_select":
      rawScore = calculateMultiSelectScore(
        value,
        config as MultiSelectCriteriaConfig,
        maxScore
      );
      break;
    case "rating_stars":
      rawScore = calculateStarsScore(
        value,
        config as StarsCriteriaConfig,
        maxScore
      );
      break;
    case "percentage":
      rawScore = calculatePercentageScore(
        value,
        config as PercentageCriteriaConfig,
        maxScore
      );
      break;
    case "text":
      rawScore = calculateTextScore(value, maxScore);
      break;
    default:
      rawScore = 0;
  }

  // Normalize score to 0-100
  const normalizedScore =
    maxScore > 0 ? (rawScore / maxScore) * 100 : 0;

  // Apply weight for weighted score
  const weightedScore = (normalizedScore * criteria.weight) / 100;

  // Check for auto-fail
  const isAutoFailTriggered =
    criteria.is_auto_fail &&
    criteria.auto_fail_threshold !== undefined &&
    normalizedScore < criteria.auto_fail_threshold;

  return {
    criteriaId: criteria.id,
    rawScore: Math.round(rawScore * 100) / 100,
    normalizedScore: Math.round(normalizedScore * 100) / 100,
    weightedScore: Math.round(weightedScore * 100) / 100,
    isNa: false,
    isAutoFailTriggered,
  };
}

/**
 * Calculate total session score based on scoring method
 */
export function calculateSessionScore(
  input: SessionScoreInput
): SessionScoreResult {
  const { template, criteria, scores } = input;
  const scoringMethod = template.scoring_method;
  const passThreshold = template.pass_threshold || 70;

  // Calculate individual criteria scores
  const criteriaResults: CriteriaScoreResult[] = [];
  const autoFailCriteriaIds: string[] = [];

  for (const scoreInput of scores) {
    const result = calculateCriteriaScore(scoreInput);
    criteriaResults.push(result);

    if (result.isAutoFailTriggered) {
      autoFailCriteriaIds.push(result.criteriaId);
    }
  }

  // Filter out N/A scores for calculations
  const validResults = criteriaResults.filter((r) => !r.isNa);

  if (validResults.length === 0) {
    return {
      total_score: 0,
      total_possible: 0,
      percentage_score: 0,
      pass_status: "pending",
      has_auto_fail: false,
      auto_fail_criteria_ids: [],
    };
  }

  let totalScore = 0;
  let totalPossible = 0;
  let percentageScore = 0;

  switch (scoringMethod) {
    case "weighted": {
      // Sum of weighted scores
      totalScore = validResults.reduce((sum, r) => sum + r.weightedScore, 0);
      // Sum of all weights for valid (non-N/A) criteria
      const validCriteriaIds = new Set(validResults.map((r) => r.criteriaId));
      const totalWeight = criteria
        .filter((c) => validCriteriaIds.has(c.id))
        .reduce((sum, c) => sum + c.weight, 0);
      totalPossible = totalWeight;
      percentageScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
      break;
    }

    case "simple_average": {
      // Simple average of normalized scores
      const sumNormalized = validResults.reduce(
        (sum, r) => sum + r.normalizedScore,
        0
      );
      percentageScore = sumNormalized / validResults.length;
      totalScore = percentageScore;
      totalPossible = 100;
      break;
    }

    case "pass_fail": {
      // All criteria must pass (100% normalized)
      const allPassed = validResults.every((r) => r.normalizedScore >= 100);
      percentageScore = allPassed ? 100 : 0;
      totalScore = allPassed ? 100 : 0;
      totalPossible = 100;
      break;
    }

    case "points": {
      // Sum of raw scores
      totalScore = validResults.reduce((sum, r) => sum + r.rawScore, 0);
      const validCriteriaIds = new Set(validResults.map((r) => r.criteriaId));
      totalPossible = criteria
        .filter((c) => validCriteriaIds.has(c.id))
        .reduce((sum, c) => sum + (c.max_score || 100), 0);
      percentageScore =
        totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
      break;
    }

    case "custom_formula": {
      // For custom formula, fall back to weighted for now
      // Custom formulas would be evaluated separately
      totalScore = validResults.reduce((sum, r) => sum + r.weightedScore, 0);
      const validCriteriaIds = new Set(validResults.map((r) => r.criteriaId));
      const totalWeight = criteria
        .filter((c) => validCriteriaIds.has(c.id))
        .reduce((sum, c) => sum + c.weight, 0);
      totalPossible = totalWeight;
      percentageScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
      break;
    }

    default:
      totalScore = 0;
      totalPossible = 0;
      percentageScore = 0;
  }

  // Round to 2 decimal places
  totalScore = Math.round(totalScore * 100) / 100;
  totalPossible = Math.round(totalPossible * 100) / 100;
  percentageScore = Math.round(percentageScore * 100) / 100;

  // Determine pass status
  const hasAutoFail = autoFailCriteriaIds.length > 0;
  let passStatus: PassStatus = "pending";

  if (hasAutoFail) {
    passStatus = "fail";
  } else if (percentageScore >= passThreshold) {
    passStatus = "pass";
  } else {
    passStatus = "fail";
  }

  return {
    total_score: totalScore,
    total_possible: totalPossible,
    percentage_score: percentageScore,
    pass_status: passStatus,
    has_auto_fail: hasAutoFail,
    auto_fail_criteria_ids: autoFailCriteriaIds,
  };
}

/**
 * Get default score value for a criteria type
 */
export function getDefaultScoreValue(criteriaType: CriteriaType): ScoreValue {
  switch (criteriaType) {
    case "scale":
      return { value: 0 };
    case "pass_fail":
      return { passed: false };
    case "checklist":
      return { checked: [], unchecked: [] };
    case "dropdown":
      return { selected: "" };
    case "multi_select":
      return { selected: [] };
    case "rating_stars":
      return { stars: 0 };
    case "percentage":
      return { value: 0 };
    case "text":
      return { response: "" };
    default:
      return { value: 0 };
  }
}

/**
 * Validate score value against criteria type
 */
export function validateScoreValue(
  criteriaType: CriteriaType,
  value: ScoreValue,
  config?: CriteriaConfig
): { valid: boolean; error?: string } {
  switch (criteriaType) {
    case "scale": {
      const scaleValue = (value as { value: number }).value;
      if (typeof scaleValue !== "number") {
        return { valid: false, error: "Scale value must be a number" };
      }
      if (config) {
        const scaleConfig = config as ScaleCriteriaConfig;
        if (scaleValue < scaleConfig.min || scaleValue > scaleConfig.max) {
          return {
            valid: false,
            error: `Value must be between ${scaleConfig.min} and ${scaleConfig.max}`,
          };
        }
      }
      return { valid: true };
    }

    case "pass_fail": {
      const passed = (value as { passed: boolean }).passed;
      if (typeof passed !== "boolean") {
        return { valid: false, error: "Pass/fail value must be a boolean" };
      }
      return { valid: true };
    }

    case "checklist": {
      const checked = (value as { checked: string[] }).checked;
      if (!Array.isArray(checked)) {
        return { valid: false, error: "Checklist value must be an array" };
      }
      return { valid: true };
    }

    case "dropdown": {
      const selected = (value as { selected: string }).selected;
      if (typeof selected !== "string") {
        return { valid: false, error: "Dropdown value must be a string" };
      }
      if (config) {
        const dropdownConfig = config as DropdownCriteriaConfig;
        const validOptions = dropdownConfig.options?.map((o) => o.value) || [];
        if (selected && !validOptions.includes(selected)) {
          return { valid: false, error: "Invalid option selected" };
        }
      }
      return { valid: true };
    }

    case "multi_select": {
      const selected = (value as { selected: string[] }).selected;
      if (!Array.isArray(selected)) {
        return { valid: false, error: "Multi-select value must be an array" };
      }
      return { valid: true };
    }

    case "rating_stars": {
      const stars = (value as { stars: number }).stars;
      if (typeof stars !== "number") {
        return { valid: false, error: "Stars value must be a number" };
      }
      if (config) {
        const starsConfig = config as StarsCriteriaConfig;
        if (stars < 0 || stars > starsConfig.max_stars) {
          return {
            valid: false,
            error: `Stars must be between 0 and ${starsConfig.max_stars}`,
          };
        }
        if (!starsConfig.allow_half && stars % 1 !== 0) {
          return { valid: false, error: "Half stars are not allowed" };
        }
      }
      return { valid: true };
    }

    case "percentage": {
      const percentage = (value as { value: number }).value;
      if (typeof percentage !== "number") {
        return { valid: false, error: "Percentage value must be a number" };
      }
      if (percentage < 0 || percentage > 100) {
        return { valid: false, error: "Percentage must be between 0 and 100" };
      }
      return { valid: true };
    }

    case "text": {
      const response = (value as { response: string }).response;
      if (typeof response !== "string") {
        return { valid: false, error: "Text response must be a string" };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: "Unknown criteria type" };
  }
}

/**
 * Get display value for a score
 */
export function getScoreDisplayValue(
  criteriaType: CriteriaType,
  value: ScoreValue,
  config?: CriteriaConfig
): string {
  switch (criteriaType) {
    case "scale": {
      const scaleValue = (value as { value: number }).value;
      const scaleConfig = config as ScaleCriteriaConfig | undefined;
      if (scaleConfig?.labels && scaleConfig.labels[String(scaleValue)]) {
        return `${scaleValue} - ${scaleConfig.labels[String(scaleValue)]}`;
      }
      return String(scaleValue);
    }

    case "pass_fail": {
      const passed = (value as { passed: boolean }).passed;
      const passFailConfig = config as PassFailCriteriaConfig | undefined;
      return passed
        ? passFailConfig?.pass_label || "Pass"
        : passFailConfig?.fail_label || "Fail";
    }

    case "checklist": {
      const checked = (value as { checked: string[] }).checked || [];
      const checklistConfig = config as ChecklistCriteriaConfig | undefined;
      const total = checklistConfig?.items?.length || 0;
      return `${checked.length}/${total} items`;
    }

    case "dropdown": {
      const selected = (value as { selected: string }).selected;
      const dropdownConfig = config as DropdownCriteriaConfig | undefined;
      const option = dropdownConfig?.options?.find((o) => o.value === selected);
      return option?.label || selected || "Not selected";
    }

    case "multi_select": {
      const selected = (value as { selected: string[] }).selected || [];
      return `${selected.length} selected`;
    }

    case "rating_stars": {
      const stars = (value as { stars: number }).stars;
      const starsConfig = config as StarsCriteriaConfig | undefined;
      return `${stars}/${starsConfig?.max_stars || 5} stars`;
    }

    case "percentage": {
      const percentage = (value as { value: number }).value;
      return `${percentage}%`;
    }

    case "text": {
      const response = (value as { response: string }).response;
      return response ? `${response.substring(0, 50)}...` : "No response";
    }

    default:
      return "Unknown";
  }
}

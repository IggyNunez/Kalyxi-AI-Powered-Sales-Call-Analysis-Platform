/**
 * Scoring Engine Comprehensive Tests
 *
 * Tests all math paths in the scoring engine:
 * - Normalization for all 8 criteria types
 * - All 5 scoring methods
 * - Auto-fail triggers
 * - N/A handling
 * - Edge cases
 */

import { TestReporter, measureTest } from "../config";
import {
  calculateCriteriaScore,
  calculateSessionScore,
  validateScoreValue,
  getDefaultScoreValue,
  ScoreInput,
  SessionScoreInput,
  CriteriaScoreResult,
} from "../../src/lib/scoring-engine";
import {
  Criteria,
  CriteriaType,
  ScoringMethod,
  Template,
  ScaleCriteriaConfig,
  PassFailCriteriaConfig,
  ChecklistCriteriaConfig,
  DropdownCriteriaConfig,
  MultiSelectCriteriaConfig,
  StarsCriteriaConfig,
  PercentageCriteriaConfig,
  TextCriteriaConfig,
  TemplateSettings,
  ScoreValue,
} from "../../src/types/database";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createCriteria(
  overrides: Partial<Criteria> & { criteria_type: CriteriaType; config: any }
): Criteria {
  return {
    id: overrides.id || `crit-${Math.random().toString(36).substr(2, 9)}`,
    template_id: overrides.template_id || "template-1",
    group_id: overrides.group_id || null,
    name: overrides.name || "Test Criteria",
    description: overrides.description || undefined,
    criteria_type: overrides.criteria_type,
    config: overrides.config,
    weight: overrides.weight ?? 1,
    max_score: overrides.max_score ?? 100,
    sort_order: overrides.sort_order ?? 0,
    is_required: overrides.is_required ?? false,
    is_auto_fail: overrides.is_auto_fail ?? false,
    auto_fail_threshold: overrides.auto_fail_threshold,
    scoring_guide: overrides.scoring_guide || undefined,
    keywords: overrides.keywords || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Criteria;
}

function createTemplate(
  overrides: Partial<Template> & { scoring_method: ScoringMethod }
): Template {
  const defaultSettings: TemplateSettings = {
    allow_na: true,
    require_comments_below_threshold: false,
    comments_threshold: 70,
    auto_calculate: true,
    show_weights_to_agents: false,
    allow_partial_submission: true,
  };

  return {
    id: overrides.id || "template-1",
    org_id: overrides.org_id || "org-1",
    name: overrides.name || "Test Template",
    description: overrides.description || undefined,
    scoring_method: overrides.scoring_method,
    use_case: overrides.use_case || "sales_call",
    pass_threshold: overrides.pass_threshold ?? 70,
    max_total_score: overrides.max_total_score ?? 100,
    settings: overrides.settings || defaultSettings,
    status: overrides.status || "active",
    version: overrides.version ?? 1,
    is_default: overrides.is_default ?? false,
    legacy_scorecard_id: overrides.legacy_scorecard_id || undefined,
    created_by: overrides.created_by || undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    activated_at: overrides.activated_at || undefined,
    archived_at: overrides.archived_at || undefined,
  } as Template;
}

function assertEqual(
  actual: number,
  expected: number,
  tolerance: number = 0.01
): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runScoringEngineTests(): Promise<void> {
  const reporter = new TestReporter();

  console.log("\n" + "=".repeat(60));
  console.log("SCORING ENGINE COMPREHENSIVE TESTS");
  console.log("=".repeat(60));

  // =========================================================================
  // SECTION 1: CRITERIA TYPE NORMALIZATION TESTS
  // =========================================================================
  reporter.setCategory("Criteria Type Normalization");

  // Test 1.1: Scale Criteria
  {
    const { result, duration } = await measureTest("Scale: Mid-range value", async () => {
      const criteria = createCriteria({
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 } as ScaleCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { value: 3 },
      };

      const result = calculateCriteriaScore(input);
      // (3 - 1) / (5 - 1) = 0.5, * 100 = 50
      return assertEqual(result.normalizedScore, 50);
    });

    reporter.log({
      name: "Scale: Mid-range value (3 on 1-5 scale = 50%)",
      passed: result,
      expected: "50",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.2: Scale Criteria - Min Value
  {
    const { result, duration } = await measureTest("Scale: Min value", async () => {
      const criteria = createCriteria({
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 } as ScaleCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { value: 1 },
      };

      const result = calculateCriteriaScore(input);
      // (1 - 1) / (5 - 1) = 0, * 100 = 0
      return assertEqual(result.normalizedScore, 0);
    });

    reporter.log({
      name: "Scale: Min value (1 on 1-5 scale = 0%)",
      passed: result,
      expected: "0",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.3: Scale Criteria - Max Value
  {
    const { result, duration } = await measureTest("Scale: Max value", async () => {
      const criteria = createCriteria({
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 } as ScaleCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { value: 5 },
      };

      const result = calculateCriteriaScore(input);
      // (5 - 1) / (5 - 1) = 1, * 100 = 100
      return assertEqual(result.normalizedScore, 100);
    });

    reporter.log({
      name: "Scale: Max value (5 on 1-5 scale = 100%)",
      passed: result,
      expected: "100",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.4: Pass/Fail Criteria - Pass
  {
    const { result, duration } = await measureTest("Pass/Fail: Pass", async () => {
      const criteria = createCriteria({
        criteria_type: "pass_fail",
        config: {
          pass_label: "Yes",
          fail_label: "No",
          pass_value: 100,
          fail_value: 0,
        } as PassFailCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { passed: true },
      };

      const result = calculateCriteriaScore(input);
      return assertEqual(result.rawScore, 100) && assertEqual(result.normalizedScore, 100);
    });

    reporter.log({
      name: "Pass/Fail: Passed = 100%",
      passed: result,
      expected: "rawScore=100, normalizedScore=100",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.5: Pass/Fail Criteria - Fail
  {
    const { result, duration } = await measureTest("Pass/Fail: Fail", async () => {
      const criteria = createCriteria({
        criteria_type: "pass_fail",
        config: {
          pass_label: "Yes",
          fail_label: "No",
          pass_value: 100,
          fail_value: 0,
        } as PassFailCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { passed: false },
      };

      const result = calculateCriteriaScore(input);
      return assertEqual(result.rawScore, 0) && assertEqual(result.normalizedScore, 0);
    });

    reporter.log({
      name: "Pass/Fail: Failed = 0%",
      passed: result,
      expected: "rawScore=0, normalizedScore=0",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.6: Checklist - Sum Mode
  {
    const { result, duration } = await measureTest("Checklist: Sum mode", async () => {
      const criteria = createCriteria({
        criteria_type: "checklist",
        config: {
          items: [
            { id: "a", label: "Item A", points: 10 },
            { id: "b", label: "Item B", points: 20 },
            { id: "c", label: "Item C", points: 30 },
          ],
          scoring: "sum",
        } as ChecklistCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { checked: ["a", "b"], unchecked: ["c"] }, // 10 + 20 = 30 out of 60
      };

      const result = calculateCriteriaScore(input);
      // (30 / 60) * 100 = 50
      return assertEqual(result.normalizedScore, 50);
    });

    reporter.log({
      name: "Checklist: Sum mode (30/60 points = 50%)",
      passed: result,
      expected: "50%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.7: Checklist - All Required Mode
  {
    const { result, duration } = await measureTest("Checklist: All required", async () => {
      const criteria = createCriteria({
        criteria_type: "checklist",
        config: {
          items: [
            { id: "a", label: "Item A", points: 10 },
            { id: "b", label: "Item B", points: 20 },
          ],
          scoring: "all_required",
        } as ChecklistCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      // Test partial - should be 0
      const partialResult = calculateCriteriaScore({
        criteria,
        value: { checked: ["a"], unchecked: ["b"] },
      });

      // Test complete - should be 100
      const fullResult = calculateCriteriaScore({
        criteria,
        value: { checked: ["a", "b"], unchecked: [] },
      });

      return (
        assertEqual(partialResult.normalizedScore, 0) &&
        assertEqual(fullResult.normalizedScore, 100)
      );
    });

    reporter.log({
      name: "Checklist: All required (partial=0%, complete=100%)",
      passed: result,
      expected: "partial=0%, complete=100%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.8: Dropdown
  {
    const { result, duration } = await measureTest("Dropdown: Selection", async () => {
      const criteria = createCriteria({
        criteria_type: "dropdown",
        config: {
          options: [
            { value: "poor", label: "Poor", score: 0 },
            { value: "fair", label: "Fair", score: 50 },
            { value: "good", label: "Good", score: 75 },
            { value: "excellent", label: "Excellent", score: 100 },
          ],
        } as DropdownCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { selected: "good" }, // 75 / 100 * 100 = 75
      };

      const result = calculateCriteriaScore(input);
      return assertEqual(result.normalizedScore, 75);
    });

    reporter.log({
      name: "Dropdown: 'Good' selection = 75%",
      passed: result,
      expected: "75%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.9: Multi-Select - Sum Mode
  {
    const { result, duration } = await measureTest("Multi-Select: Sum mode", async () => {
      const criteria = createCriteria({
        criteria_type: "multi_select",
        config: {
          options: [
            { value: "a", label: "Option A", score: 25 },
            { value: "b", label: "Option B", score: 25 },
            { value: "c", label: "Option C", score: 25 },
            { value: "d", label: "Option D", score: 25 },
          ],
          scoring: "sum",
        } as MultiSelectCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { selected: ["a", "b"] }, // 50 / 100 * 100 = 50
      };

      const result = calculateCriteriaScore(input);
      return assertEqual(result.normalizedScore, 50);
    });

    reporter.log({
      name: "Multi-Select: Sum mode (2/4 options = 50%)",
      passed: result,
      expected: "50%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.10: Rating Stars
  {
    const { result, duration } = await measureTest("Rating Stars", async () => {
      const criteria = createCriteria({
        criteria_type: "rating_stars",
        config: {
          max_stars: 5,
          allow_half: true,
        } as StarsCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { stars: 4 }, // 4 / 5 * 100 = 80
      };

      const result = calculateCriteriaScore(input);
      return assertEqual(result.normalizedScore, 80);
    });

    reporter.log({
      name: "Rating Stars: 4/5 stars = 80%",
      passed: result,
      expected: "80%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.11: Percentage
  {
    const { result, duration } = await measureTest("Percentage", async () => {
      const criteria = createCriteria({
        criteria_type: "percentage",
        config: {
          thresholds: [
            { value: 0, label: "Low", color: "red" },
            { value: 70, label: "Good", color: "green" },
          ],
        } as PercentageCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { value: 85 }, // 85 / 100 * 100 = 85
      };

      const result = calculateCriteriaScore(input);
      return assertEqual(result.normalizedScore, 85);
    });

    reporter.log({
      name: "Percentage: 85% input = 85% normalized",
      passed: result,
      expected: "85%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.12: Text (present)
  {
    const { result, duration } = await measureTest("Text: Present", async () => {
      const criteria = createCriteria({
        criteria_type: "text",
        config: {
          max_length: 500,
          placeholder: "Enter feedback...",
        } as TextCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { response: "Great job on the call!" },
      };

      const result = calculateCriteriaScore(input);
      return assertEqual(result.normalizedScore, 100);
    });

    reporter.log({
      name: "Text: With response = 100%",
      passed: result,
      expected: "100%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 1.13: Text (empty)
  {
    const { result, duration } = await measureTest("Text: Empty", async () => {
      const criteria = createCriteria({
        criteria_type: "text",
        config: {} as TextCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { response: "" },
      };

      const result = calculateCriteriaScore(input);
      return assertEqual(result.normalizedScore, 0);
    });

    reporter.log({
      name: "Text: Empty response = 0%",
      passed: result,
      expected: "0%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // =========================================================================
  // SECTION 2: WEIGHTED SCORING TESTS
  // =========================================================================
  reporter.setCategory("Weighted Scoring Method");

  // Test 2.1: Basic Weighted Calculation
  {
    const { result, duration } = await measureTest("Weighted: Basic", async () => {
      const template = createTemplate({
        scoring_method: "weighted",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 } as ScaleCriteriaConfig,
        max_score: 100,
        weight: 2, // Weight 2
      });

      const criteria2 = createCriteria({
        id: "c2",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 } as ScaleCriteriaConfig,
        max_score: 100,
        weight: 1, // Weight 1
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { value: 5 } }, // 100% * weight 2 = 2
        { criteria: criteria2, value: { value: 3 } }, // 50% * weight 1 = 0.5
      ];

      // Total weighted = 2 + 0.5 = 2.5
      // Total weight = 3
      // Percentage = 2.5 / 3 * 100 = 83.33%

      const result = calculateSessionScore({
        template,
        criteria: [criteria1, criteria2],
        scores,
      });

      return assertEqual(result.percentage_score, 83.33, 0.1);
    });

    reporter.log({
      name: "Weighted: (100%*2 + 50%*1) / 3 = 83.33%",
      passed: result,
      expected: "83.33%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 2.2: Weighted with Equal Weights
  {
    const { result, duration } = await measureTest("Weighted: Equal weights", async () => {
      const template = createTemplate({
        scoring_method: "weighted",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "pass_fail",
        config: { pass_label: "Yes", fail_label: "No", pass_value: 100, fail_value: 0 },
        max_score: 100,
        weight: 1,
      });

      const criteria2 = createCriteria({
        id: "c2",
        criteria_type: "pass_fail",
        config: { pass_label: "Yes", fail_label: "No", pass_value: 100, fail_value: 0 },
        max_score: 100,
        weight: 1,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { passed: true } }, // 100%
        { criteria: criteria2, value: { passed: false } }, // 0%
      ];

      // (100 + 0) / 2 = 50%
      const result = calculateSessionScore({
        template,
        criteria: [criteria1, criteria2],
        scores,
      });

      return (
        assertEqual(result.percentage_score, 50) && result.pass_status === "fail"
      );
    });

    reporter.log({
      name: "Weighted: (100% + 0%) / 2 = 50% (fail)",
      passed: result,
      expected: "50%, pass_status=fail",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // =========================================================================
  // SECTION 3: SIMPLE AVERAGE SCORING TESTS
  // =========================================================================
  reporter.setCategory("Simple Average Scoring Method");

  // Test 3.1: Simple Average
  {
    const { result, duration } = await measureTest("Simple Average: Basic", async () => {
      const template = createTemplate({
        scoring_method: "simple_average",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "rating_stars",
        config: { max_stars: 5, allow_half: false },
        max_score: 100,
        weight: 5, // Weight is IGNORED in simple_average
      });

      const criteria2 = createCriteria({
        id: "c2",
        criteria_type: "rating_stars",
        config: { max_stars: 5, allow_half: false },
        max_score: 100,
        weight: 1,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { stars: 5 } }, // 100%
        { criteria: criteria2, value: { stars: 2.5 } }, // 50%
      ];

      // Simple average = (100 + 50) / 2 = 75%
      const result = calculateSessionScore({
        template,
        criteria: [criteria1, criteria2],
        scores,
      });

      return (
        assertEqual(result.percentage_score, 75) && result.pass_status === "pass"
      );
    });

    reporter.log({
      name: "Simple Average: (100% + 50%) / 2 = 75% (ignores weights)",
      passed: result,
      expected: "75%, pass_status=pass",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // =========================================================================
  // SECTION 4: PASS/FAIL SCORING METHOD TESTS
  // =========================================================================
  reporter.setCategory("Pass/Fail Scoring Method");

  // Test 4.1: All Pass
  {
    const { result, duration } = await measureTest("Pass/Fail Method: All pass", async () => {
      const template = createTemplate({
        scoring_method: "pass_fail",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "pass_fail",
        config: { pass_label: "Yes", fail_label: "No", pass_value: 100, fail_value: 0 },
        max_score: 100,
        weight: 1,
      });

      const criteria2 = createCriteria({
        id: "c2",
        criteria_type: "pass_fail",
        config: { pass_label: "Yes", fail_label: "No", pass_value: 100, fail_value: 0 },
        max_score: 100,
        weight: 1,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { passed: true } },
        { criteria: criteria2, value: { passed: true } },
      ];

      const result = calculateSessionScore({
        template,
        criteria: [criteria1, criteria2],
        scores,
      });

      return (
        assertEqual(result.percentage_score, 100) && result.pass_status === "pass"
      );
    });

    reporter.log({
      name: "Pass/Fail Method: All criteria pass = 100%",
      passed: result,
      expected: "100%, pass",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 4.2: One Fails
  {
    const { result, duration } = await measureTest("Pass/Fail Method: One fails", async () => {
      const template = createTemplate({
        scoring_method: "pass_fail",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "pass_fail",
        config: { pass_label: "Yes", fail_label: "No", pass_value: 100, fail_value: 0 },
        max_score: 100,
        weight: 1,
      });

      const criteria2 = createCriteria({
        id: "c2",
        criteria_type: "pass_fail",
        config: { pass_label: "Yes", fail_label: "No", pass_value: 100, fail_value: 0 },
        max_score: 100,
        weight: 1,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { passed: true } },
        { criteria: criteria2, value: { passed: false } }, // One fails
      ];

      const result = calculateSessionScore({
        template,
        criteria: [criteria1, criteria2],
        scores,
      });

      return (
        assertEqual(result.percentage_score, 0) && result.pass_status === "fail"
      );
    });

    reporter.log({
      name: "Pass/Fail Method: One fails = 0%",
      passed: result,
      expected: "0%, fail",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // =========================================================================
  // SECTION 5: POINTS SCORING METHOD TESTS
  // =========================================================================
  reporter.setCategory("Points Scoring Method");

  // Test 5.1: Points Sum
  {
    const { result, duration } = await measureTest("Points: Sum raw scores", async () => {
      const template = createTemplate({
        scoring_method: "points",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "scale",
        config: { min: 0, max: 10, step: 1 },
        max_score: 50, // Max 50 points
        weight: 1,
      });

      const criteria2 = createCriteria({
        id: "c2",
        criteria_type: "scale",
        config: { min: 0, max: 10, step: 1 },
        max_score: 50, // Max 50 points
        weight: 1,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { value: 10 } }, // 50 points
        { criteria: criteria2, value: { value: 5 } }, // 25 points
      ];

      // Raw score sum = 50 + 25 = 75
      // Max possible = 50 + 50 = 100
      // Percentage = 75 / 100 * 100 = 75%

      const result = calculateSessionScore({
        template,
        criteria: [criteria1, criteria2],
        scores,
      });

      return (
        assertEqual(result.total_score, 75) &&
        assertEqual(result.total_possible, 100) &&
        assertEqual(result.percentage_score, 75)
      );
    });

    reporter.log({
      name: "Points: 50 + 25 = 75 / 100 = 75%",
      passed: result,
      expected: "total=75, possible=100, percent=75%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // =========================================================================
  // SECTION 6: AUTO-FAIL TESTS
  // =========================================================================
  reporter.setCategory("Auto-Fail Trigger");

  // Test 6.1: Auto-fail triggers
  {
    const { result, duration } = await measureTest("Auto-fail: Below threshold", async () => {
      const template = createTemplate({
        scoring_method: "weighted",
        pass_threshold: 50, // Would normally pass at 50%
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 },
        max_score: 100,
        weight: 1,
        is_auto_fail: true,
        auto_fail_threshold: 50, // Fails if below 50%
      });

      const criteria2 = createCriteria({
        id: "c2",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 },
        max_score: 100,
        weight: 1,
        is_auto_fail: false,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { value: 2 } }, // 25% - triggers auto-fail
        { criteria: criteria2, value: { value: 5 } }, // 100%
      ];

      // Average = (25 + 100) / 2 = 62.5% - would pass normally
      // But criteria1 triggers auto-fail

      const result = calculateSessionScore({
        template,
        criteria: [criteria1, criteria2],
        scores,
      });

      return (
        result.has_auto_fail === true &&
        result.pass_status === "fail" &&
        result.auto_fail_criteria_ids.includes("c1")
      );
    });

    reporter.log({
      name: "Auto-fail: 25% < 50% threshold triggers fail despite 62.5% average",
      passed: result,
      expected: "has_auto_fail=true, pass_status=fail",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 6.2: Auto-fail NOT triggered
  {
    const { result, duration } = await measureTest("Auto-fail: Above threshold", async () => {
      const template = createTemplate({
        scoring_method: "weighted",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 },
        max_score: 100,
        weight: 1,
        is_auto_fail: true,
        auto_fail_threshold: 50, // Fails if below 50%
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { value: 4 } }, // 75% - above threshold
      ];

      const result = calculateSessionScore({
        template,
        criteria: [criteria1],
        scores,
      });

      return (
        result.has_auto_fail === false &&
        result.pass_status === "pass" &&
        result.auto_fail_criteria_ids.length === 0
      );
    });

    reporter.log({
      name: "Auto-fail: 75% >= 50% threshold, no auto-fail",
      passed: result,
      expected: "has_auto_fail=false",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // =========================================================================
  // SECTION 7: N/A HANDLING TESTS
  // =========================================================================
  reporter.setCategory("N/A Handling");

  // Test 7.1: N/A excluded from calculation
  {
    const { result, duration } = await measureTest("N/A: Excluded from average", async () => {
      const template = createTemplate({
        scoring_method: "simple_average",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 },
        max_score: 100,
        weight: 1,
      });

      const criteria2 = createCriteria({
        id: "c2",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 },
        max_score: 100,
        weight: 1,
      });

      const criteria3 = createCriteria({
        id: "c3",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 },
        max_score: 100,
        weight: 1,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { value: 5 } }, // 100%
        { criteria: criteria2, value: { value: 3 }, isNa: true }, // N/A - excluded
        { criteria: criteria3, value: { value: 3 } }, // 50%
      ];

      // Average of (100 + 50) / 2 = 75% (criteria2 is excluded)
      const result = calculateSessionScore({
        template,
        criteria: [criteria1, criteria2, criteria3],
        scores,
      });

      return assertEqual(result.percentage_score, 75);
    });

    reporter.log({
      name: "N/A: (100% + N/A + 50%) / 2 = 75% (N/A excluded)",
      passed: result,
      expected: "75%",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // Test 7.2: All N/A
  {
    const { result, duration } = await measureTest("N/A: All N/A = pending", async () => {
      const template = createTemplate({
        scoring_method: "weighted",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 },
        max_score: 100,
        weight: 1,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { value: 5 }, isNa: true },
      ];

      const result = calculateSessionScore({
        template,
        criteria: [criteria1],
        scores,
      });

      return (
        assertEqual(result.percentage_score, 0) &&
        result.pass_status === "pending"
      );
    });

    reporter.log({
      name: "N/A: All criteria N/A = 0%, pending status",
      passed: result,
      expected: "0%, pending",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // =========================================================================
  // SECTION 8: EDGE CASES
  // =========================================================================
  reporter.setCategory("Edge Cases");

  // Test 8.1: Zero weight
  {
    const { result, duration } = await measureTest("Edge: Zero weight criteria", async () => {
      const template = createTemplate({
        scoring_method: "weighted",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 },
        max_score: 100,
        weight: 0, // Zero weight
      });

      const criteria2 = createCriteria({
        id: "c2",
        criteria_type: "scale",
        config: { min: 1, max: 5, step: 1 },
        max_score: 100,
        weight: 1,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { value: 1 } }, // 0% but weight 0
        { criteria: criteria2, value: { value: 5 } }, // 100%
      ];

      // Only weight 1 criteria matters = 100%
      const result = calculateSessionScore({
        template,
        criteria: [criteria1, criteria2],
        scores,
      });

      return assertEqual(result.percentage_score, 100);
    });

    reporter.log({
      name: "Edge: Zero weight criteria = 100% from non-zero weight only",
      passed: result,
      expected: "100%",
      actual: "See calculation",
      duration,
      severity: "high",
    });
  }

  // Test 8.2: Empty checklist
  {
    const { result, duration } = await measureTest("Edge: Empty checklist", async () => {
      const criteria = createCriteria({
        criteria_type: "checklist",
        config: {
          items: [
            { id: "a", label: "Item A", points: 10 },
            { id: "b", label: "Item B", points: 20 },
          ],
          scoring: "sum",
        } as ChecklistCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { checked: [], unchecked: ["a", "b"] }, // Nothing checked
      };

      const result = calculateCriteriaScore(input);
      return assertEqual(result.normalizedScore, 0);
    });

    reporter.log({
      name: "Edge: Empty checklist = 0%",
      passed: result,
      expected: "0%",
      actual: "See calculation",
      duration,
      severity: "high",
    });
  }

  // Test 8.3: Boundary - exactly at threshold
  {
    const { result, duration } = await measureTest("Edge: Exactly at threshold", async () => {
      const template = createTemplate({
        scoring_method: "simple_average",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "percentage",
        config: { thresholds: [] },
        max_score: 100,
        weight: 1,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { value: 70 } }, // Exactly 70%
      ];

      const result = calculateSessionScore({
        template,
        criteria: [criteria1],
        scores,
      });

      return (
        assertEqual(result.percentage_score, 70) && result.pass_status === "pass"
      );
    });

    reporter.log({
      name: "Edge: 70% exactly at 70% threshold = pass",
      passed: result,
      expected: "70%, pass",
      actual: "See calculation",
      duration,
      severity: "high",
    });
  }

  // Test 8.4: Boundary - just below threshold
  {
    const { result, duration } = await measureTest("Edge: Just below threshold", async () => {
      const template = createTemplate({
        scoring_method: "simple_average",
        pass_threshold: 70,
      });

      const criteria1 = createCriteria({
        id: "c1",
        criteria_type: "percentage",
        config: { thresholds: [] },
        max_score: 100,
        weight: 1,
      });

      const scores: ScoreInput[] = [
        { criteria: criteria1, value: { value: 69.99 } }, // Just below 70%
      ];

      const result = calculateSessionScore({
        template,
        criteria: [criteria1],
        scores,
      });

      return (
        assertEqual(result.percentage_score, 69.99, 0.1) &&
        result.pass_status === "fail"
      );
    });

    reporter.log({
      name: "Edge: 69.99% just below 70% threshold = fail",
      passed: result,
      expected: "69.99%, fail",
      actual: "See calculation",
      duration,
      severity: "high",
    });
  }

  // Test 8.5: Large scale range
  {
    const { result, duration } = await measureTest("Edge: Large scale range", async () => {
      const criteria = createCriteria({
        criteria_type: "scale",
        config: { min: 0, max: 1000, step: 1 } as ScaleCriteriaConfig,
        max_score: 100,
        weight: 1,
      });

      const input: ScoreInput = {
        criteria,
        value: { value: 500 }, // Midpoint
      };

      const result = calculateCriteriaScore(input);
      return assertEqual(result.normalizedScore, 50);
    });

    reporter.log({
      name: "Edge: Large scale 500/1000 = 50%",
      passed: result,
      expected: "50%",
      actual: "See calculation",
      duration,
      severity: "medium",
    });
  }

  // Test 8.6: Validation tests
  {
    const { result, duration } = await measureTest("Validation: Scale out of range", async () => {
      const config: ScaleCriteriaConfig = { min: 1, max: 5, step: 1 };
      const value = { value: 10 }; // Out of range

      const validation = validateScoreValue("scale", value, config);
      return validation.valid === false;
    });

    reporter.log({
      name: "Validation: Scale value 10 on 1-5 scale = invalid",
      passed: result,
      expected: "valid=false",
      actual: "See validation",
      duration,
      severity: "high",
    });
  }

  // Test 8.7: Half stars validation
  {
    const { result, duration } = await measureTest("Validation: Half stars disabled", async () => {
      const config: StarsCriteriaConfig = { max_stars: 5, allow_half: false };
      const value = { stars: 3.5 };

      const validation = validateScoreValue("rating_stars", value, config);
      return validation.valid === false;
    });

    reporter.log({
      name: "Validation: Half star when disabled = invalid",
      passed: result,
      expected: "valid=false",
      actual: "See validation",
      duration,
      severity: "medium",
    });
  }

  // =========================================================================
  // SECTION 9: WEIGHTED SCORE CALCULATION VERIFICATION
  // =========================================================================
  reporter.setCategory("Weighted Score Calculation");

  // Test 9.1: Verify weightedScore formula
  {
    const { result, duration } = await measureTest(
      "WeightedScore: Formula verification",
      async () => {
        const criteria = createCriteria({
          criteria_type: "scale",
          config: { min: 1, max: 5, step: 1 },
          max_score: 100,
          weight: 3, // Weight of 3
        });

        const input: ScoreInput = {
          criteria,
          value: { value: 4 }, // 75% normalized
        };

        const result = calculateCriteriaScore(input);

        // weightedScore = (normalizedScore * weight) / 100
        // = (75 * 3) / 100 = 2.25
        return (
          assertEqual(result.normalizedScore, 75) &&
          assertEqual(result.weightedScore, 2.25)
        );
      }
    );

    reporter.log({
      name: "WeightedScore: 75% * weight 3 / 100 = 2.25",
      passed: result,
      expected: "normalizedScore=75, weightedScore=2.25",
      actual: "See calculation",
      duration,
      severity: "blocker",
    });
  }

  // =========================================================================
  // SECTION 10: DEFAULT VALUE TESTS
  // =========================================================================
  reporter.setCategory("Default Values");

  // Test 10.1: Default values for all types
  {
    const { result, duration } = await measureTest(
      "Defaults: All criteria types",
      async () => {
        const types: CriteriaType[] = [
          "scale",
          "pass_fail",
          "checklist",
          "dropdown",
          "multi_select",
          "rating_stars",
          "percentage",
          "text",
        ];

        for (const type of types) {
          const defaultValue = getDefaultScoreValue(type);
          if (defaultValue === undefined) {
            return false;
          }
        }
        return true;
      }
    );

    reporter.log({
      name: "Defaults: All 8 criteria types have default values",
      passed: result,
      expected: "All types have defaults",
      actual: "See check",
      duration,
      severity: "high",
    });
  }

  // =========================================================================
  // PRINT SUMMARY
  // =========================================================================
  reporter.printSummary();

  const exitCode = reporter.getExitCode();
  if (exitCode !== 0) {
    console.log("\n⚠️  Some tests failed. Review issues above.");
  } else {
    console.log("\n✅ All scoring engine tests passed!");
  }

  process.exit(exitCode);
}

// Run the tests
runScoringEngineTests().catch((error) => {
  console.error("Test suite crashed:", error);
  process.exit(1);
});

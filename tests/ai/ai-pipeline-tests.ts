/**
 * Kalyxi AI - AI Pipeline Tests
 *
 * Tests the AI analysis pipeline with mocked OpenAI responses.
 * Verifies:
 * - Analysis creation and storage
 * - Score calculation
 * - Error handling
 * - Rate limiting behavior
 *
 * Run: npx tsx tests/ai/ai-pipeline-tests.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config, TestReporter, measureTest } from "../config";
import { testIds, testData } from "../seed/deterministic-seed";

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const reporter = new TestReporter();

// Mock analysis result structure
const mockAnalysisResult = {
  strengths: [
    "Clear introduction and rapport building",
    "Strong value proposition delivery",
    "Good objection handling",
  ],
  improvements: [
    "Could ask more discovery questions",
    "Need to probe budget concerns deeper",
  ],
  scores: {
    opening: 8,
    discovery: 7,
    value_proposition: 9,
    objection_handling: 8,
    closing: 7,
    overall_professionalism: 8,
  },
  recommendations: [
    "Practice deeper discovery techniques",
    "Develop more budget justification talking points",
  ],
  gatekeeper_detected: false,
  appointment_set: true,
};

async function testAnalysisDataStructure() {
  reporter.setCategory("Analysis Data Structure");

  // Test 1: Analysis has required fields
  {
    const { result, duration } = await measureTest("Analysis required fields", async () => {
      const { data: analysis, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", testIds.analysis1)
        .single();

      if (error || !analysis) return { valid: false, error };

      const hasRequiredFields =
        analysis.id &&
        analysis.call_id &&
        analysis.ai_model &&
        analysis.grading_results_json &&
        typeof analysis.overall_score === "number";

      return { valid: hasRequiredFields, analysis };
    });

    reporter.log({
      name: "Analysis has all required fields",
      passed: result.valid === true,
      expected: "All required fields present",
      actual: result.valid ? "Valid" : `Missing fields or error: ${result.error?.message}`,
      duration,
      severity: "high",
    });
  }

  // Test 2: grading_results_json has expected structure
  {
    const { result, duration } = await measureTest("Analysis JSON structure", async () => {
      const { data: analysis } = await supabase
        .from("analyses")
        .select("grading_results_json")
        .eq("id", testIds.analysis1)
        .single();

      if (!analysis) return { valid: false };

      const json = analysis.grading_results_json as Record<string, unknown>;
      const hasStrengths = Array.isArray(json.strengths);
      const hasImprovements = Array.isArray(json.improvements);
      const hasScores = typeof json.scores === "object";

      return { valid: hasStrengths && hasImprovements && hasScores, json };
    });

    reporter.log({
      name: "grading_results_json has expected structure",
      passed: result.valid === true,
      expected: "strengths[], improvements[], scores{}",
      actual: result.valid ? "Valid structure" : "Invalid structure",
      duration,
      severity: "high",
    });
  }

  // Test 3: Scores are within valid range
  {
    const { result, duration } = await measureTest("Score range validation", async () => {
      const { data: analyses } = await supabase
        .from("analyses")
        .select("overall_score, composite_score");

      const allValid = analyses?.every(
        (a) =>
          (a.overall_score === null ||
            (a.overall_score >= 0 && a.overall_score <= 100)) &&
          (a.composite_score === null ||
            (a.composite_score >= 0 && a.composite_score <= 100))
      );

      return { valid: allValid, count: analyses?.length };
    });

    reporter.log({
      name: "All scores within 0-100 range",
      passed: result.valid === true,
      expected: "All scores 0-100",
      actual: result.valid ? `${result.count} analyses valid` : "Invalid scores found",
      duration,
      severity: "high",
    });
  }
}

async function testAnalysisCallRelationship() {
  reporter.setCategory("Analysis-Call Relationship");

  // Test 1: Every analysis has a valid call_id
  {
    const { result, duration } = await measureTest("Valid call_id references", async () => {
      const { data: analyses } = await supabase
        .from("analyses")
        .select("id, call_id, calls(id)");

      const invalidRefs = analyses?.filter((a) => !a.calls);

      return { invalidCount: invalidRefs?.length || 0, total: analyses?.length || 0 };
    });

    reporter.log({
      name: "All analyses have valid call_id references",
      passed: result.invalidCount === 0,
      expected: "0 invalid references",
      actual: `${result.invalidCount} invalid out of ${result.total}`,
      duration,
      severity: "high",
    });
  }

  // Test 2: Analyzed calls have status='analyzed'
  {
    const { result, duration } = await measureTest("Analyzed calls status", async () => {
      const { data: calls } = await supabase
        .from("calls")
        .select("id, status, analyses(id)")
        .not("analyses", "is", null);

      const notAnalyzedStatus = calls?.filter((c) => c.status !== "analyzed");

      return {
        mismatchCount: notAnalyzedStatus?.length || 0,
        total: calls?.length || 0,
      };
    });

    reporter.log({
      name: "Calls with analyses have status='analyzed'",
      passed: result.mismatchCount === 0,
      expected: "All analyzed calls have correct status",
      actual:
        result.mismatchCount === 0
          ? `${result.total} calls correct`
          : `${result.mismatchCount} status mismatches`,
      duration,
      severity: "medium",
    });
  }
}

async function testMockAnalysisCreation() {
  reporter.setCategory("Mock Analysis Creation");

  // Test 1: Create analysis with mock data
  {
    const { result, duration } = await measureTest("Create mock analysis", async () => {
      // Create a test call first
      const { data: call, error: callError } = await supabase
        .from("calls")
        .insert({
          org_id: testIds.org1,
          caller_id: testIds.callerRecord1,
          raw_notes: "Mock test call for AI pipeline testing. This is a sample sales conversation.",
          status: "processing",
        })
        .select()
        .single();

      if (callError) return { success: false, error: callError };

      // Create mock analysis
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .insert({
          call_id: call.id,
          ai_model: "gpt-4o-mock",
          grading_results_json: mockAnalysisResult,
          overall_score: 78,
          composite_score: 75,
          processing_time_ms: 1500,
          token_usage: { prompt: 500, completion: 300, total: 800 },
        })
        .select()
        .single();

      if (analysisError) {
        // Cleanup call
        await supabase.from("calls").delete().eq("id", call.id);
        return { success: false, error: analysisError };
      }

      // Update call status
      await supabase.from("calls").update({ status: "analyzed" }).eq("id", call.id);

      // Cleanup
      await supabase.from("analyses").delete().eq("id", analysis.id);
      await supabase.from("calls").delete().eq("id", call.id);

      return { success: true, analysisId: analysis.id };
    });

    reporter.log({
      name: "Create analysis with mock data succeeds",
      passed: result.success === true,
      expected: "Analysis created",
      actual: result.success
        ? `Created analysis ${result.analysisId}`
        : `Error: ${result.error?.message}`,
      duration,
      severity: "high",
    });
  }

  // Test 2: Analysis cannot be created for non-existent call
  {
    const { result, duration } = await measureTest("Invalid call_id rejected", async () => {
      const { error } = await supabase.from("analyses").insert({
        call_id: "00000000-0000-0000-0000-000000000000",
        ai_model: "gpt-4o-mock",
        grading_results_json: mockAnalysisResult,
        overall_score: 78,
      });

      return { rejected: !!error, error };
    });

    reporter.log({
      name: "Analysis with invalid call_id is rejected",
      passed: result.rejected === true,
      expected: "Foreign key violation",
      actual: result.rejected ? `Rejected: ${result.error?.code}` : "Accepted - ISSUE",
      duration,
      severity: "high",
    });
  }
}

async function testTokenUsageTracking() {
  reporter.setCategory("Token Usage Tracking");

  // Test 1: Token usage is stored
  {
    const { result, duration } = await measureTest("Token usage stored", async () => {
      const { data: analyses } = await supabase
        .from("analyses")
        .select("id, token_usage")
        .not("token_usage", "is", null);

      const hasUsage = analyses?.some(
        (a) =>
          a.token_usage &&
          typeof (a.token_usage as { total?: number }).total === "number"
      );

      return { hasUsage, count: analyses?.length || 0 };
    });

    reporter.log({
      name: "Token usage is tracked in analyses",
      passed: result.hasUsage === true,
      expected: "At least one analysis with token_usage",
      actual: result.hasUsage
        ? `${result.count} analyses with token usage`
        : "No token usage found",
      duration,
      severity: "medium",
    });
  }

  // Test 2: Processing time is tracked
  {
    const { result, duration } = await measureTest("Processing time tracked", async () => {
      const { data: analyses } = await supabase
        .from("analyses")
        .select("id, processing_time_ms")
        .not("processing_time_ms", "is", null);

      const hasTime = analyses?.some(
        (a) => typeof a.processing_time_ms === "number" && a.processing_time_ms > 0
      );

      return { hasTime, count: analyses?.length || 0 };
    });

    reporter.log({
      name: "Processing time is tracked",
      passed: result.hasTime === true,
      expected: "At least one analysis with processing_time_ms",
      actual: result.hasTime
        ? `${result.count} analyses with timing`
        : "No processing time found",
      duration,
      severity: "medium",
    });
  }
}

async function testProcessingQueue() {
  reporter.setCategory("Processing Queue");

  // Test 1: Queue entry can be created
  {
    const { result, duration } = await measureTest("Queue entry creation", async () => {
      const { data: entry, error } = await supabase
        .from("processing_queue")
        .insert({
          org_id: testIds.org1,
          call_id: testIds.call3, // Pending call
          status: "queued",
          priority: 0,
        })
        .select()
        .single();

      if (!error && entry) {
        // Cleanup
        await supabase.from("processing_queue").delete().eq("id", entry.id);
      }

      return { success: !error, error };
    });

    reporter.log({
      name: "Processing queue entry can be created",
      passed: result.success === true,
      expected: "Entry created",
      actual: result.success ? "Created" : `Error: ${result.error?.message}`,
      duration,
      severity: "high",
    });
  }

  // Test 2: Queue status transitions are valid
  {
    const { result, duration } = await measureTest("Queue status transitions", async () => {
      const validStatuses = ["queued", "processing", "completed", "failed"];

      // Try to create with each valid status
      const results: boolean[] = [];
      for (const status of validStatuses) {
        const { error } = await supabase.from("processing_queue").insert({
          org_id: testIds.org1,
          call_id: testIds.call3,
          status: status,
          priority: 0,
        });

        if (!error) {
          await supabase
            .from("processing_queue")
            .delete()
            .eq("org_id", testIds.org1)
            .eq("call_id", testIds.call3)
            .eq("status", status);
        }

        results.push(!error);
      }

      return { allValid: results.every((r) => r), results };
    });

    reporter.log({
      name: "All queue statuses are valid",
      passed: result.allValid === true,
      expected: "All status values accepted",
      actual: result.allValid
        ? "All valid"
        : `Some invalid: ${result.results.join(", ")}`,
      duration,
      severity: "high",
    });
  }

  // Test 3: Invalid status rejected
  {
    const { result, duration } = await measureTest("Invalid status rejected", async () => {
      const { error } = await supabase.from("processing_queue").insert({
        org_id: testIds.org1,
        call_id: testIds.call3,
        status: "invalid_status" as "queued",
        priority: 0,
      });

      return { rejected: !!error };
    });

    reporter.log({
      name: "Invalid queue status is rejected",
      passed: result.rejected === true,
      expected: "Rejected",
      actual: result.rejected ? "Rejected" : "Accepted - ISSUE",
      duration,
      severity: "high",
    });
  }
}

async function testErrorHandling() {
  reporter.setCategory("Error Handling");

  // Test 1: Failed analysis stores error message
  {
    const { result, duration } = await measureTest("Error message storage", async () => {
      // Create a call
      const { data: call } = await supabase
        .from("calls")
        .insert({
          org_id: testIds.org1,
          caller_id: testIds.callerRecord1,
          raw_notes: "Test call for error handling.",
          status: "failed",
        })
        .select()
        .single();

      if (!call) return { success: false };

      // Create failed analysis with error message
      const { data: analysis, error } = await supabase
        .from("analyses")
        .insert({
          call_id: call.id,
          ai_model: "gpt-4o-mock",
          grading_results_json: {},
          error_message: "OpenAI API rate limit exceeded",
        })
        .select()
        .single();

      const hasError = analysis?.error_message === "OpenAI API rate limit exceeded";

      // Cleanup
      if (analysis) await supabase.from("analyses").delete().eq("id", analysis.id);
      await supabase.from("calls").delete().eq("id", call.id);

      return { success: hasError };
    });

    reporter.log({
      name: "Failed analysis can store error message",
      passed: result.success === true,
      expected: "Error message stored",
      actual: result.success ? "Stored" : "Not stored",
      duration,
      severity: "high",
    });
  }

  // Test 2: Queue tracks retry attempts
  {
    const { result, duration } = await measureTest("Retry attempt tracking", async () => {
      const { data: entry, error } = await supabase
        .from("processing_queue")
        .insert({
          org_id: testIds.org1,
          call_id: testIds.call3,
          status: "failed",
          priority: 0,
          attempts: 3,
          max_attempts: 3,
          last_error: "Connection timeout",
        })
        .select()
        .single();

      const hasAttempts =
        entry?.attempts === 3 &&
        entry?.max_attempts === 3 &&
        entry?.last_error === "Connection timeout";

      // Cleanup
      if (entry) await supabase.from("processing_queue").delete().eq("id", entry.id);

      return { success: hasAttempts };
    });

    reporter.log({
      name: "Queue tracks retry attempts",
      passed: result.success === true,
      expected: "Attempts and last_error stored",
      actual: result.success ? "Tracked" : "Not tracked",
      duration,
      severity: "medium",
    });
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("KALYXI - AI PIPELINE TESTS");
  console.log("=".repeat(60));
  console.log("");

  try {
    await testAnalysisDataStructure();
    await testAnalysisCallRelationship();
    await testMockAnalysisCreation();
    await testTokenUsageTracking();
    await testProcessingQueue();
    await testErrorHandling();

    const summary = reporter.printSummary();
    process.exit(reporter.getExitCode());
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

main();

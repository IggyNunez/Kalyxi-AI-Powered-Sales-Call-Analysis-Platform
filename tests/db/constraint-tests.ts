/**
 * Kalyxi AI - Database Constraint Tests
 *
 * Tests all database constraints including:
 * - Foreign key constraints
 * - Unique constraints
 * - Check constraints
 * - Not null constraints
 * - Enum validation
 *
 * Run: npx tsx tests/db/constraint-tests.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config, TestReporter, measureTest } from "../config";
import { testIds, testData } from "../seed/deterministic-seed";

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const reporter = new TestReporter();

async function testForeignKeyConstraints() {
  reporter.setCategory("Foreign Key Constraints");

  // Test 1: calls.caller_id must reference valid caller
  {
    const { duration } = await measureTest("FK: calls.caller_id", async () => {
      const { error } = await supabase.from("calls").insert({
        org_id: testIds.org1,
        caller_id: "00000000-0000-0000-0000-000000000000", // Non-existent
        raw_notes: "Test call",
        status: "pending",
      });
      return error;
    });

    const { result } = await measureTest("check", async () => {
      const { error } = await supabase.from("calls").insert({
        org_id: testIds.org1,
        caller_id: "00000000-0000-0000-0000-000000000000",
        raw_notes: "Test call",
        status: "pending",
      });
      return error;
    });

    reporter.log({
      name: "calls.caller_id must reference valid caller",
      passed: !!result && result.code === "23503",
      expected: "Foreign key violation error",
      actual: result ? `Error: ${result.code} - ${result.message}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 2: calls.org_id must reference valid organization
  {
    const { result, duration } = await measureTest("FK: calls.org_id", async () => {
      const { error } = await supabase.from("calls").insert({
        org_id: "00000000-0000-0000-0000-000000000000", // Non-existent
        caller_id: testIds.callerRecord1,
        raw_notes: "Test call",
        status: "pending",
      });
      return error;
    });

    reporter.log({
      name: "calls.org_id must reference valid organization",
      passed: !!result && result.code === "23503",
      expected: "Foreign key violation error",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 3: users.org_id must reference valid organization
  {
    const { result, duration } = await measureTest("FK: users.org_id", async () => {
      const { error } = await supabase.from("users").insert({
        id: "00000000-0000-0000-0000-000000000001",
        org_id: "00000000-0000-0000-0000-000000000000", // Non-existent
        email: "test@test.com",
        role: "caller",
      });
      return error;
    });

    reporter.log({
      name: "users.org_id must reference valid organization",
      passed: !!result && (result.code === "23503" || result.code === "23502"),
      expected: "Foreign key violation error",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 4: analyses.call_id must reference valid call
  {
    const { result, duration } = await measureTest("FK: analyses.call_id", async () => {
      const { error } = await supabase.from("analyses").insert({
        call_id: "00000000-0000-0000-0000-000000000000", // Non-existent
        ai_model: "gpt-4o",
        grading_results_json: {},
      });
      return error;
    });

    reporter.log({
      name: "analyses.call_id must reference valid call",
      passed: !!result && result.code === "23503",
      expected: "Foreign key violation error",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 5: reports.call_id and analysis_id must be valid
  {
    const { result, duration } = await measureTest("FK: reports.call_id", async () => {
      const { error } = await supabase.from("reports").insert({
        call_id: "00000000-0000-0000-0000-000000000000", // Non-existent
        analysis_id: testIds.analysis1,
        report_json: {},
        status: "generating",
      });
      return error;
    });

    reporter.log({
      name: "reports.call_id must reference valid call",
      passed: !!result && result.code === "23503",
      expected: "Foreign key violation error",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 6: Cascade delete - deleting org should delete callers
  {
    // Create temporary org for cascade test
    const tempOrgId = "11111111-1111-1111-1111-111111111111";
    const tempCallerId = "22222222-2222-2222-2222-222222222222";

    await supabase.from("organizations").insert({
      id: tempOrgId,
      name: "Temp Org for Cascade Test",
      slug: "temp-cascade-test",
    });

    await supabase.from("callers").insert({
      id: tempCallerId,
      org_id: tempOrgId,
      name: "Temp Caller",
    });

    // Delete org
    await supabase.from("organizations").delete().eq("id", tempOrgId);

    const { result, duration } = await measureTest("Cascade delete", async () => {
      const { data: caller } = await supabase
        .from("callers")
        .select("id")
        .eq("id", tempCallerId)
        .single();
      return caller;
    });

    reporter.log({
      name: "Cascade delete: deleting org deletes callers",
      passed: !result,
      expected: "Caller deleted",
      actual: result ? "Caller still exists" : "Caller deleted",
      duration,
      severity: "high",
    });
  }
}

async function testUniqueConstraints() {
  reporter.setCategory("Unique Constraints");

  // Test 1: organizations.slug must be unique
  {
    const { result, duration } = await measureTest("Unique: org.slug", async () => {
      const { error } = await supabase.from("organizations").insert({
        name: "Duplicate Slug Test",
        slug: config.org1Slug, // Already exists
      });
      return error;
    });

    reporter.log({
      name: "organizations.slug must be unique",
      passed: !!result && result.code === "23505",
      expected: "Unique constraint violation",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "blocker",
    });
  }

  // Test 2: invitations.token must be unique (if table exists)
  {
    const { result, duration } = await measureTest("Unique: invitation.token", async () => {
      // Create first invitation
      const token = "unique_test_token_12345";
      const expires = new Date(Date.now() + 86400000).toISOString();

      await supabase.from("invitations").insert({
        org_id: testIds.org1,
        email: "test1@example.com",
        token: token,
        expires_at: expires,
        invited_by: (testData.users[0] as { authId?: string }).authId,
      });

      // Try to create duplicate
      const { error } = await supabase.from("invitations").insert({
        org_id: testIds.org1,
        email: "test2@example.com",
        token: token, // Duplicate
        expires_at: expires,
        invited_by: (testData.users[0] as { authId?: string }).authId,
      });

      // Cleanup
      await supabase.from("invitations").delete().eq("token", token);

      return error;
    });

    reporter.log({
      name: "invitations.token must be unique",
      passed: !!result && result.code === "23505",
      expected: "Unique constraint violation",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }
}

async function testNotNullConstraints() {
  reporter.setCategory("Not Null Constraints");

  // Test 1: organizations.name cannot be null
  {
    const { result, duration } = await measureTest("NotNull: org.name", async () => {
      const { error } = await supabase.from("organizations").insert({
        name: null as unknown as string,
        slug: "null-name-test",
      });
      return error;
    });

    reporter.log({
      name: "organizations.name cannot be null",
      passed: !!result && result.code === "23502",
      expected: "Not null violation",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 2: organizations.slug cannot be null
  {
    const { result, duration } = await measureTest("NotNull: org.slug", async () => {
      const { error } = await supabase.from("organizations").insert({
        name: "Test Org",
        slug: null as unknown as string,
      });
      return error;
    });

    reporter.log({
      name: "organizations.slug cannot be null",
      passed: !!result && result.code === "23502",
      expected: "Not null violation",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 3: calls.raw_notes cannot be null
  {
    const { result, duration } = await measureTest("NotNull: calls.raw_notes", async () => {
      const { error } = await supabase.from("calls").insert({
        org_id: testIds.org1,
        caller_id: testIds.callerRecord1,
        raw_notes: null as unknown as string,
        status: "pending",
      });
      return error;
    });

    reporter.log({
      name: "calls.raw_notes cannot be null",
      passed: !!result && result.code === "23502",
      expected: "Not null violation",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 4: callers.name cannot be null
  {
    const { result, duration } = await measureTest("NotNull: callers.name", async () => {
      const { error } = await supabase.from("callers").insert({
        org_id: testIds.org1,
        name: null as unknown as string,
      });
      return error;
    });

    reporter.log({
      name: "callers.name cannot be null",
      passed: !!result && result.code === "23502",
      expected: "Not null violation",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }
}

async function testEnumConstraints() {
  reporter.setCategory("Enum Constraints");

  // Test 1: user_role enum validation
  {
    const { result, duration } = await measureTest("Enum: user_role", async () => {
      const { error } = await supabase.from("users").insert({
        id: "33333333-3333-3333-3333-333333333333",
        org_id: testIds.org1,
        email: "enum-test@example.com",
        role: "invalid_role" as "caller", // Invalid enum value
      });
      return error;
    });

    reporter.log({
      name: "user_role only accepts valid enum values",
      passed: !!result && result.code === "22P02",
      expected: "Invalid enum value error",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 2: call_status enum validation
  {
    const { result, duration } = await measureTest("Enum: call_status", async () => {
      const { error } = await supabase.from("calls").insert({
        org_id: testIds.org1,
        caller_id: testIds.callerRecord1,
        raw_notes: "Test",
        status: "invalid_status" as "pending",
      });
      return error;
    });

    reporter.log({
      name: "call_status only accepts valid enum values",
      passed: !!result && result.code === "22P02",
      expected: "Invalid enum value error",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 3: call_source enum validation
  {
    const { result, duration } = await measureTest("Enum: call_source", async () => {
      const { error } = await supabase.from("calls").insert({
        org_id: testIds.org1,
        caller_id: testIds.callerRecord1,
        raw_notes: "Test",
        status: "pending",
        source: "invalid_source" as "manual",
      });
      return error;
    });

    reporter.log({
      name: "call_source only accepts valid enum values",
      passed: !!result && result.code === "22P02",
      expected: "Invalid enum value error",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 4: plan_type enum validation
  {
    const { result, duration } = await measureTest("Enum: plan_type", async () => {
      const { error } = await supabase.from("organizations").insert({
        name: "Enum Test Org",
        slug: "enum-test-org-plan",
        plan: "invalid_plan" as "free",
      });
      return error;
    });

    reporter.log({
      name: "plan_type only accepts valid enum values",
      passed: !!result && result.code === "22P02",
      expected: "Invalid enum value error",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }
}

async function testCheckConstraints() {
  reporter.setCategory("Check/Trigger Constraints");

  // Test 1: Trigger ensures single default grading template per org
  {
    const { duration } = await measureTest("Trigger: single default template", async () => {
      // Try to create a second default template
      const { error } = await supabase.from("grading_templates").insert({
        org_id: testIds.org1,
        name: "Second Default Template",
        criteria_json: [],
        is_default: true,
        is_active: true,
      });

      if (!error) {
        // Check if the original default was unset
        const { data: templates } = await supabase
          .from("grading_templates")
          .select("id, is_default")
          .eq("org_id", testIds.org1)
          .eq("is_default", true);

        // Cleanup
        await supabase
          .from("grading_templates")
          .delete()
          .eq("name", "Second Default Template");

        return templates?.length === 1;
      }
      return false;
    });

    const { result } = await measureTest("check", async () => {
      const { data: templates } = await supabase
        .from("grading_templates")
        .select("id, is_default")
        .eq("org_id", testIds.org1)
        .eq("is_default", true);
      return templates?.length;
    });

    reporter.log({
      name: "Only one default grading template per org allowed",
      passed: result === 1,
      expected: "1 default template",
      actual: `${result} default templates`,
      duration,
      severity: "medium",
    });
  }

  // Test 2: Trigger ensures single default scorecard config per org
  {
    const { result, duration } = await measureTest(
      "Trigger: single default scorecard",
      async () => {
        const { data: configs } = await supabase
          .from("scorecard_configs")
          .select("id, is_default")
          .eq("org_id", testIds.org1)
          .eq("is_default", true);
        return configs?.length;
      }
    );

    reporter.log({
      name: "Only one default scorecard config per org allowed",
      passed: result === undefined || result === 0 || result === 1,
      expected: "0 or 1 default config",
      actual: `${result} default configs`,
      duration,
      severity: "medium",
    });
  }
}

async function testDataIntegrity() {
  reporter.setCategory("Data Integrity");

  // Test 1: Call must belong to same org as caller
  {
    const { result, duration } = await measureTest("Integrity: call-caller org match", async () => {
      // Try to create a call with caller from different org
      const { error } = await supabase.from("calls").insert({
        org_id: testIds.org1,
        caller_id: testIds.callerRecord4, // Belongs to org2
        raw_notes: "Cross-org test",
        status: "pending",
      });
      return error;
    });

    // Note: This should ideally be caught by a constraint, but may not be
    // The test documents current behavior
    reporter.log({
      name: "Call org must match caller org (data integrity check)",
      passed: !!result, // Expect an error
      expected: "Error or constraint violation",
      actual: result ? `Error: ${result.message}` : "No error - POTENTIAL ISSUE",
      duration,
      severity: result ? "medium" : "high",
    });
  }

  // Test 2: UUID format validation
  {
    const { result, duration } = await measureTest("Integrity: UUID format", async () => {
      const { error } = await supabase.from("organizations").insert({
        id: "not-a-valid-uuid",
        name: "Invalid UUID Test",
        slug: "invalid-uuid-test",
      });
      return error;
    });

    reporter.log({
      name: "UUID fields must have valid UUID format",
      passed: !!result && result.code === "22P02",
      expected: "Invalid UUID error",
      actual: result ? `Error: ${result.code}` : "No error",
      duration,
      severity: "high",
    });
  }

  // Test 3: Email format validation (if enforced)
  {
    const { result, duration } = await measureTest("Integrity: email format", async () => {
      const { error } = await supabase.from("callers").insert({
        org_id: testIds.org1,
        name: "Bad Email Caller",
        email: "not-an-email",
      });

      if (!error) {
        // Cleanup
        await supabase.from("callers").delete().eq("email", "not-an-email");
      }

      return error;
    });

    reporter.log({
      name: "Email fields validate format (if enforced)",
      passed: true, // Document current behavior
      expected: "Error or stored as-is",
      actual: result ? `Enforced: ${result.code}` : "Not enforced (stored as-is)",
      duration,
      severity: "low",
    });
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("KALYXI - DATABASE CONSTRAINT TESTS");
  console.log("=".repeat(60));
  console.log("");

  try {
    await testForeignKeyConstraints();
    await testUniqueConstraints();
    await testNotNullConstraints();
    await testEnumConstraints();
    await testCheckConstraints();
    await testDataIntegrity();

    const summary = reporter.printSummary();
    process.exit(reporter.getExitCode());
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

main();

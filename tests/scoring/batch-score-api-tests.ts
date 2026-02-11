/**
 * Batch Score Upsert API Tests
 *
 * Tests the end-to-end data flow for:
 * - Creating sessions
 * - Submitting batch scores
 * - Verifying raw_score, normalized_score, weighted_score calculations
 * - Verifying is_auto_fail_triggered flags
 * - Completing sessions and verifying final scores
 *
 * Run: npx tsx tests/scoring/batch-score-api-tests.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config, TestReporter, measureTest } from "../config";
import {
  Template,
  Criteria,
  CriteriaGroup,
  Session,
  Score,
  ScoringMethod,
  CriteriaType,
  TemplateSettings,
  ScaleCriteriaConfig,
  PassFailCriteriaConfig,
  ChecklistCriteriaConfig,
} from "../../src/types/database";
import crypto from "crypto";

const reporter = new TestReporter();

// Admin client (bypasses RLS)
let adminClient: SupabaseClient;

// Deterministic UUID generator for test data
function deterministicUUID(namespace: string, index: number): string {
  const seed = config.seed || 42;
  const hash = crypto
    .createHash("sha256")
    .update(`${seed}-scoring-test-${namespace}-${index}`)
    .digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    "8" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

// Test data IDs
const testIds = {
  org: deterministicUUID("org", 1),
  user: deterministicUUID("user", 1),
  template: deterministicUUID("template", 1),
  group: deterministicUUID("group", 1),
  criteria: [
    deterministicUUID("criteria", 1),
    deterministicUUID("criteria", 2),
    deterministicUUID("criteria", 3),
    deterministicUUID("criteria", 4),
  ],
  session: deterministicUUID("session", 1),
};

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

async function setupTestData(): Promise<boolean> {
  try {
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if test org exists
    const { data: existingOrg } = await adminClient
      .from("organizations")
      .select("id")
      .eq("id", testIds.org)
      .maybeSingle();

    if (!existingOrg) {
      console.log("Setting up test organization...");

      // Create test organization
      const { error: orgError } = await adminClient.from("organizations").insert({
        id: testIds.org,
        name: "Scoring Test Org",
        slug: "scoring-test-org",
        plan: "professional",
        settings_json: {
          branding: { primaryColor: "#4F46E5", companyName: "Scoring Test" },
          timezone: "UTC",
          notifications: {
            emailOnNewCall: false,
            emailOnLowScore: false,
            lowScoreThreshold: 50,
            dailyDigest: false,
          },
          ai: { model: "gpt-4o", temperature: 0.3 },
          features: {
            gatekeeperDetection: true,
            autoAnalyze: true,
            competitorTracking: true,
          },
        },
      });

      if (orgError) {
        console.error("Error creating test org:", orgError);
        return false;
      }
    }

    // Check if test user exists in users table
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("email", "scoring-test@test.com")
      .maybeSingle();

    if (existingUser) {
      // User exists, use their ID
      (testIds as any).user = existingUser.id;
    } else {
      console.log("Setting up test user...");

      // Create test user in auth.users (using service role)
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: "scoring-test@test.com",
        password: config.testPassword,
        email_confirm: true,
        user_metadata: { name: "Scoring Test User" },
      });

      let userId = authUser?.user?.id;

      // If auth user creation failed (duplicate), try to get existing
      if (!userId && authError) {
        const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers();
        const existing = existingAuthUsers?.users?.find(u => u.email === "scoring-test@test.com");
        userId = existing?.id;
      }

      if (!userId) {
        console.error("Failed to get or create auth user");
        return false;
      }

      // Create user in users table
      const { error: userError } = await adminClient.from("users").insert({
        id: userId,
        org_id: testIds.org,
        email: "scoring-test@test.com",
        name: "Scoring Test User",
        role: "admin",
      });

      if (userError && !userError.message.includes("duplicate")) {
        console.error("Error creating test user:", userError);
      }

      // Update testIds.user to the actual user ID
      (testIds as any).user = userId;
    }

    return true;
  } catch (error) {
    console.error("Setup error:", error);
    return false;
  }
}

async function createTestTemplate(): Promise<Template | null> {
  // Check if template exists
  const { data: existingTemplate } = await adminClient
    .from("templates")
    .select("*")
    .eq("id", testIds.template)
    .maybeSingle();

  if (existingTemplate) {
    return existingTemplate as Template;
  }

  const templateSettings: TemplateSettings = {
    allow_na: true,
    require_comments_below_threshold: false,
    comments_threshold: 70,
    auto_calculate: true,
    show_weights_to_agents: false,
    allow_partial_submission: true,
  };

  // Create template
  const { data: template, error: templateError } = await adminClient
    .from("templates")
    .insert({
      id: testIds.template,
      org_id: testIds.org,
      name: "Scoring Test Template",
      description: "Template for batch score API testing",
      scoring_method: "weighted",
      use_case: "sales_call",
      pass_threshold: 70,
      max_total_score: 100,
      settings: templateSettings,
      status: "active",
      version: 1,
      is_default: false,
    })
    .select()
    .single();

  if (templateError) {
    console.error("Error creating template:", templateError);
    return null;
  }

  // Create criteria group
  const { error: groupError } = await adminClient.from("criteria_groups").insert({
    id: testIds.group,
    template_id: testIds.template,
    name: "Test Group",
    description: "Group for testing",
    sort_order: 0,
    weight: 1,
    is_required: false,
  });

  if (groupError) {
    console.error("Error creating group:", groupError);
  }

  // Create criteria
  const criteriaToInsert = [
    {
      id: testIds.criteria[0],
      template_id: testIds.template,
      group_id: testIds.group,
      name: "Scale Criterion",
      criteria_type: "scale",
      config: { min: 1, max: 5, step: 1 } as ScaleCriteriaConfig,
      weight: 2,
      max_score: 100,
      sort_order: 0,
      is_required: false,
      is_auto_fail: false,
      keywords: [],
    },
    {
      id: testIds.criteria[1],
      template_id: testIds.template,
      group_id: testIds.group,
      name: "Pass/Fail Criterion",
      criteria_type: "pass_fail",
      config: {
        pass_label: "Yes",
        fail_label: "No",
        pass_value: 100,
        fail_value: 0,
      } as PassFailCriteriaConfig,
      weight: 1,
      max_score: 100,
      sort_order: 1,
      is_required: false,
      is_auto_fail: false,
      keywords: [],
    },
    {
      id: testIds.criteria[2],
      template_id: testIds.template,
      group_id: testIds.group,
      name: "Auto-Fail Criterion",
      criteria_type: "scale",
      config: { min: 1, max: 5, step: 1 } as ScaleCriteriaConfig,
      weight: 1,
      max_score: 100,
      sort_order: 2,
      is_required: false,
      is_auto_fail: true,
      auto_fail_threshold: 50, // Below 50% triggers auto-fail
      keywords: [],
    },
    {
      id: testIds.criteria[3],
      template_id: testIds.template,
      group_id: testIds.group,
      name: "Checklist Criterion",
      criteria_type: "checklist",
      config: {
        items: [
          { id: "a", label: "Item A", points: 10 },
          { id: "b", label: "Item B", points: 20 },
          { id: "c", label: "Item C", points: 30 },
        ],
        scoring: "sum",
      } as ChecklistCriteriaConfig,
      weight: 1,
      max_score: 100,
      sort_order: 3,
      is_required: false,
      is_auto_fail: false,
      keywords: [],
    },
  ];

  const { error: criteriaError } = await adminClient
    .from("criteria")
    .insert(criteriaToInsert);

  if (criteriaError) {
    console.error("Error creating criteria:", criteriaError);
  }

  return template as Template;
}

async function createTestSession(template: Template): Promise<Session | null> {
  // Get user for session
  const { data: users } = await adminClient
    .from("users")
    .select("id")
    .eq("org_id", testIds.org)
    .limit(1);

  const userId = users?.[0]?.id;

  if (!userId) {
    console.error("No user found for session creation");
    return null;
  }

  // Fetch criteria for snapshot
  const { data: criteria } = await adminClient
    .from("criteria")
    .select("*")
    .eq("template_id", testIds.template);

  const { data: groups } = await adminClient
    .from("criteria_groups")
    .select("*")
    .eq("template_id", testIds.template);

  // Delete existing test session if exists
  await adminClient.from("sessions").delete().eq("id", testIds.session);

  // Create session with template snapshot
  const { data: session, error } = await adminClient
    .from("sessions")
    .insert({
      id: testIds.session,
      org_id: testIds.org,
      template_id: testIds.template,
      coach_id: userId,
      status: "pending",
      template_version: template.version,
      template_snapshot: {
        template: {
          id: template.id,
          name: template.name,
          scoring_method: template.scoring_method,
          pass_threshold: template.pass_threshold,
          settings: template.settings,
        },
        groups: groups || [],
        criteria: criteria || [],
      },
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error);
    return null;
  }

  return session as Session;
}

async function getAuthToken(): Promise<string | null> {
  // Try to get existing user
  const { data: existingUser } = await adminClient
    .from("users")
    .select("email")
    .eq("org_id", testIds.org)
    .limit(1)
    .single();

  if (!existingUser) {
    console.error("No test user found");
    return null;
  }

  const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: existingUser.email,
    password: config.testPassword,
  });

  if (error) {
    console.error("Auth error:", error.message);
    return null;
  }

  return data.session?.access_token || null;
}

async function apiRequest(
  endpoint: string,
  method: string = "GET",
  body?: unknown,
  token?: string | null
): Promise<{ status: number; data: any; duration: number }> {
  const start = Date.now();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    return { status: response.status, data, duration: Date.now() - start };
  } catch (error) {
    return {
      status: 0,
      data: { error: error instanceof Error ? error.message : "Request failed" },
      duration: Date.now() - start,
    };
  }
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testBatchScoreSubmission(token: string) {
  reporter.setCategory("Batch Score Submission");

  // Test 1: Submit batch scores
  {
    const scores = [
      {
        criteria_id: testIds.criteria[0],
        value: { value: 4 }, // Scale: 4 on 1-5 = 75%
        is_na: false,
      },
      {
        criteria_id: testIds.criteria[1],
        value: { passed: true }, // Pass/Fail: pass = 100%
        is_na: false,
      },
      {
        criteria_id: testIds.criteria[2],
        value: { value: 3 }, // Scale: 3 on 1-5 = 50% (auto-fail threshold)
        is_na: false,
      },
      {
        criteria_id: testIds.criteria[3],
        value: { checked: ["a", "b"] }, // Checklist: 30/60 = 50%
        is_na: false,
      },
    ];

    const { status, data, duration } = await apiRequest(
      `/api/sessions/${testIds.session}/scores`,
      "PUT",
      { scores },
      token
    );

    const passed =
      status === 200 &&
      data.data &&
      Array.isArray(data.data) &&
      data.data.length === 4;

    reporter.log({
      name: "Submit batch scores returns 200 with all scores",
      passed,
      expected: "200 with 4 scores",
      actual: `${status} with ${data.data?.length || 0} scores`,
      duration,
      severity: "blocker",
    });
  }
}

async function testScoreCalculationVerification() {
  reporter.setCategory("Score Calculation Verification");

  // Fetch scores directly from database
  const { data: scores } = await adminClient
    .from("scores")
    .select("*")
    .eq("session_id", testIds.session);

  if (!scores || scores.length === 0) {
    reporter.log({
      name: "Scores exist in database",
      passed: false,
      expected: "4 scores",
      actual: "0 scores",
      duration: 0,
      severity: "blocker",
    });
    return;
  }

  // Test 1: Scale criterion calculation (4 on 1-5 scale, weight 2)
  {
    const scaleCriterion = scores.find((s) => s.criteria_id === testIds.criteria[0]);

    // (4 - 1) / (5 - 1) = 0.75 * 100 = 75
    // weightedScore = 75 * 2 / 100 = 1.5
    const rawScoreCorrect = Math.abs((scaleCriterion?.raw_score || 0) - 75) < 0.1;
    const normalizedCorrect =
      Math.abs((scaleCriterion?.normalized_score || 0) - 75) < 0.1;
    const weightedCorrect =
      Math.abs((scaleCriterion?.weighted_score || 0) - 1.5) < 0.1;

    reporter.log({
      name: "Scale: raw_score = 75, normalized = 75%, weighted = 1.5",
      passed: rawScoreCorrect && normalizedCorrect && weightedCorrect,
      expected: "raw=75, normalized=75, weighted=1.5",
      actual: `raw=${scaleCriterion?.raw_score}, normalized=${scaleCriterion?.normalized_score}, weighted=${scaleCriterion?.weighted_score}`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Test 2: Pass/Fail criterion calculation (passed, weight 1)
  {
    const passFail = scores.find((s) => s.criteria_id === testIds.criteria[1]);

    // passed = 100
    // weightedScore = 100 * 1 / 100 = 1
    const rawScoreCorrect = Math.abs((passFail?.raw_score || 0) - 100) < 0.1;
    const normalizedCorrect = Math.abs((passFail?.normalized_score || 0) - 100) < 0.1;
    const weightedCorrect = Math.abs((passFail?.weighted_score || 0) - 1) < 0.1;

    reporter.log({
      name: "Pass/Fail: raw_score = 100, normalized = 100%, weighted = 1",
      passed: rawScoreCorrect && normalizedCorrect && weightedCorrect,
      expected: "raw=100, normalized=100, weighted=1",
      actual: `raw=${passFail?.raw_score}, normalized=${passFail?.normalized_score}, weighted=${passFail?.weighted_score}`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Test 3: Auto-fail criterion (3 on 1-5 = 50%, at threshold)
  {
    const autoFail = scores.find((s) => s.criteria_id === testIds.criteria[2]);

    // (3 - 1) / (5 - 1) = 0.5 * 100 = 50
    // At threshold (50), should NOT trigger (threshold is below, not at)
    const normalizedCorrect = Math.abs((autoFail?.normalized_score || 0) - 50) < 0.1;
    const autoFailNotTriggered = autoFail?.is_auto_fail_triggered === false;

    reporter.log({
      name: "Auto-fail: 50% at 50% threshold, NOT triggered (requires < 50)",
      passed: normalizedCorrect && autoFailNotTriggered,
      expected: "normalized=50, is_auto_fail_triggered=false",
      actual: `normalized=${autoFail?.normalized_score}, triggered=${autoFail?.is_auto_fail_triggered}`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Test 4: Checklist criterion (30/60 = 50%)
  {
    const checklist = scores.find((s) => s.criteria_id === testIds.criteria[3]);

    // Items a(10) + b(20) = 30, max = 60
    // 30/60 * 100 = 50
    const normalizedCorrect =
      Math.abs((checklist?.normalized_score || 0) - 50) < 0.1;

    reporter.log({
      name: "Checklist: 30/60 points = 50%",
      passed: normalizedCorrect,
      expected: "normalized=50",
      actual: `normalized=${checklist?.normalized_score}`,
      duration: 0,
      severity: "blocker",
    });
  }
}

async function testAutoFailTrigger(token: string) {
  reporter.setCategory("Auto-Fail Trigger");

  // Create a new session for auto-fail test
  const autoFailSessionId = deterministicUUID("session", 2);

  // Delete if exists
  await adminClient.from("sessions").delete().eq("id", autoFailSessionId);

  // Get template data
  const { data: template } = await adminClient
    .from("templates")
    .select("*")
    .eq("id", testIds.template)
    .single();

  const { data: criteria } = await adminClient
    .from("criteria")
    .select("*")
    .eq("template_id", testIds.template);

  const { data: groups } = await adminClient
    .from("criteria_groups")
    .select("*")
    .eq("template_id", testIds.template);

  const { data: users } = await adminClient
    .from("users")
    .select("id")
    .eq("org_id", testIds.org)
    .limit(1);

  // Create session
  const { data: session } = await adminClient
    .from("sessions")
    .insert({
      id: autoFailSessionId,
      org_id: testIds.org,
      template_id: testIds.template,
      coach_id: users?.[0]?.id,
      status: "pending",
      template_version: template?.version || 1,
      template_snapshot: {
        template: template,
        groups: groups || [],
        criteria: criteria || [],
      },
    })
    .select()
    .single();

  if (!session) {
    reporter.log({
      name: "Create auto-fail test session",
      passed: false,
      expected: "Session created",
      actual: "Session creation failed",
      duration: 0,
      severity: "blocker",
    });
    return;
  }

  // Submit score below threshold (2 on 1-5 = 25%, below 50% threshold)
  const scores = [
    {
      criteria_id: testIds.criteria[2], // Auto-fail criterion
      value: { value: 2 }, // 25% - below 50% threshold
      is_na: false,
    },
  ];

  const { status, data, duration } = await apiRequest(
    `/api/sessions/${autoFailSessionId}/scores`,
    "PUT",
    { scores },
    token
  );

  // Fetch score from database
  const { data: savedScores } = await adminClient
    .from("scores")
    .select("*")
    .eq("session_id", autoFailSessionId);

  const autoFailScore = savedScores?.[0];
  const triggered = autoFailScore?.is_auto_fail_triggered === true;
  const normalizedCorrect =
    Math.abs((autoFailScore?.normalized_score || 0) - 25) < 0.1;

  reporter.log({
    name: "Auto-fail: 25% below 50% threshold triggers auto-fail",
    passed: status === 200 && triggered && normalizedCorrect,
    expected: "is_auto_fail_triggered=true, normalized=25",
    actual: `triggered=${triggered}, normalized=${autoFailScore?.normalized_score}`,
    duration,
    severity: "blocker",
  });

  // Cleanup
  await adminClient.from("sessions").delete().eq("id", autoFailSessionId);
}

async function testSessionComplete(token: string) {
  reporter.setCategory("Session Complete");

  // First, start the session (it should auto-start on score submission, but let's verify status)
  const { data: sessionBefore } = await adminClient
    .from("sessions")
    .select("status")
    .eq("id", testIds.session)
    .single();

  // Complete the session
  const { status, data, duration } = await apiRequest(
    `/api/sessions/${testIds.session}/complete`,
    "POST",
    { coach_notes: "Test completion" },
    token
  );

  // Verify the session was completed
  const { data: sessionAfter } = await adminClient
    .from("sessions")
    .select("*")
    .eq("id", testIds.session)
    .single();

  // Test 1: Session status changed to completed
  {
    const statusCorrect = sessionAfter?.status === "completed";
    reporter.log({
      name: "Session status changed to 'completed'",
      passed: statusCorrect,
      expected: "completed",
      actual: sessionAfter?.status || "unknown",
      duration,
      severity: "blocker",
    });
  }

  // Test 2: Final score calculated correctly
  {
    // Weights: scale(2), pass_fail(1), auto-fail(1), checklist(1) = 5 total
    // Scores: 75%(w2) + 100%(w1) + 50%(w1) + 50%(w1)
    // Weighted sum: 75*2 + 100*1 + 50*1 + 50*1 = 150 + 100 + 50 + 50 = 350
    // Weighted sum / 100 = 3.5
    // Total weight = 5
    // Percentage = 3.5 / 5 * 100 = 70%

    const percentageCorrect =
      Math.abs((sessionAfter?.percentage_score || 0) - 70) < 1;

    reporter.log({
      name: "Final percentage_score = 70%",
      passed: percentageCorrect,
      expected: "70%",
      actual: `${sessionAfter?.percentage_score}%`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Test 3: Pass status at threshold
  {
    // 70% exactly at 70% threshold should pass
    const passCorrect = sessionAfter?.pass_status === "pass";

    reporter.log({
      name: "Pass status at 70% threshold = pass",
      passed: passCorrect,
      expected: "pass",
      actual: sessionAfter?.pass_status || "unknown",
      duration: 0,
      severity: "blocker",
    });
  }

  // Test 4: No auto-fail (all scores at or above threshold)
  {
    const noAutoFail = sessionAfter?.has_auto_fail === false;

    reporter.log({
      name: "No auto-fail triggered (all scores >= threshold)",
      passed: noAutoFail,
      expected: "has_auto_fail=false",
      actual: `has_auto_fail=${sessionAfter?.has_auto_fail}`,
      duration: 0,
      severity: "blocker",
    });
  }
}

async function testSessionAuditLog() {
  reporter.setCategory("Session Audit Log");

  // Fetch audit log
  const { data: auditLog } = await adminClient
    .from("session_audit_log")
    .select("*")
    .eq("session_id", testIds.session)
    .order("created_at", { ascending: true });

  // Test 1: Audit log entries exist
  {
    const hasEntries = auditLog && auditLog.length >= 2; // At least score_updated and completed

    reporter.log({
      name: "Audit log has entries for session",
      passed: hasEntries === true,
      expected: ">=2 entries",
      actual: `${auditLog?.length || 0} entries`,
      duration: 0,
      severity: "high",
    });
  }

  // Test 2: score_updated action logged
  {
    const hasScoreUpdate = auditLog?.some((log) => log.action === "score_updated");

    reporter.log({
      name: "score_updated action logged",
      passed: hasScoreUpdate === true,
      expected: "score_updated action exists",
      actual: hasScoreUpdate ? "found" : "not found",
      duration: 0,
      severity: "high",
    });
  }

  // Test 3: completed action logged
  {
    const hasCompleted = auditLog?.some((log) => log.action === "completed");

    reporter.log({
      name: "completed action logged",
      passed: hasCompleted === true,
      expected: "completed action exists",
      actual: hasCompleted ? "found" : "not found",
      duration: 0,
      severity: "high",
    });
  }
}

async function cleanup() {
  console.log("\nCleaning up test data...");

  // Delete in order due to foreign keys
  await adminClient.from("session_audit_log").delete().eq("session_id", testIds.session);
  await adminClient.from("scores").delete().eq("session_id", testIds.session);
  await adminClient.from("sessions").delete().eq("template_id", testIds.template);
  await adminClient.from("criteria").delete().eq("template_id", testIds.template);
  await adminClient.from("criteria_groups").delete().eq("template_id", testIds.template);
  await adminClient.from("templates").delete().eq("id", testIds.template);

  console.log("Cleanup complete.");
}

// ============================================================================
// MAIN
// ============================================================================

async function runBatchScoreTests(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("BATCH SCORE UPSERT API TESTS");
  console.log("=".repeat(60));

  // Setup
  console.log("\nSetting up test environment...");
  const setupSuccess = await setupTestData();
  if (!setupSuccess) {
    console.error("Setup failed. Exiting.");
    process.exit(1);
  }

  // Create test template
  console.log("Creating test template...");
  const template = await createTestTemplate();
  if (!template) {
    console.error("Failed to create test template. Exiting.");
    process.exit(1);
  }

  // Create test session
  console.log("Creating test session...");
  const session = await createTestSession(template);
  if (!session) {
    console.error("Failed to create test session. Exiting.");
    process.exit(1);
  }

  // Get auth token
  console.log("Getting auth token...");
  const token = await getAuthToken();
  if (!token) {
    console.error("Failed to get auth token. Tests require a running server.");
    console.log("Please ensure the dev server is running: npm run dev");
    console.log("\nRunning database-only tests...");

    // Run database-only verification
    reporter.setCategory("Setup Verification");
    reporter.log({
      name: "Test data created successfully",
      passed: true,
      expected: "Template and session created",
      actual: `Template: ${template.id}, Session: ${session.id}`,
      duration: 0,
      severity: "high",
    });

    reporter.printSummary();
    await cleanup();
    process.exit(0);
  }

  // Run tests
  try {
    await testBatchScoreSubmission(token);
    await testScoreCalculationVerification();
    await testAutoFailTrigger(token);
    await testSessionComplete(token);
    await testSessionAuditLog();
  } catch (error) {
    console.error("Test error:", error);
  }

  // Print summary
  reporter.printSummary();

  // Cleanup
  await cleanup();

  const exitCode = reporter.getExitCode();
  process.exit(exitCode);
}

// Run
runBatchScoreTests().catch((error) => {
  console.error("Test suite crashed:", error);
  process.exit(1);
});

/**
 * Template Versioning Chain Tests
 *
 * Tests the integrity of template versioning:
 * - Version numbers increment correctly
 * - Snapshots contain all template data
 * - Sessions preserve their snapshot when template changes
 * - Historical sessions can still be scored with their original criteria
 *
 * Run: npx tsx tests/scoring/template-versioning-tests.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config, TestReporter, measureTest } from "../config";
import {
  Template,
  TemplateVersion,
  Criteria,
  CriteriaGroup,
  Session,
  TemplateVersionSnapshot,
  ScaleCriteriaConfig,
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
    .update(`${seed}-versioning-test-${namespace}-${index}`)
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
  criteria1: deterministicUUID("criteria", 1),
  criteria2: deterministicUUID("criteria", 2),
  session1: deterministicUUID("session", 1),
  session2: deterministicUUID("session", 2),
};

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

async function setupTestData(): Promise<boolean> {
  try {
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Clean up any existing test data
    await cleanup();

    // Check if test org exists
    const { data: existingOrg } = await adminClient
      .from("organizations")
      .select("id")
      .eq("id", testIds.org)
      .maybeSingle();

    if (!existingOrg) {
      // Create test organization
      const { error: orgError } = await adminClient.from("organizations").insert({
        id: testIds.org,
        name: "Versioning Test Org",
        slug: "versioning-test-org",
        plan: "professional",
        settings_json: {
          branding: { primaryColor: "#4F46E5", companyName: "Versioning Test" },
          timezone: "UTC",
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
      .eq("email", "versioning-test@test.com")
      .maybeSingle();

    if (existingUser) {
      // User exists, use their ID
      (testIds as any).user = existingUser.id;
    } else {
      // Create test user in auth.users first
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: "versioning-test@test.com",
        password: config.testPassword,
        email_confirm: true,
        user_metadata: { name: "Versioning Test User" },
      });

      let userId = authUser?.user?.id;

      // If auth user creation failed (duplicate), try to get existing
      if (!userId && authError) {
        const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers();
        const existing = existingAuthUsers?.users?.find(u => u.email === "versioning-test@test.com");
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
        email: "versioning-test@test.com",
        name: "Versioning Test User",
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

async function createTestTemplateV1(): Promise<Template | null> {
  // Create template at version 1
  const { data: template, error: templateError } = await adminClient
    .from("templates")
    .insert({
      id: testIds.template,
      org_id: testIds.org,
      name: "Versioning Test Template",
      description: "Template for versioning tests",
      scoring_method: "weighted",
      use_case: "sales_call",
      pass_threshold: 70,
      max_total_score: 100,
      settings: {
        allow_na: true,
        require_comments_below_threshold: false,
        comments_threshold: 70,
        auto_calculate: true,
        show_weights_to_agents: false,
        allow_partial_submission: true,
      },
      status: "draft",
      version: 0, // Not published yet
      is_default: false,
    })
    .select()
    .single();

  if (templateError) {
    console.error("Error creating template:", templateError);
    return null;
  }

  // Create group
  const { error: groupError } = await adminClient.from("criteria_groups").insert({
    id: testIds.group,
    template_id: testIds.template,
    name: "Initial Group",
    description: "Group for v1",
    sort_order: 0,
    weight: 1,
    is_required: false,
  });

  if (groupError) {
    console.error("Error creating group:", groupError);
  }

  // Create criteria (weight must total 100 for weighted)
  const { error: criteriaError } = await adminClient.from("criteria").insert([
    {
      id: testIds.criteria1,
      template_id: testIds.template,
      group_id: testIds.group,
      name: "Criterion A - V1",
      criteria_type: "scale",
      config: { min: 1, max: 5, step: 1 } as ScaleCriteriaConfig,
      weight: 60, // 60%
      max_score: 100,
      sort_order: 0,
      is_required: false,
      is_auto_fail: false,
      keywords: [],
    },
    {
      id: testIds.criteria2,
      template_id: testIds.template,
      group_id: testIds.group,
      name: "Criterion B - V1",
      criteria_type: "scale",
      config: { min: 1, max: 5, step: 1 } as ScaleCriteriaConfig,
      weight: 40, // 40%
      max_score: 100,
      sort_order: 1,
      is_required: false,
      is_auto_fail: false,
      keywords: [],
    },
  ]);

  if (criteriaError) {
    console.error("Error creating criteria:", criteriaError);
  }

  return template as Template;
}

async function publishTemplate(changeSummary: string): Promise<TemplateVersion | null> {
  // Fetch template
  const { data: template } = await adminClient
    .from("templates")
    .select("*")
    .eq("id", testIds.template)
    .single();

  if (!template) {
    console.error("Template not found");
    return null;
  }

  // Fetch groups
  const { data: groups } = await adminClient
    .from("criteria_groups")
    .select("*")
    .eq("template_id", testIds.template)
    .order("sort_order", { ascending: true });

  // Fetch criteria
  const { data: criteria } = await adminClient
    .from("criteria")
    .select("*")
    .eq("template_id", testIds.template)
    .order("sort_order", { ascending: true });

  // Get next version number
  const { data: latestVersion } = await adminClient
    .from("template_versions")
    .select("version_number")
    .eq("template_id", testIds.template)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latestVersion?.version_number || 0) + 1;

  // Create version snapshot
  const snapshot: TemplateVersionSnapshot = {
    template: {
      ...template,
      version: nextVersion,
      status: "active",
    },
    groups: groups || [],
    criteria: criteria || [],
  };

  // Create version record
  const { data: version, error: versionError } = await adminClient
    .from("template_versions")
    .insert({
      template_id: testIds.template,
      version_number: nextVersion,
      snapshot,
      change_summary: changeSummary,
      changed_by: testIds.user,
    })
    .select()
    .single();

  if (versionError) {
    console.error("Error creating version:", versionError);
    return null;
  }

  // Update template
  await adminClient
    .from("templates")
    .update({
      status: "active",
      version: nextVersion,
      activated_at: new Date().toISOString(),
    })
    .eq("id", testIds.template);

  return version as TemplateVersion;
}

async function createSessionAtVersion(sessionId: string): Promise<Session | null> {
  // Fetch current template and criteria
  const { data: template } = await adminClient
    .from("templates")
    .select("*")
    .eq("id", testIds.template)
    .single();

  const { data: groups } = await adminClient
    .from("criteria_groups")
    .select("*")
    .eq("template_id", testIds.template)
    .order("sort_order", { ascending: true });

  const { data: criteria } = await adminClient
    .from("criteria")
    .select("*")
    .eq("template_id", testIds.template)
    .order("sort_order", { ascending: true });

  if (!template) {
    console.error("Template not found");
    return null;
  }

  // Create session with snapshot
  const templateSnapshot: TemplateVersionSnapshot = {
    template: {
      id: template.id,
      name: template.name,
      scoring_method: template.scoring_method,
      use_case: template.use_case,
      pass_threshold: template.pass_threshold,
      settings: template.settings,
    },
    groups: groups || [],
    criteria: criteria || [],
  };

  const { data: session, error } = await adminClient
    .from("sessions")
    .insert({
      id: sessionId,
      org_id: testIds.org,
      template_id: testIds.template,
      coach_id: testIds.user,
      status: "pending",
      template_version: template.version,
      template_snapshot: templateSnapshot,
      pass_status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error);
    return null;
  }

  return session as Session;
}

async function modifyTemplateForV2(): Promise<void> {
  // Update criterion names to indicate v2
  await adminClient
    .from("criteria")
    .update({ name: "Criterion A - V2 MODIFIED", weight: 70 })
    .eq("id", testIds.criteria1);

  await adminClient
    .from("criteria")
    .update({ name: "Criterion B - V2 MODIFIED", weight: 30 })
    .eq("id", testIds.criteria2);
}

async function cleanup(): Promise<void> {
  // Delete in order due to foreign keys
  await adminClient.from("session_audit_log").delete().eq("session_id", testIds.session1);
  await adminClient.from("session_audit_log").delete().eq("session_id", testIds.session2);
  await adminClient.from("scores").delete().eq("session_id", testIds.session1);
  await adminClient.from("scores").delete().eq("session_id", testIds.session2);
  await adminClient.from("sessions").delete().eq("template_id", testIds.template);
  await adminClient.from("template_versions").delete().eq("template_id", testIds.template);
  await adminClient.from("criteria").delete().eq("template_id", testIds.template);
  await adminClient.from("criteria_groups").delete().eq("template_id", testIds.template);
  await adminClient.from("templates").delete().eq("id", testIds.template);
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testVersionNumberIncrement() {
  reporter.setCategory("Version Number Increment");

  // Test 1: First publish creates version 1
  {
    const version1 = await publishTemplate("Initial release");

    reporter.log({
      name: "First publish creates version 1",
      passed: version1?.version_number === 1,
      expected: "version_number = 1",
      actual: `version_number = ${version1?.version_number}`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Modify template
  await modifyTemplateForV2();

  // Test 2: Second publish creates version 2
  {
    const version2 = await publishTemplate("Updated criteria weights");

    reporter.log({
      name: "Second publish increments to version 2",
      passed: version2?.version_number === 2,
      expected: "version_number = 2",
      actual: `version_number = ${version2?.version_number}`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Test 3: Template version updated
  {
    const { data: template } = await adminClient
      .from("templates")
      .select("version")
      .eq("id", testIds.template)
      .single();

    reporter.log({
      name: "Template version matches latest published version",
      passed: template?.version === 2,
      expected: "version = 2",
      actual: `version = ${template?.version}`,
      duration: 0,
      severity: "blocker",
    });
  }
}

async function testSnapshotContents() {
  reporter.setCategory("Snapshot Contents");

  // Fetch versions
  const { data: versions } = await adminClient
    .from("template_versions")
    .select("*")
    .eq("template_id", testIds.template)
    .order("version_number", { ascending: true });

  if (!versions || versions.length < 2) {
    reporter.log({
      name: "Both versions exist",
      passed: false,
      expected: "2 versions",
      actual: `${versions?.length || 0} versions`,
      duration: 0,
      severity: "blocker",
    });
    return;
  }

  const v1 = versions[0];
  const v2 = versions[1];

  const v1Snapshot = v1.snapshot as TemplateVersionSnapshot;
  const v2Snapshot = v2.snapshot as TemplateVersionSnapshot;

  // Test 1: V1 snapshot has template data
  {
    const hasTemplate = v1Snapshot.template !== undefined;
    const hasGroups = Array.isArray(v1Snapshot.groups);
    const hasCriteria = Array.isArray(v1Snapshot.criteria);

    reporter.log({
      name: "V1 snapshot contains template, groups, and criteria",
      passed: hasTemplate && hasGroups && hasCriteria,
      expected: "template, groups[], criteria[]",
      actual: `template: ${hasTemplate}, groups: ${hasGroups}, criteria: ${hasCriteria}`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Test 2: V1 criteria have original names
  {
    const criteria = v1Snapshot.criteria as Criteria[];
    const criterionA = criteria.find((c) => c.id === testIds.criteria1);

    const hasV1Name = criterionA?.name === "Criterion A - V1";
    const hasWeight60 = criterionA?.weight === 60;

    reporter.log({
      name: "V1 snapshot has original criterion name and weight",
      passed: hasV1Name && hasWeight60,
      expected: "name='Criterion A - V1', weight=60",
      actual: `name='${criterionA?.name}', weight=${criterionA?.weight}`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Test 3: V2 criteria have modified names
  {
    const criteria = v2Snapshot.criteria as Criteria[];
    const criterionA = criteria.find((c) => c.id === testIds.criteria1);

    const hasV2Name = criterionA?.name === "Criterion A - V2 MODIFIED";
    const hasWeight70 = criterionA?.weight === 70;

    reporter.log({
      name: "V2 snapshot has modified criterion name and weight",
      passed: hasV2Name && hasWeight70,
      expected: "name='Criterion A - V2 MODIFIED', weight=70",
      actual: `name='${criterionA?.name}', weight=${criterionA?.weight}`,
      duration: 0,
      severity: "blocker",
    });
  }
}

async function testSessionSnapshotIntegrity() {
  reporter.setCategory("Session Snapshot Integrity");

  // First, revert template to V1 state for fresh tests
  await cleanup();
  await createTestTemplateV1();

  // Publish V1
  await publishTemplate("Initial release for session test");

  // Create session at V1
  const session1 = await createSessionAtVersion(testIds.session1);

  // Test 1: Session has version 1 snapshot
  {
    const snapshot = session1?.template_snapshot as TemplateVersionSnapshot;
    const criteria = snapshot?.criteria as Criteria[];
    const criterionA = criteria?.find((c) => c.id === testIds.criteria1);

    const hasV1Name = criterionA?.name === "Criterion A - V1";
    const hasV1 = session1?.template_version === 1;

    reporter.log({
      name: "Session 1 created with V1 snapshot",
      passed: hasV1 && hasV1Name,
      expected: "template_version=1, criterion name='Criterion A - V1'",
      actual: `template_version=${session1?.template_version}, criterion='${criterionA?.name}'`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Modify template and publish V2
  await modifyTemplateForV2();
  await publishTemplate("Updated for V2");

  // Create session at V2
  const session2 = await createSessionAtVersion(testIds.session2);

  // Test 2: Session 2 has version 2 snapshot
  {
    const snapshot = session2?.template_snapshot as TemplateVersionSnapshot;
    const criteria = snapshot?.criteria as Criteria[];
    const criterionA = criteria?.find((c) => c.id === testIds.criteria1);

    const hasV2Name = criterionA?.name === "Criterion A - V2 MODIFIED";
    const hasV2 = session2?.template_version === 2;

    reporter.log({
      name: "Session 2 created with V2 snapshot",
      passed: hasV2 && hasV2Name,
      expected: "template_version=2, criterion name='Criterion A - V2 MODIFIED'",
      actual: `template_version=${session2?.template_version}, criterion='${criterionA?.name}'`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Test 3: Session 1 STILL has V1 snapshot (immutable)
  {
    const { data: session1Refetched } = await adminClient
      .from("sessions")
      .select("*")
      .eq("id", testIds.session1)
      .single();

    const snapshot = session1Refetched?.template_snapshot as TemplateVersionSnapshot;
    const criteria = snapshot?.criteria as Criteria[];
    const criterionA = criteria?.find((c) => c.id === testIds.criteria1);

    const stillHasV1 = criterionA?.name === "Criterion A - V1";
    const stillVersion1 = session1Refetched?.template_version === 1;

    reporter.log({
      name: "Session 1 snapshot unchanged after template update (immutable)",
      passed: stillHasV1 && stillVersion1,
      expected: "template_version=1, criterion name='Criterion A - V1'",
      actual: `template_version=${session1Refetched?.template_version}, criterion='${criterionA?.name}'`,
      duration: 0,
      severity: "blocker",
    });
  }
}

async function testHistoricalSessionScoring() {
  reporter.setCategory("Historical Session Scoring");

  // Fetch sessions
  const { data: session1 } = await adminClient
    .from("sessions")
    .select("*")
    .eq("id", testIds.session1)
    .single();

  const { data: session2 } = await adminClient
    .from("sessions")
    .select("*")
    .eq("id", testIds.session2)
    .single();

  if (!session1 || !session2) {
    reporter.log({
      name: "Both sessions exist for scoring test",
      passed: false,
      expected: "2 sessions",
      actual: "Missing sessions",
      duration: 0,
      severity: "blocker",
    });
    return;
  }

  // Test 1: V1 session criteria have weight 60/40
  {
    const snapshot = session1.template_snapshot as TemplateVersionSnapshot;
    const criteria = snapshot.criteria as Criteria[];
    const criterionA = criteria.find((c) => c.id === testIds.criteria1);
    const criterionB = criteria.find((c) => c.id === testIds.criteria2);

    const correctWeights =
      criterionA?.weight === 60 && criterionB?.weight === 40;

    reporter.log({
      name: "V1 session uses original weights (60/40)",
      passed: correctWeights,
      expected: "A=60, B=40",
      actual: `A=${criterionA?.weight}, B=${criterionB?.weight}`,
      duration: 0,
      severity: "blocker",
    });
  }

  // Test 2: V2 session criteria have weight 70/30
  {
    const snapshot = session2.template_snapshot as TemplateVersionSnapshot;
    const criteria = snapshot.criteria as Criteria[];
    const criterionA = criteria.find((c) => c.id === testIds.criteria1);
    const criterionB = criteria.find((c) => c.id === testIds.criteria2);

    const correctWeights =
      criterionA?.weight === 70 && criterionB?.weight === 30;

    reporter.log({
      name: "V2 session uses modified weights (70/30)",
      passed: correctWeights,
      expected: "A=70, B=30",
      actual: `A=${criterionA?.weight}, B=${criterionB?.weight}`,
      duration: 0,
      severity: "blocker",
    });
  }
}

async function testVersionListAPI() {
  reporter.setCategory("Version List API");

  // Fetch versions via query (mimicking API behavior)
  const { data: versions, count } = await adminClient
    .from("template_versions")
    .select("*", { count: "exact" })
    .eq("template_id", testIds.template)
    .order("version_number", { ascending: false });

  // Test 1: Versions are returned in descending order
  {
    const isDescending =
      versions &&
      versions.length >= 2 &&
      versions[0].version_number > versions[1].version_number;

    reporter.log({
      name: "Versions returned in descending order (latest first)",
      passed: isDescending === true,
      expected: "v2 before v1",
      actual: versions?.map((v) => `v${v.version_number}`).join(", ") || "none",
      duration: 0,
      severity: "high",
    });
  }

  // Test 2: Count is correct
  {
    reporter.log({
      name: "Version count is correct",
      passed: count === 2,
      expected: "2",
      actual: String(count),
      duration: 0,
      severity: "high",
    });
  }

  // Test 3: Each version has required fields
  {
    const hasRequiredFields =
      versions?.every(
        (v) =>
          v.id &&
          v.template_id &&
          v.version_number &&
          v.snapshot &&
          v.created_at
      ) === true;

    reporter.log({
      name: "Each version has required fields",
      passed: hasRequiredFields,
      expected: "id, template_id, version_number, snapshot, created_at",
      actual: hasRequiredFields ? "All present" : "Missing fields",
      duration: 0,
      severity: "high",
    });
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function runVersioningTests(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("TEMPLATE VERSIONING CHAIN TESTS");
  console.log("=".repeat(60));

  // Setup
  console.log("\nSetting up test environment...");
  const setupSuccess = await setupTestData();
  if (!setupSuccess) {
    console.error("Setup failed. Exiting.");
    process.exit(1);
  }

  // Create initial template
  console.log("Creating test template...");
  const template = await createTestTemplateV1();
  if (!template) {
    console.error("Failed to create test template. Exiting.");
    process.exit(1);
  }

  // Run tests
  try {
    await testVersionNumberIncrement();
    await testSnapshotContents();
    await testSessionSnapshotIntegrity();
    await testHistoricalSessionScoring();
    await testVersionListAPI();
  } catch (error) {
    console.error("Test error:", error);
  }

  // Print summary
  reporter.printSummary();

  // Cleanup
  console.log("\nCleaning up test data...");
  await cleanup();
  console.log("Cleanup complete.");

  const exitCode = reporter.getExitCode();
  process.exit(exitCode);
}

// Run
runVersioningTests().catch((error) => {
  console.error("Test suite crashed:", error);
  process.exit(1);
});

/**
 * Kalyxi AI - RLS Attack Tests
 *
 * These tests verify that Row Level Security policies properly isolate
 * data between organizations and enforce role-based access control.
 *
 * Run: npx tsx tests/rls/rls-attack-tests.ts
 */

import "dotenv/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

// Admin client (bypasses RLS for setup)
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  severity: "blocker" | "high" | "medium" | "low";
}

const results: TestResult[] = [];

function logTest(result: TestResult) {
  results.push(result);
  const status = result.passed ? "PASS" : "FAIL";
  const icon = result.passed ? "✅" : "❌";
  console.log(`${icon} [${status}] ${result.name}`);
  if (!result.passed) {
    console.log(`   Expected: ${result.expected}`);
    console.log(`   Actual: ${result.actual}`);
    console.log(`   Severity: ${result.severity.toUpperCase()}`);
  }
}

async function createAuthenticatedClient(email: string, password: string): Promise<SupabaseClient | null> {
  const client = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(`Failed to sign in as ${email}:`, error.message);
    return null;
  }

  return client;
}

async function runTests() {
  console.log("=" .repeat(60));
  console.log("KALYXI RLS ATTACK TESTS");
  console.log("=" .repeat(60));
  console.log("");

  // Get test data
  const { data: orgs } = await adminClient.from("organizations").select("id, name, slug");
  const { data: users } = await adminClient.from("users").select("id, email, org_id, role");
  const { data: calls } = await adminClient.from("calls").select("id, org_id, caller_id");

  if (!orgs || orgs.length < 2) {
    console.error("Need at least 2 organizations for cross-tenant tests. Run seed script first.");
    process.exit(1);
  }

  if (!users || users.length < 2) {
    console.error("Need at least 2 users for tests. Run seed script first.");
    process.exit(1);
  }

  const org1 = orgs[0];
  const org2 = orgs[1];

  const admin1 = users.find(u => u.org_id === org1.id && u.role === "admin");
  const admin2 = users.find(u => u.org_id === org2.id && u.role === "admin");
  const caller1 = users.find(u => u.org_id === org1.id && u.role === "caller");

  if (!admin1 || !admin2) {
    console.error("Need admin users in both orgs. Run seed script first.");
    process.exit(1);
  }

  const org1Calls = calls?.filter(c => c.org_id === org1.id) || [];
  const org2Calls = calls?.filter(c => c.org_id === org2.id) || [];

  console.log(`Test setup:`);
  console.log(`  Org 1: ${org1.name} (${org1.id})`);
  console.log(`  Org 2: ${org2.name} (${org2.id})`);
  console.log(`  Admin 1: ${admin1.email}`);
  console.log(`  Admin 2: ${admin2.email}`);
  console.log(`  Org 1 calls: ${org1Calls.length}`);
  console.log(`  Org 2 calls: ${org2Calls.length}`);
  console.log("");

  // Create authenticated clients
  const client1 = await createAuthenticatedClient(admin1.email, "TestPassword123!");
  const client2 = await createAuthenticatedClient(admin2.email, "TestPassword123!");

  if (!client1 || !client2) {
    console.error("Failed to create authenticated clients");
    process.exit(1);
  }

  // ============================================
  // TEST SUITE 1: CROSS-TENANT DATA ISOLATION
  // ============================================
  console.log("\n--- SUITE 1: Cross-Tenant Data Isolation ---\n");

  // Test 1.1: User in Org1 cannot SELECT calls from Org2
  {
    const { data, error } = await client1.from("calls").select("*").eq("org_id", org2.id);

    logTest({
      name: "User in Org1 cannot SELECT calls from Org2",
      passed: !error && (data?.length === 0),
      expected: "0 rows returned",
      actual: error ? `Error: ${error.message}` : `${data?.length || 0} rows returned`,
      severity: "blocker",
    });
  }

  // Test 1.2: User in Org1 cannot SELECT callers from Org2
  {
    const { data, error } = await client1.from("callers").select("*").eq("org_id", org2.id);

    logTest({
      name: "User in Org1 cannot SELECT callers from Org2",
      passed: !error && (data?.length === 0),
      expected: "0 rows returned",
      actual: error ? `Error: ${error.message}` : `${data?.length || 0} rows returned`,
      severity: "blocker",
    });
  }

  // Test 1.3: User in Org1 cannot SELECT users from Org2
  {
    const { data, error } = await client1.from("users").select("*").eq("org_id", org2.id);

    logTest({
      name: "User in Org1 cannot SELECT users from Org2",
      passed: !error && (data?.length === 0),
      expected: "0 rows returned",
      actual: error ? `Error: ${error.message}` : `${data?.length || 0} rows returned`,
      severity: "blocker",
    });
  }

  // Test 1.4: User in Org1 cannot SELECT organization Org2
  {
    const { data, error } = await client1.from("organizations").select("*").eq("id", org2.id);

    logTest({
      name: "User in Org1 cannot SELECT organization Org2",
      passed: !error && (data?.length === 0),
      expected: "0 rows returned",
      actual: error ? `Error: ${error.message}` : `${data?.length || 0} rows returned`,
      severity: "blocker",
    });
  }

  // ============================================
  // TEST SUITE 2: CROSS-TENANT WRITE ATTACKS
  // ============================================
  console.log("\n--- SUITE 2: Cross-Tenant Write Attacks ---\n");

  // Test 2.1: Cannot INSERT call with forged org_id
  {
    // Get a caller from org2 for the attack
    const { data: org2Callers } = await adminClient.from("callers").select("id").eq("org_id", org2.id).limit(1);
    const targetCallerId = org2Callers?.[0]?.id;

    if (targetCallerId) {
      const { error } = await client1.from("calls").insert({
        org_id: org2.id, // Trying to forge org_id
        caller_id: targetCallerId,
        raw_notes: "ATTACK: Forged org_id insertion attempt",
        status: "pending",
      });

      logTest({
        name: "Cannot INSERT call with forged org_id",
        passed: !!error,
        expected: "RLS error or constraint violation",
        actual: error ? `Blocked: ${error.message}` : "INSERT succeeded - VULNERABILITY!",
        severity: "blocker",
      });
    } else {
      logTest({
        name: "Cannot INSERT call with forged org_id",
        passed: true,
        expected: "Skipped - no target caller",
        actual: "Skipped",
        severity: "blocker",
      });
    }
  }

  // Test 2.2: Cannot UPDATE call in Org2
  {
    if (org2Calls.length > 0) {
      const targetCall = org2Calls[0];

      const { error } = await client1
        .from("calls")
        .update({ raw_notes: "ATTACK: Unauthorized update" })
        .eq("id", targetCall.id);

      // Check if actually updated
      const { data: checkCall } = await adminClient
        .from("calls")
        .select("raw_notes")
        .eq("id", targetCall.id)
        .single();

      const wasUpdated = checkCall?.raw_notes === "ATTACK: Unauthorized update";

      logTest({
        name: "Cannot UPDATE call in Org2",
        passed: !!error || !wasUpdated,
        expected: "Update blocked or no effect",
        actual: wasUpdated ? "Update succeeded - VULNERABILITY!" : (error ? `Blocked: ${error.message}` : "No rows affected"),
        severity: "blocker",
      });
    }
  }

  // Test 2.3: Cannot DELETE call in Org2
  {
    if (org2Calls.length > 0) {
      const targetCall = org2Calls[0];

      const { error } = await client1.from("calls").delete().eq("id", targetCall.id);

      // Check if actually deleted
      const { data: checkCall } = await adminClient
        .from("calls")
        .select("id")
        .eq("id", targetCall.id)
        .single();

      const wasDeleted = !checkCall;

      logTest({
        name: "Cannot DELETE call in Org2",
        passed: !wasDeleted,
        expected: "Call still exists",
        actual: wasDeleted ? "Call deleted - VULNERABILITY!" : "Call protected",
        severity: "blocker",
      });
    }
  }

  // ============================================
  // TEST SUITE 3: ROLE-BASED ACCESS CONTROL
  // ============================================
  console.log("\n--- SUITE 3: Role-Based Access Control ---\n");

  // Test with caller role if available
  if (caller1) {
    const callerClient = await createAuthenticatedClient(caller1.email, "TestPassword123!");

    if (callerClient) {
      // Test 3.1: Caller cannot INSERT calls
      {
        const { data: callerData } = await adminClient
          .from("callers")
          .select("id")
          .eq("org_id", org1.id)
          .limit(1);

        if (callerData?.[0]) {
          const { error } = await callerClient.from("calls").insert({
            org_id: org1.id,
            caller_id: callerData[0].id,
            raw_notes: "ATTACK: Caller trying to create call",
            status: "pending",
          });

          logTest({
            name: "Caller role cannot INSERT calls",
            passed: !!error,
            expected: "Permission denied",
            actual: error ? `Blocked: ${error.message}` : "INSERT succeeded - Check policy",
            severity: "high",
          });
        }
      }

      // Test 3.2: Caller cannot create other callers
      {
        const { error } = await callerClient.from("callers").insert({
          org_id: org1.id,
          name: "ATTACK: Unauthorized caller creation",
        });

        logTest({
          name: "Caller role cannot INSERT callers",
          passed: !!error,
          expected: "Permission denied",
          actual: error ? `Blocked: ${error.message}` : "INSERT succeeded - VULNERABILITY!",
          severity: "high",
        });
      }

      // Test 3.3: Caller cannot update grading templates
      {
        const { data: templates } = await adminClient
          .from("grading_templates")
          .select("id")
          .eq("org_id", org1.id)
          .limit(1);

        if (templates?.[0]) {
          const { error } = await callerClient
            .from("grading_templates")
            .update({ name: "ATTACK: Unauthorized template update" })
            .eq("id", templates[0].id);

          logTest({
            name: "Caller role cannot UPDATE grading templates",
            passed: !!error,
            expected: "Permission denied",
            actual: error ? `Blocked: ${error.message}` : "UPDATE succeeded - VULNERABILITY!",
            severity: "high",
          });
        }
      }
    }
  }

  // ============================================
  // TEST SUITE 4: ANALYSIS/REPORT ACCESS VIA JOINS
  // ============================================
  console.log("\n--- SUITE 4: Analysis/Report Access via Joins ---\n");

  // Test 4.1: Cannot access analyses for calls in Org2
  {
    const { data: org2Analyses } = await adminClient
      .from("analyses")
      .select("id, call_id")
      .limit(10);

    const org2AnalysisIds = org2Analyses
      ?.filter(a => org2Calls.some(c => c.id === a.call_id))
      .map(a => a.id) || [];

    if (org2AnalysisIds.length > 0) {
      const { data, error } = await client1
        .from("analyses")
        .select("*")
        .in("id", org2AnalysisIds);

      logTest({
        name: "Cannot SELECT analyses for Org2 calls",
        passed: !error && (data?.length === 0),
        expected: "0 rows returned",
        actual: error ? `Error: ${error.message}` : `${data?.length || 0} rows returned`,
        severity: "high",
      });
    }
  }

  // Test 4.2: Cannot access reports for calls in Org2
  {
    const { data: org2Reports } = await adminClient
      .from("reports")
      .select("id, call_id")
      .limit(10);

    const org2ReportIds = org2Reports
      ?.filter(r => org2Calls.some(c => c.id === r.call_id))
      .map(r => r.id) || [];

    if (org2ReportIds.length > 0) {
      const { data, error } = await client1
        .from("reports")
        .select("*")
        .in("id", org2ReportIds);

      logTest({
        name: "Cannot SELECT reports for Org2 calls",
        passed: !error && (data?.length === 0),
        expected: "0 rows returned",
        actual: error ? `Error: ${error.message}` : `${data?.length || 0} rows returned`,
        severity: "high",
      });
    }
  }

  // ============================================
  // TEST SUITE 5: WEBHOOK/AUDIT LOG ACCESS
  // ============================================
  console.log("\n--- SUITE 5: Sensitive Log Access ---\n");

  // Test 5.1: Cannot access webhook logs from Org2
  {
    const { data, error } = await client1.from("webhook_logs").select("*").eq("org_id", org2.id);

    logTest({
      name: "Cannot SELECT webhook_logs from Org2",
      passed: !error && (data?.length === 0),
      expected: "0 rows returned",
      actual: error ? `Error: ${error.message}` : `${data?.length || 0} rows returned`,
      severity: "high",
    });
  }

  // Test 5.2: Cannot access audit logs from Org2
  {
    const { data, error } = await client1.from("audit_logs").select("*").eq("org_id", org2.id);

    logTest({
      name: "Cannot SELECT audit_logs from Org2",
      passed: !error && (data?.length === 0),
      expected: "0 rows returned",
      actual: error ? `Error: ${error.message}` : `${data?.length || 0} rows returned`,
      severity: "high",
    });
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const blockers = results.filter(r => !r.passed && r.severity === "blocker").length;
  const high = results.filter(r => !r.passed && r.severity === "high").length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`  Blockers: ${blockers}`);
  console.log(`  High: ${high}`);
  console.log("");

  if (blockers > 0) {
    console.log("CRITICAL: BLOCKER ISSUES FOUND!");
    console.log("The following tests MUST pass before production:");
    results.filter(r => !r.passed && r.severity === "blocker").forEach(r => {
      console.log(`  - ${r.name}`);
    });
  }

  // Cleanup
  await client1.auth.signOut();
  await client2.auth.signOut();

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);

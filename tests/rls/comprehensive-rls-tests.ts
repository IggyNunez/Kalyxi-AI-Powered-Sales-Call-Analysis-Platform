/**
 * Kalyxi AI - Comprehensive RLS Attack Tests
 *
 * Exhaustive Row Level Security tests covering:
 * - Cross-tenant data isolation
 * - Role-based access control
 * - IDOR (Insecure Direct Object Reference)
 * - Privilege escalation
 * - Data leakage via joins/views
 *
 * Run: npx tsx tests/rls/comprehensive-rls-tests.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config, TestReporter, measureTest } from "../config";
import { testIds, testData } from "../seed/deterministic-seed";

// Admin client (bypasses RLS)
const adminClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const reporter = new TestReporter();

interface AuthenticatedClient {
  client: SupabaseClient;
  email: string;
  role: string;
  orgId: string;
}

async function createAuthenticatedClient(
  email: string,
  password: string
): Promise<AuthenticatedClient | null> {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey);

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(`Failed to sign in as ${email}:`, error.message);
    return null;
  }

  const user = testData.users.find((u) => u.email === email);
  const org = testData.organizations[user?.org_index || 0];

  return {
    client,
    email,
    role: user?.role || "caller",
    orgId: org.id,
  };
}

async function testCrossTenantIsolation(
  client1: AuthenticatedClient,
  client2: AuthenticatedClient
) {
  reporter.setCategory("Cross-Tenant Data Isolation");

  const tables = [
    "organizations",
    "users",
    "callers",
    "calls",
    "grading_templates",
    "scorecard_configs",
    "scorecards",
    "scripts",
    "insight_templates",
    "webhook_logs",
    "audit_logs",
  ];

  // Test 1: Cannot SELECT data from other org
  for (const table of tables) {
    const { result, duration } = await measureTest(`SELECT ${table}`, async () => {
      const { data, error } = await client1.client
        .from(table)
        .select("*")
        .eq(table === "organizations" ? "id" : "org_id", client2.orgId);

      return { data, error };
    });

    reporter.log({
      name: `[${client1.email}] Cannot SELECT ${table} from other org`,
      passed: !result.error && (result.data?.length === 0),
      expected: "0 rows returned",
      actual: result.error
        ? `Error: ${result.error.message}`
        : `${result.data?.length || 0} rows returned`,
      duration,
      severity: "blocker",
    });
  }

  // Test 2: Cannot SELECT calls via direct ID access (IDOR)
  {
    const { result, duration } = await measureTest("IDOR: calls", async () => {
      // Get a call ID from org2
      const { data: org2Calls } = await adminClient
        .from("calls")
        .select("id")
        .eq("org_id", client2.orgId)
        .limit(1);

      if (!org2Calls?.[0]) return { data: null, skipped: true };

      const { data, error } = await client1.client
        .from("calls")
        .select("*")
        .eq("id", org2Calls[0].id)
        .single();

      return { data, error };
    });

    if ((result as { skipped?: boolean }).skipped) {
      reporter.log({
        name: `[${client1.email}] IDOR: Cannot access other org's call by ID`,
        passed: true,
        expected: "Skipped - no data",
        actual: "Skipped",
        duration,
        severity: "blocker",
      });
    } else {
      reporter.log({
        name: `[${client1.email}] IDOR: Cannot access other org's call by ID`,
        passed: !result.data,
        expected: "No data returned or error",
        actual: result.data ? "Data returned - VULNERABILITY!" : "Blocked correctly",
        duration,
        severity: "blocker",
      });
    }
  }

  // Test 3: Cannot access analyses via call join
  {
    const { result, duration } = await measureTest("Join: analyses via calls", async () => {
      // Get analysis for org2 call
      const { data: org2Analyses } = await adminClient
        .from("analyses")
        .select("id, call_id, calls(org_id)")
        .limit(5);

      const org2Analysis = org2Analyses?.find(
        (a) => (a.calls as { org_id?: string })?.org_id === client2.orgId
      );

      if (!org2Analysis) return { data: null, skipped: true };

      const { data, error } = await client1.client
        .from("analyses")
        .select("*")
        .eq("id", org2Analysis.id)
        .single();

      return { data, error };
    });

    if ((result as { skipped?: boolean }).skipped) {
      reporter.log({
        name: `[${client1.email}] Cannot access analyses for other org's calls`,
        passed: true,
        expected: "Skipped - no data",
        actual: "Skipped",
        duration,
        severity: "blocker",
      });
    } else {
      reporter.log({
        name: `[${client1.email}] Cannot access analyses for other org's calls`,
        passed: !result.data,
        expected: "No data returned",
        actual: result.data ? "Data returned - VULNERABILITY!" : "Blocked correctly",
        duration,
        severity: "blocker",
      });
    }
  }
}

async function testCrossTenantWriteAttacks(
  client1: AuthenticatedClient,
  client2: AuthenticatedClient
) {
  reporter.setCategory("Cross-Tenant Write Attacks");

  // Test 1: Cannot INSERT call with forged org_id
  {
    const { result, duration } = await measureTest("INSERT: forged org_id", async () => {
      const { data: org2Callers } = await adminClient
        .from("callers")
        .select("id")
        .eq("org_id", client2.orgId)
        .limit(1);

      if (!org2Callers?.[0]) return { error: null, skipped: true };

      const { error } = await client1.client.from("calls").insert({
        org_id: client2.orgId, // Forged org_id
        caller_id: org2Callers[0].id,
        raw_notes: "ATTACK: Forged org_id",
        status: "pending",
      });

      return { error };
    });

    reporter.log({
      name: `[${client1.email}] Cannot INSERT call with forged org_id`,
      passed: !!result.error,
      expected: "RLS violation error",
      actual: result.error ? `Blocked: ${result.error.message}` : "Insert succeeded - VULNERABILITY!",
      duration,
      severity: "blocker",
    });
  }

  // Test 2: Cannot UPDATE call in other org
  {
    const { result, duration } = await measureTest("UPDATE: other org call", async () => {
      const { data: org2Calls } = await adminClient
        .from("calls")
        .select("id, raw_notes")
        .eq("org_id", client2.orgId)
        .limit(1);

      if (!org2Calls?.[0]) return { updated: false, skipped: true };

      const originalNotes = org2Calls[0].raw_notes;

      const { error } = await client1.client
        .from("calls")
        .update({ raw_notes: "ATTACK: Unauthorized update" })
        .eq("id", org2Calls[0].id);

      // Verify not updated
      const { data: checkCall } = await adminClient
        .from("calls")
        .select("raw_notes")
        .eq("id", org2Calls[0].id)
        .single();

      const wasUpdated = checkCall?.raw_notes !== originalNotes;

      return { error, updated: wasUpdated };
    });

    reporter.log({
      name: `[${client1.email}] Cannot UPDATE call in other org`,
      passed: !result.updated,
      expected: "Update blocked or no effect",
      actual: result.updated ? "Update succeeded - VULNERABILITY!" : "Blocked correctly",
      duration,
      severity: "blocker",
    });
  }

  // Test 3: Cannot DELETE call in other org
  {
    const { result, duration } = await measureTest("DELETE: other org call", async () => {
      const { data: org2Calls } = await adminClient
        .from("calls")
        .select("id")
        .eq("org_id", client2.orgId)
        .limit(1);

      if (!org2Calls?.[0]) return { deleted: false, skipped: true };

      await client1.client.from("calls").delete().eq("id", org2Calls[0].id);

      // Verify not deleted
      const { data: checkCall } = await adminClient
        .from("calls")
        .select("id")
        .eq("id", org2Calls[0].id)
        .single();

      return { deleted: !checkCall };
    });

    reporter.log({
      name: `[${client1.email}] Cannot DELETE call in other org`,
      passed: !result.deleted,
      expected: "Call still exists",
      actual: result.deleted ? "Call deleted - VULNERABILITY!" : "Call protected",
      duration,
      severity: "blocker",
    });
  }

  // Test 4: Cannot INSERT caller with forged org_id
  {
    const { result, duration } = await measureTest("INSERT: forged caller org_id", async () => {
      const { error } = await client1.client.from("callers").insert({
        org_id: client2.orgId, // Forged
        name: "ATTACK: Forged caller",
        email: "attack@example.com",
      });

      return { error };
    });

    reporter.log({
      name: `[${client1.email}] Cannot INSERT caller with forged org_id`,
      passed: !!result.error,
      expected: "RLS violation error",
      actual: result.error ? `Blocked: ${result.error.message}` : "Insert succeeded - VULNERABILITY!",
      duration,
      severity: "blocker",
    });
  }

  // Test 5: Cannot UPDATE organization settings of other org
  {
    const { result, duration } = await measureTest("UPDATE: other org settings", async () => {
      const { error } = await client1.client
        .from("organizations")
        .update({ name: "ATTACK: Hijacked org" })
        .eq("id", client2.orgId);

      // Verify not updated
      const { data: checkOrg } = await adminClient
        .from("organizations")
        .select("name")
        .eq("id", client2.orgId)
        .single();

      const wasUpdated = checkOrg?.name === "ATTACK: Hijacked org";

      return { error, updated: wasUpdated };
    });

    reporter.log({
      name: `[${client1.email}] Cannot UPDATE other org's settings`,
      passed: !result.updated,
      expected: "Update blocked",
      actual: result.updated ? "Update succeeded - VULNERABILITY!" : "Blocked correctly",
      duration,
      severity: "blocker",
    });
  }
}

async function testRoleBasedAccessControl(
  adminClient1: AuthenticatedClient,
  callerClient: AuthenticatedClient
) {
  reporter.setCategory("Role-Based Access Control (RBAC)");

  // Test 1: Caller cannot create calls
  {
    const { result, duration } = await measureTest("Caller INSERT call", async () => {
      const { data: callers } = await callerClient.client
        .from("callers")
        .select("id")
        .limit(1);

      const { error } = await callerClient.client.from("calls").insert({
        org_id: callerClient.orgId,
        caller_id: callers?.[0]?.id || testIds.callerRecord1,
        raw_notes: "Caller trying to create call",
        status: "pending",
      });

      return { error };
    });

    reporter.log({
      name: `[${callerClient.email}] Caller cannot INSERT calls`,
      passed: !!result.error,
      expected: "Permission denied",
      actual: result.error ? `Blocked: ${result.error.message}` : "Insert succeeded - check policy",
      duration,
      severity: "high",
    });
  }

  // Test 2: Caller cannot create callers
  {
    const { result, duration } = await measureTest("Caller INSERT caller", async () => {
      const { error } = await callerClient.client.from("callers").insert({
        org_id: callerClient.orgId,
        name: "Unauthorized Caller Creation",
        email: "unauthorized@example.com",
      });

      if (!error) {
        // Cleanup
        await adminClient
          .from("callers")
          .delete()
          .eq("email", "unauthorized@example.com");
      }

      return { error };
    });

    reporter.log({
      name: `[${callerClient.email}] Caller cannot INSERT callers`,
      passed: !!result.error,
      expected: "Permission denied",
      actual: result.error ? `Blocked: ${result.error.message}` : "Insert succeeded - VULNERABILITY!",
      duration,
      severity: "high",
    });
  }

  // Test 3: Caller cannot delete callers
  {
    const { result, duration } = await measureTest("Caller DELETE caller", async () => {
      const { error } = await callerClient.client
        .from("callers")
        .delete()
        .eq("id", testIds.callerRecord2);

      // Verify not deleted
      const { data: checkCaller } = await adminClient
        .from("callers")
        .select("id")
        .eq("id", testIds.callerRecord2)
        .single();

      return { error, deleted: !checkCaller };
    });

    reporter.log({
      name: `[${callerClient.email}] Caller cannot DELETE callers`,
      passed: !result.deleted,
      expected: "Delete blocked",
      actual: result.deleted ? "Deleted - VULNERABILITY!" : "Protected",
      duration,
      severity: "high",
    });
  }

  // Test 4: Caller cannot update grading templates
  {
    const { result, duration } = await measureTest("Caller UPDATE template", async () => {
      const { data: templates } = await callerClient.client
        .from("grading_templates")
        .select("id, name")
        .limit(1);

      if (!templates?.[0]) return { error: null, skipped: true };

      const { error } = await callerClient.client
        .from("grading_templates")
        .update({ name: "ATTACK: Template hijack" })
        .eq("id", templates[0].id);

      // Verify not updated
      const { data: checkTemplate } = await adminClient
        .from("grading_templates")
        .select("name")
        .eq("id", templates[0].id)
        .single();

      return { error, updated: checkTemplate?.name === "ATTACK: Template hijack" };
    });

    reporter.log({
      name: `[${callerClient.email}] Caller cannot UPDATE grading templates`,
      passed: !result.updated,
      expected: "Update blocked",
      actual: result.updated ? "Updated - VULNERABILITY!" : "Protected",
      duration,
      severity: "high",
    });
  }

  // Test 5: Caller can only see their own calls
  {
    const { result, duration } = await measureTest("Caller sees only own calls", async () => {
      const { data: calls, error } = await callerClient.client.from("calls").select("id, caller_id");

      // Get caller's caller_id
      const user = testData.users.find((u) => u.email === callerClient.email) as {
        authId?: string;
      };
      const { data: callerRecord } = await adminClient
        .from("callers")
        .select("id")
        .eq("user_id", user?.authId)
        .single();

      const allOwnCalls = calls?.every(
        (c) => c.caller_id === callerRecord?.id
      );

      return { allOwnCalls, callCount: calls?.length };
    });

    // Note: This depends on how RLS is configured for callers
    reporter.log({
      name: `[${callerClient.email}] Caller sees only own calls (or none)`,
      passed: result.allOwnCalls === true || result.callCount === 0,
      expected: "Only own calls or admin-level access",
      actual: `${result.callCount} calls, all own: ${result.allOwnCalls}`,
      duration,
      severity: "high",
    });
  }

  // Test 6: Caller cannot access webhook logs
  {
    const { result, duration } = await measureTest("Caller SELECT webhook_logs", async () => {
      const { data, error } = await callerClient.client.from("webhook_logs").select("*");
      return { data, error };
    });

    reporter.log({
      name: `[${callerClient.email}] Caller cannot access webhook_logs`,
      passed: result.data?.length === 0 || !!result.error,
      expected: "0 rows or error",
      actual: result.error
        ? `Error: ${result.error.message}`
        : `${result.data?.length} rows`,
      duration,
      severity: "high",
    });
  }

  // Test 7: Caller cannot access audit logs
  {
    const { result, duration } = await measureTest("Caller SELECT audit_logs", async () => {
      const { data, error } = await callerClient.client.from("audit_logs").select("*");
      return { data, error };
    });

    reporter.log({
      name: `[${callerClient.email}] Caller cannot access audit_logs`,
      passed: result.data?.length === 0 || !!result.error,
      expected: "0 rows or error",
      actual: result.error
        ? `Error: ${result.error.message}`
        : `${result.data?.length} rows`,
      duration,
      severity: "high",
    });
  }
}

async function testPrivilegeEscalation(
  callerClient: AuthenticatedClient
) {
  reporter.setCategory("Privilege Escalation");

  // Test 1: Caller cannot update their own role
  {
    const user = testData.users.find((u) => u.email === callerClient.email) as {
      authId?: string;
    };

    const { result, duration } = await measureTest("Self role escalation", async () => {
      const { error } = await callerClient.client
        .from("users")
        .update({ role: "admin" })
        .eq("id", user?.authId);

      // Verify not updated
      const { data: checkUser } = await adminClient
        .from("users")
        .select("role")
        .eq("id", user?.authId)
        .single();

      return { error, currentRole: checkUser?.role };
    });

    reporter.log({
      name: `[${callerClient.email}] Cannot escalate own role to admin`,
      passed: result.currentRole === "caller",
      expected: "Role remains 'caller'",
      actual: `Role is '${result.currentRole}'`,
      duration,
      severity: "blocker",
    });
  }

  // Test 2: Caller cannot update another user's role
  {
    const { result, duration } = await measureTest("Other user role escalation", async () => {
      const admin = testData.users.find(
        (u) => u.org_index === 0 && u.role === "admin"
      ) as { authId?: string };

      const { error } = await callerClient.client
        .from("users")
        .update({ role: "caller" })
        .eq("id", admin?.authId);

      // Verify not updated
      const { data: checkUser } = await adminClient
        .from("users")
        .select("role")
        .eq("id", admin?.authId)
        .single();

      return { error, currentRole: checkUser?.role };
    });

    reporter.log({
      name: `[${callerClient.email}] Cannot change admin user's role`,
      passed: result.currentRole === "admin",
      expected: "Role remains 'admin'",
      actual: `Role is '${result.currentRole}'`,
      duration,
      severity: "blocker",
    });
  }

  // Test 3: Cannot update user to superadmin
  {
    const user = testData.users.find((u) => u.email === callerClient.email) as {
      authId?: string;
    };

    const { result, duration } = await measureTest("Superadmin escalation", async () => {
      const { error } = await callerClient.client
        .from("users")
        .update({ role: "superadmin" })
        .eq("id", user?.authId);

      // Verify not updated
      const { data: checkUser } = await adminClient
        .from("users")
        .select("role")
        .eq("id", user?.authId)
        .single();

      return { error, currentRole: checkUser?.role };
    });

    reporter.log({
      name: `[${callerClient.email}] Cannot escalate to superadmin`,
      passed: result.currentRole !== "superadmin",
      expected: "Role is not 'superadmin'",
      actual: `Role is '${result.currentRole}'`,
      duration,
      severity: "blocker",
    });
  }
}

async function testDataLeakageViaJoins(client1: AuthenticatedClient) {
  reporter.setCategory("Data Leakage via Joins/Views");

  // Test 1: Cannot access other org's data via calls->callers join
  {
    const { result, duration } = await measureTest("Join: calls->callers leak", async () => {
      const { data, error } = await client1.client
        .from("calls")
        .select("id, callers(id, name, org_id)");

      // Check if any caller from different org leaked
      const leakedData = data?.filter(
        (c) => (c.callers as { org_id?: string })?.org_id !== client1.orgId
      );

      return { leakedCount: leakedData?.length || 0, totalCount: data?.length || 0 };
    });

    reporter.log({
      name: `[${client1.email}] No data leakage via calls->callers join`,
      passed: result.leakedCount === 0,
      expected: "0 leaked records",
      actual: `${result.leakedCount} leaked out of ${result.totalCount}`,
      duration,
      severity: "high",
    });
  }

  // Test 2: Cannot access other org's data via calls->analyses join
  {
    const { result, duration } = await measureTest("Join: calls->analyses leak", async () => {
      const { data, error } = await client1.client.from("calls").select(`
          id, org_id,
          analyses(id, overall_score)
        `);

      // All calls should be from user's org
      const foreignCalls = data?.filter((c) => c.org_id !== client1.orgId);

      return { foreignCount: foreignCalls?.length || 0, totalCount: data?.length || 0 };
    });

    reporter.log({
      name: `[${client1.email}] No foreign data in calls->analyses join`,
      passed: result.foreignCount === 0,
      expected: "0 foreign records",
      actual: `${result.foreignCount} foreign out of ${result.totalCount}`,
      duration,
      severity: "high",
    });
  }

  // Test 3: Views don't leak cross-org data (caller_stats)
  {
    const { result, duration } = await measureTest("View: caller_stats leak", async () => {
      const { data, error } = await client1.client.from("caller_stats").select("*");

      const foreignData = data?.filter((s) => s.org_id !== client1.orgId);

      return { foreignCount: foreignData?.length || 0, error };
    });

    reporter.log({
      name: `[${client1.email}] caller_stats view doesn't leak data`,
      passed: result.foreignCount === 0 || !!result.error,
      expected: "0 foreign records or error",
      actual: result.error
        ? `Error: ${result.error.message}`
        : `${result.foreignCount} foreign records`,
      duration,
      severity: "high",
    });
  }
}

async function testSensitiveDataAccess(
  admin1: AuthenticatedClient,
  admin2: AuthenticatedClient
) {
  reporter.setCategory("Sensitive Data Access");

  // Test 1: Cannot access other org's webhook secret
  {
    const { result, duration } = await measureTest("Webhook secret access", async () => {
      const { data, error } = await admin1.client
        .from("organizations")
        .select("id, webhook_secret")
        .eq("id", admin2.orgId);

      return { data, error };
    });

    reporter.log({
      name: `[${admin1.email}] Cannot access other org's webhook_secret`,
      passed: result.data?.length === 0 || !result.data?.[0]?.webhook_secret,
      expected: "No data or no secret",
      actual: result.data?.[0]?.webhook_secret
        ? "Secret exposed - VULNERABILITY!"
        : "Protected",
      duration,
      severity: "blocker",
    });
  }

  // Test 2: Cannot access other org's API keys
  {
    const { result, duration } = await measureTest("API keys access", async () => {
      const { data, error } = await admin1.client
        .from("api_keys")
        .select("*")
        .eq("org_id", admin2.orgId);

      return { data, error };
    });

    reporter.log({
      name: `[${admin1.email}] Cannot access other org's api_keys`,
      passed: result.data?.length === 0,
      expected: "0 rows",
      actual: `${result.data?.length} rows`,
      duration,
      severity: "blocker",
    });
  }

  // Test 3: Cannot access other org's invitations
  {
    const { result, duration } = await measureTest("Invitations access", async () => {
      const { data, error } = await admin1.client
        .from("invitations")
        .select("*")
        .eq("org_id", admin2.orgId);

      return { data, error };
    });

    reporter.log({
      name: `[${admin1.email}] Cannot access other org's invitations`,
      passed: result.data?.length === 0,
      expected: "0 rows",
      actual: `${result.data?.length} rows`,
      duration,
      severity: "high",
    });
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("KALYXI - COMPREHENSIVE RLS ATTACK TESTS");
  console.log("=".repeat(60));
  console.log("");

  // Create authenticated clients
  const admin1 = await createAuthenticatedClient(
    testData.users[0].email, // admin1@acme-testing.com
    config.testPassword
  );

  const caller1 = await createAuthenticatedClient(
    testData.users[1].email, // caller1@acme-testing.com
    config.testPassword
  );

  const admin2 = await createAuthenticatedClient(
    testData.users[3].email, // admin2@beta-testing.com
    config.testPassword
  );

  if (!admin1 || !caller1 || !admin2) {
    console.error("Failed to create authenticated clients. Run seed script first.");
    process.exit(1);
  }

  console.log("Test setup:");
  console.log(`  Admin 1: ${admin1.email} (Org: ${admin1.orgId})`);
  console.log(`  Caller 1: ${caller1.email} (Org: ${caller1.orgId})`);
  console.log(`  Admin 2: ${admin2.email} (Org: ${admin2.orgId})`);
  console.log("");

  try {
    await testCrossTenantIsolation(admin1, admin2);
    await testCrossTenantWriteAttacks(admin1, admin2);
    await testRoleBasedAccessControl(admin1, caller1);
    await testPrivilegeEscalation(caller1);
    await testDataLeakageViaJoins(admin1);
    await testSensitiveDataAccess(admin1, admin2);

    // Cleanup
    await admin1.client.auth.signOut();
    await caller1.client.auth.signOut();
    await admin2.client.auth.signOut();

    const summary = reporter.printSummary();
    process.exit(reporter.getExitCode());
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

main();

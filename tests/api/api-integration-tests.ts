/**
 * Kalyxi AI - API Integration Tests
 *
 * Tests all API endpoints for:
 * - Happy path
 * - Invalid input
 * - Unauthorized access
 * - Cross-tenant attacks
 * - Concurrency
 * - Error handling
 *
 * Run: npx tsx tests/api/api-integration-tests.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  passed: boolean;
  expected: string;
  actual: string;
  duration: number;
}

const results: TestResult[] = [];

async function getAuthToken(email: string, password: string): Promise<string | null> {
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(`Failed to get token for ${email}:`, error.message);
    return null;
  }

  return data.session?.access_token || null;
}

async function apiRequest(
  endpoint: string,
  method: string = "GET",
  body?: unknown,
  token?: string | null
): Promise<{ status: number; data: unknown; duration: number }> {
  const start = Date.now();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    const duration = Date.now() - start;

    return { status: response.status, data, duration };
  } catch (error) {
    return {
      status: 0,
      data: { error: error instanceof Error ? error.message : "Request failed" },
      duration: Date.now() - start,
    };
  }
}

function logTest(result: TestResult) {
  results.push(result);
  const status = result.passed ? "PASS" : "FAIL";
  const icon = result.passed ? "✅" : "❌";
  console.log(`${icon} [${status}] ${result.method} ${result.endpoint} - ${result.name} (${result.duration}ms)`);
  if (!result.passed) {
    console.log(`   Expected: ${result.expected}`);
    console.log(`   Actual: ${result.actual}`);
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("KALYXI API INTEGRATION TESTS");
  console.log("=".repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log("");

  // Get test credentials
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: orgs } = await adminClient.from("organizations").select("id, name, slug");
  const { data: users } = await adminClient.from("users").select("id, email, org_id, role");
  const { data: callers } = await adminClient.from("callers").select("id, name, org_id");
  const { data: calls } = await adminClient.from("calls").select("id, org_id, caller_id, status");

  if (!orgs || orgs.length < 2 || !users || users.length < 2) {
    console.error("Insufficient test data. Run seed script first.");
    process.exit(1);
  }

  const org1 = orgs[0];
  const org2 = orgs[1];
  const admin1 = users.find(u => u.org_id === org1.id && u.role === "admin");
  const admin2 = users.find(u => u.org_id === org2.id && u.role === "admin");
  const caller1 = callers?.find(c => c.org_id === org1.id);
  const call1 = calls?.find(c => c.org_id === org1.id);
  const call2 = calls?.find(c => c.org_id === org2.id);

  if (!admin1 || !admin2) {
    console.error("Need admin users in both orgs.");
    process.exit(1);
  }

  const token1 = await getAuthToken(admin1.email, "TestPassword123!");
  const token2 = await getAuthToken(admin2.email, "TestPassword123!");

  if (!token1 || !token2) {
    console.error("Failed to get auth tokens.");
    process.exit(1);
  }

  // ============================================
  // SUITE 1: Authentication Tests
  // ============================================
  console.log("\n--- SUITE 1: Authentication Tests ---\n");

  // Test 1.1: Unauthenticated request returns 401
  {
    const { status, duration } = await apiRequest("/api/calls");

    logTest({
      name: "Unauthenticated request returns 401",
      endpoint: "/api/calls",
      method: "GET",
      passed: status === 401,
      expected: "401",
      actual: String(status),
      duration,
    });
  }

  // Test 1.2: Invalid token returns 401
  {
    const { status, duration } = await apiRequest("/api/calls", "GET", undefined, "invalid-token");

    logTest({
      name: "Invalid token returns 401",
      endpoint: "/api/calls",
      method: "GET",
      passed: status === 401,
      expected: "401",
      actual: String(status),
      duration,
    });
  }

  // Test 1.3: Valid token returns 200
  {
    const { status, duration } = await apiRequest("/api/calls", "GET", undefined, token1);

    logTest({
      name: "Valid token returns 200",
      endpoint: "/api/calls",
      method: "GET",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
    });
  }

  // ============================================
  // SUITE 2: Calls API Tests
  // ============================================
  console.log("\n--- SUITE 2: Calls API Tests ---\n");

  // Test 2.1: GET /api/calls - List calls
  {
    const { status, data, duration } = await apiRequest("/api/calls", "GET", undefined, token1);
    const hasData = typeof data === "object" && data !== null && "data" in data;
    const hasPagination = typeof data === "object" && data !== null && "pagination" in data;

    logTest({
      name: "List calls returns data and pagination",
      endpoint: "/api/calls",
      method: "GET",
      passed: status === 200 && hasData && hasPagination,
      expected: "200 with data and pagination",
      actual: `${status} - data: ${hasData}, pagination: ${hasPagination}`,
      duration,
    });
  }

  // Test 2.2: GET /api/calls with pagination
  {
    const { status, data, duration } = await apiRequest("/api/calls?page=1&pageSize=5", "GET", undefined, token1);
    const pagination = (data as { pagination?: { pageSize: number } })?.pagination;

    logTest({
      name: "Pagination parameters respected",
      endpoint: "/api/calls?page=1&pageSize=5",
      method: "GET",
      passed: status === 200 && pagination?.pageSize === 5,
      expected: "pageSize=5",
      actual: `pageSize=${pagination?.pageSize}`,
      duration,
    });
  }

  // Test 2.3: POST /api/calls - Create call
  if (caller1) {
    const { status, data, duration } = await apiRequest(
      "/api/calls",
      "POST",
      {
        caller_id: caller1.id,
        raw_notes: "Test call notes for API integration testing. This is a sample sales call.",
        customer_name: "Test Customer",
        customer_company: "Test Corp",
      },
      token1
    );

    const hasCallId = typeof data === "object" && data !== null && "data" in data && (data as { data: { id: string } }).data?.id;

    logTest({
      name: "Create call succeeds",
      endpoint: "/api/calls",
      method: "POST",
      passed: status === 201 && !!hasCallId,
      expected: "201 with call id",
      actual: `${status} - id: ${hasCallId || "missing"}`,
      duration,
    });
  }

  // Test 2.4: POST /api/calls - Invalid caller_id
  {
    const { status, data, duration } = await apiRequest(
      "/api/calls",
      "POST",
      {
        caller_id: "00000000-0000-0000-0000-000000000000",
        raw_notes: "Test call notes",
      },
      token1
    );

    logTest({
      name: "Invalid caller_id returns 404",
      endpoint: "/api/calls",
      method: "POST",
      passed: status === 404,
      expected: "404",
      actual: String(status),
      duration,
    });
  }

  // Test 2.5: POST /api/calls - Missing required field
  {
    const { status, duration } = await apiRequest(
      "/api/calls",
      "POST",
      {
        caller_id: caller1?.id,
        // Missing raw_notes
      },
      token1
    );

    logTest({
      name: "Missing required field returns 400",
      endpoint: "/api/calls",
      method: "POST",
      passed: status === 400,
      expected: "400",
      actual: String(status),
      duration,
    });
  }

  // Test 2.6: POST /api/calls - Cross-tenant attack
  if (caller1) {
    const { data: org2Callers } = await adminClient.from("callers").select("id").eq("org_id", org2.id).limit(1);
    const org2CallerId = org2Callers?.[0]?.id;

    if (org2CallerId) {
      const { status, duration } = await apiRequest(
        "/api/calls",
        "POST",
        {
          caller_id: org2CallerId, // Trying to use caller from different org
          raw_notes: "ATTACK: Cross-tenant call creation",
        },
        token1
      );

      logTest({
        name: "Cross-tenant caller_id blocked",
        endpoint: "/api/calls",
        method: "POST",
        passed: status === 404, // Should not find caller in user's org
        expected: "404",
        actual: String(status),
        duration,
      });
    }
  }

  // ============================================
  // SUITE 3: Single Call API Tests
  // ============================================
  console.log("\n--- SUITE 3: Single Call API Tests ---\n");

  if (call1 && call2) {
    // Test 3.1: GET /api/calls/[id] - Own org call
    {
      const { status, duration } = await apiRequest(`/api/calls/${call1.id}`, "GET", undefined, token1);

      logTest({
        name: "Get own org call succeeds",
        endpoint: `/api/calls/${call1.id}`,
        method: "GET",
        passed: status === 200,
        expected: "200",
        actual: String(status),
        duration,
      });
    }

    // Test 3.2: GET /api/calls/[id] - Other org call blocked
    {
      const { status, duration } = await apiRequest(`/api/calls/${call2.id}`, "GET", undefined, token1);

      logTest({
        name: "Get other org call blocked",
        endpoint: `/api/calls/${call2.id}`,
        method: "GET",
        passed: status === 404,
        expected: "404",
        actual: String(status),
        duration,
      });
    }

    // Test 3.3: PUT /api/calls/[id] - Update own call
    {
      const { status, duration } = await apiRequest(
        `/api/calls/${call1.id}`,
        "PUT",
        { customer_name: "Updated Customer Name" },
        token1
      );

      logTest({
        name: "Update own call succeeds",
        endpoint: `/api/calls/${call1.id}`,
        method: "PUT",
        passed: status === 200,
        expected: "200",
        actual: String(status),
        duration,
      });
    }

    // Test 3.4: PUT /api/calls/[id] - Update other org call blocked
    {
      const { status, duration } = await apiRequest(
        `/api/calls/${call2.id}`,
        "PUT",
        { customer_name: "ATTACK: Cross-tenant update" },
        token1
      );

      logTest({
        name: "Update other org call blocked",
        endpoint: `/api/calls/${call2.id}`,
        method: "PUT",
        passed: status === 404,
        expected: "404",
        actual: String(status),
        duration,
      });
    }
  }

  // ============================================
  // SUITE 4: Callers API Tests
  // ============================================
  console.log("\n--- SUITE 4: Callers API Tests ---\n");

  // Test 4.1: GET /api/callers
  {
    const { status, data, duration } = await apiRequest("/api/callers", "GET", undefined, token1);
    const callersData = (data as { data?: Array<{ org_id?: string }> })?.data;
    const allFromOrg1 = Array.isArray(callersData) && callersData.every(
      (c) => c.org_id === org1.id
    );

    logTest({
      name: "List callers returns only own org",
      endpoint: "/api/callers",
      method: "GET",
      passed: status === 200 && allFromOrg1,
      expected: "200 with only org1 callers",
      actual: `${status} - all from org1: ${allFromOrg1}`,
      duration,
    });
  }

  // Test 4.2: POST /api/callers - Create caller
  {
    const { status, data, duration } = await apiRequest(
      "/api/callers",
      "POST",
      {
        name: "New Test Caller",
        email: `test-${Date.now()}@example.com`,
        team: "Test Team",
      },
      token1
    );

    const hasCallerId = typeof data === "object" && data !== null && "data" in data && (data as { data: { id: string } }).data?.id;

    logTest({
      name: "Create caller succeeds",
      endpoint: "/api/callers",
      method: "POST",
      passed: status === 201 && !!hasCallerId,
      expected: "201 with caller id",
      actual: `${status} - id: ${hasCallerId || "missing"}`,
      duration,
    });
  }

  // ============================================
  // SUITE 5: Grading Templates API Tests
  // ============================================
  console.log("\n--- SUITE 5: Grading Templates API Tests ---\n");

  // Test 5.1: GET /api/grading-templates
  {
    const { status, data, duration } = await apiRequest("/api/grading-templates", "GET", undefined, token1);
    const hasData = typeof data === "object" && data !== null && "data" in data;

    logTest({
      name: "List grading templates succeeds",
      endpoint: "/api/grading-templates",
      method: "GET",
      passed: status === 200 && hasData,
      expected: "200 with data",
      actual: `${status} - hasData: ${hasData}`,
      duration,
    });
  }

  // Test 5.2: POST /api/grading-templates - Create template
  {
    const { status, data, duration } = await apiRequest(
      "/api/grading-templates",
      "POST",
      {
        name: "Test Template",
        description: "Test template for API integration testing",
        criteria_json: [
          {
            id: "test_criterion",
            name: "Test Criterion",
            description: "A test criterion",
            type: "score",
            weight: 100,
            isRequired: true,
            order: 1,
            minValue: 1,
            maxValue: 10,
          },
        ],
      },
      token1
    );

    const hasTemplateId = typeof data === "object" && data !== null && "data" in data && (data as { data: { id: string } }).data?.id;

    logTest({
      name: "Create grading template succeeds",
      endpoint: "/api/grading-templates",
      method: "POST",
      passed: status === 201 && !!hasTemplateId,
      expected: "201 with template id",
      actual: `${status} - id: ${hasTemplateId || "missing"}`,
      duration,
    });
  }

  // ============================================
  // SUITE 6: Dashboard Stats API Tests
  // ============================================
  console.log("\n--- SUITE 6: Dashboard Stats API Tests ---\n");

  // Test 6.1: GET /api/dashboard/stats
  {
    const { status, data, duration } = await apiRequest("/api/dashboard/stats", "GET", undefined, token1);
    const statsData = (data as { data?: { totalCalls?: number } })?.data;
    const hasStats = typeof statsData?.totalCalls === "number";

    logTest({
      name: "Get dashboard stats succeeds",
      endpoint: "/api/dashboard/stats",
      method: "GET",
      passed: status === 200 && hasStats,
      expected: "200 with totalCalls",
      actual: `${status} - totalCalls: ${statsData?.totalCalls}`,
      duration,
    });
  }

  // Test 6.2: GET /api/dashboard/stats with period
  {
    const { status, data, duration } = await apiRequest("/api/dashboard/stats?period=month", "GET", undefined, token1);
    const period = (data as { data?: { period?: string } })?.data?.period;

    logTest({
      name: "Dashboard stats respects period param",
      endpoint: "/api/dashboard/stats?period=month",
      method: "GET",
      passed: status === 200 && period === "month",
      expected: "period=month",
      actual: `period=${period}`,
      duration,
    });
  }

  // ============================================
  // SUITE 7: Webhook API Tests
  // ============================================
  console.log("\n--- SUITE 7: Webhook API Tests ---\n");

  // Test 7.1: GET /api/webhook/[orgSlug] - Test endpoint
  {
    const { status, data, duration } = await apiRequest(`/api/webhook/${org1.slug}`, "GET");
    const webhookStatus = (data as { status?: string })?.status;

    logTest({
      name: "Webhook test endpoint returns status",
      endpoint: `/api/webhook/${org1.slug}`,
      method: "GET",
      passed: status === 200 && webhookStatus === "active",
      expected: "200 with status=active",
      actual: `${status} - status=${webhookStatus}`,
      duration,
    });
  }

  // Test 7.2: GET /api/webhook/invalid-slug - 404
  {
    const { status, duration } = await apiRequest("/api/webhook/nonexistent-org-slug", "GET");

    logTest({
      name: "Invalid org slug returns 404",
      endpoint: "/api/webhook/nonexistent-org-slug",
      method: "GET",
      passed: status === 404,
      expected: "404",
      actual: String(status),
      duration,
    });
  }

  // Test 7.3: POST /api/webhook/[orgSlug] - No auth
  {
    const { status, duration } = await apiRequest(
      `/api/webhook/${org1.slug}`,
      "POST",
      {
        caller_name: "Test Caller",
        raw_notes: "Test webhook payload",
      }
    );

    logTest({
      name: "Webhook POST without auth returns 401",
      endpoint: `/api/webhook/${org1.slug}`,
      method: "POST",
      passed: status === 401,
      expected: "401",
      actual: String(status),
      duration,
    });
  }

  // ============================================
  // SUITE 8: Concurrency Tests
  // ============================================
  console.log("\n--- SUITE 8: Concurrency Tests ---\n");

  // Test 8.1: Parallel requests to same endpoint
  {
    const start = Date.now();
    const promises = Array(5).fill(null).map(() =>
      apiRequest("/api/calls?pageSize=5", "GET", undefined, token1)
    );

    const responses = await Promise.all(promises);
    const duration = Date.now() - start;
    const allSucceeded = responses.every(r => r.status === 200);

    logTest({
      name: "5 parallel requests all succeed",
      endpoint: "/api/calls",
      method: "GET (x5 parallel)",
      passed: allSucceeded,
      expected: "All 200",
      actual: responses.map(r => r.status).join(", "),
      duration,
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
  const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length);

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Avg Duration: ${avgDuration}ms`);

  if (failed > 0) {
    console.log("\nFailed Tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint} - ${r.name}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);

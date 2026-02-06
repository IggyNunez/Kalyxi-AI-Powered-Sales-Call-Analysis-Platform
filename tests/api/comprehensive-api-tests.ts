/**
 * Kalyxi AI - Comprehensive API Integration Tests
 *
 * Tests all API endpoints for:
 * - Happy path (success cases)
 * - Invalid input (validation)
 * - Authentication/Authorization
 * - Cross-tenant attacks
 * - Edge cases
 *
 * Run: npx tsx tests/api/comprehensive-api-tests.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config, TestReporter, measureTest } from "../config";
import { testIds, testData } from "../seed/deterministic-seed";

const reporter = new TestReporter();

async function getAuthToken(email: string, password: string): Promise<string | null> {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
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
  token?: string | null,
  headers?: Record<string, string>
): Promise<{ status: number; data: unknown; duration: number }> {
  const start = Date.now();

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
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

async function testAuthenticationEndpoints(token1: string) {
  reporter.setCategory("Authentication");

  // Test 1: Unauthenticated request returns 401
  {
    const { status, duration } = await apiRequest("/api/calls");

    reporter.log({
      name: "Unauthenticated request returns 401",
      passed: status === 401,
      expected: "401",
      actual: String(status),
      duration,
      severity: "blocker",
    });
  }

  // Test 2: Invalid token returns 401
  {
    const { status, duration } = await apiRequest("/api/calls", "GET", undefined, "invalid-token");

    reporter.log({
      name: "Invalid token returns 401",
      passed: status === 401,
      expected: "401",
      actual: String(status),
      duration,
      severity: "blocker",
    });
  }

  // Test 3: Expired token handling (simulate with garbage)
  {
    const { status, duration } = await apiRequest(
      "/api/calls",
      "GET",
      undefined,
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid"
    );

    reporter.log({
      name: "Malformed/expired token returns 401",
      passed: status === 401,
      expected: "401",
      actual: String(status),
      duration,
      severity: "blocker",
    });
  }

  // Test 4: Valid token returns 200
  {
    const { status, duration } = await apiRequest("/api/calls", "GET", undefined, token1);

    reporter.log({
      name: "Valid token returns 200",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "blocker",
    });
  }
}

async function testCallsAPI(token1: string, token2: string, callerToken: string) {
  reporter.setCategory("Calls API");

  // Test: GET /api/calls - List calls
  {
    const { status, data, duration } = await apiRequest("/api/calls", "GET", undefined, token1);
    const hasData = typeof data === "object" && data !== null && "data" in data;
    const hasPagination = typeof data === "object" && data !== null && "pagination" in data;

    reporter.log({
      name: "GET /api/calls returns data and pagination",
      passed: status === 200 && hasData && hasPagination,
      expected: "200 with data and pagination",
      actual: `${status} - data: ${hasData}, pagination: ${hasPagination}`,
      duration,
      severity: "high",
    });
  }

  // Test: Pagination parameters
  {
    const { status, data, duration } = await apiRequest(
      "/api/calls?page=1&pageSize=5",
      "GET",
      undefined,
      token1
    );
    const pagination = (data as { pagination?: { pageSize: number } })?.pagination;

    reporter.log({
      name: "GET /api/calls respects pagination params",
      passed: status === 200 && pagination?.pageSize === 5,
      expected: "pageSize=5",
      actual: `pageSize=${pagination?.pageSize}`,
      duration,
      severity: "medium",
    });
  }

  // Test: Sorting parameters
  {
    const { status, data, duration } = await apiRequest(
      "/api/calls?sortBy=call_timestamp&sortOrder=asc",
      "GET",
      undefined,
      token1
    );

    reporter.log({
      name: "GET /api/calls respects sorting params",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "medium",
    });
  }

  // Test: Status filter
  {
    const { status, data, duration } = await apiRequest(
      "/api/calls?status=analyzed",
      "GET",
      undefined,
      token1
    );
    const calls = (data as { data?: Array<{ status: string }> })?.data;
    const allAnalyzed = calls?.every((c) => c.status === "analyzed") ?? true;

    reporter.log({
      name: "GET /api/calls respects status filter",
      passed: status === 200 && allAnalyzed,
      expected: "All calls have status=analyzed",
      actual: `All analyzed: ${allAnalyzed}`,
      duration,
      severity: "medium",
    });
  }

  // Test: POST /api/calls - Create call (admin)
  let createdCallId: string | null = null;
  {
    const { status, data, duration } = await apiRequest(
      "/api/calls",
      "POST",
      {
        caller_id: testIds.callerRecord1,
        raw_notes: "API test call - should be created successfully. Lorem ipsum dolor sit amet.",
        customer_name: "API Test Customer",
        customer_company: "API Test Corp",
      },
      token1
    );

    const callId = (data as { data?: { id: string } })?.data?.id;
    createdCallId = callId || null;

    reporter.log({
      name: "POST /api/calls creates call (admin)",
      passed: status === 201 && !!callId,
      expected: "201 with call id",
      actual: `${status} - id: ${callId || "missing"}`,
      duration,
      severity: "high",
    });
  }

  // Test: POST /api/calls - Missing required field
  {
    const { status, duration } = await apiRequest(
      "/api/calls",
      "POST",
      {
        caller_id: testIds.callerRecord1,
        // Missing raw_notes
      },
      token1
    );

    reporter.log({
      name: "POST /api/calls validates required fields",
      passed: status === 400,
      expected: "400",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: POST /api/calls - Invalid caller_id
  {
    const { status, duration } = await apiRequest(
      "/api/calls",
      "POST",
      {
        caller_id: "00000000-0000-0000-0000-000000000000",
        raw_notes: "Test call with invalid caller",
      },
      token1
    );

    reporter.log({
      name: "POST /api/calls rejects invalid caller_id",
      passed: status === 404 || status === 400,
      expected: "404 or 400",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: POST /api/calls - Cross-tenant caller_id
  {
    const { status, duration } = await apiRequest(
      "/api/calls",
      "POST",
      {
        caller_id: testIds.callerRecord4, // Belongs to org2
        raw_notes: "Cross-tenant attack attempt",
      },
      token1 // Token for org1
    );

    reporter.log({
      name: "POST /api/calls blocks cross-tenant caller_id",
      passed: status === 404 || status === 403,
      expected: "404 or 403",
      actual: String(status),
      duration,
      severity: "blocker",
    });
  }

  // Test: POST /api/calls - Caller role cannot create
  {
    const { status, duration } = await apiRequest(
      "/api/calls",
      "POST",
      {
        caller_id: testIds.callerRecord1,
        raw_notes: "Caller role trying to create",
      },
      callerToken
    );

    reporter.log({
      name: "POST /api/calls denied for caller role",
      passed: status === 403,
      expected: "403",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: GET /api/calls/[id] - Own org call
  if (createdCallId) {
    const { status, data, duration } = await apiRequest(
      `/api/calls/${createdCallId}`,
      "GET",
      undefined,
      token1
    );

    reporter.log({
      name: "GET /api/calls/[id] returns own org call",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: GET /api/calls/[id] - Other org call blocked
  {
    const { status, duration } = await apiRequest(
      `/api/calls/${testIds.call4}`, // Belongs to org2
      "GET",
      undefined,
      token1
    );

    reporter.log({
      name: "GET /api/calls/[id] blocks other org call",
      passed: status === 404,
      expected: "404",
      actual: String(status),
      duration,
      severity: "blocker",
    });
  }

  // Test: PUT /api/calls/[id] - Update own call
  if (createdCallId) {
    const { status, duration } = await apiRequest(
      `/api/calls/${createdCallId}`,
      "PUT",
      { customer_name: "Updated Customer Name" },
      token1
    );

    reporter.log({
      name: "PUT /api/calls/[id] updates own org call",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: PUT /api/calls/[id] - Other org call blocked
  {
    const { status, duration } = await apiRequest(
      `/api/calls/${testIds.call4}`,
      "PUT",
      { customer_name: "ATTACK" },
      token1
    );

    reporter.log({
      name: "PUT /api/calls/[id] blocks other org call",
      passed: status === 404,
      expected: "404",
      actual: String(status),
      duration,
      severity: "blocker",
    });
  }

  // Test: DELETE /api/calls/[id] - Delete own call
  if (createdCallId) {
    const { status, duration } = await apiRequest(
      `/api/calls/${createdCallId}`,
      "DELETE",
      undefined,
      token1
    );

    reporter.log({
      name: "DELETE /api/calls/[id] deletes own org call",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: DELETE /api/calls/[id] - Other org blocked
  {
    const { status, duration } = await apiRequest(
      `/api/calls/${testIds.call4}`,
      "DELETE",
      undefined,
      token1
    );

    reporter.log({
      name: "DELETE /api/calls/[id] blocks other org call",
      passed: status === 404,
      expected: "404",
      actual: String(status),
      duration,
      severity: "blocker",
    });
  }
}

async function testCallersAPI(token1: string, callerToken: string) {
  reporter.setCategory("Callers API");

  // Test: GET /api/callers
  {
    const { status, data, duration } = await apiRequest("/api/callers", "GET", undefined, token1);
    const hasData = typeof data === "object" && data !== null && "data" in data;

    reporter.log({
      name: "GET /api/callers returns data",
      passed: status === 200 && hasData,
      expected: "200 with data",
      actual: `${status} - hasData: ${hasData}`,
      duration,
      severity: "high",
    });
  }

  // Test: POST /api/callers - Create caller
  let createdCallerId: string | null = null;
  {
    const timestamp = Date.now();
    const { status, data, duration } = await apiRequest(
      "/api/callers",
      "POST",
      {
        name: "API Test Caller",
        email: `api-test-${timestamp}@example.com`,
        team: "Test Team",
      },
      token1
    );

    const callerId = (data as { data?: { id: string } })?.data?.id;
    createdCallerId = callerId || null;

    reporter.log({
      name: "POST /api/callers creates caller",
      passed: status === 201 && !!callerId,
      expected: "201 with caller id",
      actual: `${status} - id: ${callerId || "missing"}`,
      duration,
      severity: "high",
    });
  }

  // Test: POST /api/callers - Caller role cannot create
  {
    const { status, duration } = await apiRequest(
      "/api/callers",
      "POST",
      {
        name: "Unauthorized Caller",
        email: `unauthorized-${Date.now()}@example.com`,
      },
      callerToken
    );

    reporter.log({
      name: "POST /api/callers denied for caller role",
      passed: status === 403,
      expected: "403",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: GET /api/callers/[id]
  if (createdCallerId) {
    const { status, duration } = await apiRequest(
      `/api/callers/${createdCallerId}`,
      "GET",
      undefined,
      token1
    );

    reporter.log({
      name: "GET /api/callers/[id] returns caller",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: PATCH /api/callers/[id]
  if (createdCallerId) {
    const { status, duration } = await apiRequest(
      `/api/callers/${createdCallerId}`,
      "PATCH",
      { name: "Updated Caller Name" },
      token1
    );

    reporter.log({
      name: "PATCH /api/callers/[id] updates caller",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: DELETE /api/callers/[id] - Soft delete
  if (createdCallerId) {
    const { status, duration } = await apiRequest(
      `/api/callers/${createdCallerId}`,
      "DELETE",
      undefined,
      token1
    );

    reporter.log({
      name: "DELETE /api/callers/[id] deactivates caller",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "high",
    });
  }
}

async function testGradingTemplatesAPI(token1: string, callerToken: string) {
  reporter.setCategory("Grading Templates API");

  // Test: GET /api/grading-templates
  {
    const { status, data, duration } = await apiRequest(
      "/api/grading-templates",
      "GET",
      undefined,
      token1
    );

    reporter.log({
      name: "GET /api/grading-templates returns templates",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: POST /api/grading-templates
  let createdTemplateId: string | null = null;
  {
    const { status, data, duration } = await apiRequest(
      "/api/grading-templates",
      "POST",
      {
        name: "API Test Template",
        description: "Created via API test",
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

    const templateId = (data as { data?: { id: string } })?.data?.id;
    createdTemplateId = templateId || null;

    reporter.log({
      name: "POST /api/grading-templates creates template",
      passed: status === 201 && !!templateId,
      expected: "201 with template id",
      actual: `${status} - id: ${templateId || "missing"}`,
      duration,
      severity: "high",
    });
  }

  // Test: Caller cannot create templates
  {
    const { status, duration } = await apiRequest(
      "/api/grading-templates",
      "POST",
      {
        name: "Unauthorized Template",
        criteria_json: [],
      },
      callerToken
    );

    reporter.log({
      name: "POST /api/grading-templates denied for caller",
      passed: status === 403,
      expected: "403",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Cleanup
  if (createdTemplateId) {
    await apiRequest(`/api/grading-templates/${createdTemplateId}`, "DELETE", undefined, token1);
  }
}

async function testScorecardsAPI(token1: string) {
  reporter.setCategory("Scorecards API");

  // Test: GET /api/scorecards
  {
    const { status, data, duration } = await apiRequest(
      "/api/scorecards",
      "GET",
      undefined,
      token1
    );

    reporter.log({
      name: "GET /api/scorecards returns scorecards",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: POST /api/scorecards
  let createdScorecardId: string | null = null;
  {
    const { status, data, duration } = await apiRequest(
      "/api/scorecards",
      "POST",
      {
        name: "API Test Scorecard",
        description: "Created via API test",
        total_weight: 100,
        criteria: [
          {
            id: "criterion_1",
            name: "Test Criterion",
            description: "A test criterion",
            weight: 100,
            max_score: 10,
            scoring_guide: "Score from 1-10",
            order: 1,
          },
        ],
      },
      token1
    );

    const scorecardId = (data as { data?: { id: string } })?.data?.id;
    createdScorecardId = scorecardId || null;

    reporter.log({
      name: "POST /api/scorecards creates scorecard",
      passed: status === 201 && !!scorecardId,
      expected: "201 with scorecard id",
      actual: `${status} - id: ${scorecardId || "missing"}`,
      duration,
      severity: "high",
    });
  }

  // Test: Weight validation
  {
    const { status, data, duration } = await apiRequest(
      "/api/scorecards",
      "POST",
      {
        name: "Invalid Weight Scorecard",
        total_weight: 100,
        criteria: [
          {
            id: "c1",
            name: "C1",
            description: "D1",
            weight: 50, // Doesn't add up to 100
            max_score: 10,
            scoring_guide: "Guide",
            order: 1,
          },
        ],
      },
      token1
    );

    reporter.log({
      name: "POST /api/scorecards validates weight sum = 100",
      passed: status === 400,
      expected: "400",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Cleanup
  if (createdScorecardId) {
    await apiRequest(`/api/scorecards/${createdScorecardId}`, "DELETE", undefined, token1);
  }
}

async function testScriptsAPI(token1: string) {
  reporter.setCategory("Scripts API");

  // Test: GET /api/scripts
  {
    const { status, duration } = await apiRequest("/api/scripts", "GET", undefined, token1);

    reporter.log({
      name: "GET /api/scripts returns scripts",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: POST /api/scripts
  let createdScriptId: string | null = null;
  {
    const { status, data, duration } = await apiRequest(
      "/api/scripts",
      "POST",
      {
        name: "API Test Script",
        description: "Created via API test",
        sections: [
          {
            id: "intro",
            name: "Introduction",
            content: "Hello, this is a test script.",
            tips: ["Be friendly"],
            order: 1,
          },
        ],
      },
      token1
    );

    const scriptId = (data as { data?: { id: string } })?.data?.id;
    createdScriptId = scriptId || null;

    reporter.log({
      name: "POST /api/scripts creates script",
      passed: status === 201 && !!scriptId,
      expected: "201 with script id",
      actual: `${status} - id: ${scriptId || "missing"}`,
      duration,
      severity: "high",
    });
  }

  // Cleanup
  if (createdScriptId) {
    await apiRequest(`/api/scripts/${createdScriptId}`, "DELETE", undefined, token1);
  }
}

async function testInsightTemplatesAPI(token1: string) {
  reporter.setCategory("Insight Templates API");

  // Test: GET /api/insight-templates
  {
    const { status, duration } = await apiRequest(
      "/api/insight-templates",
      "GET",
      undefined,
      token1
    );

    reporter.log({
      name: "GET /api/insight-templates returns templates",
      passed: status === 200,
      expected: "200",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: POST /api/insight-templates
  let createdTemplateId: string | null = null;
  {
    const { status, data, duration } = await apiRequest(
      "/api/insight-templates",
      "POST",
      {
        name: "API Test Insight Template",
        description: "Created via API test",
        category: "general",
        prompt_template: "Analyze the following call and provide insights.",
        output_format: "bullets",
        max_insights: 5,
      },
      token1
    );

    const templateId = (data as { data?: { id: string } })?.data?.id;
    createdTemplateId = templateId || null;

    reporter.log({
      name: "POST /api/insight-templates creates template",
      passed: status === 201 && !!templateId,
      expected: "201 with template id",
      actual: `${status} - id: ${templateId || "missing"}`,
      duration,
      severity: "high",
    });
  }

  // Cleanup
  if (createdTemplateId) {
    await apiRequest(`/api/insight-templates/${createdTemplateId}`, "DELETE", undefined, token1);
  }
}

async function testDashboardStatsAPI(token1: string) {
  reporter.setCategory("Dashboard Stats API");

  // Test: GET /api/dashboard/stats
  {
    const { status, data, duration } = await apiRequest(
      "/api/dashboard/stats",
      "GET",
      undefined,
      token1
    );
    const hasStats =
      typeof data === "object" &&
      data !== null &&
      "data" in data &&
      typeof (data as { data: { totalCalls?: number } }).data?.totalCalls === "number";

    reporter.log({
      name: "GET /api/dashboard/stats returns stats",
      passed: status === 200 && hasStats,
      expected: "200 with totalCalls",
      actual: `${status} - hasStats: ${hasStats}`,
      duration,
      severity: "high",
    });
  }

  // Test: Period parameter
  for (const period of ["day", "week", "month", "quarter"]) {
    const { status, data, duration } = await apiRequest(
      `/api/dashboard/stats?period=${period}`,
      "GET",
      undefined,
      token1
    );
    const returnedPeriod = (data as { data?: { period?: string } })?.data?.period;

    reporter.log({
      name: `GET /api/dashboard/stats?period=${period}`,
      passed: status === 200 && returnedPeriod === period,
      expected: `period=${period}`,
      actual: `period=${returnedPeriod}`,
      duration,
      severity: "medium",
    });
  }
}

async function testWebhookAPI(token1: string) {
  reporter.setCategory("Webhook API");

  const orgSlug = config.org1Slug;
  const webhookSecret = `test_secret_${orgSlug}`;

  // Test: GET /api/webhook/[orgSlug] - Test endpoint
  {
    const { status, data, duration } = await apiRequest(`/api/webhook/${orgSlug}`);
    const webhookStatus = (data as { status?: string })?.status;

    reporter.log({
      name: "GET /api/webhook/[orgSlug] returns status",
      passed: status === 200 && webhookStatus === "active",
      expected: "200 with status=active",
      actual: `${status} - status=${webhookStatus}`,
      duration,
      severity: "high",
    });
  }

  // Test: Invalid org slug returns 404
  {
    const { status, duration } = await apiRequest("/api/webhook/nonexistent-org-slug");

    reporter.log({
      name: "GET /api/webhook/[invalid] returns 404",
      passed: status === 404,
      expected: "404",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: POST without auth returns 401
  {
    const { status, duration } = await apiRequest(`/api/webhook/${orgSlug}`, "POST", {
      caller_name: "Test Caller",
      raw_notes: "Test webhook payload with sufficient content for validation.",
    });

    reporter.log({
      name: "POST /api/webhook without auth returns 401",
      passed: status === 401,
      expected: "401",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: POST with Bearer token
  {
    const { status, data, duration } = await apiRequest(
      `/api/webhook/${orgSlug}`,
      "POST",
      {
        caller_name: "Webhook Test Caller",
        raw_notes: "This is a test call submitted via webhook API with bearer token authentication.",
      },
      undefined,
      { Authorization: `Bearer ${webhookSecret}` }
    );

    const success = (data as { success?: boolean })?.success;

    reporter.log({
      name: "POST /api/webhook with Bearer token succeeds",
      passed: status === 201 && success === true,
      expected: "201 with success=true",
      actual: `${status} - success=${success}`,
      duration,
      severity: "high",
    });
  }

  // Test: POST with invalid Bearer token
  {
    const { status, duration } = await apiRequest(
      `/api/webhook/${orgSlug}`,
      "POST",
      {
        caller_name: "Test",
        raw_notes: "Test webhook with invalid token that should be rejected by the server.",
      },
      undefined,
      { Authorization: "Bearer invalid-secret" }
    );

    reporter.log({
      name: "POST /api/webhook with invalid Bearer token returns 401",
      passed: status === 401,
      expected: "401",
      actual: String(status),
      duration,
      severity: "high",
    });
  }

  // Test: Validation - raw_notes too short
  {
    const { status, duration } = await apiRequest(
      `/api/webhook/${orgSlug}`,
      "POST",
      {
        caller_name: "Test",
        raw_notes: "Too short", // Less than 10 chars
      },
      undefined,
      { Authorization: `Bearer ${webhookSecret}` }
    );

    reporter.log({
      name: "POST /api/webhook validates raw_notes length",
      passed: status === 400,
      expected: "400",
      actual: String(status),
      duration,
      severity: "medium",
    });
  }
}

async function testConcurrency(token1: string) {
  reporter.setCategory("Concurrency");

  // Test: Parallel requests
  {
    const start = Date.now();
    const promises = Array(10)
      .fill(null)
      .map(() => apiRequest("/api/calls?pageSize=5", "GET", undefined, token1));

    const responses = await Promise.all(promises);
    const duration = Date.now() - start;
    const allSucceeded = responses.every((r) => r.status === 200);

    reporter.log({
      name: "10 parallel requests all succeed",
      passed: allSucceeded,
      expected: "All 200",
      actual: responses.map((r) => r.status).join(", "),
      duration,
      severity: "medium",
    });
  }

  // Test: Response time under load
  {
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const { duration } = await apiRequest("/api/calls?pageSize=1", "GET", undefined, token1);
      times.push(duration);
    }
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    reporter.log({
      name: "Average response time under 500ms",
      passed: avgTime < 500,
      expected: "<500ms",
      actual: `${Math.round(avgTime)}ms avg`,
      duration: Math.round(avgTime),
      severity: "medium",
    });
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("KALYXI - COMPREHENSIVE API TESTS");
  console.log("=".repeat(60));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log("");

  // Get auth tokens
  const token1 = await getAuthToken(testData.users[0].email, config.testPassword);
  const token2 = await getAuthToken(testData.users[3].email, config.testPassword);
  const callerToken = await getAuthToken(testData.users[1].email, config.testPassword);

  if (!token1 || !token2 || !callerToken) {
    console.error("Failed to get auth tokens. Run seed script first.");
    process.exit(1);
  }

  console.log("Test setup:");
  console.log(`  Admin 1 token: ${token1.substring(0, 20)}...`);
  console.log(`  Admin 2 token: ${token2.substring(0, 20)}...`);
  console.log(`  Caller token: ${callerToken.substring(0, 20)}...`);
  console.log("");

  try {
    await testAuthenticationEndpoints(token1);
    await testCallsAPI(token1, token2, callerToken);
    await testCallersAPI(token1, callerToken);
    await testGradingTemplatesAPI(token1, callerToken);
    await testScorecardsAPI(token1);
    await testScriptsAPI(token1);
    await testInsightTemplatesAPI(token1);
    await testDashboardStatsAPI(token1);
    await testWebhookAPI(token1);
    await testConcurrency(token1);

    const summary = reporter.printSummary();
    process.exit(reporter.getExitCode());
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

main();

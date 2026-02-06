/**
 * Kalyxi AI - Test Configuration
 *
 * Centralized configuration for all test suites.
 */

import "dotenv/config";

// Environment validation
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

export const config = {
  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,

  // API
  baseUrl: process.env.TEST_BASE_URL || "http://localhost:3000",

  // Test credentials (deterministic)
  testPassword: "TestPassword123!",

  // Test organization slugs (deterministic)
  org1Slug: "acme-sales-testing",
  org2Slug: "beta-corp-testing",
  org3Slug: "gamma-inc-testing",

  // Test timeouts
  apiTimeout: 30000,
  dbTimeout: 10000,

  // Deterministic seed for reproducible data
  seed: 42,
};

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  duration: number;
  severity: "blocker" | "critical" | "high" | "medium" | "low";
  error?: Error;
}

export interface TestSuiteResult {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

export class TestReporter {
  private results: TestResult[] = [];
  private startTime: number = Date.now();
  private currentCategory: string = "";

  setCategory(category: string) {
    this.currentCategory = category;
    console.log(`\n--- ${category} ---\n`);
  }

  log(result: Omit<TestResult, "category">) {
    const fullResult: TestResult = { ...result, category: this.currentCategory };
    this.results.push(fullResult);

    const status = result.passed ? "PASS" : "FAIL";
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} [${status}] ${result.name} (${result.duration}ms)`);

    if (!result.passed) {
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Actual: ${result.actual}`);
      console.log(`   Severity: ${result.severity.toUpperCase()}`);
      if (result.error) {
        console.log(`   Error: ${result.error.message}`);
      }
    }
  }

  getSummary(): TestSuiteResult {
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;

    return {
      name: "Full Test Suite",
      tests: this.results,
      passed,
      failed,
      duration: Date.now() - this.startTime,
    };
  }

  printSummary() {
    const summary = this.getSummary();

    console.log("\n" + "=".repeat(60));
    console.log("TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total: ${summary.tests.length}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Duration: ${summary.duration}ms`);

    // Group failures by severity
    const blockers = this.results.filter((r) => !r.passed && r.severity === "blocker");
    const critical = this.results.filter((r) => !r.passed && r.severity === "critical");
    const high = this.results.filter((r) => !r.passed && r.severity === "high");

    if (blockers.length > 0) {
      console.log("\n🚨 BLOCKER ISSUES (Must fix before production):");
      blockers.forEach((r) => console.log(`  - [${r.category}] ${r.name}`));
    }

    if (critical.length > 0) {
      console.log("\n⛔ CRITICAL ISSUES:");
      critical.forEach((r) => console.log(`  - [${r.category}] ${r.name}`));
    }

    if (high.length > 0) {
      console.log("\n⚠️  HIGH PRIORITY ISSUES:");
      high.forEach((r) => console.log(`  - [${r.category}] ${r.name}`));
    }

    // Categories summary
    const categories = [...new Set(this.results.map((r) => r.category))];
    console.log("\n📊 Results by Category:");
    for (const cat of categories) {
      const catResults = this.results.filter((r) => r.category === cat);
      const catPassed = catResults.filter((r) => r.passed).length;
      const catFailed = catResults.filter((r) => !r.passed).length;
      const icon = catFailed === 0 ? "✅" : "❌";
      console.log(`  ${icon} ${cat}: ${catPassed}/${catResults.length} passed`);
    }

    return summary;
  }

  toJSON(): string {
    return JSON.stringify(this.getSummary(), null, 2);
  }

  getExitCode(): number {
    const blockers = this.results.filter((r) => !r.passed && r.severity === "blocker");
    const critical = this.results.filter((r) => !r.passed && r.severity === "critical");

    if (blockers.length > 0) return 2;
    if (critical.length > 0) return 1;
    return 0;
  }
}

// Helper to measure test duration
export async function measureTest<T>(
  name: string,
  testFn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await testFn();
  return { result, duration: Date.now() - start };
}

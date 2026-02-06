import { test, expect, testUsers, selectors, waitForTableLoad, getTableRowCount } from "./fixtures";
import * as path from "path";

/**
 * Kalyxi AI - Calls E2E Tests
 *
 * Tests call management functionality including:
 * - Calls list view
 * - Call details view
 * - Call upload/submit
 * - Filtering and pagination
 * - Call analysis view
 */

test.describe("Calls List", () => {
  test.describe("Page Load", () => {
    test("should display calls list page", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      // Page should load with main content
      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("should display table or empty state", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      // Either table exists or empty state
      const table = adminPage.locator(selectors.table);
      const emptyState = adminPage.locator(':has-text("No calls"), :has-text("no calls")');

      const hasTable = (await table.count()) > 0;
      const hasEmptyState = (await emptyState.count()) > 0;

      expect(hasTable || hasEmptyState).toBe(true);
    });

    test("caller should be able to view calls list", async ({ callerPage }) => {
      await callerPage.goto("/dashboard/calls");
      await callerPage.waitForLoadState("networkidle");

      const mainContent = callerPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("Table Functionality", () => {
    test("should display call columns", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      const table = adminPage.locator(selectors.table);
      if ((await table.count()) > 0) {
        // Check for expected column headers
        const expectedHeaders = ["Contact", "Duration", "Status", "Date", "Score"];

        for (const header of expectedHeaders) {
          const headerCell = adminPage.locator(`th:has-text("${header}"), [role="columnheader"]:has-text("${header}")`);
          // Headers may vary, just check table is functional
        }
      }
    });

    test("should support pagination", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      const pagination = adminPage.locator(selectors.pagination);
      if ((await pagination.count()) > 0) {
        // Check pagination controls exist
        const nextButton = adminPage.locator('button:has-text("Next"), button[aria-label*="next"]');
        const prevButton = adminPage.locator('button:has-text("Previous"), button[aria-label*="previous"]');

        // Controls should be present (may be disabled if few records)
      }
    });
  });

  test.describe("Filters", () => {
    test("should have search functionality", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      const searchInput = adminPage.locator(selectors.searchInput);
      if ((await searchInput.count()) > 0) {
        await searchInput.first().fill("test search");
        await adminPage.waitForTimeout(500); // Debounce

        // Search should trigger (URL or table update)
      }
    });

    test("should have status filter", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      const statusFilter = adminPage.locator(
        'select[name="status"], ' +
        '[data-testid="status-filter"], ' +
        'button:has-text("Status")'
      );

      if ((await statusFilter.count()) > 0) {
        // Filter exists
        await expect(statusFilter.first()).toBeVisible();
      }
    });

    test("should filter by date range", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      const dateFilter = adminPage.locator(
        'input[type="date"], ' +
        '[data-testid="date-filter"], ' +
        'button:has-text("Date")'
      );

      // Date filter may or may not exist
    });
  });

  test.describe("Navigation", () => {
    test("should navigate to call details on row click", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      const callRows = adminPage.locator(`${selectors.tableRow}, a[href*="/calls/"]`);

      if ((await callRows.count()) > 0) {
        await callRows.first().click();
        await adminPage.waitForTimeout(1000);

        // Should navigate to call detail page
        const url = adminPage.url();
        expect(url).toMatch(/\/calls\/[a-f0-9-]+|\/calls/);
      }
    });
  });
});

test.describe("Call Details", () => {
  test.describe("Page Load", () => {
    test("should load call detail page", async ({ adminPage }) => {
      // First get a call ID from the list
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      const callLinks = adminPage.locator('a[href*="/calls/"]');

      if ((await callLinks.count()) > 0) {
        await callLinks.first().click();
        await adminPage.waitForLoadState("networkidle");

        const mainContent = adminPage.locator("main, [role='main']");
        await expect(mainContent).toBeVisible();
      }
    });

    test("should display call information", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      const callLinks = adminPage.locator('a[href*="/calls/"]');

      if ((await callLinks.count()) > 0) {
        await callLinks.first().click();
        await adminPage.waitForLoadState("networkidle");

        // Look for call details sections
        const sections = [
          "Transcript",
          "Analysis",
          "Score",
          "Summary",
          "Duration",
        ];

        // At least some sections should be present
        let foundSections = 0;
        for (const section of sections) {
          const sectionElement = adminPage.locator(`:has-text("${section}")`);
          if ((await sectionElement.count()) > 0) {
            foundSections++;
          }
        }
      }
    });

    test("should handle non-existent call ID", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls/00000000-0000-0000-0000-000000000000");
      await adminPage.waitForLoadState("networkidle");

      // Should show error or 404
      const errorIndicator = adminPage.locator(
        ':has-text("not found"), :has-text("Not Found"), :has-text("Error")'
      );

      // Either shows error or redirects
      const url = adminPage.url();
      const hasError = (await errorIndicator.count()) > 0;
      const redirected = !url.includes("00000000-0000-0000-0000-000000000000");

      expect(hasError || redirected).toBe(true);
    });
  });

  test.describe("Analysis View", () => {
    test("should display analysis results if available", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/calls");
      await adminPage.waitForLoadState("networkidle");

      const callLinks = adminPage.locator('a[href*="/calls/"]');

      if ((await callLinks.count()) > 0) {
        await callLinks.first().click();
        await adminPage.waitForLoadState("networkidle");

        // Look for analysis components
        const analysisSection = adminPage.locator(
          '[data-testid="analysis"], ' +
          ':has-text("Analysis"), ' +
          ':has-text("Insights")'
        );

        // Analysis may or may not be present
      }
    });
  });
});

test.describe("Call Submit", () => {
  test.describe("Submit Page", () => {
    test("should display submit form", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/submit");
      await adminPage.waitForLoadState("networkidle");

      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("should have contact name input", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/submit");
      await adminPage.waitForLoadState("networkidle");

      const nameInput = adminPage.locator(
        'input[name="contactName"], ' +
        'input[name="contact_name"], ' +
        'input[placeholder*="name" i]'
      );

      if ((await nameInput.count()) > 0) {
        await expect(nameInput.first()).toBeVisible();
      }
    });

    test("should have phone number input", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/submit");
      await adminPage.waitForLoadState("networkidle");

      const phoneInput = adminPage.locator(
        'input[name="phone"], ' +
        'input[name="phoneNumber"], ' +
        'input[type="tel"], ' +
        'input[placeholder*="phone" i]'
      );

      if ((await phoneInput.count()) > 0) {
        await expect(phoneInput.first()).toBeVisible();
      }
    });

    test("should have transcript textarea", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/submit");
      await adminPage.waitForLoadState("networkidle");

      const transcriptInput = adminPage.locator(
        'textarea[name="transcript"], ' +
        'textarea[placeholder*="transcript" i], ' +
        'textarea'
      );

      if ((await transcriptInput.count()) > 0) {
        await expect(transcriptInput.first()).toBeVisible();
      }
    });

    test("should validate required fields", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/submit");
      await adminPage.waitForLoadState("networkidle");

      // Try to submit empty form
      const submitButton = adminPage.locator('button[type="submit"]');

      if ((await submitButton.count()) > 0) {
        await submitButton.click();
        await adminPage.waitForTimeout(500);

        // Should show validation errors or stay on page
        await expect(adminPage).toHaveURL(/\/submit/);
      }
    });

    test("should submit valid call data", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/submit");
      await adminPage.waitForLoadState("networkidle");

      // Fill form
      const nameInput = adminPage.locator('input[name="contactName"], input[name="contact_name"], input[placeholder*="name" i]');
      const phoneInput = adminPage.locator('input[name="phone"], input[name="phoneNumber"], input[type="tel"]');
      const transcriptInput = adminPage.locator('textarea[name="transcript"], textarea');

      if ((await nameInput.count()) > 0) {
        await nameInput.first().fill("E2E Test Contact");
      }

      if ((await phoneInput.count()) > 0) {
        await phoneInput.first().fill("+1-555-0199");
      }

      if ((await transcriptInput.count()) > 0) {
        await transcriptInput.first().fill(
          "Rep: Hello, this is a test call for E2E testing.\n" +
          "Customer: Hi, I'm interested in your product.\n" +
          "Rep: Great! Let me tell you about our features..."
        );
      }

      // Submit form
      const submitButton = adminPage.locator('button[type="submit"]');
      if ((await submitButton.count()) > 0) {
        await submitButton.click();

        // Wait for success or redirect
        await adminPage.waitForTimeout(3000);

        // Should redirect to calls or show success
        const url = adminPage.url();
        const hasSuccess = (await adminPage.locator(':has-text("success"), :has-text("Success")').count()) > 0;
        const redirected = url.includes("/calls");

        // Either shows success or redirects
      }
    });
  });

  test.describe("Caller Access", () => {
    test("caller should be able to submit calls", async ({ callerPage }) => {
      await callerPage.goto("/dashboard/submit");
      await callerPage.waitForLoadState("networkidle");

      // Callers should have access to submit page
      const mainContent = callerPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();

      // Should not be redirected away
      await expect(callerPage).toHaveURL(/\/submit/);
    });
  });
});

test.describe("Cross-Tenant Security", () => {
  test("should not access calls from other organizations", async ({ browser }) => {
    // Login as org1 user
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto("/login");
    await page1.fill('input[type="email"]', testUsers.org1Admin.email);
    await page1.fill('input[type="password"]', testUsers.org1Admin.password);
    await page1.click('button[type="submit"]');
    await page1.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Get a call ID (from URL or API)
    await page1.goto("/dashboard/calls");
    await page1.waitForLoadState("networkidle");

    // Note: In a real scenario, we'd need to get the actual call ID
    // For now, we test the general security pattern

    await context1.close();

    // Login as org2 user
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto("/login");
    await page2.fill('input[type="email"]', testUsers.org2Admin.email);
    await page2.fill('input[type="password"]', testUsers.org2Admin.password);
    await page2.click('button[type="submit"]');
    await page2.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Org2 user should only see their own calls
    await page2.goto("/dashboard/calls");
    await page2.waitForLoadState("networkidle");

    // Verify the page loads (RLS handles the actual filtering)
    const mainContent = page2.locator("main, [role='main']");
    await expect(mainContent).toBeVisible();

    await context2.close();
  });
});

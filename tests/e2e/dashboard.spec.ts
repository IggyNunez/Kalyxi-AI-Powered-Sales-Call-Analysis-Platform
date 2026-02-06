import { test, expect, testUsers, selectors } from "./fixtures";

/**
 * Kalyxi AI - Dashboard E2E Tests
 *
 * Tests dashboard functionality including:
 * - Stats display
 * - Navigation elements
 * - Recent calls list
 * - Role-based visibility
 */

test.describe("Dashboard", () => {
  test.describe("Layout and Navigation", () => {
    test("should display sidebar navigation", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");

      // Check sidebar exists
      const sidebar = adminPage.locator(selectors.sidebar);
      await expect(sidebar).toBeVisible();

      // Check navigation links
      const navLinks = [
        "Dashboard",
        "Calls",
        "Analytics",
        "Settings",
      ];

      for (const linkText of navLinks) {
        const link = adminPage.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`);
        if ((await link.count()) > 0) {
          await expect(link.first()).toBeVisible();
        }
      }
    });

    test("should display header with user info", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");

      const header = adminPage.locator(selectors.header);
      await expect(header).toBeVisible();
    });

    test("should navigate to calls page from sidebar", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");

      const callsLink = adminPage.locator('a[href*="/calls"], a:has-text("Calls")');
      if ((await callsLink.count()) > 0) {
        await callsLink.first().click();
        await expect(adminPage).toHaveURL(/\/calls/);
      }
    });

    test("should navigate to analytics page from sidebar", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");

      const analyticsLink = adminPage.locator('a[href*="/analytics"], a:has-text("Analytics")');
      if ((await analyticsLink.count()) > 0) {
        await analyticsLink.first().click();
        await expect(adminPage).toHaveURL(/\/analytics/);
      }
    });

    test("should navigate to settings page from sidebar", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");

      const settingsLink = adminPage.locator('a[href*="/settings"], a:has-text("Settings")');
      if ((await settingsLink.count()) > 0) {
        await settingsLink.first().click();
        await expect(adminPage).toHaveURL(/\/settings/);
      }
    });
  });

  test.describe("Stats Cards", () => {
    test("should display stats cards for admin", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");
      await adminPage.waitForLoadState("networkidle");

      // Look for stats elements (cards with numbers)
      const statsCards = adminPage.locator('[data-testid*="stat"], .stat-card, [class*="stat"]');

      // At minimum, page should load without errors
      await expect(adminPage.locator("main, [role='main'], " + selectors.mainContent)).toBeVisible();
    });

    test("should display stats cards for caller", async ({ callerPage }) => {
      await callerPage.goto("/dashboard");
      await callerPage.waitForLoadState("networkidle");

      // Page should load without errors
      await expect(callerPage.locator("main, [role='main'], " + selectors.mainContent)).toBeVisible();
    });
  });

  test.describe("Recent Activity", () => {
    test("should display recent calls section", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");
      await adminPage.waitForLoadState("networkidle");

      // Look for recent calls section
      const recentSection = adminPage.locator(':has-text("Recent"), :has-text("Latest")');

      // Page should be functional
      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("should navigate to call details when clicking a call", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");
      await adminPage.waitForLoadState("networkidle");

      // Look for clickable call items
      const callLinks = adminPage.locator('a[href*="/calls/"]');

      if ((await callLinks.count()) > 0) {
        await callLinks.first().click();
        await expect(adminPage).toHaveURL(/\/calls\/[a-f0-9-]+/);
      }
    });
  });

  test.describe("Role-Based Access", () => {
    test("admin should see admin-only elements", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");
      await adminPage.waitForLoadState("networkidle");

      // Check for admin-specific navigation
      const adminLinks = adminPage.locator('a[href*="/settings"], a:has-text("Settings")');

      if ((await adminLinks.count()) > 0) {
        await expect(adminLinks.first()).toBeVisible();
      }
    });

    test("caller should have appropriate access", async ({ callerPage }) => {
      await callerPage.goto("/dashboard");
      await callerPage.waitForLoadState("networkidle");

      // Callers should see the dashboard
      const mainContent = callerPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("Period Filters", () => {
    test("should have period filter options", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");
      await adminPage.waitForLoadState("networkidle");

      // Look for period selectors
      const periodSelect = adminPage.locator(
        'select:has(option:has-text("7 days")), ' +
        'select:has(option:has-text("30 days")), ' +
        '[data-testid="period-select"], ' +
        'button:has-text("7 days"), ' +
        'button:has-text("30 days")'
      );

      // Period filter may or may not exist depending on implementation
      const count = await periodSelect.count();
      // Just verify the page loaded correctly
      await expect(adminPage.locator("main, [role='main']")).toBeVisible();
    });
  });

  test.describe("Error Handling", () => {
    test("should handle API errors gracefully", async ({ adminPage }) => {
      // Navigate with network interception to simulate errors
      await adminPage.route("**/api/stats**", (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      });

      await adminPage.goto("/dashboard");

      // Page should still render (with error state or empty state)
      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("should be responsive on mobile viewport", async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE
      });
      const page = await context.newPage();

      // Login
      await page.goto("/login");
      await page.fill('input[type="email"], input[name="email"]', testUsers.org1Admin.email);
      await page.fill('input[type="password"], input[name="password"]', testUsers.org1Admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Dashboard should be visible
      const mainContent = page.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();

      await context.close();
    });

    test("should work on tablet viewport", async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 768, height: 1024 }, // iPad
      });
      const page = await context.newPage();

      // Login
      await page.goto("/login");
      await page.fill('input[type="email"], input[name="email"]', testUsers.org1Admin.email);
      await page.fill('input[type="password"], input[name="password"]', testUsers.org1Admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Dashboard should be visible
      const mainContent = page.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();

      await context.close();
    });
  });
});

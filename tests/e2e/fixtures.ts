import { test as base, expect, Page } from "@playwright/test";

/**
 * Kalyxi AI - E2E Test Fixtures
 *
 * Provides authenticated page contexts and helper functions for E2E tests.
 */

// Test user credentials (from deterministic seed)
export const testUsers = {
  org1Admin: {
    email: "admin@acme-sales-testing.test",
    password: "TestPassword123!",
    name: "Alice Admin",
    role: "admin",
    orgSlug: "acme-sales-testing",
  },
  org1Caller: {
    email: "caller1@acme-sales-testing.test",
    password: "TestPassword123!",
    name: "Bob Caller",
    role: "caller",
    orgSlug: "acme-sales-testing",
  },
  org2Admin: {
    email: "admin@beta-corp-testing.test",
    password: "TestPassword123!",
    name: "Charlie Admin",
    role: "admin",
    orgSlug: "beta-corp-testing",
  },
  org2Caller: {
    email: "caller1@beta-corp-testing.test",
    password: "TestPassword123!",
    name: "Diana Caller",
    role: "caller",
    orgSlug: "beta-corp-testing",
  },
};

// Helper to login a user
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

// Helper to logout
export async function logout(page: Page): Promise<void> {
  // Look for logout button/link
  const logoutButton = page.locator(
    'button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign out"), a:has-text("Sign out")'
  );

  if ((await logoutButton.count()) > 0) {
    await logoutButton.first().click();
    await page.waitForURL(/\/(login)?$/, { timeout: 5000 });
  } else {
    // Fallback: navigate directly
    await page.goto("/login");
  }
}

// Extended test fixture with authenticated contexts
type AuthenticatedFixtures = {
  adminPage: Page;
  callerPage: Page;
  unauthenticatedPage: Page;
};

export const test = base.extend<AuthenticatedFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as org1 admin
    await login(page, testUsers.org1Admin.email, testUsers.org1Admin.password);

    await use(page);

    await context.close();
  },

  callerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as org1 caller
    await login(
      page,
      testUsers.org1Caller.email,
      testUsers.org1Caller.password
    );

    await use(page);

    await context.close();
  },

  unauthenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await use(page);

    await context.close();
  },
});

export { expect };

// Common selectors
export const selectors = {
  sidebar: '[data-testid="sidebar"], aside, nav.sidebar',
  header: '[data-testid="header"], header',
  mainContent: '[data-testid="main-content"], main',
  loadingSpinner: '[data-testid="loading"], .loading, .spinner',
  errorMessage: '[data-testid="error"], .error, [role="alert"]',
  successMessage: '[data-testid="success"], .success',
  modal: '[data-testid="modal"], [role="dialog"]',
  modalClose: '[data-testid="modal-close"], [aria-label="Close"]',
  table: '[data-testid="table"], table',
  tableRow: '[data-testid="table-row"], tbody tr',
  pagination: '[data-testid="pagination"], .pagination',
  searchInput: '[data-testid="search"], input[type="search"], input[placeholder*="Search"]',
  filterDropdown: '[data-testid="filter"], select',
  submitButton: 'button[type="submit"]',
  cancelButton: 'button:has-text("Cancel")',
  deleteButton: 'button:has-text("Delete")',
  editButton: 'button:has-text("Edit")',
  saveButton: 'button:has-text("Save")',
};

// Wait helpers
export async function waitForTableLoad(page: Page): Promise<void> {
  // Wait for loading to finish
  const loading = page.locator(selectors.loadingSpinner);
  if ((await loading.count()) > 0) {
    await loading.waitFor({ state: "hidden", timeout: 10000 });
  }

  // Wait for table to be visible
  await page.locator(selectors.table).waitFor({ state: "visible", timeout: 10000 });
}

export async function waitForModalOpen(page: Page): Promise<void> {
  await page.locator(selectors.modal).waitFor({ state: "visible", timeout: 5000 });
}

export async function waitForModalClose(page: Page): Promise<void> {
  await page.locator(selectors.modal).waitFor({ state: "hidden", timeout: 5000 });
}

// Data extraction helpers
export async function getTableRowCount(page: Page): Promise<number> {
  await waitForTableLoad(page);
  return page.locator(selectors.tableRow).count();
}

export async function getErrorMessage(page: Page): Promise<string | null> {
  const error = page.locator(selectors.errorMessage);
  if ((await error.count()) > 0) {
    return error.first().textContent();
  }
  return null;
}

export async function getSuccessMessage(page: Page): Promise<string | null> {
  const success = page.locator(selectors.successMessage);
  if ((await success.count()) > 0) {
    return success.first().textContent();
  }
  return null;
}

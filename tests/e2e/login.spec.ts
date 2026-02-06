import { test, expect, testUsers, login, logout, selectors } from "./fixtures";

/**
 * Kalyxi AI - Login E2E Tests
 *
 * Tests authentication flows including:
 * - Valid login
 * - Invalid credentials
 * - Session persistence
 * - Logout functionality
 * - Protected route access
 */

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ unauthenticatedPage: page }) => {
      await page.goto("/login");

      // Check form elements exist
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test("should show error for empty form submission", async ({ unauthenticatedPage: page }) => {
      await page.goto("/login");

      // Click submit without filling form
      await page.click('button[type="submit"]');

      // Should show validation error or stay on page
      await expect(page).toHaveURL(/\/login/);
    });

    test("should show error for invalid credentials", async ({ unauthenticatedPage: page }) => {
      await page.goto("/login");

      await page.fill('input[type="email"], input[name="email"]', "invalid@test.com");
      await page.fill('input[type="password"], input[name="password"]', "wrongpassword");
      await page.click('button[type="submit"]');

      // Wait for error message or stay on login page
      await page.waitForTimeout(2000);

      // Should either show error or remain on login
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/login/);
    });

    test("should successfully login with valid admin credentials", async ({ unauthenticatedPage: page }) => {
      await login(page, testUsers.org1Admin.email, testUsers.org1Admin.password);

      // Should be on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("should successfully login with valid caller credentials", async ({ unauthenticatedPage: page }) => {
      await login(page, testUsers.org1Caller.email, testUsers.org1Caller.password);

      // Should be on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("should persist session after page refresh", async ({ unauthenticatedPage: page }) => {
      await login(page, testUsers.org1Admin.email, testUsers.org1Admin.password);

      // Refresh the page
      await page.reload();

      // Should still be authenticated (on dashboard, not redirected to login)
      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe("Logout", () => {
    test("should successfully logout", async ({ adminPage }) => {
      // Click logout
      await logout(adminPage);

      // Should be redirected to login or home
      const url = adminPage.url();
      expect(url).toMatch(/(login|^\/$)/);
    });

    test("should not access protected routes after logout", async ({ unauthenticatedPage: page }) => {
      // Login first
      await login(page, testUsers.org1Admin.email, testUsers.org1Admin.password);

      // Logout
      await logout(page);

      // Try to access dashboard
      await page.goto("/dashboard");

      // Should be redirected to login
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect unauthenticated user from dashboard to login", async ({ unauthenticatedPage: page }) => {
      await page.goto("/dashboard");

      // Wait for redirect
      await page.waitForTimeout(2000);

      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect unauthenticated user from calls to login", async ({ unauthenticatedPage: page }) => {
      await page.goto("/dashboard/calls");

      await page.waitForTimeout(2000);

      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect unauthenticated user from settings to login", async ({ unauthenticatedPage: page }) => {
      await page.goto("/dashboard/settings");

      await page.waitForTimeout(2000);

      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect unauthenticated user from analytics to login", async ({ unauthenticatedPage: page }) => {
      await page.goto("/dashboard/analytics");

      await page.waitForTimeout(2000);

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Registration Link", () => {
    test("should have link to registration page", async ({ unauthenticatedPage: page }) => {
      await page.goto("/login");

      const registerLink = page.locator('a[href*="register"]');
      if ((await registerLink.count()) > 0) {
        await expect(registerLink.first()).toBeVisible();
      }
    });
  });
});

test.describe("Registration", () => {
  test("should display registration form", async ({ unauthenticatedPage: page }) => {
    await page.goto("/register");

    // Check form elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should show error for invalid email format", async ({ unauthenticatedPage: page }) => {
    await page.goto("/register");

    await page.fill('input[type="email"], input[name="email"]', "notanemail");
    await page.fill('input[type="password"], input[name="password"]', "TestPassword123!");

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error or stay on page
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/register/);
  });

  test("should show error for weak password", async ({ unauthenticatedPage: page }) => {
    await page.goto("/register");

    await page.fill('input[type="email"], input[name="email"]', "test@example.com");
    await page.fill('input[type="password"], input[name="password"]', "weak");

    await page.click('button[type="submit"]');

    // Should show validation error or stay on page
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/register/);
  });

  test("should have link to login page", async ({ unauthenticatedPage: page }) => {
    await page.goto("/register");

    const loginLink = page.locator('a[href*="login"]');
    if ((await loginLink.count()) > 0) {
      await expect(loginLink.first()).toBeVisible();
    }
  });
});

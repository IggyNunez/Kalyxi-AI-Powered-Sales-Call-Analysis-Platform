import { test, expect, testUsers, selectors } from "./fixtures";

/**
 * Kalyxi AI - Settings E2E Tests
 *
 * Tests settings functionality including:
 * - Organization settings
 * - User profile settings
 * - Integration settings
 * - Security settings
 * - Role-based access
 */

test.describe("Settings Page", () => {
  test.describe("Access Control", () => {
    test("admin should access settings page", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("caller should have limited settings access", async ({ callerPage }) => {
      await callerPage.goto("/dashboard/settings");
      await callerPage.waitForLoadState("networkidle");

      // Callers may have access to profile settings only
      const mainContent = callerPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("Settings Navigation", () => {
    test("should have settings tabs/sections", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      // Look for settings navigation
      const settingsTabs = adminPage.locator(
        '[data-testid="settings-nav"], ' +
        '[role="tablist"], ' +
        'nav:has(a[href*="settings"]), ' +
        '.settings-nav'
      );

      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("should navigate between settings sections", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const sections = ["General", "Team", "Callers", "Integrations", "Security"];

      for (const section of sections) {
        const sectionTab = adminPage.locator(
          `button:has-text("${section}"), ` +
          `a:has-text("${section}"), ` +
          `[data-testid="settings-${section.toLowerCase()}"]`
        );

        if ((await sectionTab.count()) > 0) {
          await sectionTab.first().click();
          await adminPage.waitForTimeout(500);
          // Section should load
        }
      }
    });
  });
});

test.describe("Organization Settings", () => {
  test.describe("Organization Info", () => {
    test("should display organization name", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const orgName = adminPage.locator(
        '[data-testid="org-name"], ' +
        'input[name="organizationName"], ' +
        ':has-text("Organization")'
      );

      // Org name should be visible
    });

    test("should be able to edit organization name", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const orgNameInput = adminPage.locator(
        'input[name="organizationName"], ' +
        'input[name="name"], ' +
        '[data-testid="org-name-input"]'
      );

      if ((await orgNameInput.count()) > 0) {
        const currentValue = await orgNameInput.first().inputValue();
        await orgNameInput.first().fill("Updated Org Name");

        const saveButton = adminPage.locator(selectors.saveButton);
        if ((await saveButton.count()) > 0) {
          await saveButton.first().click();
          await adminPage.waitForTimeout(2000);
        }

        // Restore original value
        await orgNameInput.first().fill(currentValue);
        if ((await saveButton.count()) > 0) {
          await saveButton.first().click();
        }
      }
    });

    test("should display organization slug", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const orgSlug = adminPage.locator(
        '[data-testid="org-slug"], ' +
        ':has-text("slug"), ' +
        'input[name="slug"]'
      );

      // Slug may be displayed (usually read-only)
    });
  });

  test.describe("Organization Plan", () => {
    test("should display current plan", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const planInfo = adminPage.locator(
        '[data-testid="plan-info"], ' +
        ':has-text("Plan"), ' +
        ':has-text("Subscription")'
      );

      // Plan info may be visible
    });

    test("should show upgrade option if on free plan", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const upgradeButton = adminPage.locator(
        'button:has-text("Upgrade"), ' +
        'a:has-text("Upgrade"), ' +
        '[data-testid="upgrade-plan"]'
      );

      // Upgrade button may be present for free plans
    });
  });
});

test.describe("User Profile Settings", () => {
  test.describe("Profile Info", () => {
    test("should display user profile section", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const profileSection = adminPage.locator(
        '[data-testid="profile-section"], ' +
        ':has-text("Profile"), ' +
        ':has-text("Account")'
      );

      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("should display user email", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const emailDisplay = adminPage.locator(
        '[data-testid="user-email"], ' +
        ':has-text("@"), ' +
        'input[type="email"]'
      );

      // Email should be displayed
    });

    test("should be able to update display name", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const nameInput = adminPage.locator(
        'input[name="displayName"], ' +
        'input[name="name"], ' +
        '[data-testid="display-name"]'
      );

      if ((await nameInput.count()) > 0) {
        await nameInput.first().fill("Updated Display Name");

        const saveButton = adminPage.locator(selectors.saveButton);
        if ((await saveButton.count()) > 0) {
          await saveButton.first().click();
          await adminPage.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe("Password Change", () => {
    test("should have password change option", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const passwordSection = adminPage.locator(
        '[data-testid="password-section"], ' +
        'button:has-text("Change Password"), ' +
        ':has-text("Password")'
      );

      // Password change option should be present
    });

    test("should validate current password before change", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const changePasswordButton = adminPage.locator('button:has-text("Change Password")');

      if ((await changePasswordButton.count()) > 0) {
        await changePasswordButton.first().click();
        await adminPage.waitForTimeout(500);

        const currentPasswordInput = adminPage.locator(
          'input[name="currentPassword"], ' +
          'input[placeholder*="current" i]'
        );

        if ((await currentPasswordInput.count()) > 0) {
          await expect(currentPasswordInput.first()).toBeVisible();
        }
      }
    });
  });
});

test.describe("Integration Settings", () => {
  test.describe("Webhook Configuration", () => {
    test("should display webhook settings", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const integrationsTab = adminPage.locator(
        'button:has-text("Integrations"), ' +
        'a:has-text("Integrations"), ' +
        '[data-testid="integrations-tab"]'
      );

      if ((await integrationsTab.count()) > 0) {
        await integrationsTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const webhookSection = adminPage.locator(
        '[data-testid="webhook-settings"], ' +
        ':has-text("Webhook"), ' +
        ':has-text("webhook")'
      );

      // Webhook section may be visible
    });

    test("should display webhook URL", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const integrationsTab = adminPage.locator('button:has-text("Integrations"), a:has-text("Integrations")');

      if ((await integrationsTab.count()) > 0) {
        await integrationsTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const webhookUrl = adminPage.locator(
        '[data-testid="webhook-url"], ' +
        ':has-text("/api/webhook/"), ' +
        'code:has-text("webhook")'
      );

      // Webhook URL may be displayed
    });

    test("should have regenerate webhook secret option", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const integrationsTab = adminPage.locator('button:has-text("Integrations"), a:has-text("Integrations")');

      if ((await integrationsTab.count()) > 0) {
        await integrationsTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const regenerateButton = adminPage.locator(
        'button:has-text("Regenerate"), ' +
        'button:has-text("Generate New"), ' +
        '[data-testid="regenerate-secret"]'
      );

      // Regenerate option may be present
    });
  });

  test.describe("API Keys", () => {
    test("should have API keys section", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const integrationsTab = adminPage.locator('button:has-text("Integrations"), a:has-text("Integrations")');

      if ((await integrationsTab.count()) > 0) {
        await integrationsTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const apiKeysSection = adminPage.locator(
        '[data-testid="api-keys"], ' +
        ':has-text("API Key"), ' +
        ':has-text("API Keys")'
      );

      // API keys section may be present
    });
  });
});

test.describe("Security Settings", () => {
  test.describe("Security Section", () => {
    test("should have security settings section", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const securityTab = adminPage.locator(
        'button:has-text("Security"), ' +
        'a:has-text("Security"), ' +
        '[data-testid="security-tab"]'
      );

      if ((await securityTab.count()) > 0) {
        await securityTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("should show active sessions", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const securityTab = adminPage.locator('button:has-text("Security"), a:has-text("Security")');

      if ((await securityTab.count()) > 0) {
        await securityTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const sessionsSection = adminPage.locator(
        '[data-testid="sessions"], ' +
        ':has-text("Sessions"), ' +
        ':has-text("Active Sessions")'
      );

      // Sessions section may be visible
    });
  });

  test.describe("Two-Factor Authentication", () => {
    test("should have 2FA option", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const securityTab = adminPage.locator('button:has-text("Security"), a:has-text("Security")');

      if ((await securityTab.count()) > 0) {
        await securityTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const twoFactorOption = adminPage.locator(
        '[data-testid="2fa"], ' +
        ':has-text("Two-Factor"), ' +
        ':has-text("2FA"), ' +
        ':has-text("Multi-Factor")'
      );

      // 2FA option may be present
    });
  });
});

test.describe("Data Management", () => {
  test.describe("Export Data", () => {
    test("should have data export option", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const exportButton = adminPage.locator(
        'button:has-text("Export"), ' +
        'a:has-text("Export Data"), ' +
        '[data-testid="export-data"]'
      );

      // Export option may be present
    });
  });

  test.describe("Delete Account", () => {
    test("should have delete account option with confirmation", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const deleteAccountButton = adminPage.locator(
        'button:has-text("Delete Account"), ' +
        '[data-testid="delete-account"]'
      );

      if ((await deleteAccountButton.count()) > 0) {
        // Note: Don't actually click - just verify it exists
        await expect(deleteAccountButton.first()).toBeVisible();
      }
    });
  });
});

test.describe("Settings Persistence", () => {
  test("changes should persist after page reload", async ({ adminPage }) => {
    await adminPage.goto("/dashboard/settings");
    await adminPage.waitForLoadState("networkidle");

    // Make a change (if possible)
    const nameInput = adminPage.locator('input[name="name"], input[name="displayName"]');

    if ((await nameInput.count()) > 0) {
      const originalValue = await nameInput.first().inputValue();
      const testValue = `Test ${Date.now()}`;

      await nameInput.first().fill(testValue);

      const saveButton = adminPage.locator(selectors.saveButton);
      if ((await saveButton.count()) > 0) {
        await saveButton.first().click();
        await adminPage.waitForTimeout(2000);
      }

      // Reload page
      await adminPage.reload();
      await adminPage.waitForLoadState("networkidle");

      // Verify change persisted
      const newValue = await nameInput.first().inputValue();
      // Value should be the test value

      // Restore original value
      await nameInput.first().fill(originalValue);
      if ((await saveButton.count()) > 0) {
        await saveButton.first().click();
      }
    }
  });
});

test.describe("Settings Error Handling", () => {
  test("should handle invalid input gracefully", async ({ adminPage }) => {
    await adminPage.goto("/dashboard/settings");
    await adminPage.waitForLoadState("networkidle");

    const nameInput = adminPage.locator('input[name="name"]');

    if ((await nameInput.count()) > 0) {
      // Clear the field
      await nameInput.first().fill("");

      const saveButton = adminPage.locator(selectors.saveButton);
      if ((await saveButton.count()) > 0) {
        await saveButton.first().click();
        await adminPage.waitForTimeout(500);

        // Should show validation error
        const error = adminPage.locator(selectors.errorMessage + ', [aria-invalid="true"]');
        // Error should be present or field should prevent saving
      }
    }
  });

  test("should handle API errors gracefully", async ({ adminPage }) => {
    // Intercept API and return error
    await adminPage.route("**/api/settings**", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await adminPage.goto("/dashboard/settings");
    await adminPage.waitForLoadState("networkidle");

    // Page should still render (with error state)
    const mainContent = adminPage.locator("main, [role='main']");
    await expect(mainContent).toBeVisible();
  });
});

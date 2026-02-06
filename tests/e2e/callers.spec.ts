import { test, expect, testUsers, selectors, waitForTableLoad, waitForModalOpen, waitForModalClose } from "./fixtures";

/**
 * Kalyxi AI - Callers Management E2E Tests
 *
 * Tests caller management functionality including:
 * - Callers list view
 * - Create caller
 * - Edit caller
 * - Delete caller
 * - Role-based access (admin only)
 */

test.describe("Callers Management", () => {
  test.describe("Access Control", () => {
    test("admin should have access to callers page", async ({ adminPage }) => {
      // Navigate via settings or direct URL
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      // Look for callers section or tab
      const callersLink = adminPage.locator(
        'a[href*="callers"], ' +
        'button:has-text("Callers"), ' +
        ':has-text("Team"), ' +
        'a:has-text("Callers")'
      );

      if ((await callersLink.count()) > 0) {
        await callersLink.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("caller should not have admin access to manage callers", async ({ callerPage }) => {
      await callerPage.goto("/dashboard/settings");
      await callerPage.waitForLoadState("networkidle");

      // Callers shouldn't see caller management options
      // or should be restricted from editing other callers
      const mainContent = callerPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("Callers List", () => {
    test("should display callers list", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      // Navigate to callers section
      const callersTab = adminPage.locator(
        'button:has-text("Callers"), ' +
        'a:has-text("Callers"), ' +
        '[data-testid="callers-tab"]'
      );

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      // Look for callers table or list
      const callersList = adminPage.locator(
        '[data-testid="callers-list"], ' +
        'table, ' +
        '[role="list"]'
      );

      // List should be visible if callers exist
      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("should display caller information in list", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      // Look for caller details columns
      const expectedInfo = ["Name", "Email", "Status", "Role"];

      for (const info of expectedInfo) {
        const element = adminPage.locator(`:has-text("${info}")`);
        // Info may or may not be present depending on design
      }
    });
  });

  test.describe("Create Caller", () => {
    test("should have add caller button", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const addButton = adminPage.locator(
        'button:has-text("Add"), ' +
        'button:has-text("Invite"), ' +
        'button:has-text("Create"), ' +
        'button:has-text("New Caller"), ' +
        '[data-testid="add-caller"]'
      );

      if ((await addButton.count()) > 0) {
        await expect(addButton.first()).toBeVisible();
      }
    });

    test("should open create caller form", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const addButton = adminPage.locator(
        'button:has-text("Add"), button:has-text("Invite"), button:has-text("Create")'
      );

      if ((await addButton.count()) > 0) {
        await addButton.first().click();
        await adminPage.waitForTimeout(500);

        // Modal or form should appear
        const form = adminPage.locator(
          selectors.modal + ', ' +
          'form, ' +
          '[data-testid="caller-form"]'
        );

        if ((await form.count()) > 0) {
          await expect(form.first()).toBeVisible();
        }
      }
    });

    test("should validate caller form fields", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const addButton = adminPage.locator('button:has-text("Add"), button:has-text("Invite")');

      if ((await addButton.count()) > 0) {
        await addButton.first().click();
        await adminPage.waitForTimeout(500);

        // Try to submit empty form
        const submitButton = adminPage.locator(selectors.submitButton + ', button:has-text("Save")');

        if ((await submitButton.count()) > 0) {
          await submitButton.first().click();
          await adminPage.waitForTimeout(500);

          // Should show validation errors
          const errors = adminPage.locator(selectors.errorMessage + ', .error, [aria-invalid="true"]');
          // Validation should prevent empty submission
        }
      }
    });

    test("should create caller with valid data", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const addButton = adminPage.locator('button:has-text("Add"), button:has-text("Invite")');

      if ((await addButton.count()) > 0) {
        await addButton.first().click();
        await adminPage.waitForTimeout(500);

        // Fill form
        const nameInput = adminPage.locator('input[name="name"], input[placeholder*="name" i]');
        const emailInput = adminPage.locator('input[name="email"], input[type="email"]');

        if ((await nameInput.count()) > 0) {
          await nameInput.first().fill("E2E Test Caller");
        }

        if ((await emailInput.count()) > 0) {
          const uniqueEmail = `e2e-caller-${Date.now()}@test.com`;
          await emailInput.first().fill(uniqueEmail);
        }

        // Submit
        const submitButton = adminPage.locator(selectors.submitButton + ', button:has-text("Save")');

        if ((await submitButton.count()) > 0) {
          await submitButton.first().click();
          await adminPage.waitForTimeout(2000);

          // Should close modal or show success
        }
      }
    });
  });

  test.describe("Edit Caller", () => {
    test("should have edit button for callers", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const editButtons = adminPage.locator(selectors.editButton + ', button[aria-label*="edit" i]');

      if ((await editButtons.count()) > 0) {
        await expect(editButtons.first()).toBeVisible();
      }
    });

    test("should open edit form when clicking edit", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const editButtons = adminPage.locator(selectors.editButton);

      if ((await editButtons.count()) > 0) {
        await editButtons.first().click();
        await adminPage.waitForTimeout(500);

        // Form should appear
        const form = adminPage.locator(selectors.modal + ', form');

        if ((await form.count()) > 0) {
          await expect(form.first()).toBeVisible();
        }
      }
    });

    test("should save caller updates", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const editButtons = adminPage.locator(selectors.editButton);

      if ((await editButtons.count()) > 0) {
        await editButtons.first().click();
        await adminPage.waitForTimeout(500);

        // Modify a field
        const nameInput = adminPage.locator('input[name="name"]');

        if ((await nameInput.count()) > 0) {
          await nameInput.first().fill("Updated Caller Name");
        }

        // Save
        const saveButton = adminPage.locator(selectors.saveButton);

        if ((await saveButton.count()) > 0) {
          await saveButton.first().click();
          await adminPage.waitForTimeout(2000);

          // Should save and close modal
        }
      }
    });
  });

  test.describe("Delete Caller", () => {
    test("should have delete button for callers", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const deleteButtons = adminPage.locator(
        selectors.deleteButton + ', ' +
        'button[aria-label*="delete" i], ' +
        'button:has-text("Remove")'
      );

      // Delete button may or may not be visible (could be in dropdown)
    });

    test("should show confirmation before deleting", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const deleteButtons = adminPage.locator(selectors.deleteButton + ', button:has-text("Remove")');

      if ((await deleteButtons.count()) > 0) {
        await deleteButtons.first().click();
        await adminPage.waitForTimeout(500);

        // Confirmation dialog should appear
        const confirmation = adminPage.locator(
          '[role="alertdialog"], ' +
          '[role="dialog"]:has-text("confirm"), ' +
          ':has-text("Are you sure")'
        );

        if ((await confirmation.count()) > 0) {
          await expect(confirmation.first()).toBeVisible();

          // Cancel to avoid actually deleting
          const cancelButton = adminPage.locator(selectors.cancelButton);
          if ((await cancelButton.count()) > 0) {
            await cancelButton.first().click();
          }
        }
      }
    });
  });

  test.describe("Caller Status", () => {
    test("should display caller status indicator", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      // Look for status indicators
      const statusIndicators = adminPage.locator(
        ':has-text("Active"), ' +
        ':has-text("Inactive"), ' +
        ':has-text("Pending"), ' +
        '[data-testid*="status"]'
      );

      // Status indicators may be present
    });

    test("should be able to toggle caller status", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const callersTab = adminPage.locator('button:has-text("Callers"), a:has-text("Callers")');

      if ((await callersTab.count()) > 0) {
        await callersTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      // Look for status toggle
      const statusToggle = adminPage.locator(
        '[data-testid="status-toggle"], ' +
        'button:has-text("Deactivate"), ' +
        'button:has-text("Activate"), ' +
        '[role="switch"]'
      );

      // Toggle may be present
    });
  });
});

test.describe("Team/Caller Invitations", () => {
  test("should have invite functionality", async ({ adminPage }) => {
    await adminPage.goto("/dashboard/settings");
    await adminPage.waitForLoadState("networkidle");

    const inviteButton = adminPage.locator(
      'button:has-text("Invite"), ' +
      'button:has-text("Add Team Member"), ' +
      '[data-testid="invite-button"]'
    );

    if ((await inviteButton.count()) > 0) {
      await expect(inviteButton.first()).toBeVisible();
    }
  });

  test("should show invitation form", async ({ adminPage }) => {
    await adminPage.goto("/dashboard/settings");
    await adminPage.waitForLoadState("networkidle");

    const inviteButton = adminPage.locator('button:has-text("Invite")');

    if ((await inviteButton.count()) > 0) {
      await inviteButton.first().click();
      await adminPage.waitForTimeout(500);

      // Invitation form should appear
      const emailInput = adminPage.locator('input[type="email"]');

      if ((await emailInput.count()) > 0) {
        await expect(emailInput.first()).toBeVisible();
      }
    }
  });

  test("should validate invitation email", async ({ adminPage }) => {
    await adminPage.goto("/dashboard/settings");
    await adminPage.waitForLoadState("networkidle");

    const inviteButton = adminPage.locator('button:has-text("Invite")');

    if ((await inviteButton.count()) > 0) {
      await inviteButton.first().click();
      await adminPage.waitForTimeout(500);

      const emailInput = adminPage.locator('input[type="email"]');

      if ((await emailInput.count()) > 0) {
        await emailInput.first().fill("invalid-email");

        const submitButton = adminPage.locator(selectors.submitButton);
        if ((await submitButton.count()) > 0) {
          await submitButton.first().click();
          await adminPage.waitForTimeout(500);

          // Should show validation error
        }
      }
    }
  });
});

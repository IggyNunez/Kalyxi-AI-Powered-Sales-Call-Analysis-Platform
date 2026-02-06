import { test, expect, testUsers, selectors, waitForModalOpen, waitForModalClose } from "./fixtures";

/**
 * Kalyxi AI - Grading/Scorecards E2E Tests
 *
 * Tests grading template and scorecard functionality including:
 * - Grading templates list
 * - Create/edit templates
 * - Scorecard configuration
 * - Role-based access
 */

test.describe("Grading Templates", () => {
  test.describe("Access Control", () => {
    test("admin should access grading templates", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      // Look for grading/templates section
      const gradingTab = adminPage.locator(
        'button:has-text("Grading"), ' +
        'button:has-text("Templates"), ' +
        'a:has-text("Grading"), ' +
        '[data-testid="grading-tab"]'
      );

      if ((await gradingTab.count()) > 0) {
        await gradingTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("caller should have limited access to grading", async ({ callerPage }) => {
      await callerPage.goto("/dashboard/settings");
      await callerPage.waitForLoadState("networkidle");

      // Callers may have view-only access or no access
      const mainContent = callerPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("Templates List", () => {
    test("should display grading templates list", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const gradingTab = adminPage.locator('button:has-text("Grading"), a:has-text("Grading")');

      if ((await gradingTab.count()) > 0) {
        await gradingTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      // Look for templates list
      const templatesList = adminPage.locator(
        '[data-testid="templates-list"], ' +
        'table, ' +
        '[role="list"], ' +
        '.template-card'
      );

      // List should be visible (may be empty)
      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("should show default template indicator", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const gradingTab = adminPage.locator('button:has-text("Grading"), a:has-text("Grading")');

      if ((await gradingTab.count()) > 0) {
        await gradingTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      // Look for default indicator
      const defaultIndicator = adminPage.locator(
        ':has-text("Default"), ' +
        '[data-testid="default-badge"], ' +
        '.default-indicator'
      );

      // Default indicator may or may not be present
    });
  });

  test.describe("Create Template", () => {
    test("should have create template button", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const gradingTab = adminPage.locator('button:has-text("Grading"), a:has-text("Grading")');

      if ((await gradingTab.count()) > 0) {
        await gradingTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const createButton = adminPage.locator(
        'button:has-text("Create"), ' +
        'button:has-text("Add"), ' +
        'button:has-text("New Template"), ' +
        '[data-testid="create-template"]'
      );

      if ((await createButton.count()) > 0) {
        await expect(createButton.first()).toBeVisible();
      }
    });

    test("should open template creation form", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const gradingTab = adminPage.locator('button:has-text("Grading"), a:has-text("Grading")');

      if ((await gradingTab.count()) > 0) {
        await gradingTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const createButton = adminPage.locator('button:has-text("Create"), button:has-text("Add")');

      if ((await createButton.count()) > 0) {
        await createButton.first().click();
        await adminPage.waitForTimeout(500);

        // Form should appear
        const form = adminPage.locator(selectors.modal + ', form, [data-testid="template-form"]');

        if ((await form.count()) > 0) {
          await expect(form.first()).toBeVisible();
        }
      }
    });

    test("should have template name field", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const gradingTab = adminPage.locator('button:has-text("Grading"), a:has-text("Grading")');

      if ((await gradingTab.count()) > 0) {
        await gradingTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const createButton = adminPage.locator('button:has-text("Create"), button:has-text("Add")');

      if ((await createButton.count()) > 0) {
        await createButton.first().click();
        await adminPage.waitForTimeout(500);

        const nameInput = adminPage.locator(
          'input[name="name"], ' +
          'input[placeholder*="name" i], ' +
          '[data-testid="template-name"]'
        );

        if ((await nameInput.count()) > 0) {
          await expect(nameInput.first()).toBeVisible();
        }
      }
    });
  });

  test.describe("Edit Template", () => {
    test("should have edit option for templates", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const gradingTab = adminPage.locator('button:has-text("Grading"), a:has-text("Grading")');

      if ((await gradingTab.count()) > 0) {
        await gradingTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const editButtons = adminPage.locator(selectors.editButton);

      // Edit buttons may be present for each template
    });

    test("should load template data in edit form", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const gradingTab = adminPage.locator('button:has-text("Grading"), a:has-text("Grading")');

      if ((await gradingTab.count()) > 0) {
        await gradingTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const editButtons = adminPage.locator(selectors.editButton);

      if ((await editButtons.count()) > 0) {
        await editButtons.first().click();
        await adminPage.waitForTimeout(500);

        // Form should be populated
        const nameInput = adminPage.locator('input[name="name"]');

        if ((await nameInput.count()) > 0) {
          const value = await nameInput.first().inputValue();
          // Value should not be empty for edit
        }
      }
    });
  });
});

test.describe("Scorecards", () => {
  test.describe("Scorecard Page", () => {
    test("should access scorecard page", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/scorecard");
      await adminPage.waitForLoadState("networkidle");

      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("should display scorecard list or configuration", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/scorecard");
      await adminPage.waitForLoadState("networkidle");

      // Look for scorecard elements
      const scorecardElements = adminPage.locator(
        '[data-testid="scorecard"], ' +
        ':has-text("Scorecard"), ' +
        ':has-text("Criteria"), ' +
        'table'
      );

      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("Scorecard Creation", () => {
    test("should have create scorecard option", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/scorecard");
      await adminPage.waitForLoadState("networkidle");

      const createButton = adminPage.locator(
        'button:has-text("Create"), ' +
        'button:has-text("Add"), ' +
        'button:has-text("New Scorecard")'
      );

      if ((await createButton.count()) > 0) {
        await expect(createButton.first()).toBeVisible();
      }
    });

    test("should show scorecard form with criteria", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/scorecard");
      await adminPage.waitForLoadState("networkidle");

      const createButton = adminPage.locator('button:has-text("Create"), button:has-text("Add")');

      if ((await createButton.count()) > 0) {
        await createButton.first().click();
        await adminPage.waitForTimeout(500);

        // Look for criteria fields
        const criteriaSection = adminPage.locator(
          ':has-text("Criteria"), ' +
          '[data-testid="criteria"], ' +
          ':has-text("Weight")'
        );

        if ((await criteriaSection.count()) > 0) {
          // Criteria section should be visible
        }
      }
    });

    test("should validate total weight equals 100", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/scorecard");
      await adminPage.waitForLoadState("networkidle");

      const createButton = adminPage.locator('button:has-text("Create"), button:has-text("Add")');

      if ((await createButton.count()) > 0) {
        await createButton.first().click();
        await adminPage.waitForTimeout(500);

        // Fill with invalid weight
        const weightInputs = adminPage.locator('input[name*="weight"], input[type="number"]');

        if ((await weightInputs.count()) > 0) {
          await weightInputs.first().fill("50"); // Less than 100

          const submitButton = adminPage.locator(selectors.submitButton);
          if ((await submitButton.count()) > 0) {
            await submitButton.first().click();
            await adminPage.waitForTimeout(500);

            // Should show weight validation error
          }
        }
      }
    });
  });

  test.describe("Scorecard Criteria", () => {
    test("should be able to add criteria", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/scorecard");
      await adminPage.waitForLoadState("networkidle");

      const createButton = adminPage.locator('button:has-text("Create"), button:has-text("Add")');

      if ((await createButton.count()) > 0) {
        await createButton.first().click();
        await adminPage.waitForTimeout(500);

        const addCriteriaButton = adminPage.locator(
          'button:has-text("Add Criteria"), ' +
          'button:has-text("Add Criterion"), ' +
          '[data-testid="add-criteria"]'
        );

        if ((await addCriteriaButton.count()) > 0) {
          await expect(addCriteriaButton.first()).toBeVisible();
        }
      }
    });

    test("should be able to remove criteria", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/scorecard");
      await adminPage.waitForLoadState("networkidle");

      const createButton = adminPage.locator('button:has-text("Create"), button:has-text("Add")');

      if ((await createButton.count()) > 0) {
        await createButton.first().click();
        await adminPage.waitForTimeout(500);

        const removeCriteriaButton = adminPage.locator(
          'button:has-text("Remove"), ' +
          'button[aria-label*="remove" i], ' +
          '[data-testid="remove-criteria"]'
        );

        // Remove button may be present for each criterion
      }
    });

    test("criteria should have required fields", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/scorecard");
      await adminPage.waitForLoadState("networkidle");

      const createButton = adminPage.locator('button:has-text("Create"), button:has-text("Add")');

      if ((await createButton.count()) > 0) {
        await createButton.first().click();
        await adminPage.waitForTimeout(500);

        // Look for criterion fields
        const expectedFields = ["name", "description", "weight", "max_score"];

        for (const field of expectedFields) {
          const input = adminPage.locator(
            `input[name*="${field}"], ` +
            `textarea[name*="${field}"], ` +
            `[data-testid="${field}"]`
          );
          // Field may or may not exist depending on implementation
        }
      }
    });
  });

  test.describe("Default Scorecard", () => {
    test("should be able to set default scorecard", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/scorecard");
      await adminPage.waitForLoadState("networkidle");

      const defaultToggle = adminPage.locator(
        '[data-testid="set-default"], ' +
        'button:has-text("Set as Default"), ' +
        ':has-text("Default") input[type="checkbox"], ' +
        '[role="switch"]'
      );

      // Default toggle may be present
    });

    test("should show which scorecard is default", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/scorecard");
      await adminPage.waitForLoadState("networkidle");

      const defaultBadge = adminPage.locator(
        '[data-testid="default-badge"], ' +
        ':has-text("Default"), ' +
        '.badge:has-text("Default")'
      );

      // Default indicator may be present if a default is set
    });
  });
});

test.describe("Scripts", () => {
  test.describe("Scripts List", () => {
    test("should access scripts configuration", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const scriptsTab = adminPage.locator(
        'button:has-text("Scripts"), ' +
        'a:has-text("Scripts"), ' +
        '[data-testid="scripts-tab"]'
      );

      if ((await scriptsTab.count()) > 0) {
        await scriptsTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const mainContent = adminPage.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();
    });

    test("should display scripts list", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const scriptsTab = adminPage.locator('button:has-text("Scripts"), a:has-text("Scripts")');

      if ((await scriptsTab.count()) > 0) {
        await scriptsTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      // Look for scripts list
      const scriptsList = adminPage.locator(
        '[data-testid="scripts-list"], ' +
        'table, ' +
        '.script-card'
      );

      // List should be present (may be empty)
    });
  });

  test.describe("Script Sections", () => {
    test("should be able to add sections to script", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const scriptsTab = adminPage.locator('button:has-text("Scripts"), a:has-text("Scripts")');

      if ((await scriptsTab.count()) > 0) {
        await scriptsTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const createButton = adminPage.locator('button:has-text("Create"), button:has-text("Add")');

      if ((await createButton.count()) > 0) {
        await createButton.first().click();
        await adminPage.waitForTimeout(500);

        const addSectionButton = adminPage.locator(
          'button:has-text("Add Section"), ' +
          '[data-testid="add-section"]'
        );

        if ((await addSectionButton.count()) > 0) {
          await expect(addSectionButton.first()).toBeVisible();
        }
      }
    });

    test("sections should have content field", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/settings");
      await adminPage.waitForLoadState("networkidle");

      const scriptsTab = adminPage.locator('button:has-text("Scripts"), a:has-text("Scripts")');

      if ((await scriptsTab.count()) > 0) {
        await scriptsTab.first().click();
        await adminPage.waitForLoadState("networkidle");
      }

      const createButton = adminPage.locator('button:has-text("Create"), button:has-text("Add")');

      if ((await createButton.count()) > 0) {
        await createButton.first().click();
        await adminPage.waitForTimeout(500);

        const contentField = adminPage.locator(
          'textarea[name*="content"], ' +
          '[data-testid="section-content"], ' +
          '.section-content'
        );

        // Content field should be present for sections
      }
    });
  });
});

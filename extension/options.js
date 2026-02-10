/**
 * Kalyxi Chrome Extension - Options Script
 */

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("settings-form");
  const apiTokenInput = document.getElementById("api-token");
  const apiUrlInput = document.getElementById("api-url");
  const toggleTokenBtn = document.getElementById("toggle-token");
  const saveBtn = document.getElementById("save-btn");
  const testBtn = document.getElementById("test-btn");
  const messageEl = document.getElementById("message");

  // Load saved settings
  const settings = await chrome.storage.sync.get(["apiToken", "apiUrl"]);
  if (settings.apiToken) {
    apiTokenInput.value = settings.apiToken;
  }
  if (settings.apiUrl) {
    apiUrlInput.value = settings.apiUrl;
  } else {
    apiUrlInput.value = "https://app.kalyxi.com";
  }

  // Show message
  function showMessage(text, type = "success") {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove("hidden");

    // Scroll to message
    messageEl.scrollIntoView({ behavior: "smooth", block: "center" });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageEl.classList.add("hidden");
    }, 5000);
  }

  // Toggle token visibility
  let tokenVisible = false;
  toggleTokenBtn.addEventListener("click", () => {
    tokenVisible = !tokenVisible;
    apiTokenInput.type = tokenVisible ? "text" : "password";
    toggleTokenBtn.innerHTML = tokenVisible
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>`;
  });

  // Save settings
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const apiToken = apiTokenInput.value.trim();
    const apiUrl = apiUrlInput.value.trim() || "https://app.kalyxi.com";

    if (!apiToken) {
      showMessage("Please enter your API token", "error");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      await chrome.storage.sync.set({
        apiToken,
        apiUrl,
        enabled: true,
      });

      showMessage("Settings saved successfully!");
    } catch (error) {
      showMessage("Failed to save settings", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Settings";
    }
  });

  // Test connection
  testBtn.addEventListener("click", async () => {
    const apiToken = apiTokenInput.value.trim();
    const apiUrl = apiUrlInput.value.trim() || "https://app.kalyxi.com";

    if (!apiToken) {
      showMessage("Please enter your API token first", "error");
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = "Testing...";

    try {
      // Save settings first
      await chrome.storage.sync.set({ apiToken, apiUrl });

      // Test connection via background script
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "TEST_CONNECTION" }, resolve);
      });

      if (result.success) {
        showMessage("Connection successful! Your extension is ready to use.", "success");
      } else {
        showMessage(result.error || "Connection failed", "error");
      }
    } catch (error) {
      showMessage("Failed to test connection", "error");
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = "Test Connection";
    }
  });
});

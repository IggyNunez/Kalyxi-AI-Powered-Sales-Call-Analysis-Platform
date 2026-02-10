/**
 * Kalyxi Chrome Extension - Popup Script
 */

document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const statusTextEl = document.getElementById("status-text");
  const messageEl = document.getElementById("message");
  const enabledToggle = document.getElementById("enabled");
  const meetingCodeInput = document.getElementById("meeting-code");
  const syncBtn = document.getElementById("sync-btn");
  const syncCurrentBtn = document.getElementById("sync-current-btn");
  const optionsLink = document.getElementById("options-link");

  // Load current config
  const config = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_CONFIG" }, resolve);
  });

  // Initialize toggle
  enabledToggle.checked = config.enabled !== false;

  // Update status
  async function updateStatus() {
    if (!config.apiToken) {
      statusEl.className = "status disconnected";
      statusTextEl.textContent = "Not configured - add your API token";
      return;
    }

    statusEl.className = "status";
    statusTextEl.textContent = "Checking connection...";

    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "TEST_CONNECTION" }, resolve);
    });

    if (result.success) {
      statusEl.className = "status connected";
      statusTextEl.textContent = "Connected to Kalyxi";
    } else {
      statusEl.className = "status error";
      statusTextEl.textContent = result.error || "Connection failed";
    }
  }

  // Show message
  function showMessage(text, type = "success") {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove("hidden");
    setTimeout(() => {
      messageEl.classList.add("hidden");
    }, 3000);
  }

  // Extract meeting code from URL
  function extractMeetingCode(url) {
    if (!url) return null;
    const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    return match ? match[1].toLowerCase() : null;
  }

  // Sync a meeting
  async function syncMeeting(meetingCode) {
    if (!meetingCode) {
      showMessage("Please enter a valid meeting code", "error");
      return;
    }

    // Validate format
    const codeRegex = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
    if (!codeRegex.test(meetingCode.toLowerCase())) {
      showMessage("Invalid format. Use: abc-defg-hij", "error");
      return;
    }

    syncBtn.disabled = true;
    syncCurrentBtn.disabled = true;
    syncBtn.textContent = "...";

    try {
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "MANUAL_SYNC", meetingCode: meetingCode.toLowerCase() },
          resolve
        );
      });

      if (result.success) {
        if (result.transcriptsSaved > 0) {
          showMessage(`Synced ${result.transcriptsSaved} transcript(s)!`);
        } else {
          showMessage("No new transcripts found", "success");
        }
      } else {
        showMessage(result.reason || "Sync failed", "error");
      }
    } catch (error) {
      showMessage("Sync failed", "error");
    } finally {
      syncBtn.disabled = false;
      syncCurrentBtn.disabled = false;
      syncBtn.textContent = "Sync";
    }
  }

  // Event listeners
  enabledToggle.addEventListener("change", async () => {
    await chrome.storage.sync.set({ enabled: enabledToggle.checked });
  });

  syncBtn.addEventListener("click", () => {
    const code = meetingCodeInput.value.trim();
    syncMeeting(code);
  });

  meetingCodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      syncMeeting(meetingCodeInput.value.trim());
    }
  });

  syncCurrentBtn.addEventListener("click", async () => {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const code = extractMeetingCode(tab?.url);

    if (code) {
      meetingCodeInput.value = code;
      syncMeeting(code);
    } else {
      showMessage("Not on a Google Meet page", "error");
    }
  });

  optionsLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Initialize
  updateStatus();

  // Try to prefill with current tab's meeting code
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const code = extractMeetingCode(tab?.url);
  if (code) {
    meetingCodeInput.value = code;
  }
});

/**
 * Kalyxi Chrome Extension - Background Service Worker
 *
 * Handles meeting detection and transcript sync requests.
 */

// Default API endpoint (can be configured in options)
const DEFAULT_API_URL = "https://app.kalyxi.com";

/**
 * Get configuration from storage
 */
async function getConfig() {
  const result = await chrome.storage.sync.get(["apiToken", "apiUrl", "enabled"]);
  return {
    apiToken: result.apiToken || "",
    apiUrl: result.apiUrl || DEFAULT_API_URL,
    enabled: result.enabled !== false, // Default to true
  };
}

/**
 * Send transcript sync request to Kalyxi API
 */
async function syncMeeting(meetingCode) {
  const config = await getConfig();

  if (!config.enabled) {
    console.log("[Kalyxi] Extension disabled, skipping sync");
    return { success: false, reason: "disabled" };
  }

  if (!config.apiToken) {
    console.log("[Kalyxi] No API token configured");
    showNotification("Configuration Required", "Please set your API token in the extension options.");
    return { success: false, reason: "no_token" };
  }

  try {
    console.log(`[Kalyxi] Syncing meeting: ${meetingCode}`);

    const response = await fetch(`${config.apiUrl}/api/meet/push-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify({ meetingCode }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      const saved = data.transcriptsSaved || 0;
      if (saved > 0) {
        showNotification(
          "Transcript Synced!",
          `Successfully synced ${saved} transcript(s) from meeting ${meetingCode}`
        );
      } else {
        console.log(`[Kalyxi] No new transcripts found for ${meetingCode}`);
      }
      return { success: true, transcriptsSaved: saved };
    } else {
      console.error("[Kalyxi] Sync failed:", data.message || data.error);
      return { success: false, reason: data.message || "sync_failed" };
    }
  } catch (error) {
    console.error("[Kalyxi] Sync error:", error);
    return { success: false, reason: "network_error" };
  }
}

/**
 * Show a notification to the user
 */
function showNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: title,
    message: message,
    priority: 1,
  });
}

/**
 * Extract meeting code from Google Meet URL
 * Format: https://meet.google.com/xxx-xxxx-xxx
 */
function extractMeetingCode(url) {
  if (!url) return null;
  const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "MEETING_ENDED") {
    const meetingCode = message.meetingCode;
    if (meetingCode) {
      console.log(`[Kalyxi] Meeting ended: ${meetingCode}`);
      syncMeeting(meetingCode).then(sendResponse);
      return true; // Keep channel open for async response
    }
  }

  if (message.type === "MANUAL_SYNC") {
    const meetingCode = message.meetingCode;
    if (meetingCode) {
      syncMeeting(meetingCode).then(sendResponse);
      return true;
    }
  }

  if (message.type === "GET_CONFIG") {
    getConfig().then(sendResponse);
    return true;
  }

  if (message.type === "TEST_CONNECTION") {
    testConnection().then(sendResponse);
    return true;
  }
});

/**
 * Test API connection
 */
async function testConnection() {
  const config = await getConfig();

  if (!config.apiToken) {
    return { success: false, error: "No API token configured" };
  }

  try {
    const response = await fetch(`${config.apiUrl}/api/extension/validate`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
      },
    });

    if (response.status === 401) {
      return { success: false, error: "Invalid or expired API token" };
    }

    if (response.ok) {
      const data = await response.json();
      return { success: data.valid, error: data.error };
    }

    return { success: false, error: `API returned ${response.status}` };
  } catch (error) {
    return { success: false, error: "Network error - check your internet connection" };
  }
}

/**
 * Listen for tab updates to detect meeting ends
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when URL changes
  if (!changeInfo.url) return;

  const config = await getConfig();
  if (!config.enabled) return;

  // Check if navigating away from a Meet call
  const previousUrl = tab.url;
  const newUrl = changeInfo.url;

  const previousCode = extractMeetingCode(previousUrl);
  const newCode = extractMeetingCode(newUrl);

  // If we were in a meeting and now we're not (or in a different meeting)
  if (previousCode && previousCode !== newCode) {
    console.log(`[Kalyxi] Detected navigation away from meeting: ${previousCode}`);
    // The content script will handle the meeting end detection more reliably
  }
});

/**
 * Handle extension installation/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

console.log("[Kalyxi] Background service worker loaded");

/**
 * Kalyxi Chrome Extension - Content Script
 *
 * Runs on Google Meet pages to detect when meetings end.
 */

(function () {
  "use strict";

  // Track meeting state
  let currentMeetingCode = null;
  let isInMeeting = false;
  let meetingDetectionInterval = null;

  /**
   * Extract meeting code from current URL
   */
  function getMeetingCode() {
    const match = window.location.href.match(
      /meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i
    );
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Check if we're in an active meeting
   * Looks for indicators that we're actually in a call, not just on the landing page
   */
  function checkIfInMeeting() {
    // Look for various indicators that we're in a meeting:
    // 1. The "Leave call" button
    const leaveButton = document.querySelector('[aria-label*="Leave"]');
    // 2. The video grid
    const videoGrid = document.querySelector('[data-participant-id]');
    // 3. The meeting controls bar
    const controlsBar = document.querySelector('[data-meeting-code]');
    // 4. Self video preview in call
    const selfVideo = document.querySelector('[data-self-name]');
    // 5. The call timer
    const callTimer = document.querySelector('[data-call-duration]');

    return !!(leaveButton || videoGrid || controlsBar || selfVideo || callTimer);
  }

  /**
   * Notify background script that meeting ended
   */
  function notifyMeetingEnded(meetingCode) {
    console.log(`[Kalyxi] Meeting ended: ${meetingCode}`);
    chrome.runtime.sendMessage(
      {
        type: "MEETING_ENDED",
        meetingCode: meetingCode,
        timestamp: new Date().toISOString(),
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[Kalyxi] Failed to send message:", chrome.runtime.lastError);
        } else if (response) {
          console.log("[Kalyxi] Sync result:", response);
        }
      }
    );
  }

  /**
   * Monitor meeting state
   */
  function monitorMeeting() {
    const meetingCode = getMeetingCode();
    const inMeeting = checkIfInMeeting();

    // Started a new meeting
    if (meetingCode && inMeeting && !isInMeeting) {
      console.log(`[Kalyxi] Joined meeting: ${meetingCode}`);
      currentMeetingCode = meetingCode;
      isInMeeting = true;
    }

    // Left the meeting
    if (isInMeeting && !inMeeting && currentMeetingCode) {
      notifyMeetingEnded(currentMeetingCode);
      currentMeetingCode = null;
      isInMeeting = false;
    }

    // Navigated to a different meeting code (edge case)
    if (meetingCode && meetingCode !== currentMeetingCode && isInMeeting) {
      if (currentMeetingCode) {
        notifyMeetingEnded(currentMeetingCode);
      }
      currentMeetingCode = meetingCode;
    }
  }

  /**
   * Start monitoring
   */
  function startMonitoring() {
    if (meetingDetectionInterval) return;

    // Initial check
    monitorMeeting();

    // Check periodically
    meetingDetectionInterval = setInterval(monitorMeeting, 2000);

    console.log("[Kalyxi] Started monitoring Google Meet");
  }

  /**
   * Stop monitoring
   */
  function stopMonitoring() {
    if (meetingDetectionInterval) {
      clearInterval(meetingDetectionInterval);
      meetingDetectionInterval = null;
    }
  }

  /**
   * Handle page visibility changes
   */
  function handleVisibilityChange() {
    if (document.hidden) {
      // Page hidden - if we were in a meeting, it might have ended
      // We'll check when the page becomes visible again
    } else {
      // Page visible - check meeting state
      monitorMeeting();
    }
  }

  /**
   * Handle navigation/unload
   */
  function handleBeforeUnload() {
    if (isInMeeting && currentMeetingCode) {
      // Try to sync before the page unloads
      notifyMeetingEnded(currentMeetingCode);
    }
  }

  /**
   * Initialize
   */
  function init() {
    // Only run on actual meet URLs
    if (!getMeetingCode()) {
      console.log("[Kalyxi] Not a meeting URL, skipping");
      return;
    }

    // Start monitoring
    startMonitoring();

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Try to catch navigation away
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Listen for popstate (back/forward navigation)
    window.addEventListener("popstate", () => {
      setTimeout(monitorMeeting, 100);
    });

    // Watch for URL changes (SPA navigation)
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        monitorMeeting();
      }
    });
    urlObserver.observe(document, { subtree: true, childList: true });

    console.log("[Kalyxi] Content script initialized");
  }

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

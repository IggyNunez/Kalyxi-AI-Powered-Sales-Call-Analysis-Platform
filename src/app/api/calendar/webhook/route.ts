/**
 * Calendar Webhook API
 *
 * POST /api/calendar/webhook - Handle Google Calendar push notifications
 *
 * Google sends POST requests when calendar events change.
 * Headers include:
 * - X-Goog-Channel-ID: The channel ID we specified when setting up the watch
 * - X-Goog-Resource-ID: The ID of the watched resource
 * - X-Goog-Resource-State: The type of change (sync, exists, not_exists)
 * - X-Goog-Message-Number: The sequence number of the message
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { syncCalendarLink } from "@/lib/google/calendar-sync";

export async function POST(request: Request) {
  try {
    // Extract headers
    const channelId = request.headers.get("X-Goog-Channel-ID");
    const resourceId = request.headers.get("X-Goog-Resource-ID");
    const resourceState = request.headers.get("X-Goog-Resource-State");
    const messageNumber = request.headers.get("X-Goog-Message-Number");

    console.log("[Calendar Webhook] Received notification:", {
      channelId,
      resourceId,
      resourceState,
      messageNumber,
    });

    // Validate required headers
    if (!channelId || !resourceId) {
      console.warn("[Calendar Webhook] Missing required headers");
      return new NextResponse("Missing required headers", { status: 400 });
    }

    // Handle sync state (initial verification)
    if (resourceState === "sync") {
      console.log("[Calendar Webhook] Sync state received, acknowledging");
      return new NextResponse("OK", { status: 200 });
    }

    // For other states (exists, not_exists), trigger a sync
    if (resourceState === "exists" || resourceState === "not_exists") {
      const supabase = createAdminClient();

      // Find the calendar link by webhook channel ID
      const { data: link, error } = await supabase
        .from("google_calendar_links")
        .select("id")
        .eq("webhook_channel_id", channelId)
        .single();

      if (error || !link) {
        console.warn("[Calendar Webhook] No calendar link found for channel:", channelId);
        // Return 200 to prevent Google from retrying
        return new NextResponse("OK", { status: 200 });
      }

      // Trigger async sync (don't await to respond quickly)
      syncCalendarLink(link.id, { windowHours: 24 }).catch((err) => {
        console.error("[Calendar Webhook] Sync failed:", err);
      });

      return new NextResponse("OK", { status: 200 });
    }

    // Unknown state
    console.warn("[Calendar Webhook] Unknown resource state:", resourceState);
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[Calendar Webhook] Error:", error);
    // Return 500 so Google will retry
    return new NextResponse(
      error instanceof Error ? error.message : "Internal error",
      { status: 500 }
    );
  }
}

// Also handle GET for webhook verification (some setups use this)
export async function GET(request: Request) {
  // Return 200 for any GET requests (verification)
  return new NextResponse("Calendar webhook endpoint", { status: 200 });
}

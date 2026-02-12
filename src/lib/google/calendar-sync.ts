/**
 * Calendar Sync Library
 *
 * Handles syncing Google Calendar events to scoring sessions.
 * Creates sessions automatically from calendar events based on filter criteria.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "./tokens";
import {
  listEvents,
  matchesEventFilter,
  extractMeetCode,
  getEventStartTime,
  getEventEndTime,
  type GoogleCalendarEvent,
  type EventFilter,
} from "./calendar-client";

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarLink {
  id: string;
  org_id: string;
  template_id: string;
  google_connection_id: string;
  calendar_id: string;
  calendar_name: string;
  google_account_email: string;
  event_filter: EventFilter | null;
  sync_enabled: boolean;
  auto_create_sessions: boolean;
  default_coach_id: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
  sync_cursor: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarSyncResult {
  linkId: string;
  calendarId: string;
  eventsChecked: number;
  sessionsCreated: number;
  sessionsSkipped: number;
  errors: string[];
  newSessionIds: string[];
}

export interface UserMapping {
  email: string;
  userId: string;
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Sync a single calendar link
 */
export async function syncCalendarLink(
  linkId: string,
  options: {
    windowHours?: number;
    forceFullSync?: boolean;
  } = {}
): Promise<CalendarSyncResult> {
  const { windowHours = 168, forceFullSync = false } = options; // Default 7 days

  const result: CalendarSyncResult = {
    linkId,
    calendarId: "",
    eventsChecked: 0,
    sessionsCreated: 0,
    sessionsSkipped: 0,
    errors: [],
    newSessionIds: [],
  };

  const supabase = createAdminClient();

  try {
    // Fetch the calendar link
    const { data: link, error: linkError } = await supabase
      .from("google_calendar_links")
      .select("*")
      .eq("id", linkId)
      .single();

    if (linkError || !link) {
      throw new Error(`Calendar link not found: ${linkId}`);
    }

    const calendarLink = link as CalendarLink;
    result.calendarId = calendarLink.calendar_id;

    // Check if sync is enabled
    if (!calendarLink.sync_enabled) {
      result.errors.push("Sync is disabled for this calendar link");
      return result;
    }

    // Get access token
    const accessToken = await getValidAccessToken(calendarLink.google_connection_id);

    // Calculate time window
    const now = new Date();
    const timeMin = forceFullSync
      ? new Date(now.getTime() - windowHours * 60 * 60 * 1000)
      : calendarLink.last_sync_at
        ? new Date(calendarLink.last_sync_at)
        : new Date(now.getTime() - windowHours * 60 * 60 * 1000);
    const timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day

    // Fetch events from Google Calendar
    let pageToken: string | undefined;
    const allEvents: GoogleCalendarEvent[] = [];

    do {
      const response = await listEvents(accessToken, calendarLink.calendar_id, {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 100,
        pageToken,
        syncToken: forceFullSync ? undefined : (calendarLink.sync_cursor || undefined),
      });

      if (response.items) {
        allEvents.push(...response.items);
      }
      pageToken = response.nextPageToken;

      // Save sync token for incremental sync
      if (response.nextSyncToken) {
        await supabase
          .from("google_calendar_links")
          .update({ sync_cursor: response.nextSyncToken })
          .eq("id", linkId);
      }
    } while (pageToken);

    result.eventsChecked = allEvents.length;

    // Get event filter
    const eventFilter = calendarLink.event_filter || {};

    // Build user mapping for attendees
    const userMapping = await buildUserMapping(calendarLink.org_id);

    // Process each event
    for (const event of allEvents) {
      try {
        // Check if event matches filter
        if (!matchesEventFilter(event, eventFilter)) {
          result.sessionsSkipped++;
          continue;
        }

        // Check if session already exists for this event
        const { data: existingSession } = await supabase
          .from("sessions")
          .select("id")
          .eq("google_event_id", event.id)
          .eq("template_id", calendarLink.template_id)
          .maybeSingle();

        if (existingSession) {
          result.sessionsSkipped++;
          continue;
        }

        // Only create session if auto_create_sessions is enabled
        if (!calendarLink.auto_create_sessions) {
          result.sessionsSkipped++;
          continue;
        }

        // Create session
        const sessionId = await createSessionFromEvent(
          event,
          calendarLink,
          userMapping
        );

        if (sessionId) {
          result.sessionsCreated++;
          result.newSessionIds.push(sessionId);
        }
      } catch (error) {
        result.errors.push(
          `Event ${event.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Update last sync time
    await supabase
      .from("google_calendar_links")
      .update({
        last_sync_at: now.toISOString(),
        last_sync_error: result.errors.length > 0 ? result.errors.join("; ") : null,
      })
      .eq("id", linkId);

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Unknown error");

    // Update error status
    await supabase
      .from("google_calendar_links")
      .update({
        last_sync_error: result.errors.join("; "),
      })
      .eq("id", linkId);

    return result;
  }
}

/**
 * Sync all calendar links for an organization
 */
export async function syncOrgCalendars(
  orgId: string,
  options: {
    windowHours?: number;
    forceFullSync?: boolean;
  } = {}
): Promise<CalendarSyncResult[]> {
  const supabase = createAdminClient();

  // Get all enabled calendar links for the org
  const { data: links, error } = await supabase
    .from("google_calendar_links")
    .select("id")
    .eq("org_id", orgId)
    .eq("sync_enabled", true);

  if (error || !links) {
    return [];
  }

  // Sync each link
  const results: CalendarSyncResult[] = [];
  for (const link of links) {
    const result = await syncCalendarLink(link.id, options);
    results.push(result);
  }

  return results;
}

/**
 * Sync all enabled calendar links (for cron job)
 */
export async function syncAllCalendars(
  options: {
    windowHours?: number;
    maxLinks?: number;
  } = {}
): Promise<{
  synced: number;
  sessionsCreated: number;
  errors: string[];
}> {
  const { windowHours = 24, maxLinks = 100 } = options;
  const supabase = createAdminClient();

  // Get all enabled calendar links
  const { data: links, error } = await supabase
    .from("google_calendar_links")
    .select("id")
    .eq("sync_enabled", true)
    .limit(maxLinks);

  if (error || !links) {
    return { synced: 0, sessionsCreated: 0, errors: [error?.message || "No links found"] };
  }

  let totalSessionsCreated = 0;
  const allErrors: string[] = [];

  for (const link of links) {
    try {
      const result = await syncCalendarLink(link.id, { windowHours });
      totalSessionsCreated += result.sessionsCreated;
      allErrors.push(...result.errors);
    } catch (error) {
      allErrors.push(`Link ${link.id}: ${error instanceof Error ? error.message : "Unknown"}`);
    }
  }

  return {
    synced: links.length,
    sessionsCreated: totalSessionsCreated,
    errors: allErrors,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build a mapping of email -> userId for an organization
 */
async function buildUserMapping(orgId: string): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const mapping = new Map<string, string>();

  const { data: profiles } = await supabase
    .from("users")
    .select("id, email")
    .eq("org_id", orgId);

  if (profiles) {
    for (const profile of profiles) {
      if (profile.email) {
        mapping.set(profile.email.toLowerCase(), profile.id);
      }
    }
  }

  return mapping;
}

/**
 * Create a session from a calendar event
 */
async function createSessionFromEvent(
  event: GoogleCalendarEvent,
  link: CalendarLink,
  userMapping: Map<string, string>
): Promise<string | null> {
  const supabase = createAdminClient();

  // Determine agent from attendees (non-organizer)
  let agentId: string | null = null;
  if (event.attendees) {
    for (const attendee of event.attendees) {
      if (attendee.email && !attendee.organizer) {
        const userId = userMapping.get(attendee.email.toLowerCase());
        if (userId) {
          agentId = userId;
          break;
        }
      }
    }
  }

  // Use default coach or organizer
  let coachId = link.default_coach_id;
  if (!coachId && event.organizer?.email) {
    coachId = userMapping.get(event.organizer.email.toLowerCase()) || null;
  }

  // Get template snapshot
  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", link.template_id)
    .single();

  if (!template) {
    throw new Error("Template not found");
  }

  // Get groups and criteria for snapshot
  const { data: groups } = await supabase
    .from("criteria_groups")
    .select("*")
    .eq("template_id", link.template_id)
    .order("sort_order");

  const { data: criteria } = await supabase
    .from("criteria")
    .select("*")
    .eq("template_id", link.template_id)
    .order("sort_order");

  // Build template snapshot
  const templateSnapshot = {
    ...template,
    groups: groups || [],
    criteria: criteria || [],
  };

  // Extract Meet code if present
  const meetCode = extractMeetCode(event);

  // Create session
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      org_id: link.org_id,
      template_id: link.template_id,
      template_snapshot: templateSnapshot,
      coach_id: coachId,
      agent_id: agentId,
      status: "pending",
      google_event_id: event.id,
      google_event_title: event.summary || "Untitled Event",
      google_event_start: event.start.dateTime || event.start.date,
      google_event_end: event.end.dateTime || event.end.date,
      google_calendar_link_id: link.id,
      google_meet_code: meetCode,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return session?.id || null;
}

/**
 * Handle a calendar webhook notification
 */
export async function handleCalendarWebhook(
  channelId: string,
  resourceId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Find the calendar link by channel ID
  const { data: link } = await supabase
    .from("google_calendar_links")
    .select("id")
    .eq("webhook_channel_id", channelId)
    .single();

  if (link) {
    // Trigger a sync for this link
    await syncCalendarLink(link.id, { windowHours: 24 });
  }
}

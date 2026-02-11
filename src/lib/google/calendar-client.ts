/**
 * Google Calendar API Client
 *
 * Handles interactions with Google Calendar API for fetching calendars and events.
 */

import "server-only";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

// ============================================================================
// TYPES
// ============================================================================

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: "owner" | "writer" | "reader" | "freeBusyReader";
  primary?: boolean;
}

export interface CalendarListResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  nextSyncToken?: string;
  items?: GoogleCalendar[];
}

export interface GoogleCalendarEvent {
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  htmlLink: string;
  created: string;
  updated: string;
  summary?: string;
  description?: string;
  location?: string;
  creator?: {
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  organizer?: {
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurringEventId?: string;
  originalStartTime?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
  }>;
  hangoutLink?: string;
  conferenceData?: {
    conferenceId?: string;
    conferenceSolution?: {
      key?: { type: string };
      name?: string;
      iconUri?: string;
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri?: string;
      label?: string;
      meetingCode?: string;
    }>;
  };
  iCalUID: string;
  eventType?: "default" | "outOfOffice" | "focusTime" | "workingLocation";
}

export interface EventListResponse {
  kind: string;
  etag: string;
  summary: string;
  description?: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  nextPageToken?: string;
  nextSyncToken?: string;
  items?: GoogleCalendarEvent[];
}

export interface EventFilter {
  keywords?: string[];
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  hasVideoConference?: boolean;
  excludeAllDayEvents?: boolean;
  attendeeEmails?: string[];
}

// ============================================================================
// CLIENT FUNCTIONS
// ============================================================================

/**
 * List all calendars the user has access to
 */
export async function listCalendars(
  accessToken: string
): Promise<GoogleCalendar[]> {
  const url = `${CALENDAR_API_BASE}/users/me/calendarList`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list calendars: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as CalendarListResponse;
  return data.items || [];
}

/**
 * Get a specific calendar by ID
 */
export async function getCalendar(
  accessToken: string,
  calendarId: string
): Promise<GoogleCalendar> {
  const url = `${CALENDAR_API_BASE}/users/me/calendarList/${encodeURIComponent(calendarId)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get calendar: ${response.status} - ${error}`);
  }

  return (await response.json()) as GoogleCalendar;
}

/**
 * List events from a calendar with optional filtering
 */
export async function listEvents(
  accessToken: string,
  calendarId: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    pageToken?: string;
    syncToken?: string;
    singleEvents?: boolean;
    orderBy?: "startTime" | "updated";
    q?: string;
  } = {}
): Promise<EventListResponse> {
  const params = new URLSearchParams();

  if (options.timeMin) params.set("timeMin", options.timeMin);
  if (options.timeMax) params.set("timeMax", options.timeMax);
  if (options.maxResults) params.set("maxResults", options.maxResults.toString());
  if (options.pageToken) params.set("pageToken", options.pageToken);
  if (options.syncToken) params.set("syncToken", options.syncToken);
  if (options.singleEvents !== undefined) {
    params.set("singleEvents", options.singleEvents.toString());
  }
  if (options.orderBy) params.set("orderBy", options.orderBy);
  if (options.q) params.set("q", options.q);

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list events: ${response.status} - ${error}`);
  }

  return (await response.json()) as EventListResponse;
}

/**
 * Get a specific event by ID
 */
export async function getEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<GoogleCalendarEvent> {
  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get event: ${response.status} - ${error}`);
  }

  return (await response.json()) as GoogleCalendarEvent;
}

/**
 * Set up a watch channel for push notifications on a calendar
 */
export async function watchCalendar(
  accessToken: string,
  calendarId: string,
  channelId: string,
  webhookUrl: string,
  expirationTime?: number
): Promise<{
  kind: string;
  id: string;
  resourceId: string;
  resourceUri: string;
  expiration: string;
}> {
  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/watch`;

  const body: Record<string, unknown> = {
    id: channelId,
    type: "web_hook",
    address: webhookUrl,
  };

  if (expirationTime) {
    body.expiration = expirationTime.toString();
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to watch calendar: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Stop a watch channel
 */
export async function stopWatch(
  accessToken: string,
  channelId: string,
  resourceId: string
): Promise<void> {
  const url = `${CALENDAR_API_BASE}/channels/stop`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: channelId,
      resourceId: resourceId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to stop watch: ${response.status} - ${error}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if an event matches the given filter criteria
 */
export function matchesEventFilter(
  event: GoogleCalendarEvent,
  filter: EventFilter
): boolean {
  // Skip cancelled events
  if (event.status === "cancelled") {
    return false;
  }

  // Check all-day events
  if (filter.excludeAllDayEvents && event.start.date && !event.start.dateTime) {
    return false;
  }

  // Check keywords
  if (filter.keywords && filter.keywords.length > 0) {
    const searchText = `${event.summary || ""} ${event.description || ""}`.toLowerCase();
    const hasKeyword = filter.keywords.some((keyword) =>
      searchText.includes(keyword.toLowerCase())
    );
    if (!hasKeyword) {
      return false;
    }
  }

  // Check duration
  if (filter.minDurationMinutes || filter.maxDurationMinutes) {
    const startTime = event.start.dateTime
      ? new Date(event.start.dateTime)
      : null;
    const endTime = event.end.dateTime ? new Date(event.end.dateTime) : null;

    if (startTime && endTime) {
      const durationMinutes =
        (endTime.getTime() - startTime.getTime()) / 1000 / 60;

      if (
        filter.minDurationMinutes &&
        durationMinutes < filter.minDurationMinutes
      ) {
        return false;
      }
      if (
        filter.maxDurationMinutes &&
        durationMinutes > filter.maxDurationMinutes
      ) {
        return false;
      }
    }
  }

  // Check video conference
  if (filter.hasVideoConference) {
    const hasConference = !!(
      event.hangoutLink ||
      event.conferenceData?.entryPoints?.some((ep) =>
        ["video", "more"].includes(ep.entryPointType)
      )
    );
    if (!hasConference) {
      return false;
    }
  }

  // Check attendees
  if (filter.attendeeEmails && filter.attendeeEmails.length > 0) {
    const eventAttendees = event.attendees?.map((a) => a.email?.toLowerCase()) || [];
    const hasAttendee = filter.attendeeEmails.some((email) =>
      eventAttendees.includes(email.toLowerCase())
    );
    if (!hasAttendee) {
      return false;
    }
  }

  return true;
}

/**
 * Extract a Google Meet code from an event
 */
export function extractMeetCode(event: GoogleCalendarEvent): string | null {
  // Try hangoutLink first
  if (event.hangoutLink) {
    const match = event.hangoutLink.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    if (match) {
      return match[1];
    }
  }

  // Try conference data entry points
  if (event.conferenceData?.entryPoints) {
    for (const ep of event.conferenceData.entryPoints) {
      if (ep.meetingCode) {
        return ep.meetingCode;
      }
      if (ep.uri) {
        const match = ep.uri.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
        if (match) {
          return match[1];
        }
      }
    }
  }

  return null;
}

/**
 * Get the start time of an event as a Date
 */
export function getEventStartTime(event: GoogleCalendarEvent): Date {
  if (event.start.dateTime) {
    return new Date(event.start.dateTime);
  }
  // All-day event
  return new Date(event.start.date!);
}

/**
 * Get the end time of an event as a Date
 */
export function getEventEndTime(event: GoogleCalendarEvent): Date {
  if (event.end.dateTime) {
    return new Date(event.end.dateTime);
  }
  // All-day event
  return new Date(event.end.date!);
}

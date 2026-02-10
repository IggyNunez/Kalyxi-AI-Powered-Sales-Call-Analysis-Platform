/**
 * Google Meet REST API Client
 *
 * Server-only client for interacting with the Google Meet REST API v2.
 * Supports both OAuth tokens (user auth) and service account auth.
 *
 * API Reference: https://developers.google.com/meet/api/reference/rest
 */

import "server-only";
import type {
  ConferenceRecord,
  ListConferenceRecordsResponse,
  ListTranscriptEntriesResponse,
  ListTranscriptsResponse,
  Transcript,
  TranscriptEntry,
} from "./types";

const MEET_API_BASE = "https://meet.googleapis.com/v2";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Custom error class for Meet API errors with helpful context
 */
export class MeetAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly suggestion?: string,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = "MeetAPIError";
  }
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an authenticated request to the Meet API with retry logic.
 *
 * @param accessToken - OAuth access token
 * @param endpoint - API endpoint (relative or absolute)
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
async function meetFetch<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${MEET_API_BASE}${endpoint}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "60",
          10
        );
        if (attempt < MAX_RETRIES - 1) {
          await sleep(retryAfter * 1000);
          continue;
        }
        throw new MeetAPIError(
          "Rate limit exceeded",
          429,
          `Please retry after ${retryAfter} seconds.`,
          retryAfter
        );
      }

      // Handle server errors with retry
      if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
        continue;
      }

      // Handle other errors
      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage: string;
        let suggestion: string | undefined;

        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.error?.message || errorBody;
        } catch {
          errorMessage = errorBody || response.statusText;
        }

        switch (response.status) {
          case 400:
            suggestion =
              "Check the request format. Meeting codes should be like 'abc-defg-hij'.";
            break;
          case 401:
            suggestion =
              "Authentication failed. The access token may be expired or invalid.";
            break;
          case 403:
            suggestion =
              "Permission denied. Ensure the user has access to this meeting's data " +
              "and the OAuth scopes are correct.";
            break;
          case 404:
            suggestion =
              "Resource not found. The meeting may not exist or may have expired.";
            break;
          case 500:
          case 502:
          case 503:
            suggestion =
              "Google Meet API is temporarily unavailable. Please try again later.";
            break;
        }

        throw new MeetAPIError(errorMessage, response.status, suggestion);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error as Error;
      if (error instanceof MeetAPIError) {
        throw error;
      }
      if (attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError || new Error("Request failed after max retries");
}

/**
 * List recent conference records within a time window.
 *
 * @param accessToken - OAuth access token
 * @param windowHours - Hours to look back (default: 24)
 * @param pageSize - Results per page (default: 100)
 * @returns Array of conference records
 */
export async function listConferenceRecordsRecent(
  accessToken: string,
  windowHours: number = 24,
  pageSize: number = 100
): Promise<ConferenceRecord[]> {
  const records: ConferenceRecord[] = [];
  let pageToken: string | undefined;

  // Calculate the start time for the filter
  const startTime = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const filter = encodeURIComponent(`end_time>="${startTime.toISOString()}"`);

  do {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      filter,
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await meetFetch<ListConferenceRecordsResponse>(
      accessToken,
      `/conferenceRecords?${params.toString()}`
    );

    if (response.conferenceRecords) {
      records.push(...response.conferenceRecords);
    }

    pageToken = response.nextPageToken;
  } while (pageToken);

  return records;
}

/**
 * List conference records for a specific meeting code.
 *
 * @param accessToken - OAuth access token
 * @param meetingCode - The meeting code (e.g., "abc-defg-hij")
 * @returns Array of conference records
 */
export async function listConferenceRecordsByMeetingCode(
  accessToken: string,
  meetingCode: string
): Promise<ConferenceRecord[]> {
  // Normalize meeting code: remove spaces, ensure lowercase
  const normalizedCode = meetingCode.trim().toLowerCase();

  // Validate meeting code format (xxx-xxxx-xxx)
  const meetingCodeRegex = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
  if (!meetingCodeRegex.test(normalizedCode)) {
    throw new MeetAPIError(
      `Invalid meeting code format: "${meetingCode}"`,
      400,
      'Meeting code should be in format "abc-defg-hij" (3 letters, dash, 4 letters, dash, 3 letters).'
    );
  }

  // Use filter to find conference records by meeting code
  const filter = encodeURIComponent(
    `space.meeting_code="${normalizedCode}"`
  );

  const response = await meetFetch<ListConferenceRecordsResponse>(
    accessToken,
    `/conferenceRecords?filter=${filter}`
  );

  return response.conferenceRecords || [];
}

/**
 * List all transcripts for a conference record.
 *
 * @param accessToken - OAuth access token
 * @param conferenceRecordName - The full resource name (e.g., "conferenceRecords/abc123")
 * @returns Array of transcripts
 */
export async function listTranscripts(
  accessToken: string,
  conferenceRecordName: string
): Promise<Transcript[]> {
  // Ensure proper format
  const name = conferenceRecordName.startsWith("conferenceRecords/")
    ? conferenceRecordName
    : `conferenceRecords/${conferenceRecordName}`;

  const response = await meetFetch<ListTranscriptsResponse>(
    accessToken,
    `/${name}/transcripts`
  );

  return response.transcripts || [];
}

/**
 * List all entries for a transcript with automatic pagination.
 *
 * @param accessToken - OAuth access token
 * @param transcriptName - The full resource name
 * @param maxEntries - Maximum number of entries to fetch (default: 10000)
 * @returns Array of transcript entries
 */
export async function listTranscriptEntries(
  accessToken: string,
  transcriptName: string,
  maxEntries: number = 10000
): Promise<TranscriptEntry[]> {
  const entries: TranscriptEntry[] = [];
  let pageToken: string | undefined;

  // Ensure proper format
  const name = transcriptName.startsWith("conferenceRecords/")
    ? transcriptName
    : `conferenceRecords/${transcriptName}`;

  do {
    const params = new URLSearchParams({
      pageSize: "1000", // Maximum allowed page size
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await meetFetch<ListTranscriptEntriesResponse>(
      accessToken,
      `/${name}/entries?${params.toString()}`
    );

    if (response.transcriptEntries) {
      entries.push(...response.transcriptEntries);
    }

    pageToken = response.nextPageToken;

    // Safety check to prevent infinite loops
    if (entries.length >= maxEntries) {
      break;
    }
  } while (pageToken);

  return entries;
}

/**
 * Get a single transcript by name.
 *
 * @param accessToken - OAuth access token
 * @param transcriptName - The full resource name
 * @returns Transcript object
 */
export async function getTranscript(
  accessToken: string,
  transcriptName: string
): Promise<Transcript> {
  const name = transcriptName.startsWith("conferenceRecords/")
    ? transcriptName
    : `conferenceRecords/${transcriptName}`;

  return meetFetch<Transcript>(accessToken, `/${name}`);
}

/**
 * Get a single conference record by name.
 *
 * @param accessToken - OAuth access token
 * @param conferenceRecordName - The full resource name
 * @returns ConferenceRecord object
 */
export async function getConferenceRecord(
  accessToken: string,
  conferenceRecordName: string
): Promise<ConferenceRecord> {
  const name = conferenceRecordName.startsWith("conferenceRecords/")
    ? conferenceRecordName
    : `conferenceRecords/${conferenceRecordName}`;

  return meetFetch<ConferenceRecord>(accessToken, `/${name}`);
}

/**
 * Find the best available transcript for a conference record.
 *
 * Prioritizes transcripts with state FILE_GENERATED, which means
 * the Google Docs transcript is available.
 *
 * @param accessToken - OAuth access token
 * @param conferenceRecordName - The conference record name
 * @returns Object with best transcript and status info
 */
export async function findBestTranscriptForConference(
  accessToken: string,
  conferenceRecordName: string
): Promise<{
  transcript: Transcript | null;
  allTranscripts: Transcript[];
  status: "ready" | "processing" | "no_transcripts";
  message: string;
}> {
  // Get transcripts for this conference record
  const transcripts = await listTranscripts(accessToken, conferenceRecordName);

  if (transcripts.length === 0) {
    return {
      transcript: null,
      allTranscripts: [],
      status: "no_transcripts",
      message:
        "No transcripts found. Transcription may not have been enabled.",
    };
  }

  // Find a transcript with FILE_GENERATED state (best quality)
  const readyTranscript = transcripts.find(
    (t) => t.state === "FILE_GENERATED"
  );

  if (readyTranscript) {
    return {
      transcript: readyTranscript,
      allTranscripts: transcripts,
      status: "ready",
      message: "Transcript ready with Google Docs export available.",
    };
  }

  // Check if any transcript is still processing
  const processingTranscript = transcripts.find(
    (t) => t.state === "STARTED" || t.state === "ENDED"
  );

  if (processingTranscript) {
    return {
      transcript: processingTranscript,
      allTranscripts: transcripts,
      status: "processing",
      message: "Transcript is still being processed.",
    };
  }

  // Return the first available transcript
  return {
    transcript: transcripts[0],
    allTranscripts: transcripts,
    status: "processing",
    message: `Transcript state: ${transcripts[0].state}`,
  };
}

/**
 * Find the best transcript for a meeting code.
 * This is a convenience function that combines conference record lookup and transcript search.
 *
 * @param accessToken - OAuth access token
 * @param meetingCode - The meeting code
 * @returns Object with conference record and best transcript, or status info
 */
export async function findBestTranscript(
  accessToken: string,
  meetingCode: string
): Promise<{
  conferenceRecord: ConferenceRecord | null;
  transcript: Transcript | null;
  allTranscripts: Transcript[];
  status: "ready" | "processing" | "not_found" | "no_transcripts";
  message: string;
}> {
  // Get conference records for this meeting code
  const conferenceRecords = await listConferenceRecordsByMeetingCode(
    accessToken,
    meetingCode
  );

  if (conferenceRecords.length === 0) {
    return {
      conferenceRecord: null,
      transcript: null,
      allTranscripts: [],
      status: "not_found",
      message: `No conference records found for meeting code "${meetingCode}".`,
    };
  }

  // Use the most recent conference record
  const latestConferenceRecord =
    conferenceRecords[conferenceRecords.length - 1];

  // Find best transcript
  const result = await findBestTranscriptForConference(
    accessToken,
    latestConferenceRecord.name
  );

  return {
    conferenceRecord: latestConferenceRecord,
    transcript: result.transcript,
    allTranscripts: result.allTranscripts,
    status: result.status,
    message: result.message,
  };
}

/**
 * Convert transcript entries to plain text format.
 *
 * @param entries - Array of transcript entries
 * @returns Formatted transcript text with speaker labels and timestamps
 */
export function entriesToPlainText(entries: TranscriptEntry[]): string {
  if (entries.length === 0) {
    return "";
  }

  const lines: string[] = [];

  for (const entry of entries) {
    // Extract participant name from resource name
    const participantId = entry.participant.split("/").pop() || "Unknown";

    // Format timestamp
    const timestamp = formatTimestamp(entry.startTime);

    // Add formatted line
    lines.push(`[${timestamp}] ${participantId}: ${entry.text}`);
  }

  return lines.join("\n");
}

/**
 * Format an ISO timestamp to a readable format (MM:SS or HH:MM:SS)
 */
function formatTimestamp(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");

    if (hours > 0) {
      return `${hours}:${minutes}:${seconds}`;
    }
    return `${minutes}:${seconds}`;
  } catch {
    return "00:00";
  }
}

/**
 * Extract meeting code from a conference record's space.
 */
export function getMeetingCode(conferenceRecord: ConferenceRecord): string | null {
  return conferenceRecord.space?.meetingCode || null;
}

/**
 * Check if a conference record has ended.
 */
export function hasEnded(conferenceRecord: ConferenceRecord): boolean {
  return !!conferenceRecord.endTime;
}

/**
 * Filter conference records to only those that have ended.
 */
export function filterEndedConferences(
  records: ConferenceRecord[]
): ConferenceRecord[] {
  return records.filter(hasEnded);
}

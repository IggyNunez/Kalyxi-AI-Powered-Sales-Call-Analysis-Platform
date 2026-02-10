/**
 * Google Meet REST API Client
 *
 * Server-only client for interacting with the Google Meet REST API v2.
 * Handles conference records, transcripts, and transcript entries.
 *
 * API Reference: https://developers.google.com/meet/api/reference/rest
 */

import "server-only";
import { getGoogleAccessToken } from "./auth";
import type {
  ConferenceRecord,
  ListConferenceRecordsResponse,
  ListTranscriptEntriesResponse,
  ListTranscriptsResponse,
  Transcript,
  TranscriptEntry,
} from "./types";

const MEET_API_BASE = "https://meet.googleapis.com/v2";

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
 * Make an authenticated request to the Meet API
 */
async function meetFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getGoogleAccessToken();

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${MEET_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Handle specific error codes with helpful messages
  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage: string;
    let suggestion: string | undefined;
    let retryAfter: number | undefined;

    try {
      const errorJson = JSON.parse(errorBody);
      errorMessage = errorJson.error?.message || errorBody;
    } catch {
      errorMessage = errorBody || response.statusText;
    }

    switch (response.status) {
      case 400:
        suggestion =
          "Check the meeting code format. It should be like 'abc-defg-hij'.";
        break;
      case 401:
        suggestion =
          "Authentication failed. Verify service account credentials and domain-wide delegation.";
        break;
      case 403:
        suggestion =
          "Permission denied. Ensure the impersonated user has access to this meeting " +
          "and domain-wide delegation is configured with the correct scopes.";
        break;
      case 404:
        suggestion =
          "Meeting or transcript not found. The meeting may not exist or may have expired.";
        break;
      case 429:
        retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
        suggestion = `Rate limit exceeded. Please retry after ${retryAfter} seconds.`;
        break;
      case 500:
      case 502:
      case 503:
        suggestion =
          "Google Meet API is temporarily unavailable. Please try again later.";
        break;
    }

    throw new MeetAPIError(errorMessage, response.status, suggestion, retryAfter);
  }

  return response.json() as Promise<T>;
}

/**
 * List conference records for a specific meeting code.
 *
 * @param meetingCode - The meeting code (e.g., "abc-defg-hij")
 * @returns Array of conference records
 */
export async function listConferenceRecordsByMeetingCode(
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
    `/conferenceRecords?filter=${filter}`
  );

  return response.conferenceRecords || [];
}

/**
 * List all transcripts for a conference record.
 *
 * @param conferenceRecordName - The full resource name (e.g., "conferenceRecords/abc123")
 * @returns Array of transcripts
 */
export async function listTranscripts(
  conferenceRecordName: string
): Promise<Transcript[]> {
  // Ensure proper format
  const name = conferenceRecordName.startsWith("conferenceRecords/")
    ? conferenceRecordName
    : `conferenceRecords/${conferenceRecordName}`;

  const response = await meetFetch<ListTranscriptsResponse>(
    `/${name}/transcripts`
  );

  return response.transcripts || [];
}

/**
 * List all entries for a transcript with automatic pagination.
 *
 * @param transcriptName - The full resource name (e.g., "conferenceRecords/abc123/transcripts/xyz789")
 * @param maxEntries - Maximum number of entries to fetch (default: 10000)
 * @returns Array of transcript entries
 */
export async function listTranscriptEntries(
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
 * @param transcriptName - The full resource name
 * @returns Transcript object
 */
export async function getTranscript(transcriptName: string): Promise<Transcript> {
  const name = transcriptName.startsWith("conferenceRecords/")
    ? transcriptName
    : `conferenceRecords/${transcriptName}`;

  return meetFetch<Transcript>(`/${name}`);
}

/**
 * Get a single conference record by name.
 *
 * @param conferenceRecordName - The full resource name
 * @returns ConferenceRecord object
 */
export async function getConferenceRecord(
  conferenceRecordName: string
): Promise<ConferenceRecord> {
  const name = conferenceRecordName.startsWith("conferenceRecords/")
    ? conferenceRecordName
    : `conferenceRecords/${conferenceRecordName}`;

  return meetFetch<ConferenceRecord>(`/${name}`);
}

/**
 * Find the best available transcript for a meeting.
 *
 * Prioritizes transcripts with state FILE_GENERATED, which means
 * the Google Docs transcript is available.
 *
 * @param meetingCode - The meeting code
 * @returns Object with conference record and best transcript, or status info
 */
export async function findBestTranscript(meetingCode: string): Promise<{
  conferenceRecord: ConferenceRecord | null;
  transcript: Transcript | null;
  allTranscripts: Transcript[];
  status: "ready" | "processing" | "not_found" | "no_transcripts";
  message: string;
}> {
  // Get conference records for this meeting code
  const conferenceRecords =
    await listConferenceRecordsByMeetingCode(meetingCode);

  if (conferenceRecords.length === 0) {
    return {
      conferenceRecord: null,
      transcript: null,
      allTranscripts: [],
      status: "not_found",
      message: `No conference records found for meeting code "${meetingCode}". ` +
        "The meeting may not have occurred yet or the meeting code may be incorrect.",
    };
  }

  // Use the most recent conference record (last in the list)
  // In practice, a meeting code can have multiple conference records if
  // the meeting was held multiple times
  const latestConferenceRecord =
    conferenceRecords[conferenceRecords.length - 1];

  // Get transcripts for this conference record
  const transcripts = await listTranscripts(latestConferenceRecord.name);

  if (transcripts.length === 0) {
    return {
      conferenceRecord: latestConferenceRecord,
      transcript: null,
      allTranscripts: [],
      status: "no_transcripts",
      message:
        "No transcripts found for this meeting. " +
        "Transcription may not have been enabled, or the meeting is still in progress.",
    };
  }

  // Find a transcript with FILE_GENERATED state (best quality)
  const readyTranscript = transcripts.find(
    (t) => t.state === "FILE_GENERATED"
  );

  if (readyTranscript) {
    return {
      conferenceRecord: latestConferenceRecord,
      transcript: readyTranscript,
      allTranscripts: transcripts,
      status: "ready",
      message: "Transcript is ready with Google Docs export available.",
    };
  }

  // Check if any transcript is still processing
  const processingTranscript = transcripts.find(
    (t) => t.state === "STARTED" || t.state === "ENDED"
  );

  if (processingTranscript) {
    return {
      conferenceRecord: latestConferenceRecord,
      transcript: processingTranscript,
      allTranscripts: transcripts,
      status: "processing",
      message:
        "Transcript is still being processed. " +
        "Please try again in a few minutes for the Google Docs version.",
    };
  }

  // Return the first available transcript
  return {
    conferenceRecord: latestConferenceRecord,
    transcript: transcripts[0],
    allTranscripts: transcripts,
    status: "processing",
    message: `Transcript state: ${transcripts[0].state}. Processing may still be in progress.`,
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
    // Format: conferenceRecords/xxx/participants/yyy
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

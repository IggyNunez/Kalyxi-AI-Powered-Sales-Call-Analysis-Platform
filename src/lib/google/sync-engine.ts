/**
 * Transcript Sync Engine
 *
 * Server-only module that handles syncing Google Meet transcripts.
 * Fetches conference records, retrieves transcripts, and stores them.
 */

import "server-only";
import { getValidAccessToken } from "./tokens";
import {
  listConferenceRecordsRecent,
  listConferenceRecordsByMeetingCode,
  findBestTranscriptForConference,
  listTranscriptEntries,
  entriesToPlainText,
  filterEndedConferences,
  getMeetingCode,
  MeetAPIError,
} from "./meet-client";
import { fetchTranscriptAsPlainText, DocsAPIError } from "./docs-client";
import {
  getGoogleConnection,
  transcriptExists,
  saveTranscript,
  updateSyncStatus,
  createSyncLog,
  updateSyncLog,
} from "./storage";
import type {
  GoogleConnection,
  ConferenceRecord,
  SyncResult,
  SyncOptions,
} from "./types";

/**
 * Sync transcripts for a single connection.
 *
 * @param connection - The Google connection
 * @param options - Sync options
 * @returns Sync results
 */
export async function syncConnectionTranscripts(
  connection: GoogleConnection,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const { windowHours = 24, maxConferences = 50, meetingCode } = options;
  const startTime = new Date();

  const result: SyncResult = {
    success: true,
    connectionId: connection.id,
    conferencesChecked: 0,
    transcriptsFetched: 0,
    transcriptsSaved: 0,
    errors: [],
    newTranscripts: [],
  };

  console.log("[SyncEngine] syncConnectionTranscripts for connection:", connection.id, "user:", connection.user_id);

  // Create sync log
  let logId: string;
  try {
    logId = await createSyncLog(
      connection.id,
      connection.user_id,
      meetingCode ? "push" : "manual"
    );
    console.log("[SyncEngine] Sync log created:", logId);
  } catch (logError) {
    console.error("[SyncEngine] Failed to create sync log:", logError);
    throw logError;
  }

  try {
    // Get valid access token (handles refresh if needed)
    const accessToken = await getValidAccessToken(connection.id);

    // Fetch conference records
    let conferenceRecords: ConferenceRecord[];

    if (meetingCode) {
      // Sync specific meeting
      conferenceRecords = await listConferenceRecordsByMeetingCode(
        accessToken,
        meetingCode
      );
    } else {
      // Sync recent meetings
      conferenceRecords = await listConferenceRecordsRecent(
        accessToken,
        windowHours,
        maxConferences
      );
    }

    // Filter to only ended conferences
    const endedConferences = filterEndedConferences(conferenceRecords);
    result.conferencesChecked = endedConferences.length;

    // Process each conference
    for (const conference of endedConferences) {
      try {
        // Check if we already have this transcript
        const exists = await transcriptExists(
          connection.id,
          conference.name
        );

        if (exists && !meetingCode) {
          // Skip if exists (unless this is a push sync for specific meeting)
          continue;
        }

        // Find best transcript
        const transcriptResult = await findBestTranscriptForConference(
          accessToken,
          conference.name
        );

        if (!transcriptResult.transcript) {
          // No transcript available
          continue;
        }

        const transcript = transcriptResult.transcript;
        result.transcriptsFetched++;

        // Fetch transcript content
        let textContent = "";
        let textSource: "docs" | "entries" = "entries";
        let entriesCount = 0;

        // Try Google Docs first if available
        if (
          transcriptResult.status === "ready" &&
          transcript.docsDestination?.document
        ) {
          try {
            const docsResult = await fetchTranscriptAsPlainText(
              accessToken,
              transcript.docsDestination.document
            );
            textContent = docsResult.text;
            textSource = "docs";
            // Estimate entry count from lines
            entriesCount = (textContent.match(/\n/g) || []).length;
          } catch (docsError) {
            // Fallback to entries
            result.errors.push(
              `Docs fetch failed for ${conference.name}: ${docsError instanceof Error ? docsError.message : "Unknown"}`
            );
          }
        }

        // If no docs content, try transcript entries
        if (!textContent) {
          try {
            const entries = await listTranscriptEntries(
              accessToken,
              transcript.name
            );
            textContent = entriesToPlainText(entries);
            textSource = "entries";
            entriesCount = entries.length;
          } catch (entriesError) {
            result.errors.push(
              `Entries fetch failed for ${conference.name}: ${entriesError instanceof Error ? entriesError.message : "Unknown"}`
            );
            continue;
          }
        }

        // Skip if no content
        if (!textContent.trim()) {
          continue;
        }

        // Save transcript
        const meetCode = getMeetingCode(conference) || "unknown";

        await saveTranscript({
          userId: connection.user_id,
          connectionId: connection.id,
          meetingCode: meetCode,
          conferenceRecordName: conference.name,
          transcriptName: transcript.name,
          transcriptState: transcript.state,
          docsDocumentId: transcript.docsDestination?.document,
          textContent,
          textSource,
          entriesCount,
          meetingStartTime: conference.startTime,
          meetingEndTime: conference.endTime,
          meetingSpaceName: conference.space?.name,
        });

        result.transcriptsSaved++;
        result.newTranscripts.push(conference.name);
      } catch (conferenceError) {
        result.errors.push(
          `Conference ${conference.name}: ${conferenceError instanceof Error ? conferenceError.message : "Unknown error"}`
        );
      }
    }

    // Update connection sync status
    await updateSyncStatus(connection.id, null);

    // Update sync log
    await updateSyncLog(
      logId,
      "completed",
      {
        conferencesChecked: result.conferencesChecked,
        transcriptsFetched: result.transcriptsFetched,
        transcriptsSaved: result.transcriptsSaved,
      },
      startTime
    );
  } catch (error) {
    result.success = false;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMessage);

    // Update connection with error
    await updateSyncStatus(connection.id, errorMessage);

    // Update sync log
    await updateSyncLog(
      logId,
      "failed",
      {
        conferencesChecked: result.conferencesChecked,
        transcriptsFetched: result.transcriptsFetched,
        transcriptsSaved: result.transcriptsSaved,
        errorMessage,
      },
      startTime
    );

    // Re-throw specific errors for proper handling
    if (error instanceof MeetAPIError || error instanceof DocsAPIError) {
      throw error;
    }
  }

  return result;
}

/**
 * Sync transcripts for a user (all their connections).
 *
 * @param userId - The user ID
 * @param options - Sync options (can specify connectionId to sync one)
 * @returns Array of sync results
 */
export async function syncUserTranscripts(
  userId: string,
  options: SyncOptions = {}
): Promise<SyncResult[]> {
  console.log("[SyncEngine] syncUserTranscripts called for user:", userId);
  const results: SyncResult[] = [];

  if (options.connectionId) {
    // Sync specific connection
    console.log("[SyncEngine] Syncing specific connection:", options.connectionId);
    const connection = await getGoogleConnection(options.connectionId);

    if (!connection) {
      throw new Error("Connection not found");
    }

    if (connection.user_id !== userId) {
      throw new Error("Connection does not belong to user");
    }

    const result = await syncConnectionTranscripts(connection, options);
    results.push(result);
  } else {
    // Sync all user connections
    console.log("[SyncEngine] Syncing all connections for user");
    const { listUserGoogleConnections } = await import("./storage");
    const connections = await listUserGoogleConnections(userId);
    console.log("[SyncEngine] Found", connections.length, "connections");

    if (connections.length === 0) {
      // No connections to sync - return empty results (not an error)
      return results;
    }

    for (const connPublic of connections) {
      if (!connPublic.is_token_valid) {
        // Skip invalid connections but record it
        results.push({
          success: false,
          connectionId: connPublic.id,
          conferencesChecked: 0,
          transcriptsFetched: 0,
          transcriptsSaved: 0,
          errors: ["Token expired or invalid - please reconnect"],
          newTranscripts: [],
        });
        continue;
      }

      const connection = await getGoogleConnection(connPublic.id);
      if (!connection) continue;

      try {
        const result = await syncConnectionTranscripts(connection, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          connectionId: connection.id,
          conferencesChecked: 0,
          transcriptsFetched: 0,
          transcriptsSaved: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
          newTranscripts: [],
        });
      }
    }
  }

  return results;
}

/**
 * Sync transcripts for a specific meeting code using extension token.
 *
 * @param userId - The user ID (from validated extension token)
 * @param meetingCode - The meeting code to sync
 * @returns Array of sync results (one per connection)
 */
export async function syncMeetingByCode(
  userId: string,
  meetingCode: string
): Promise<SyncResult[]> {
  // Import here to avoid circular dependency
  const { listUserGoogleConnections } = await import("./storage");

  const connections = await listUserGoogleConnections(userId);
  const results: SyncResult[] = [];

  // Try each connection
  for (const connPublic of connections) {
    if (!connPublic.is_token_valid) {
      continue;
    }

    const connection = await getGoogleConnection(connPublic.id);
    if (!connection) continue;

    try {
      const result = await syncConnectionTranscripts(connection, {
        meetingCode,
      });
      results.push(result);

      // If we got transcripts, we can stop
      if (result.transcriptsSaved > 0) {
        break;
      }
    } catch (error) {
      // Continue to next connection
      results.push({
        success: false,
        connectionId: connection.id,
        conferencesChecked: 0,
        transcriptsFetched: 0,
        transcriptsSaved: 0,
        errors: [
          error instanceof Error ? error.message : "Unknown error",
        ],
        newTranscripts: [],
      });
    }
  }

  return results;
}

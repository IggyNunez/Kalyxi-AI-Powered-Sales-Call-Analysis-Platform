/**
 * Google Meet Transcript Integration
 *
 * Server-only exports for Google Meet and Docs API integration.
 *
 * Usage:
 *   import { getGoogleAccessToken, findBestTranscript } from '@/lib/google';
 *
 * All exports are server-only and will cause a build error if imported
 * from client components.
 */

// Re-export authentication utilities
export {
  getGoogleAccessToken,
  getJwtClient,
  clearAuthCache,
  getServiceAccountEmail,
  validateConfiguration,
} from "./auth";

// Re-export Meet API client
export {
  listConferenceRecordsByMeetingCode,
  listTranscripts,
  listTranscriptEntries,
  getTranscript,
  getConferenceRecord,
  findBestTranscript,
  entriesToPlainText,
  MeetAPIError,
} from "./meet-client";

// Re-export Docs API client
export {
  getDocument,
  docToPlainText,
  fetchTranscriptAsPlainText,
  getDocumentMetadata,
  DocsAPIError,
} from "./docs-client";

// Re-export types (these are safe for client-side, but most usage is server-side)
export type {
  GoogleServiceAccountCredentials,
  ConferenceRecord,
  ListConferenceRecordsResponse,
  Transcript,
  TranscriptState,
  ListTranscriptsResponse,
  TranscriptEntry,
  ListTranscriptEntriesResponse,
  GoogleDocsDocument,
  TranscriptAPIResponse,
  TranscriptRequestBody,
} from "./types";

// Re-export optional storage utilities
export {
  saveTranscript,
  getTranscriptByMeetingCode,
  listTranscripts as listStoredTranscripts,
  deleteTranscript,
  searchTranscripts,
  isStorageEnabled,
} from "./storage";

export type { StoredTranscript, SaveTranscriptInput } from "./storage";

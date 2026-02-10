/**
 * Google Meet Transcript Integration
 *
 * Server-only exports for Google Meet OAuth and transcript sync.
 *
 * Usage:
 *   import { buildGoogleAuthUrl, syncMeetingByCode } from '@/lib/google';
 *
 * All exports are server-only and will cause a build error if imported
 * from client components.
 */

// Re-export OAuth utilities
export {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchGoogleUserInfo,
  signState,
  verifySignedState,
  getOAuthConfig,
} from "./oauth";

// Re-export token management
export {
  getValidAccessToken,
  validateConnection,
  isTokenExpired,
} from "./tokens";

// Re-export Meet API client
export {
  listConferenceRecordsRecent,
  listConferenceRecordsByMeetingCode,
  listTranscripts,
  listTranscriptEntries,
  getTranscript,
  getConferenceRecord,
  findBestTranscript,
  findBestTranscriptForConference,
  entriesToPlainText,
  getMeetingCode,
  hasEnded,
  filterEndedConferences,
  MeetAPIError,
} from "./meet-client";

// Re-export Docs API client
export {
  getDocument,
  docToPlainText,
  fetchTranscriptAsPlainText,
  getDocumentMetadata,
  extractDocumentId,
  DocsAPIError,
} from "./docs-client";

// Re-export sync engine
export {
  syncConnectionTranscripts,
  syncUserTranscripts,
  syncMeetingByCode,
} from "./sync-engine";

// Re-export storage utilities
export {
  // Connections
  createOrUpdateGoogleConnection,
  getGoogleConnection,
  getDecryptedRefreshToken,
  listUserGoogleConnections,
  deleteGoogleConnection,
  updateConnectionTokens,
  updateSyncStatus,
  getAllGoogleConnections,
  // Transcripts
  saveTranscript,
  transcriptExists,
  listTranscripts as listStoredTranscripts,
  getTranscriptById,
  deleteTranscript,
  // Extension tokens
  createExtensionToken,
  validateExtensionToken,
  listExtensionTokens,
  revokeExtensionToken,
  // Sync logs
  createSyncLog,
  updateSyncLog,
} from "./storage";

// Re-export crypto utilities
export { encryptToken, decryptToken } from "./crypto";

// Re-export types
export type {
  // OAuth types
  GoogleConnection,
  GoogleConnectionPublic,
  MeetTranscript,
  ExtensionToken,
  ExtensionTokenPublic,
  OAuthStatePayload,
  GoogleTokenResponse,
  GoogleUserInfo,
  CreateConnectionInput,
  SaveTranscriptInput,
  SyncOptions,
  SyncResult,
  // Meet API types
  ConferenceRecord,
  ListConferenceRecordsResponse,
  Transcript,
  TranscriptState,
  ListTranscriptsResponse,
  TranscriptEntry,
  ListTranscriptEntriesResponse,
  // Docs API types
  GoogleDocsDocument,
  StructuralElement,
  Paragraph,
  ParagraphElement,
} from "./types";

// Legacy exports for backwards compatibility
// These use domain-wide delegation (service account auth)
export {
  getGoogleAccessToken,
  getJwtClient,
  clearAuthCache,
  getServiceAccountEmail,
  validateConfiguration,
} from "./auth";

export type { GoogleServiceAccountCredentials } from "./types";

/**
 * Google Authentication Library for Vercel Serverless
 *
 * Handles service account authentication with domain-wide delegation.
 * Designed to work with environment variables (no file system access).
 *
 * Required Environment Variables:
 * - GOOGLE_SERVICE_ACCOUNT_JSON: Complete service account JSON (minified or multiline)
 * - GOOGLE_IMPERSONATE_USER: Email of the Workspace user to impersonate
 */

import { JWT } from "google-auth-library";
import type { GoogleServiceAccountCredentials } from "./types";

// Google API scopes for Meet transcripts
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/drive.meet.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
];

/**
 * Parse and normalize the service account JSON from environment variable.
 *
 * Handles two formats:
 * 1. JSON with literal "\n" in private_key (escaped newlines)
 * 2. JSON with actual newlines in private_key (multiline string)
 *
 * @throws Error if parsing fails or required fields are missing
 */
function parseServiceAccountCredentials(): GoogleServiceAccountCredentials {
  const jsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!jsonString) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable. " +
        "Set this to your complete service account JSON (minified)."
    );
  }

  let credentials: GoogleServiceAccountCredentials;

  try {
    credentials = JSON.parse(jsonString);
  } catch (parseError) {
    // If JSON parsing fails, it might be a multiline string issue
    // Try to fix common issues
    const cleanedJson = jsonString
      .replace(/\n/g, "\\n") // Escape actual newlines
      .replace(/\r/g, ""); // Remove carriage returns

    try {
      credentials = JSON.parse(cleanedJson);
    } catch {
      throw new Error(
        `Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${parseError instanceof Error ? parseError.message : "Invalid JSON"}. ` +
          "Ensure the JSON is properly escaped or minified."
      );
    }
  }

  // Validate required fields
  const requiredFields = [
    "type",
    "project_id",
    "private_key",
    "client_email",
  ] as const;

  for (const field of requiredFields) {
    if (!credentials[field]) {
      throw new Error(
        `Invalid service account JSON: missing required field "${field}".`
      );
    }
  }

  if (credentials.type !== "service_account") {
    throw new Error(
      `Invalid service account JSON: type must be "service_account", got "${credentials.type}".`
    );
  }

  // Normalize the private key: replace literal "\n" with actual newlines
  // This handles the case where the JSON was minified with escaped newlines
  credentials.private_key = normalizePrivateKey(credentials.private_key);

  return credentials;
}

/**
 * Normalize the private key to have proper newlines.
 * Handles keys stored with literal "\n" or with actual newlines.
 */
function normalizePrivateKey(privateKey: string): string {
  // If the key contains literal "\n" (escaped), replace with actual newlines
  if (privateKey.includes("\\n")) {
    return privateKey.replace(/\\n/g, "\n");
  }

  // If the key already has actual newlines, return as-is
  if (privateKey.includes("\n")) {
    return privateKey;
  }

  // If neither, the key might be malformed
  // Try to add newlines at the expected PEM boundary positions
  if (
    privateKey.includes("-----BEGIN PRIVATE KEY-----") &&
    privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    // Basic recovery: add newlines after BEGIN and before END markers
    return privateKey
      .replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
      .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----\n");
  }

  // Return as-is and let JWT handle the error
  return privateKey;
}

/**
 * Get the user email to impersonate for domain-wide delegation.
 *
 * @throws Error if GOOGLE_IMPERSONATE_USER is not set
 */
function getImpersonateUser(): string {
  const user = process.env.GOOGLE_IMPERSONATE_USER;

  if (!user) {
    throw new Error(
      "Missing GOOGLE_IMPERSONATE_USER environment variable. " +
        "Set this to a Google Workspace user email with access to Meet recordings."
    );
  }

  // Basic email validation
  if (!user.includes("@") || !user.includes(".")) {
    throw new Error(
      `Invalid GOOGLE_IMPERSONATE_USER: "${user}" does not appear to be a valid email address.`
    );
  }

  return user;
}

// Cache the JWT client to avoid recreating it on every request
let jwtClient: JWT | null = null;

/**
 * Get a configured JWT client for Google API authentication.
 *
 * Uses service account credentials with domain-wide delegation to
 * impersonate a Workspace user.
 *
 * @returns Configured JWT client
 */
export function getJwtClient(): JWT {
  if (jwtClient) {
    return jwtClient;
  }

  const credentials = parseServiceAccountCredentials();
  const subject = getImpersonateUser();

  jwtClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: GOOGLE_SCOPES,
    subject: subject, // Domain-wide delegation: impersonate this user
  });

  return jwtClient;
}

/**
 * Get a fresh access token for Google API calls.
 *
 * The JWT client handles token refresh automatically, but this method
 * ensures we have a valid token for direct REST API calls.
 *
 * @returns Access token string
 * @throws Error if authentication fails
 */
export async function getGoogleAccessToken(): Promise<string> {
  const client = getJwtClient();

  try {
    const tokenResponse = await client.getAccessToken();

    if (!tokenResponse.token) {
      throw new Error(
        "Failed to obtain access token. " +
          "Verify domain-wide delegation is configured correctly in Google Workspace Admin."
      );
    }

    return tokenResponse.token;
  } catch (error) {
    // Clear cached client on auth failure
    jwtClient = null;

    if (error instanceof Error) {
      // Provide helpful error messages for common issues
      if (error.message.includes("invalid_grant")) {
        throw new Error(
          "Authentication failed: invalid_grant. " +
            "This usually means domain-wide delegation is not configured or the scopes are not authorized. " +
            "Check Google Workspace Admin Console > Security > API Controls > Domain-wide Delegation."
        );
      }

      if (error.message.includes("invalid_client")) {
        throw new Error(
          "Authentication failed: invalid_client. " +
            "Verify the service account credentials are correct and the account exists."
        );
      }

      if (error.message.includes("unauthorized_client")) {
        throw new Error(
          "Authentication failed: unauthorized_client. " +
            "The service account is not authorized for domain-wide delegation, " +
            "or the specified scopes are not authorized in Google Workspace Admin."
        );
      }

      throw new Error(`Google authentication failed: ${error.message}`);
    }

    throw new Error("Google authentication failed: Unknown error");
  }
}

/**
 * Clear the cached JWT client.
 * Useful for testing or when credentials change.
 */
export function clearAuthCache(): void {
  jwtClient = null;
}

/**
 * Get the service account email for debugging purposes.
 * Returns null if credentials are not configured.
 */
export function getServiceAccountEmail(): string | null {
  try {
    const credentials = parseServiceAccountCredentials();
    return credentials.client_email;
  } catch {
    return null;
  }
}

/**
 * Validate the current configuration without making API calls.
 * Returns an object with validation status and any errors.
 */
export function validateConfiguration(): {
  valid: boolean;
  errors: string[];
  serviceAccountEmail?: string;
  impersonateUser?: string;
} {
  const errors: string[] = [];
  let serviceAccountEmail: string | undefined;
  let impersonateUser: string | undefined;

  try {
    const credentials = parseServiceAccountCredentials();
    serviceAccountEmail = credentials.client_email;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Invalid credentials");
  }

  try {
    impersonateUser = getImpersonateUser();
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "Invalid impersonate user"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    serviceAccountEmail,
    impersonateUser,
  };
}

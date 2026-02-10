/**
 * Token Encryption Utilities
 *
 * AES-256-GCM encryption for storing refresh tokens securely in the database.
 * Uses Node.js crypto module (server-only).
 *
 * Environment Variables Required:
 * - TOKEN_ENCRYPTION_KEY: Base64-encoded 32-byte key
 *
 * Key Generation:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Example output: "K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols="
 */

import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import type { EncryptedToken } from "./types";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Get the encryption key from environment variables.
 * @throws Error if key is missing or invalid
 */
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.TOKEN_ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error(
      "Missing TOKEN_ENCRYPTION_KEY environment variable. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }

  const key = Buffer.from(keyBase64, "base64");

  if (key.length !== 32) {
    throw new Error(
      `Invalid TOKEN_ENCRYPTION_KEY: expected 32 bytes, got ${key.length}. ` +
        "Ensure the key is a base64-encoded 32-byte value."
    );
  }

  return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt (e.g., refresh token)
 * @returns Encrypted payload with ciphertext, IV, and auth tag (all base64)
 */
export function encryptToken(plaintext: string): EncryptedToken {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");

  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypt an encrypted token payload.
 *
 * @param payload - The encrypted payload from encryptToken()
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decryptToken(payload: EncryptedToken): string {
  const key = getEncryptionKey();

  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }

  if (tag.length !== TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${TAG_LENGTH}, got ${tag.length}`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  try {
    let plaintext = decipher.update(ciphertext, undefined, "utf8");
    plaintext += decipher.final("utf8");
    return plaintext;
  } catch (error) {
    throw new Error(
      "Token decryption failed. This may indicate: " +
        "1) Wrong encryption key, 2) Corrupted data, or 3) Tampered ciphertext. " +
        `Original error: ${error instanceof Error ? error.message : "Unknown"}`
    );
  }
}

/**
 * Validate that the encryption key is properly configured.
 *
 * @returns Object indicating validity and any errors
 */
export function validateEncryptionConfig(): {
  valid: boolean;
  error?: string;
} {
  try {
    getEncryptionKey();
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Test encryption/decryption with a sample value.
 * Useful for verifying configuration in health checks.
 *
 * @returns True if encryption roundtrip succeeds
 */
export function testEncryption(): boolean {
  try {
    const testValue = "test-encryption-" + Date.now();
    const encrypted = encryptToken(testValue);
    const decrypted = decryptToken(encrypted);
    return decrypted === testValue;
  } catch {
    return false;
  }
}

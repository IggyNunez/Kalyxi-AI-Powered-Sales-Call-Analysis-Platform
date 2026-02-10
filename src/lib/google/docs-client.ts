/**
 * Google Docs REST API Client
 *
 * Server-only client for fetching and parsing Google Docs documents.
 * Used to retrieve the formatted transcript from Google Meet.
 * Supports OAuth tokens for user authentication.
 *
 * API Reference: https://developers.google.com/docs/api/reference/rest
 */

import "server-only";
import type {
  GoogleDocsDocument,
  Paragraph,
  ParagraphElement,
  StructuralElement,
} from "./types";

const DOCS_API_BASE = "https://docs.googleapis.com/v1";

/**
 * Custom error class for Docs API errors
 */
export class DocsAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = "DocsAPIError";
  }
}

/**
 * Make an authenticated request to the Docs API
 *
 * @param accessToken - OAuth access token
 * @param endpoint - API endpoint
 * @param options - Fetch options
 */
async function docsFetch<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${DOCS_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

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
        suggestion = "Check the document ID format.";
        break;
      case 401:
        suggestion =
          "Authentication failed. The access token may be expired or invalid.";
        break;
      case 403:
        suggestion =
          "Permission denied. The user may not have access to this document.";
        break;
      case 404:
        suggestion =
          "Document not found. It may have been deleted or the ID is incorrect.";
        break;
      case 429:
        suggestion = "Rate limit exceeded. Please try again later.";
        break;
    }

    throw new DocsAPIError(errorMessage, response.status, suggestion);
  }

  return response.json() as Promise<T>;
}

/**
 * Extract document ID from various formats:
 * - Raw ID: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
 * - Full URL: "https://docs.google.com/document/d/1BxiMVs.../edit"
 * - Docs destination format: "documents/1BxiMVs..."
 */
export function extractDocumentId(input: string): string {
  // If it's a URL, extract the ID from the path
  if (input.includes("docs.google.com/document/d/")) {
    const match = input.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return match[1];
    }
  }

  // If it starts with "documents/", remove that prefix
  if (input.startsWith("documents/")) {
    return input.replace("documents/", "");
  }

  // Otherwise, assume it's already a raw document ID
  return input;
}

/**
 * Fetch a Google Docs document by its ID.
 *
 * @param accessToken - OAuth access token
 * @param documentId - The document ID (from the docsDestination in transcript)
 * @returns The full document structure
 */
export async function getDocument(
  accessToken: string,
  documentId: string
): Promise<GoogleDocsDocument> {
  const id = extractDocumentId(documentId);
  return docsFetch<GoogleDocsDocument>(accessToken, `/documents/${id}`);
}

/**
 * Convert a Google Docs document to plain text.
 *
 * Extracts all text content from the document body, preserving
 * paragraph structure with newlines.
 *
 * @param document - The Google Docs document
 * @returns Plain text content
 */
export function docToPlainText(document: GoogleDocsDocument): string {
  if (!document.body?.content) {
    return "";
  }

  const textParts: string[] = [];

  for (const element of document.body.content) {
    const text = extractTextFromElement(element);
    if (text) {
      textParts.push(text);
    }
  }

  return textParts.join("");
}

/**
 * Extract text from a structural element (paragraph, table, etc.)
 */
function extractTextFromElement(element: StructuralElement): string {
  if (element.paragraph) {
    return extractTextFromParagraph(element.paragraph);
  }

  if (element.table) {
    // Extract text from table cells
    const tableParts: string[] = [];
    for (const row of element.table.tableRows || []) {
      for (const cell of row.tableCells || []) {
        for (const cellContent of cell.content || []) {
          const text = extractTextFromElement(cellContent);
          if (text) {
            tableParts.push(text);
          }
        }
      }
    }
    return tableParts.join("\t");
  }

  if (element.tableOfContents) {
    // Skip table of contents
    return "";
  }

  return "";
}

/**
 * Extract text from a paragraph element
 */
function extractTextFromParagraph(paragraph: Paragraph): string {
  const textParts: string[] = [];

  for (const element of paragraph.elements || []) {
    const text = extractTextFromParagraphElement(element);
    if (text) {
      textParts.push(text);
    }
  }

  return textParts.join("");
}

/**
 * Extract text from a paragraph element (text run, etc.)
 */
function extractTextFromParagraphElement(element: ParagraphElement): string {
  if (element.textRun) {
    return element.textRun.content || "";
  }

  if (element.person) {
    // Handle @mentions
    return element.person.personProperties?.name || "@mention";
  }

  if (element.richLink) {
    // Handle rich links (like Google Drive links)
    return element.richLink.richLinkProperties?.title || "";
  }

  if (element.inlineObjectElement) {
    // Skip inline objects (images, etc.)
    return "";
  }

  if (element.pageBreak) {
    return "\n\n--- Page Break ---\n\n";
  }

  if (element.horizontalRule) {
    return "\n---\n";
  }

  return "";
}

/**
 * Fetch a transcript document and convert to plain text.
 *
 * This is a convenience function that combines getDocument and docToPlainText.
 *
 * @param accessToken - OAuth access token
 * @param documentId - The document ID or URL
 * @returns Object with document metadata and plain text
 */
export async function fetchTranscriptAsPlainText(
  accessToken: string,
  documentId: string
): Promise<{
  documentId: string;
  title: string;
  text: string;
  revisionId?: string;
}> {
  const document = await getDocument(accessToken, documentId);

  return {
    documentId: document.documentId,
    title: document.title,
    text: docToPlainText(document),
    revisionId: document.revisionId,
  };
}

/**
 * Get basic document metadata without fetching the full content.
 * Useful for checking if a document exists and is accessible.
 *
 * @param accessToken - OAuth access token
 * @param documentId - The document ID
 * @returns Document title and ID
 */
export async function getDocumentMetadata(
  accessToken: string,
  documentId: string
): Promise<{
  documentId: string;
  title: string;
  exists: boolean;
}> {
  try {
    const document = await getDocument(accessToken, documentId);
    return {
      documentId: document.documentId,
      title: document.title,
      exists: true,
    };
  } catch (error) {
    if (error instanceof DocsAPIError && error.statusCode === 404) {
      return {
        documentId: extractDocumentId(documentId),
        title: "",
        exists: false,
      };
    }
    throw error;
  }
}

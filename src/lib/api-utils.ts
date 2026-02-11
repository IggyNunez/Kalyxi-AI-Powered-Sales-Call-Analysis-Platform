import { createClient, createClientWithToken } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { User, UserRole } from "@/types/database";

// Standard API response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// Get current user with org info
export async function getCurrentUser(): Promise<{
  user: User | null;
  orgId: string | null;
  role: UserRole | null;
  error?: string;
}> {
  try {
    // Try Bearer token first (for API/programmatic access)
    let supabase = await createClientWithToken();

    // Fall back to cookie-based auth
    if (!supabase) {
      supabase = await createClient();
    }

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { user: null, orgId: null, role: null };
    }

    // Sanitize userId to remove any potential :1 suffix from Supabase
    const sanitizedUserId = sanitizeUUID(authUser.id);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", sanitizedUserId)
      .maybeSingle();

    if (userError) {
      console.error("Error fetching user profile:", userError);
      return { user: null, orgId: null, role: null, error: userError.message };
    }

    if (!user) {
      // User exists in auth.users but not in public.users - they need to complete registration
      return { user: null, orgId: null, role: null, error: "User profile not found. Please complete registration." };
    }

    return {
      user: user as User,
      orgId: user.org_id,
      role: user.role as UserRole,
    };
  } catch {
    return { user: null, orgId: null, role: null, error: "Failed to get user" };
  }
}

// Require authentication
export async function requireAuth() {
  const { user, orgId, role, error } = await getCurrentUser();

  if (!user || !orgId) {
    // Check if user is authenticated but missing profile
    const isProfileMissing = error?.includes("profile not found");
    return {
      user: null,
      orgId: null,
      role: null,
      response: NextResponse.json(
        {
          error: isProfileMissing ? "Profile Required" : "Unauthorized",
          message: isProfileMissing
            ? "Your user profile is not set up. Please refresh the page to complete setup."
            : "You must be logged in",
          code: isProfileMissing ? "PROFILE_MISSING" : "UNAUTHORIZED",
        },
        { status: isProfileMissing ? 403 : 401 }
      ),
    };
  }

  return { user, orgId, role, response: null };
}

// Require specific roles
export async function requireRole(allowedRoles: UserRole[]) {
  const { user, orgId, role, response } = await requireAuth();

  if (response) return { user: null, orgId: null, role: null, response };

  if (!role || !allowedRoles.includes(role)) {
    return {
      user: null,
      orgId: null,
      role: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user, orgId, role, response: null };
}

// Simple role check (to use after requireAuth)
export function checkRole(
  currentRole: UserRole | null,
  allowedRoles: UserRole[]
): NextResponse | null {
  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// Require admin or superadmin
export async function requireAdmin() {
  return requireRole(["admin", "superadmin"]);
}

// Require superadmin
export async function requireSuperadmin() {
  return requireRole(["superadmin"]);
}

// Re-export rate limiting from dedicated module
// Uses Redis if REDIS_URL is configured, otherwise falls back to in-memory
export {
  checkRateLimit,
  addRateLimitHeaders,
  RATE_LIMITS,
  type RateLimitResult,
} from "@/lib/rate-limiter";

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[<>'"]/g, ""); // Remove potentially dangerous characters
}

// Validate UUID
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Sanitize UUID - removes any suffix like `:1` that might be added by Supabase deduplication
export function sanitizeUUID(uuid: string): string {
  if (!uuid || typeof uuid !== "string") {
    return uuid;
  }
  // Remove any trailing :N suffix (e.g., `:1`, `:2`, etc.)
  return uuid.replace(/:\d+$/, "");
}

// Validate and sanitize UUID, throws if invalid after sanitization
export function validateAndSanitizeUUID(uuid: string, fieldName: string = "id"): string {
  if (!uuid || typeof uuid !== "string") {
    throw new Error(`Invalid ${fieldName}: must be a non-empty string`);
  }

  const sanitized = sanitizeUUID(uuid);

  if (!isValidUUID(sanitized)) {
    throw new Error(`Invalid ${fieldName}: "${uuid}" is not a valid UUID`);
  }

  return sanitized;
}

// Pagination helper
export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export function getPaginationParams(
  searchParams: URLSearchParams,
  defaultPageSize: number = 20,
  maxPageSize: number = 100
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const requestedSize = parseInt(searchParams.get("pageSize") || String(defaultPageSize), 10);
  const pageSize = Math.min(Math.max(1, requestedSize), maxPageSize);
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

// Sorting helper
export interface SortParams {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export function getSortParams(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string = "created_at",
  defaultOrder: "asc" | "desc" = "desc"
): SortParams {
  const sortBy = searchParams.get("sortBy") || defaultField;
  const sortOrder = (searchParams.get("sortOrder") || defaultOrder) as "asc" | "desc";

  return {
    sortBy: allowedFields.includes(sortBy) ? sortBy : defaultField,
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  };
}

// Error response helper
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Success response helper
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ data }, { status });
}

// Audit log helper
export async function createAuditLog(
  orgId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  request?: Request
) {
  try {
    const supabase = await createClient();

    await supabase.from("audit_logs").insert({
      org_id: orgId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: request?.headers.get("x-forwarded-for") || null,
      user_agent: request?.headers.get("user-agent") || null,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

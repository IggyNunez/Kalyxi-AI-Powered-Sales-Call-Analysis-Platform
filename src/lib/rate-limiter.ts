import Redis from "ioredis";

// Redis client singleton
let redisClient: Redis | null = null;
let redisAvailable = false;

// Initialize Redis connection
function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URL not configured. Using in-memory rate limiting.");
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisClient.on("connect", () => {
      redisAvailable = true;
    });

    redisClient.on("error", (err) => {
      console.warn("Redis error, falling back to in-memory:", err.message);
      redisAvailable = false;
    });

    // Attempt connection
    redisClient.connect().catch(() => {
      redisAvailable = false;
    });

    return redisClient;
  } catch {
    console.warn("Failed to initialize Redis. Using in-memory rate limiting.");
    return null;
  }
}

// In-memory fallback store
const memoryStore = new Map<string, { count: number; resetAt: number }>();

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (now > value.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Check rate limit for an identifier.
 * Uses Redis if available, falls back to in-memory.
 *
 * @param identifier - Unique identifier (IP, user ID, API key, etc.)
 * @param limit - Maximum requests allowed in window
 * @param windowMs - Window size in milliseconds
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  const client = getRedisClient();

  if (client && redisAvailable) {
    return checkRateLimitRedis(client, identifier, limit, windowMs);
  }

  return checkRateLimitMemory(identifier, limit, windowMs);
}

/**
 * Redis-based rate limiting using sliding window algorithm
 */
async function checkRateLimitRedis(
  client: Redis,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set for sliding window
    const pipeline = client.multi();

    // Remove entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current entries
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry
    pipeline.pexpire(key, windowMs);

    const results = await pipeline.exec();

    if (!results) {
      // Redis error, fall back to allowing
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs, limit };
    }

    const count = (results[1]?.[1] as number) || 0;
    const allowed = count < limit;
    const remaining = Math.max(0, limit - count - 1);

    return {
      allowed,
      remaining,
      resetAt: now + windowMs,
      limit,
    };
  } catch (error) {
    console.error("Redis rate limit error:", error);
    // On error, fall back to memory
    return checkRateLimitMemory(identifier, limit, windowMs);
  }
}

/**
 * In-memory rate limiting (fallback)
 */
function checkRateLimitMemory(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(identifier);

  if (!record || now > record.resetAt) {
    // Create new window
    memoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs, limit };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt, limit };
  }

  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: record.resetAt,
    limit,
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Auth endpoints - stricter limits
  auth: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  register: { limit: 5, windowMs: 60 * 1000 }, // 5 per minute
  passwordReset: { limit: 3, windowMs: 60 * 1000 }, // 3 per minute

  // API endpoints - standard limits
  api: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute
  apiWrite: { limit: 50, windowMs: 60 * 1000 }, // 50 writes per minute

  // Webhook endpoints - higher limits
  webhook: { limit: 200, windowMs: 60 * 1000 }, // 200 per minute

  // AI analysis - lower limits due to cost
  analysis: { limit: 20, windowMs: 60 * 1000 }, // 20 per minute
} as const;

/**
 * Helper to add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());
}

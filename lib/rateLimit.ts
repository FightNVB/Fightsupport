/**
 * lib/rateLimit.ts
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window per key (userId or IP).
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory store — resets on server restart.
// For multi-instance production deployments, replace with Redis.
const store = new Map<string, RateLimitEntry>();

/** Clean up expired entries to prevent memory leaks. */
function cleanup(windowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > windowMs) {
      store.delete(key);
    }
  }
}

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function maybeCleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    cleanup(windowMs);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms when the window resets
}

/**
 * Check and record a rate limit hit.
 *
 * @param key     Unique key (userId, IP, etc.)
 * @param max     Max requests per window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  maybeCleanup(windowMs);

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: max - 1,
      resetAt: now + windowMs,
    };
  }

  existing.count += 1;
  const allowed = existing.count <= max;
  return {
    allowed,
    remaining: Math.max(0, max - existing.count),
    resetAt: existing.windowStart + windowMs,
  };
}

// ---------------------------------------------------------------------------
// Pre-configured limiters
// ---------------------------------------------------------------------------

/** General API: 100 requests per minute per userId. */
export function checkUserRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`user:${userId}`, 100, 60_000);
}

/** Login attempts: 5 per minute per IP. */
export function checkLoginRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`login:${ip}`, 5, 60_000);
}

/** File uploads: 1 per 5 seconds per userId. */
export function checkUploadRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`upload:${userId}`, 1, 5_000);
}

/**
 * Extract the client IP from a Next.js Request.
 * Checks x-forwarded-for, x-real-ip, then falls back to "unknown".
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

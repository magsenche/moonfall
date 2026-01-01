/**
 * Rate Limiter - Simple in-memory rate limiting for API routes
 * 
 * Uses a sliding window algorithm with configurable limits.
 * Works with Vercel serverless (per-instance limiting).
 * 
 * For production at scale, consider:
 * - Vercel KV (Redis) for distributed limiting
 * - Upstash Rate Limit SDK
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per serverless instance)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (prevent memory leaks)
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (usually IP or IP+endpoint)
 * @param config - Rate limit configuration
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup();
  
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = store.get(key);
  
  // No existing entry or window expired
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, newEntry);
    
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt: newEntry.resetAt,
    };
  }
  
  // Within window
  entry.count++;
  
  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request headers (works with Vercel)
 */
export function getClientIp(request: Request): string {
  // Vercel-specific header
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // Real IP header (some proxies)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback
  return 'unknown';
}

// Preset configurations for common use cases
export const RATE_LIMITS = {
  /** Creating games: 5 per minute */
  createGame: { limit: 5, windowSeconds: 60 },
  
  /** Joining games: 10 per minute */
  joinGame: { limit: 10, windowSeconds: 60 },
  
  /** General API: 60 per minute */
  general: { limit: 60, windowSeconds: 60 },
  
  /** Voting: 30 per minute */
  voting: { limit: 30, windowSeconds: 60 },
  
  /** Chat messages: 20 per minute */
  chat: { limit: 20, windowSeconds: 60 },
} as const;

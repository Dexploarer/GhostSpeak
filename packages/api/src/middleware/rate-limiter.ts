/**
 * Rate Limiter Middleware
 *
 * Free tier: 100 requests per minute per IP
 * Inspired by ZAuth's public API model for network effects
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private requests: Map<string, RateLimitRecord> = new Map();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number = 100, windowMs: number = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;

    // Cleanup expired records every minute
    setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Check if request is allowed
   */
  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const record = this.requests.get(identifier);

    // No record or expired window
    if (!record || now >= record.resetAt) {
      const newRecord: RateLimitRecord = {
        count: 1,
        resetAt: now + this.windowMs,
      };
      this.requests.set(identifier, newRecord);

      return {
        allowed: true,
        remaining: this.limit - 1,
        resetAt: newRecord.resetAt,
      };
    }

    // Within window - check limit
    if (record.count < this.limit) {
      record.count++;
      this.requests.set(identifier, record);

      return {
        allowed: true,
        remaining: this.limit - record.count,
        resetAt: record.resetAt,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Get current usage for identifier
   */
  getUsage(identifier: string): { count: number; limit: number; resetAt: number } | null {
    const record = this.requests.get(identifier);
    if (!record || Date.now() >= record.resetAt) {
      return null;
    }

    return {
      count: record.count,
      limit: this.limit,
      resetAt: record.resetAt,
    };
  }

  /**
   * Cleanup expired records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, record] of this.requests.entries()) {
      if (now >= record.resetAt) {
        this.requests.delete(identifier);
      }
    }
  }

  /**
   * Get rate limit stats
   */
  getStats(): {
    totalTracked: number;
    totalRequests: number;
  } {
    let totalRequests = 0;
    for (const record of this.requests.values()) {
      totalRequests += record.count;
    }

    return {
      totalTracked: this.requests.size,
      totalRequests,
    };
  }
}

/**
 * Extract client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try X-Forwarded-For header (for proxied requests)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Try X-Real-IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection info (Bun-specific)
  // In production, this would be the actual client IP
  return 'unknown';
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString(),
      },
    }
  );
}

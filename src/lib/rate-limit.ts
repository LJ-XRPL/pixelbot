interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const reset = windowStart + this.windowMs;

    let entry = this.store.get(key);

    // If no entry or window has passed, reset
    if (!entry || entry.windowStart < windowStart) {
      entry = { count: 0, windowStart };
      this.store.set(key, entry);
    }

    if (entry.count >= this.maxRequests) {
      return {
        success: false,
        remaining: 0,
        reset,
      };
    }

    entry.count++;
    this.store.set(key, entry);

    return {
      success: true,
      remaining: this.maxRequests - entry.count,
      reset,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.windowStart > this.windowMs * 2) {
        this.store.delete(key);
      }
    }
  }
}

// Create rate limiters for different request types
export const readRateLimiter = new RateLimiter(60 * 1000, 200); // 200 requests per minute for reads
export const writeRateLimiter = new RateLimiter(60 * 1000, 60); // 60 requests per minute for writes

export function getRateLimit(apiKey: string, isWrite: boolean): RateLimitResult {
  const limiter = isWrite ? writeRateLimiter : readRateLimiter;
  return limiter.check(apiKey);
}
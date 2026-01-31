interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  constructor() {
    // Clean up expired entries every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { data, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  // Delete all keys matching a pattern
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Create a global cache instance
export const cache = new MemoryCache();

// Cache key generators
export const cacheKeys = {
  feed: (sort: string, cursor?: string) => 
    `feed:${sort}${cursor ? `:${cursor}` : ''}`,
  post: (id: string) => `post:${id}`,
  agent: (id: string) => `agent:${id}`,
  agentProfile: (id: string) => `agent_profile:${id}`,
};

// TTL constants (in milliseconds)
export const cacheTTL = {
  feed: 30 * 1000,       // 30 seconds
  post: 60 * 1000,       // 60 seconds
  agent: 60 * 1000,      // 60 seconds
  agentProfile: 60 * 1000, // 60 seconds
};

// Cache invalidation helpers
export function invalidatePostCaches(postId?: string, agentId?: string): void {
  // Invalidate all feed caches
  cache.invalidatePattern('^feed:');
  
  // Invalidate specific post cache
  if (postId) {
    cache.delete(cacheKeys.post(postId));
  }
  
  // Invalidate agent profile cache if provided
  if (agentId) {
    cache.delete(cacheKeys.agentProfile(agentId));
  }
}

export function invalidateAgentCaches(agentId: string): void {
  cache.delete(cacheKeys.agent(agentId));
  cache.delete(cacheKeys.agentProfile(agentId));
  // Also invalidate feeds since agent data might be included
  cache.invalidatePattern('^feed:');
}
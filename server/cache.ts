import memoize from "memoizee";

// Cache configuration
const CACHE_TTL = {
  USER: 5 * 60 * 1000, // 5 minutes for user data
  EVENT: 2 * 60 * 1000, // 2 minutes for event data
  MESSAGE: 30 * 1000, // 30 seconds for messages
  SHORT: 10 * 1000, // 10 seconds for frequently changing data
};

// Simple in-memory cache for WebSocket-related data
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttl: number;

  constructor(ttl: number) {
    this.ttl = ttl;
  }

  get(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return cached.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Invalidate entries matching a pattern
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    Array.from(this.cache.keys()).forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }
}

// Cache instances for different data types
export const userCache = new SimpleCache<any>(CACHE_TTL.USER);
export const eventCache = new SimpleCache<any>(CACHE_TTL.EVENT);
export const messageCache = new SimpleCache<any>(CACHE_TTL.MESSAGE);
export const eventMembersCache = new SimpleCache<number[]>(CACHE_TTL.SHORT);

// Memoized functions for expensive operations
export const memoizedGetUserEventIds = memoize(
  async (getUserEventIds: Function, userId: string) => {
    return await getUserEventIds(userId);
  },
  {
    maxAge: CACHE_TTL.SHORT,
    primitive: true,
    normalizer: (args) => args[1], // Only use userId for cache key
  }
);

// Helper to invalidate related caches
export function invalidateUserCaches(userId: string) {
  userCache.delete(userId);
  eventMembersCache.invalidatePattern(`.*_${userId}`);
  memoizedGetUserEventIds.clear();
}

export function invalidateEventCaches(eventId: number) {
  eventCache.delete(eventId.toString());
  messageCache.invalidatePattern(`^${eventId}_.*`);
  eventMembersCache.invalidatePattern(`^${eventId}_.*`);
}

export function invalidateMessageCaches(eventId: number) {
  messageCache.invalidatePattern(`^${eventId}_.*`);
}
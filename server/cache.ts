import { LRUCache } from 'lru-cache';
import memoize from "memoizee";

// Cache configuration
const CACHE_CONFIG = {
  // Maximum number of items in cache
  max: 500,
  // TTL in milliseconds (5 minutes default)
  ttl: 1000 * 60 * 5,
  // Maximum size in bytes (50MB)
  maxSize: 50 * 1024 * 1024,
  // Calculate size of cached items
  sizeCalculation: (value: any): number => {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1000; // Default size if serialization fails
    }
  },
  // Update age on get
  updateAgeOnGet: false,
  // Update age on has
  updateAgeOnHas: false,
};

// Cache TTL configuration
const CACHE_TTL = {
  USER: 15 * 60 * 1000, // 15 minutes for user data
  EVENT: 10 * 60 * 1000, // 10 minutes for event data
  EVENT_LIST: 5 * 60 * 1000, // 5 minutes for event lists
  MESSAGE: 30 * 1000, // 30 seconds for messages
  SHORT: 10 * 1000, // 10 seconds for frequently changing data
  RSVP: 2 * 60 * 1000, // 2 minutes for RSVP data
};

// Create separate LRU caches for different data types with different TTLs
const caches = {
  // Event listings cache - 5 minutes TTL
  eventLists: new LRUCache<string, any>({
    ...CACHE_CONFIG,
    ttl: CACHE_TTL.EVENT_LIST,
    max: 200, // Lower limit for list caches
  }),
  
  // Individual events cache - 10 minutes TTL
  events: new LRUCache<string, any>({
    ...CACHE_CONFIG,
    ttl: CACHE_TTL.EVENT,
  }),
  
  // User profiles cache - 15 minutes TTL
  users: new LRUCache<string, any>({
    ...CACHE_CONFIG,
    ttl: CACHE_TTL.USER,
  }),
  
  // RSVP/attendees cache - 2 minutes TTL
  attendees: new LRUCache<string, any>({
    ...CACHE_CONFIG,
    ttl: CACHE_TTL.RSVP,
  }),
  
  // Messages cache - 30 seconds TTL
  messages: new LRUCache<string, any>({
    ...CACHE_CONFIG,
    ttl: CACHE_TTL.MESSAGE,
    max: 100, // Lower limit for messages
  }),
};

// Cache statistics
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  clears: 0,
};

// Helper to generate cache keys
export const cacheKeys = {
  eventList: (params: {
    startDate?: string;
    endDate?: string;
    category?: string;
    timeFilter?: string;
    timePeriod?: string;
    limit?: number;
    offset?: number;
    timezoneOffset?: number;
    userId?: string;
  }) => {
    const parts = [
      'events:list',
      params.startDate || 'nostart',
      params.endDate || 'noend',
      params.category || 'all',
      params.timeFilter || 'none',
      params.timePeriod || 'none',
      params.limit || '20',
      params.offset || '0',
      params.timezoneOffset || '0',
      params.userId || 'public'
    ];
    return parts.join(':');
  },
  
  homeEvents: (userId: string | undefined, category: string | undefined, timeFilter: string | undefined, limit: number) => {
    return `events:home:${userId || 'public'}:${category || 'all'}:${timeFilter || 'none'}:${limit}`;
  },
  
  event: (id: number, userId?: string) => {
    return `event:${id}:${userId || 'public'}`;
  },
  
  user: (id: string) => {
    return `user:${id}`;
  },
  
  userPublic: (id: string) => {
    return `user:public:${id}`;
  },
  
  eventAttendees: (eventId: number) => {
    return `event:attendees:${eventId}`;
  },
  
  userEvents: (userId: string, type: string, pastOnly?: boolean) => {
    return `user:events:${userId}:${type}:${pastOnly ? 'past' : 'all'}`;
  },
  
  messages: (eventId: number, limit: number, before?: Date) => {
    return `messages:${eventId}:${limit}:${before ? before.toISOString() : 'latest'}`;
  },
};

// Main cache operations
const cache = {
  // Get from cache with logging
  get: <T>(cacheType: keyof typeof caches, key: string): T | undefined => {
    const value = caches[cacheType].get(key);
    if (value !== undefined) {
      cacheStats.hits++;
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache HIT [${cacheType}]: ${key.substring(0, 50)}`);
      }
    } else {
      cacheStats.misses++;
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache MISS [${cacheType}]: ${key.substring(0, 50)}`);
      }
    }
    return value;
  },
  
  // Set in cache with optional TTL override
  set: <T>(cacheType: keyof typeof caches, key: string, value: T, ttl?: number): void => {
    const options = ttl ? { ttl } : undefined;
    caches[cacheType].set(key, value, options);
    cacheStats.sets++;
    if (process.env.NODE_ENV === 'development') {
      console.log(`Cache SET [${cacheType}]: ${key.substring(0, 50)}`);
    }
  },
  
  // Delete from cache
  delete: (cacheType: keyof typeof caches, key: string): boolean => {
    const result = caches[cacheType].delete(key);
    if (result) {
      cacheStats.deletes++;
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache DELETE [${cacheType}]: ${key.substring(0, 50)}`);
      }
    }
    return result;
  },
  
  // Clear specific cache type
  clear: (cacheType: keyof typeof caches): void => {
    caches[cacheType].clear();
    cacheStats.clears++;
    console.log(`Cache CLEAR [${cacheType}]`);
  },
  
  // Clear all caches
  clearAll: (): void => {
    Object.keys(caches).forEach(cacheType => {
      caches[cacheType as keyof typeof caches].clear();
    });
    cacheStats.clears += Object.keys(caches).length;
    console.log('Cache CLEAR ALL');
  },
  
  // Get cache statistics
  getStats: () => {
    const totalSize = Object.keys(caches).reduce((acc, cacheType) => {
      return acc + caches[cacheType as keyof typeof caches].calculatedSize;
    }, 0);
    
    const itemCounts = Object.keys(caches).reduce((acc, cacheType) => {
      acc[cacheType] = caches[cacheType as keyof typeof caches].size;
      return acc;
    }, {} as Record<string, number>);
    
    const hitRate = (cacheStats.hits + cacheStats.misses) > 0 
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) 
      : 0;
    
    return {
      ...cacheStats,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      itemCounts,
      hitRate: (hitRate * 100).toFixed(2) + '%',
    };
  },
  
  // Invalidate related caches when event data changes
  invalidateEvent: (eventId: number): void => {
    // Clear all event list caches as they might contain this event
    caches.eventLists.clear();
    
    // Clear specific event cache entries
    const eventKeysToDelete: string[] = [];
    caches.events.forEach((value, key) => {
      if (key.startsWith(`event:${eventId}:`)) {
        eventKeysToDelete.push(key);
      }
    });
    eventKeysToDelete.forEach(key => caches.events.delete(key));
    
    // Clear attendees cache for this event
    caches.attendees.delete(`event:attendees:${eventId}`);
    
    // Clear messages for this event
    const messageKeysToDelete: string[] = [];
    caches.messages.forEach((value, key) => {
      if (key.startsWith(`messages:${eventId}:`)) {
        messageKeysToDelete.push(key);
      }
    });
    messageKeysToDelete.forEach(key => caches.messages.delete(key));
    
    console.log(`Cache INVALIDATE event:${eventId} (cleared ${eventKeysToDelete.length + messageKeysToDelete.length + 1} entries)`);
  },
  
  // Invalidate user-related caches
  invalidateUser: (userId: string): void => {
    // Clear user-specific caches
    caches.users.delete(`user:${userId}`);
    caches.users.delete(`user:public:${userId}`);
    
    // Clear user events from event lists
    const eventListKeysToDelete: string[] = [];
    caches.eventLists.forEach((value, key) => {
      if (key.includes(`:${userId}`)) {
        eventListKeysToDelete.push(key);
      }
    });
    eventListKeysToDelete.forEach(key => caches.eventLists.delete(key));
    
    console.log(`Cache INVALIDATE user:${userId} (cleared ${eventListKeysToDelete.length + 2} entries)`);
  },
  
  // Invalidate RSVP-related caches
  invalidateRsvp: (eventId: number, userId: string): void => {
    // Clear event attendees
    caches.attendees.delete(`event:attendees:${eventId}`);
    
    // Clear user event lists
    cache.invalidateUser(userId);
    
    // Clear event details (as RSVP count changed)
    cache.invalidateEvent(eventId);
    
    console.log(`Cache INVALIDATE rsvp:${eventId}:${userId}`);
  },
  
  // Invalidate all event list caches
  invalidateEventLists: (): void => {
    caches.eventLists.clear();
    console.log('Cache INVALIDATE all event lists');
  },
};

// Legacy SimpleCache class for backward compatibility
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

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    Array.from(this.cache.keys()).forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }
}

// Legacy cache instances for backward compatibility
export const userCache = new SimpleCache<any>(CACHE_TTL.USER);
export const eventCache = new SimpleCache<any>(CACHE_TTL.EVENT);
export const messageCache = new SimpleCache<any>(CACHE_TTL.MESSAGE);
export const eventMembersCache = new SimpleCache<number[]>(CACHE_TTL.SHORT);

// Legacy memoized functions for backward compatibility
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

// Legacy helper functions for backward compatibility
export function invalidateUserCaches(userId: string) {
  cache.invalidateUser(userId);
  userCache.delete(userId);
  eventMembersCache.invalidatePattern(`.*_${userId}`);
  memoizedGetUserEventIds.clear();
}

export function invalidateEventCaches(eventId: number) {
  cache.invalidateEvent(eventId);
  eventCache.delete(eventId.toString());
  messageCache.invalidatePattern(`^${eventId}_.*`);
  eventMembersCache.invalidatePattern(`^${eventId}_.*`);
}

export function invalidateMessageCaches(eventId: number) {
  const messageKeysToDelete: string[] = [];
  caches.messages.forEach((value, key) => {
    if (key.startsWith(`messages:${eventId}:`)) {
      messageKeysToDelete.push(key);
    }
  });
  messageKeysToDelete.forEach(key => caches.messages.delete(key));
  messageCache.invalidatePattern(`^${eventId}_.*`);
}

// Export the main cache object and helpers
export { cache, cacheKeys };
export default cache;